import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, submissions, passages } from "@/lib/db";
import { requirePlay, readJson } from "@/lib/play";
import { newId } from "@/lib/ids";
import { clean, lengthError, restatesEvidence } from "@/lib/validate";

export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const ctx = await requirePlay(String(body.roundId ?? ""), "submit");
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { round, session } = ctx;
  if (round.submissionsLocked === 1) {
    return NextResponse.json({ error: "Submissions are locked." }, { status: 409 });
  }

  const claim = clean(body.claim);
  const reasoning = clean(body.reasoning);
  const confidence = Number(body.confidence);
  const start = Number(body.evidenceStart);
  const end = Number(body.evidenceEnd);

  const claimErr = lengthError(claim, "claim", "Your claim");
  if (claimErr) return NextResponse.json({ error: claimErr }, { status: 400 });
  const reasoningErr = lengthError(reasoning, "reasoning", "Your reasoning");
  if (reasoningErr) return NextResponse.json({ error: reasoningErr }, { status: 400 });
  if (![1, 2, 3, 4].includes(confidence)) {
    return NextResponse.json({ error: "Pick a confidence level." }, { status: 400 });
  }

  const [passage] = await db.select().from(passages).where(eq(passages.id, round.passageId)).limit(1);
  if (!passage) return NextResponse.json({ error: "Passage missing." }, { status: 500 });
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > passage.text.length || end <= start) {
    return NextResponse.json({ error: "Select your evidence directly from the passage." }, { status: 400 });
  }
  const evidenceText = passage.text.slice(start, end);
  if (evidenceText.trim().length < 3 || evidenceText.length > 400) {
    return NextResponse.json(
      { error: "Evidence should be a focused quote — more than a word, less than a paragraph." },
      { status: 400 },
    );
  }
  if (restatesEvidence(reasoning, evidenceText)) {
    return NextResponse.json(
      {
        error:
          "Your reasoning mostly repeats the quote. Explain what the quote PROVES about your claim — what does it show that isn't said directly?",
      },
      { status: 400 },
    );
  }

  // Atomic upsert: students can improve their answer until the teacher locks
  // or advances, and a double-tapped submit can never create two rows.
  await db
    .insert(submissions)
    .values({
      id: newId(),
      roundId: round.id,
      studentSessionId: session.id,
      claim,
      reasoning,
      confidence,
      evidenceStart: start,
      evidenceEnd: end,
      evidenceText,
      status: "submitted",
      submittedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: submissions.studentSessionId,
      set: {
        claim,
        reasoning,
        confidence,
        evidenceStart: start,
        evidenceEnd: end,
        evidenceText,
        status: "submitted",
        submittedAt: Date.now(),
      },
    });
  return NextResponse.json({ ok: true });
}
