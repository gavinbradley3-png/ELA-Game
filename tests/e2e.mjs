/**
 * End-to-end test of a full Evidence Battle round against a running server
 * (default http://localhost:3000 — override with BASE_URL).
 *
 * Teacher drives the real UI in a browser; 4 students act through the API.
 * Uses a unique teacher email per run, so it can run against a dirty database.
 *
 *   npm run build && AUTH_SECRET=test npm start &
 *   npm run test:e2e
 */
import { chromium } from "playwright";
import assert from "node:assert";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOTS = new URL("./shots/", import.meta.url).pathname;
fs.mkdirSync(SHOTS, { recursive: true });
const RUN = Date.now().toString(36);

const EXECUTABLE = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  ?? (fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);

const PASSAGE_TEXT = `Lena kept her eyes on the floor tiles as Maya slid into the seat beside her.

"So," Maya said, drumming her fingers on the desk, "did you bring it? Mr. Ortiz said the models are due right after lunch."

"Yeah. About that." Lena's voice came out thinner than she wanted. She pulled her backpack closer, as if it needed protecting. "I was thinking we should tell him we need another day. You know, to make it perfect."

Maya laughed. "Perfect? Lena, we finished it Sunday. You took it home to add the labels. It IS perfect."

"Right." Lena's hands were shaking, so she sat on them. Out the window, two sixth graders were kicking a soccer ball against the fence, and she watched them like it was the most interesting thing she had ever seen.

"Lena." Maya's voice dropped. "Where is the model?"

"Why are you interrogating me?" Lena snapped, louder than she meant to. Half the class turned around. "I said we should ask for another day. Why isn't that good enough for you?"

Maya blinked and sat back, and for a moment neither of them said anything. Lena thought about the bus, about the crunch she had heard when her backpack slipped off the seat, about the little bridge they had built from balsa wood lying somewhere on the floor of the number 12 bus in a hundred pieces. Maya had trusted her with it. Maya, who checked the glue on every joint twice.

"Forget it," Lena muttered. "I'll talk to Mr. Ortiz myself."`;

const students = [
  { name: "Ava", cookie: "", roundId: "" },
  { name: "Ben", cookie: "", roundId: "" },
  { name: "Cleo", cookie: "", roundId: "" },
  { name: "Dev", cookie: "", roundId: "" },
];

