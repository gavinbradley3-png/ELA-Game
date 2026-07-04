import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, submissions, revisions, passages } from "@/lib/db";
import { requirePlay } from "@/lib/play";
import { newId } from "@/lib/ids";
import { clean, lengthError, meaningfullyDifferent } from "@/lib/validate";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const ctx = await requirePlay(String(body.roundId ?? ""), "revise");
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { round, session } = ctx;

  const [original] = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.roundId, round.id), eq(submissions.studentSessionId, session.id)))
    .limit(1);
  if (!original) {
    return NextResponse.json({ error: "You didn't submit a response this round, so there's nothing to revise." }, { status: 409 });
  }

  const keepOriginal = body.keepOriginal === true;
  const changeExplanation = clean(body.changeExplanation);
  const explErr = lengthError(
    changeExplanation,
    "changeExplanation",
    keepOriginal ? "Your defense of the original" : "Your explanation of what changed",
  );
  if (explErr) return NextResponse.json({ error: explErr }, { status: 400 });

  let revisedClaim: string;
  let revisedReasoning: string;
  let start: number;
  let end: number;
  let evidenceText: string;

  if (keepOriginal) {
    // "Defend my original" still requires a specific written defense —
    // keeping your answer is a reasoning move, not an opt-out (DESIGN.md §19).
    revisedClaim = original.claim;
    revisedReasoning = original.reasoning;
    start = original.evidenceStart;
    end = original.evidenceEnd;
    evidenceText = original.evidenceText;
  } else {
    revisedClaim = clean(body.revisedClaim);
    revisedReasoning = clean(body.revisedReasoning);
    start = Number(body.revisedEvidenceStart);
    end = Number(body.revisedEvidenceEnd);

    const claimErr = lengthError(revisedClaim, "claim", "Your revised claim");
    if (claimErr) return NextResponse.json({ error: claimErr }, { status: 400 });
    const reasoningErr = lengthError(revisedReasoning, "reasoning", "Your revised reasoning");
    if (reasoningErr) return NextResponse.json({ error: reasoningErr }, { status: 400 });

    const [passage] = await db.select().from(passages).where(eq(passages.id, round.passageId)).limit(1);
    if (!passage) return NextResponse.json({ error: "Passage missing." }, { status: 500 });
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > passage.text.length || end <= start) {
      return NextResponse.json({ error: "Select your evidence directly from the passage." }, { status: 400 });
    }
    evidenceText = passage.text.slice(start, end);
    if (evidenceText.trim().length < 3 || evidenceText.length > 400) {
      return NextResponse.json({ error: "Evidence should be a focused quote." }, { status: 400 });
    }

    const unchanged =
      start === original.evidenceStart &&
      end === original.evidenceEnd &&
      !meaningfullyDifferent(original.claim, revisedClaim) &&
      !meaningfullyDifferent(original.reasoning, revisedReasoning);
    if (unchanged) {
      return NextResponse.json(
        {
          error:
            "Nothing actually changed. Improve your evidence, claim, or reasoning — or switch to “Defend my original” and explain why it holds up.",
        },
        { status: 400 },
      );
    }
  }

  const [existing] = await db
    .select()
    .from(revisions)
    .where(eq(revisions.submissionId, original.id))
    .limit(1);
  if (existing) {
    await db
      .update(revisions)
      .set({
        revisedClaim,
        revisedReasoning,
        revisedEvidenceStart: start,
        revisedEvidenceEnd: end,
        revisedEvidenceText: evidenceText,
        changeExplanation,
        keptOriginal: keepOriginal ? 1 : 0,
        submittedAt: Date.now(),
      })
      .where(eq(revisions.id, existing.id));
    return NextResponse.json({ ok: true });
  }
  await db.insert(revisions).values({
    id: newId(),
    submissionId: original.id,
    revisedClaim,
    revisedReasoning,
    revisedEvidenceStart: start,
    revisedEvidenceEnd: end,
    revisedEvidenceText: evidenceText,
    changeExplanation,
    keptOriginal: keepOriginal ? 1 : 0,
    submittedAt: Date.now(),
  });
  return NextResponse.json({ ok: true });
}
