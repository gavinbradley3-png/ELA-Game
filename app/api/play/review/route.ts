import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, peerComparisons } from "@/lib/db";
import { requirePlay } from "@/lib/play";
import { clean, lengthError } from "@/lib/validate";
import { PEER_CRITERIA } from "@/lib/tags";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const ctx = await requirePlay(String(body.roundId ?? ""), "review");
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { round, session } = ctx;

  const comparisonId = String(body.comparisonId ?? "");
  const selected = String(body.selectedSubmissionId ?? "");
  const justification = clean(body.justification);
  const criteria = Array.isArray(body.criteria)
    ? body.criteria.map(String).filter((c) => PEER_CRITERIA.some((p) => p.id === c))
    : [];

  const [comparison] = await db
    .select()
    .from(peerComparisons)
    .where(
      and(
        eq(peerComparisons.id, comparisonId),
        eq(peerComparisons.roundId, round.id),
        eq(peerComparisons.reviewerSessionId, session.id),
      ),
    )
    .limit(1);
  if (!comparison) return NextResponse.json({ error: "That comparison isn't yours." }, { status: 404 });
  if (comparison.completedAt) return NextResponse.json({ error: "Already completed." }, { status: 409 });
  if (selected !== comparison.submissionAId && selected !== comparison.submissionBId) {
    return NextResponse.json({ error: "Pick one of the two responses." }, { status: 400 });
  }
  // Lazy-vote safeguards (DESIGN.md §18): a vote without a reason doesn't count.
  const justErr = lengthError(justification, "justification", "Your justification");
  if (justErr) return NextResponse.json({ error: justErr }, { status: 400 });
  if (criteria.length === 0) {
    return NextResponse.json({ error: "Pick at least one reason from the rubric." }, { status: 400 });
  }

  await db
    .update(peerComparisons)
    .set({
      selectedSubmissionId: selected,
      justification,
      criteriaUsed: JSON.stringify(criteria),
      completedAt: Date.now(),
    })
    .where(eq(peerComparisons.id, comparison.id));
  return NextResponse.json({ ok: true });
}
