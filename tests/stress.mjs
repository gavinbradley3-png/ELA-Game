/**
 * Classroom stress test: 30 students hammer one live round concurrently, with
 * deliberate double-fired requests, to prove the race-safety guarantees:
 *
 *  - simultaneous joins (incl. duplicate names) never collide
 *  - a double-tapped submit produces exactly one submission
 *  - a double-fired "advance" moves exactly one phase (fromPhase guard)
 *  - concurrent advance-to-Vote generates comparisons exactly once,
 *    with no self-review, no duplicate pairs, and balanced exposure
 *  - concurrent votes/revisions/reflections all land exactly once
 *
 * Seeds the teacher/content directly into the database, so it needs the same
 * AUTH_SECRET and database file as the server under test:
 *
 *   npm run build && AUTH_SECRET=test npm start &
 *   AUTH_SECRET=test npm run test:stress
 */
import assert from "node:assert";
import { createHmac, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const DB_PATH = process.env.RECEIPTS_DB_PATH ?? path.join(process.cwd(), "data", "receipts.db");
const SECRET = process.env.AUTH_SECRET ?? "receipts-dev-secret-do-not-use-in-prod";
const N = 30;

const PASSAGE = Array.from({ length: 8 }, (_, i) =>
  `Paragraph ${i + 1}. Lena stared at the broken bridge model and thought about what she would tell Maya. The glue had failed exactly where she had rushed it, and everyone would see that the collapse was not an accident of the bus ride alone.`,
).join("\n\n");

// --- seed teacher + content directly -----------------------------------------
const db = new Database(DB_PATH);
const now = Date.now();
const teacherId = randomUUID();
const classId = randomUUID();
const passageId = randomUUID();
const promptId = randomUUID();
const roundId = randomUUID();
const joinCode = "STRS" + Math.floor(Math.random() * 90 + 10);

db.prepare(
  "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
).run(teacherId, `stress-${now}@example.com`, "Stress Teacher", "x", now);
db.prepare(
  "INSERT INTO classes (id, teacher_id, name, grade, archived, created_at) VALUES (?, ?, ?, ?, 0, ?)",
).run(classId, teacherId, `Stress Class ${now}`, "8", now);
db.prepare(
  "INSERT INTO passages (id, teacher_id, title, text, archived, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)",
).run(passageId, teacherId, `Stress Passage ${now}`, PASSAGE, now, now);
db.prepare(
  "INSERT INTO prompts (id, passage_id, text, prompt_type, created_at) VALUES (?, ?, ?, ?, ?)",
).run(promptId, passageId, "What best explains the collapse of the bridge? Support your claim with evidence.", "Best evidence", now);
db.prepare(
  `INSERT INTO game_rounds (id, teacher_id, class_id, passage_id, prompt_id, join_code, phase, names_hidden, settings, created_at, started_at)
   VALUES (?, ?, ?, ?, ?, ?, 'lobby', 1, ?, ?, ?)`,
).run(roundId, teacherId, classId, passageId, promptId, joinCode, JSON.stringify({}), now, now);
console.log(`✓ seeded round ${joinCode}`);

// --- forge a teacher session cookie (same HMAC scheme as lib/auth) ------------
const expiry = Date.now() + 60 * 60 * 1000;
const payload = `${teacherId}.${expiry}`;
const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
const teacherCookie = `receipts_session=${payload}.${sig}`;

async function teacherAct(body) {
  const res = await fetch(`${BASE}/api/teacher/rounds/${roundId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: teacherCookie },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}
async function teacherStatus() {
  const res = await fetch(`${BASE}/api/teacher/rounds/${roundId}/status`, {
    headers: { cookie: teacherCookie },
  });
  assert.equal(res.status, 200, "teacher status auth (forged cookie must verify)");
  return res.json();
}

const students = Array.from({ length: N }, (_, i) => ({
  name: i % 5 === 0 ? "Sam" : `Kid${i}`, // deliberate duplicate names
  cookie: "",
}));

async function sApi(s, path, body) {
  const res = await fetch(BASE + path, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", cookie: s.cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) s.cookie = setCookie.split(";")[0];
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

async function main() {
  // sanity: forged auth works before we rely on it
  await teacherStatus();

  // -- 30 simultaneous joins ---------------------------------------------------
  const joins = await Promise.all(students.map((s) => sApi(s, "/api/play/join", { code: joinCode, name: s.name })));
  for (const j of joins) assert.equal(j.status, 200, JSON.stringify(j.data));
  const names = joins.map((j) => j.data.name);
  assert.equal(new Set(names).size, N, `names must be unique, got ${N - new Set(names).size} collisions`);
  console.log(`✓ ${N} students joined simultaneously, all display names unique`);

  const advance = async (fromPhase, label) => {
    const r = await teacherAct({ type: "advance", fromPhase });
    assert.equal(r.status, 200, `${label}: ${JSON.stringify(r.data)}`);
  };

  // -- double-fired advance moves exactly one phase ------------------------------
  const [a1, a2] = await Promise.all([
    teacherAct({ type: "advance", fromPhase: "lobby" }),
    teacherAct({ type: "advance", fromPhase: "lobby" }),
  ]);
  const okCount = [a1, a2].filter((r) => r.status === 200).length;
  assert.equal(okCount, 1, "exactly one of two concurrent advances should win");
  let status = await teacherStatus();
  assert.equal(status.round.underlyingPhase, "reading", "double advance must not skip a phase");
  console.log("✓ double-fired advance moved exactly one phase");

  // -- everyone annotates concurrently ------------------------------------------
  await advance("reading", "to annotate");
  const annos = await Promise.all(
    students.map((s, i) =>
      sApi(s, "/api/play/annotate", {
        roundId, action: "add",
        startOffset: (i % 8) * 40, endOffset: (i % 8) * 40 + 60,
        tag: "evidence",
      }),
    ),
  );
  for (const a of annos) assert.equal(a.status, 200, JSON.stringify(a.data));
  console.log(`✓ ${N} concurrent annotations saved`);

  // -- everyone submits; five of them double-tap ---------------------------------
  await advance("annotating", "to prompt");
  await advance("prompt", "to submitting");
  const submitBody = (s, i) => ({
    roundId,
    claim: `The rushed glue joint is the real cause of the collapse, not the bus (${i}).`,
    reasoning: `The passage says the glue failed exactly where she had rushed it, which proves the weak point existed before the ride and the crash only exposed it (${i}).`,
    confidence: (i % 4) + 1,
    evidenceStart: 30, evidenceEnd: 150,
  });
  const submitCalls = students.flatMap((s, i) =>
    i % 6 === 0
      ? [sApi(s, "/api/play/submit", submitBody(s, i)), sApi(s, "/api/play/submit", submitBody(s, i))]
      : [sApi(s, "/api/play/submit", submitBody(s, i))],
  );
  const submitResults = await Promise.all(submitCalls);
  for (const r of submitResults) assert.equal(r.status, 200, JSON.stringify(r.data));
  status = await teacherStatus();
  assert.equal(status.counts.submitted, N, `double-tapped submits must not duplicate (got ${status.counts.submitted})`);
  console.log(`✓ ${N} submissions exactly (double-taps deduplicated)`);

  // -- concurrent advance to Vote generates comparisons exactly once --------------
  await Promise.allSettled([
    teacherAct({ type: "advance", fromPhase: "submitting" }),
    teacherAct({ type: "advance", fromPhase: "submitting" }),
  ]);
  status = await teacherStatus();
  assert.equal(status.round.underlyingPhase, "peer_review");

  const comps = db
    .prepare("SELECT reviewer_session_id, submission_a_id, submission_b_id FROM peer_comparisons WHERE round_id = ?")
    .all(roundId);
  const subRows = db
    .prepare("SELECT id, student_session_id FROM submissions WHERE round_id = ?")
    .all(roundId);
  const ownerOf = new Map(subRows.map((r) => [r.id, r.student_session_id]));
  const perReviewer = new Map();
  const exposure = new Map(subRows.map((r) => [r.id, 0]));
  for (const c of comps) {
    assert.notEqual(ownerOf.get(c.submission_a_id), c.reviewer_session_id, "self-review A");
    assert.notEqual(ownerOf.get(c.submission_b_id), c.reviewer_session_id, "self-review B");
    assert.notEqual(c.submission_a_id, c.submission_b_id, "pair must be two different receipts");
    const pairs = perReviewer.get(c.reviewer_session_id) ?? new Set();
    const key = [c.submission_a_id, c.submission_b_id].sort().join("|");
    assert(!pairs.has(key), "duplicate pair for one reviewer");
    pairs.add(key);
    perReviewer.set(c.reviewer_session_id, pairs);
    exposure.set(c.submission_a_id, exposure.get(c.submission_a_id) + 1);
    exposure.set(c.submission_b_id, exposure.get(c.submission_b_id) + 1);
  }
  for (const pairs of perReviewer.values()) assert(pairs.size <= 2, "max 2 comparisons per reviewer");
  const counts = [...exposure.values()];
  assert(Math.max(...counts) - Math.min(...counts) <= 3, `exposure unbalanced: ${Math.min(...counts)}–${Math.max(...counts)}`);
  assert.equal(comps.length, status.counts.reviewsAssigned);
  console.log(`✓ comparisons generated once: ${comps.length} pairs, no self-review, exposure ${Math.min(...counts)}–${Math.max(...counts)}`);

  // -- everyone votes concurrently -------------------------------------------------
  const voteCalls = [];
  for (const s of students) {
    const st = await sApi(s, `/api/play/state?roundId=${roundId}`);
    for (const c of st.data.comparisons ?? []) {
      voteCalls.push(
        sApi(s, "/api/play/review", {
          roundId, comparisonId: c.id, selectedSubmissionId: c.a.id,
          criteria: ["evidence"],
          justification: "This receipt names the exact failure point instead of describing the scene around it.",
        }),
      );
    }
  }
  const votes = await Promise.all(voteCalls);
  for (const v of votes) assert.equal(v.status, 200, JSON.stringify(v.data));
  status = await teacherStatus();
  assert.equal(status.counts.reviewed, status.counts.reviewsAssigned, "every assigned comparison voted");
  console.log(`✓ ${votes.length} concurrent votes recorded`);

  // -- revisions + double-tapped reflections ----------------------------------------
  await advance("peer_review", "to revise");
  const revisions = await Promise.all(
    students.slice(0, 10).map((s, i) =>
      sApi(s, "/api/play/revise", {
        roundId, keepOriginal: false,
        revisedClaim: `The collapse traces to one rushed joint, and the evidence pins it precisely (${i}).`,
        revisedReasoning: `Rereading the passage, the narrator isolates the failure to the rushed glue joint before the ride, so the bus is the trigger and not the cause, which sharpens my original claim considerably (${i}).`,
        revisedEvidenceStart: 60, revisedEvidenceEnd: 200,
        changeExplanation: "I narrowed the evidence window to the sentence that names the rushed joint directly.",
      }),
    ),
  );
  for (const r of revisions) assert.equal(r.status, 200, JSON.stringify(r.data));

  await advance("revising", "to reveal");
  await advance("reveal", "to reflect");
  const reflectBody = { roundId, text: "My evidence got sharper once I stopped quoting the whole paragraph." };
  const reflects = await Promise.all(
    students.flatMap((s, i) =>
      i % 7 === 0
        ? [sApi(s, "/api/play/reflect", reflectBody), sApi(s, "/api/play/reflect", reflectBody)]
        : [sApi(s, "/api/play/reflect", reflectBody)],
    ),
  );
  for (const r of reflects) assert.equal(r.status, 200, JSON.stringify(r.data));
  status = await teacherStatus();
  assert.equal(status.counts.revised, 10);
  assert.equal(status.counts.reflected, N, `double-tapped reflections must not duplicate (got ${status.counts.reflected})`);
  console.log(`✓ 10 revisions, ${N} reflections exactly (double-taps deduplicated)`);

  await advance("reflection", "to done");
  status = await teacherStatus();
  assert.equal(status.round.underlyingPhase, "complete");
  console.log("✓ round completed:", JSON.stringify(status.counts));

  console.log(`\nSTRESS TEST PASSED — ${N} students, ${votes.length} votes, zero glitches`);
}

main()
  .catch((e) => {
    console.error("STRESS TEST FAILED:", e);
    process.exit(1);
  })
  .finally(() => db.close());