async function api(student, path, body) {
  const res = await fetch(BASE + path, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", cookie: student.cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) student.cookie = setCookie.split(";")[0];
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}
const state = (s) => api(s, `/api/play/state?roundId=${s.roundId}`);

function offsets(text, quote) {
  const i = text.indexOf(quote);
  assert(i >= 0, `quote not found: ${quote}`);
  return { start: i, end: i + quote.length };
}

async function main() {
  const browser = await chromium.launch({ executablePath: EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // -- Teacher: signup ------------------------------------------------------
  await page.goto(BASE + "/signup");
  await page.fill('input[name="name"]', "Ms. Bradley");
  await page.fill('input[name="email"]', `teacher-${RUN}@example.com`);
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/teacher");
  console.log("✓ teacher signup");

  // -- Create class ---------------------------------------------------------
  await page.goto(BASE + "/teacher/classes");
  await page.fill('input[name="name"]', `Block B — ${RUN}`);
  await page.fill('input[name="grade"]', "8");
  await page.click('button:has-text("Add class")');
  await page.waitForSelector(`text=Block B — ${RUN}`);
  console.log("✓ class created");

  // -- Create passage -------------------------------------------------------
  await page.goto(BASE + "/teacher/passages/new");
  await page.fill('input[name="title"]', `The Missing Project ${RUN}`);
  await page.fill('input[name="genre"]', "Short story excerpt");
  await page.fill('input[name="gradeLevel"]', "8");
  await page.fill('textarea[name="text"]', PASSAGE_TEXT);
  await page.click('button:has-text("Save passage")');
  await page.waitForURL("**/teacher/passages/*");
  console.log("✓ passage created");

  // -- Add prompt ------------------------------------------------------------
  await page.fill(
    'form:has(button:has-text("Add prompt")) textarea[name="text"]',
    "What best explains Lena's behavior: anger, guilt, or fear? Choose the strongest evidence and explain how it supports your claim.",
  );
  await page.selectOption('select[name="promptType"]', "Character motivation");
  await page.click('button:has-text("Add prompt")');
  await page.waitForSelector('li:has-text("What best explains Lena\'s behavior")');
  console.log("✓ prompt created");

  // -- Launch round ------------------------------------------------------------
  await page.click("text=Launch a round with this passage");
  await page.waitForURL("**/teacher/rounds/new**");
  await page.click('button:has-text("Open the lobby")');
  await page.waitForURL("**/control");
  await page.waitForSelector('[data-testid="phase-label"]');
  const joinCode = (await page.locator('[data-testid="join-code"]').textContent()).trim();
  console.log("✓ round launched, code:", joinCode);
  await page.screenshot({ path: SHOTS + "01-control-lobby.png" });

  // -- Students join -------------------------------------------------------------
  for (const s of students) {
    const { status, data } = await api(s, "/api/play/join", { code: joinCode, name: s.name });
    assert.equal(status, 200, JSON.stringify(data));
    s.roundId = data.roundId;
  }
  const dup = { name: "Ava", cookie: "" };
  const dupRes = await api(dup, "/api/play/join", { code: joinCode, name: "Ava" });
  assert.equal(dupRes.data.name, "Ava 2");
  const bad = { name: "x", cookie: "" };
  const badRes = await api(bad, "/api/play/join", { code: joinCode, name: "fuckface" });
  assert.equal(badRes.status, 400);
  console.log("✓ 5 students joined (dup name suffixed, bad name blocked)");

  await page.waitForSelector("text=Ava 2");

  // Student browser page for screenshots
  const sPage = await (await browser.newContext({ viewport: { width: 420, height: 860 } })).newPage();
  await sPage.goto(BASE + "/play");
  await sPage.fill('input[placeholder="ABC123"]', joinCode);
  await sPage.fill('input[placeholder="Sam"]', "Elle");
  await sPage.click('button[type="submit"]');
  await sPage.waitForSelector("text=You're in");
  await sPage.screenshot({ path: SHOTS + "02-student-lobby.png" });

  const advance = async (label) => {
    await page.click('button:has-text("Next:")');
    await page.waitForSelector(`[data-testid="phase-label"]:has-text("${label}")`);
    console.log("✓ advanced to", label);
  };

  // -- Reading ---------------------------------------------------------------------
  await advance("Reading");
  let st = await state(students[0]);
  assert.equal(st.data.round.underlyingPhase, "reading");
  assert(st.data.passage.text.includes("balsa wood"));
  const early = await api(students[0], "/api/play/submit", {
    roundId: students[0].roundId, claim: "x".repeat(20), reasoning: "y".repeat(50),
    confidence: 3, evidenceStart: 0, evidenceEnd: 20,
  });
  assert.equal(early.status, 409);
  await sPage.waitForSelector(`text=The Missing Project ${RUN}`);
  await sPage.waitForTimeout(1800);
  await sPage.screenshot({ path: SHOTS + "03-student-reading.png" });
  console.log("✓ reading phase (early submit correctly rejected)");

  // -- Pause / resume -----------------------------------------------------------------
  await page.click('button:has-text("Pause")');
  await page.waitForSelector("text=Paused");
  st = await state(students[0]);
  assert.equal(st.data.round.paused, true);
  await page.click('button:has-text("Resume")');
  await page.waitForSelector('[data-testid="phase-label"]:has-text("Reading")');
  console.log("✓ pause/resume");

  // -- Annotate ------------------------------------------------------------------------
  await advance("Annotate");
  const text = st.data.passage.text;
  const quotes = {
    shaking: `Lena's hands were shaking, so she sat on them`,
    snapped: `"Why are you interrogating me?" Lena snapped`,
    crunch: `the crunch she had heard when her backpack slipped off the seat`,
    trusted: `Maya had trusted her with it`,
  };
  for (const [i, s] of students.entries()) {
    const q = Object.values(quotes)[i % 4];
    const { start, end } = offsets(text, q);
    const r = await api(s, "/api/play/annotate", {
      roundId: s.roundId, action: "add", startOffset: start, endOffset: end,
      tag: ["evidence", "character", "inference", "conflict"][i % 4],
    });
    assert.equal(r.status, 200, JSON.stringify(r.data));
  }
  const big = await api(students[0], "/api/play/annotate", {
    roundId: students[0].roundId, action: "add", startOffset: 0, endOffset: 500, tag: "evidence",
  });
  assert.equal(big.status, 400);
  await sPage.waitForSelector('[data-testid="student-phase"]:has-text("Annotate")');
  await sPage.waitForTimeout(1800);
  await sPage.screenshot({ path: SHOTS + "04-student-annotate.png" });
  console.log("✓ annotations saved (over-highlight blocked)");

  // -- The Prompt -------------------------------------------------------------------------
  await advance("The Prompt");
  st = await state(students[0]);
  assert(st.data.prompt.text.includes("anger, guilt, or fear"));

  // -- Submit Receipt ----------------------------------------------------------------------
  await advance("Submit Receipt");
  const subs = [
    { s: students[0], q: quotes.shaking, claim: "Lena hides the truth because she is afraid of losing Maya's trust.", reasoning: "Shaking hands are a body's fear response, and hiding them shows Lena is trying to keep Maya from seeing how scared she is about the broken model." },
    { s: students[1], q: quotes.snapped, claim: "Lena acts out of anger at being questioned.", reasoning: "She snaps loudly at Maya, which shows her frustration boiling over when she feels cornered by the interrogation." },
    { s: students[2], q: quotes.crunch, claim: "Guilt drives Lena to avoid the conversation entirely.", reasoning: "The memory of the crunch replays in her head, which shows the accident is weighing on her conscience and she cannot face what she did to their shared work." },
    { s: students[3], q: quotes.trusted, claim: "Lena's behavior comes from guilt over betraying Maya's trust.", reasoning: "The narrator stresses that Maya trusted her and checks every joint twice, so Lena knows exactly how much the loss will hurt, which explains the avoidance and the snapping." },
  ];
  const shk = offsets(text, quotes.shaking);
  const restate = await api(students[0], "/api/play/submit", {
    roundId: students[0].roundId, claim: "Lena is afraid of what Maya will say next.",
    reasoning: "Lena's hands were shaking so she sat on them there.",
    confidence: 3, evidenceStart: shk.start, evidenceEnd: shk.end,
  });
  assert.equal(restate.status, 400, "restating reasoning should be blocked");
  for (const [i, x] of subs.entries()) {
    const { start, end } = offsets(text, x.q);
    const r = await api(x.s, "/api/play/submit", {
      roundId: x.s.roundId, claim: x.claim, reasoning: x.reasoning,
      confidence: (i % 4) + 1, evidenceStart: start, evidenceEnd: end,
    });
    assert.equal(r.status, 200, JSON.stringify(r.data));
  }
  await sPage.waitForSelector("text=Your receipt");
  await sPage.waitForTimeout(1800);
  await sPage.screenshot({ path: SHOTS + "05-student-submit.png" });
  await page.screenshot({ path: SHOTS + "06-control-submitting.png" });
  console.log("✓ 4 submissions (quote-restating reasoning blocked)");

  // -- Vote -----------------------------------------------------------------------------------
  await advance("Vote");
  await sPage.waitForSelector("text=Which receipt");
  await sPage.waitForTimeout(1800);
  await sPage.screenshot({ path: SHOTS + "06b-student-jury.png" });
  let totalVotes = 0;
  for (const s of students) {
    const st2 = await state(s);
    const comps = st2.data.comparisons ?? [];
    assert(comps.length > 0, `no comparisons for ${s.name}`);
    for (const c of comps) {
      assert(c.a && c.b);
      const lazy = await api(s, "/api/play/review", {
        roundId: s.roundId, comparisonId: c.id, selectedSubmissionId: c.a.id,
        criteria: ["evidence"], justification: "good",
      });
      assert.equal(lazy.status, 400);
      const r = await api(s, "/api/play/review", {
        roundId: s.roundId, comparisonId: c.id, selectedSubmissionId: c.a.id,
        criteria: ["evidence", "connection"],
        justification: "Receipt A's quote actually shows the feeling directly instead of just describing the scene around it.",
      });
      assert.equal(r.status, 200, JSON.stringify(r.data));
      totalVotes++;
    }
  }
  console.log(`✓ voting: ${totalVotes} votes with justification (lazy votes rejected)`);

  // -- Revise ------------------------------------------------------------------------------------
  await advance("Revise");
  const better = offsets(text, quotes.trusted);
  let r = await api(students[0], "/api/play/revise", {
    roundId: students[0].roundId, keepOriginal: false,
    revisedClaim: "Lena hides the truth because she fears losing Maya's trust more than she fears Mr. Ortiz.",
    revisedReasoning: "The narrator says Maya trusted her and checked every joint twice. Lena replays that fact right before she offers to talk to the teacher alone, which shows the friendship, not the grade, is what she is scared of breaking.",
    revisedEvidenceStart: better.start, revisedEvidenceEnd: better.end,
    changeExplanation: "I swapped my evidence because the trust line explains WHY the shaking hands matter, and a peer justification pointed at motivation over reaction.",
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  r = await api(students[1], "/api/play/revise", {
    roundId: students[1].roundId, keepOriginal: false,
    revisedClaim: subs[1].claim, revisedReasoning: subs[1].reasoning,
    revisedEvidenceStart: offsets(text, quotes.snapped).start,
    revisedEvidenceEnd: offsets(text, quotes.snapped).end,
    changeExplanation: "I made it better and stronger overall.",
  });
  assert.equal(r.status, 400, "no-op revision should be blocked");
  r = await api(students[1], "/api/play/revise", {
    roundId: students[1].roundId, keepOriginal: true,
    changeExplanation: "I'm keeping the snapping quote because it's the only moment Lena directs her feelings AT someone, and my claim is about how she treats Maya.",
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  await sPage.waitForSelector("text=nothing to revise");
  await sPage.waitForTimeout(1800);
  await sPage.screenshot({ path: SHOTS + "07-student-revise.png" });
  console.log("✓ revision (meaningful change required; defend-original path works)");

  // -- Spotlight + Reveal --------------------------------------------------------------------------
  await page.click('button:has-text("☆ Spotlight")');
  await advance("Reveal");
  st = await state(students[0]);
  assert(st.data.reveal.totalSubmissions >= 4);
  assert(st.data.reveal.spotlights.length >= 1);
  await sPage.waitForSelector("text=Teacher spotlight");
  await sPage.waitForTimeout(1800);
  await sPage.screenshot({ path: SHOTS + "08-student-reveal.png" });
  console.log("✓ reveal (spotlight visible, evidence clusters:", st.data.reveal.evidenceClusters.length + ")");

  // -- Reflect ------------------------------------------------------------------------------------
  await advance("Reflect");
  for (const s of students.slice(0, 3)) {
    const r2 = await api(s, "/api/play/reflect", {
      roundId: s.roundId,
      text: "My evidence got stronger when I picked the line about trust instead of the shaking hands.",
    });
    assert.equal(r2.status, 200);
  }
  console.log("✓ reflections saved");

  // -- Done + dashboard -----------------------------------------------------------------------------
  await advance("Done");
  await page.goto(BASE + `/teacher/rounds/${students[0].roundId}/dashboard`);
  await page.waitForSelector("text=Round report");
  await page.screenshot({ path: SHOTS + "09-dashboard.png", fullPage: true });

  const csv = await page.evaluate(async (id) => {
    const res = await fetch(`/api/teacher/rounds/${id}/export`);
    return res.text();
  }, students[0].roundId);
  assert(csv.includes("claim") && csv.includes("Student 1"));
  console.log("✓ dashboard + CSV export");

  const status = await page.evaluate(async (id) => {
    const res = await fetch(`/api/teacher/rounds/${id}/status`);
    return res.json();
  }, students[0].roundId);
  assert.equal(status.counts.submitted, 4);
  assert.equal(status.counts.revised, 2);
  assert(status.counts.improved >= 1, "revision should count as improved");
  assert.equal(status.counts.reflected, 3);
  assert(status.evidenceClusters.length >= 2);
  console.log("✓ teacher status counts:", JSON.stringify(status.counts));

  await browser.close();
  console.log("\nALL E2E CHECKS PASSED");
}

main().catch((e) => {
  console.error("E2E FAILED:", e);
  process.exit(1);
});
