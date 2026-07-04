import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  gameRounds,
  passages,
  prompts,
  annotations,
  submissions,
  peerComparisons,
  revisions,
  reflections,
} from "@/lib/db";
import { getStudentSession, touchStudentSession } from "@/lib/student";
import { PHASE_ORDER } from "@/lib/phases";
import { publicRoundState, clusterRanges } from "@/lib/rounds";

/**
 * The student client polls this endpoint to stay in sync with the
 * teacher-controlled round state. Everything is filtered to what the current
 * phase allows the student to see (DESIGN.md §31: never trust client state).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const roundId = url.searchParams.get("roundId") ?? "";
  const [round] = await db.select().from(gameRounds).where(eq(gameRounds.id, roundId)).limit(1);
  if (!round) return NextResponse.json({ error: "Round not found." }, { status: 404 });

  const session = await getStudentSession(round.id);
  if (!session) return NextResponse.json({ error: "removed_or_unknown" }, { status: 401 });
  await touchStudentSession(session.id);

  const phase = round.pausedFromPhase ?? round.phase;
  const phaseIndex = (PHASE_ORDER as readonly string[]).indexOf(phase);
  const atLeast = (p: string) => phaseIndex >= (PHASE_ORDER as readonly string[]).indexOf(p);

  const state: Record<string, unknown> = {
    round: publicRoundState(round),
    me: { id: session.id, name: session.displayName },
  };

  if (atLeast("reading") && round.phase !== "cancelled") {
    const [passage] = await db.select().from(passages).where(eq(passages.id, round.passageId)).limit(1);
    if (passage) {
      state.passage = { title: passage.title, text: passage.text, vocabNotes: passage.vocabNotes };
    }
  }
  if (atLeast("prompt")) {
    const [prompt] = await db.select().from(prompts).where(eq(prompts.id, round.promptId)).limit(1);
    if (prompt) state.prompt = { text: prompt.text, promptType: prompt.promptType };
  }

  const myAnnotations = await db
    .select()
    .from(annotations)
    .where(and(eq(annotations.roundId, round.id), eq(annotations.studentSessionId, session.id)));
  state.annotations = myAnnotations.map((a) => ({
    id: a.id,
    startOffset: a.startOffset,
    endOffset: a.endOffset,
    text: a.text,
    tag: a.tag,
  }));

  const [mySubmission] = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.roundId, round.id), eq(submissions.studentSessionId, session.id)))
    .limit(1);
  if (mySubmission) {
    state.submission = {
      id: mySubmission.id,
      claim: mySubmission.claim,
      reasoning: mySubmission.reasoning,
      confidence: mySubmission.confidence,
      evidenceStart: mySubmission.evidenceStart,
      evidenceEnd: mySubmission.evidenceEnd,
      evidenceText: mySubmission.evidenceText,
      removed: mySubmission.status === "removed",
    };
    const [myRevision] = await db
      .select()
      .from(revisions)
      .where(eq(revisions.submissionId, mySubmission.id))
      .limit(1);
    if (myRevision) {
      state.revision = {
        claim: myRevision.revisedClaim,
        reasoning: myRevision.revisedReasoning,
        evidenceStart: myRevision.revisedEvidenceStart,
        evidenceEnd: myRevision.revisedEvidenceEnd,
        evidenceText: myRevision.revisedEvidenceText,
        changeExplanation: myRevision.changeExplanation,
        keptOriginal: myRevision.keptOriginal === 1,
      };
    }
  }

  if (phase === "peer_review" || (atLeast("peer_review") && !atLeast("reveal"))) {
    state.comparisons = await loadComparisons(round.id, session.id);
  }

  // Feedback for revision: how peers voted on my submission, with justifications
  // (anonymous). Available from the revising phase onward.
  if (mySubmission && atLeast("revising")) {
    const aboutMe = await db
      .select()
      .from(peerComparisons)
      .where(eq(peerComparisons.roundId, round.id));
    const relevant = aboutMe.filter(
      (c) =>
        c.completedAt &&
        (c.submissionAId === mySubmission.id || c.submissionBId === mySubmission.id),
    );
    state.peerFeedback = {
      timesCompared: relevant.length,
      votesFor: relevant.filter((c) => c.selectedSubmissionId === mySubmission.id).length,
      justifications: relevant
        .filter((c) => c.justification)
        .map((c) => ({
          pickedMine: c.selectedSubmissionId === mySubmission.id,
          text: c.justification,
        })),
    };
  }

  if (atLeast("reveal")) {
    state.reveal = await buildStudentReveal(round.id, round.passageId, round.namesHidden === 1);
  }

  const [myReflection] = await db
    .select()
    .from(reflections)
    .where(and(eq(reflections.roundId, round.id), eq(reflections.studentSessionId, session.id)))
    .limit(1);
  state.reflected = !!myReflection;

  return NextResponse.json(state);
}

async function loadComparisons(roundId: string, reviewerId: string) {
  const mine = await db
    .select()
    .from(peerComparisons)
    .where(and(eq(peerComparisons.roundId, roundId), eq(peerComparisons.reviewerSessionId, reviewerId)));
  if (mine.length === 0) return [];
  const subIds = [...new Set(mine.flatMap((c) => [c.submissionAId, c.submissionBId]))];
  const subs = await db.select().from(submissions).where(inArray(submissions.id, subIds));
  const subById = new Map(subs.map((s) => [s.id, s]));
  const anon = (id: string) => {
    const s = subById.get(id);
    if (!s || s.status === "removed") return null;
    return { id: s.id, claim: s.claim, evidenceText: s.evidenceText, reasoning: s.reasoning };
  };
  return mine
    .map((c) => ({
      id: c.id,
      a: anon(c.submissionAId),
      b: anon(c.submissionBId),
      selectedSubmissionId: c.selectedSubmissionId,
      completed: !!c.completedAt,
    }))
    .filter((c) => c.a && c.b);
}

async function buildStudentReveal(roundId: string, passageId: string, namesHidden: boolean) {
  const [passage] = await db.select().from(passages).where(eq(passages.id, passageId)).limit(1);
  const subs = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.roundId, roundId), eq(submissions.status, "submitted")));
  const comparisons = await db.select().from(peerComparisons).where(eq(peerComparisons.roundId, roundId));
  const votes = new Map<string, number>();
  for (const c of comparisons) {
    if (c.selectedSubmissionId) votes.set(c.selectedSubmissionId, (votes.get(c.selectedSubmissionId) ?? 0) + 1);
  }
  const subIdList = subs.map((s) => s.id);
  const revs =
    subIdList.length > 0
      ? await db.select().from(revisions).where(inArray(revisions.submissionId, subIdList))
      : [];

  const clusters = passage
    ? clusterRanges(
        subs.map((s) => ({ id: s.id, start: s.evidenceStart, end: s.evidenceEnd, votes: votes.get(s.id) ?? 0 })),
        passage.text,
      ).slice(0, 5)
    : [];

  // Spotlights are teacher-chosen; names stay hidden unless teacher reveals.
  const spotlights = subs
    .filter((s) => s.spotlighted === 1)
    .map((s) => ({
      claim: s.claim,
      evidenceText: s.evidenceText,
      reasoning: s.reasoning,
      votes: votes.get(s.id) ?? 0,
    }));
  void namesHidden; // student reveal is always anonymous in MVP

  return {
    totalSubmissions: subs.length,
    totalVotesCast: comparisons.filter((c) => c.completedAt).length,
    totalRevised: revs.length,
    evidenceClusters: clusters.map((c) => ({ text: c.text, count: c.count, votes: c.votes })),
    spotlights,
  };
}
