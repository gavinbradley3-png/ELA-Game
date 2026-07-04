import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  gameRounds,
  studentSessions,
  submissions,
  annotations,
  peerComparisons,
  revisions,
  reflections,
  passages,
  prompts,
  type GameRound,
  type Submission,
} from "@/lib/db";
import { newId } from "@/lib/ids";
import { nextPhase, phaseTimerSeconds, type RoundSettings, DEFAULT_SETTINGS } from "@/lib/phases";
import { restatesEvidence, tokenOverlap } from "@/lib/validate";

export function parseSettings(round: GameRound): RoundSettings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(round.settings) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function getTeacherRound(roundId: string, teacherId: string): Promise<GameRound | null> {
  const rows = await db
    .select()
    .from(gameRounds)
    .where(and(eq(gameRounds.id, roundId), eq(gameRounds.teacherId, teacherId)))
    .limit(1);
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Phase transitions (server-authoritative, teacher-driven — DESIGN.md §31)
// ---------------------------------------------------------------------------

export async function advanceRound(round: GameRound): Promise<{ phase: string } | { error: string }> {
  if (round.pausedFromPhase) return { error: "Round is paused. Resume before advancing." };
  const next = nextPhase(round.phase);
  if (!next) return { error: "Round is already complete." };
  return enterPhase(round, next);
}

export async function enterPhase(round: GameRound, phase: string): Promise<{ phase: string } | { error: string }> {
  const settings = parseSettings(round);

  if (phase === "peer_review") {
    const generated = await generateComparisons(round, settings);
    if ("error" in generated) return generated;
  }

  const timerSeconds = phaseTimerSeconds(phase, settings);
  await db
    .update(gameRounds)
    .set({
      phase,
      pausedFromPhase: null,
      pausedRemainingMs: null,
      phaseEndsAt: timerSeconds ? Date.now() + timerSeconds * 1000 : null,
      // Leaving the lobby locks the join code to new (non-rejoining) students
      // only when the teacher chose to; late joiners land in the current phase.
      submissionsLocked: phase === "submitting" ? 0 : round.submissionsLocked,
      endedAt: phase === "complete" ? Date.now() : round.endedAt,
    })
    .where(eq(gameRounds.id, round.id));
  return { phase };
}

export async function pauseRound(round: GameRound): Promise<{ error?: string }> {
  if (round.pausedFromPhase) return { error: "Already paused." };
  if (round.phase === "complete" || round.phase === "cancelled") return { error: "Round is over." };
  const remaining = round.phaseEndsAt ? Math.max(0, round.phaseEndsAt - Date.now()) : null;
  await db
    .update(gameRounds)
    .set({ pausedFromPhase: round.phase, pausedRemainingMs: remaining, phaseEndsAt: null })
    .where(eq(gameRounds.id, round.id));
  return {};
}

export async function resumeRound(round: GameRound): Promise<{ error?: string }> {
  if (!round.pausedFromPhase) return { error: "Round is not paused." };
  await db
    .update(gameRounds)
    .set({
      pausedFromPhase: null,
      pausedRemainingMs: null,
      phaseEndsAt: round.pausedRemainingMs != null ? Date.now() + round.pausedRemainingMs : null,
    })
    .where(eq(gameRounds.id, round.id));
  return {};
}

export async function adjustTimer(round: GameRound, deltaSeconds: number): Promise<void> {
  if (round.pausedFromPhase) {
    const base = round.pausedRemainingMs ?? 0;
    await db
      .update(gameRounds)
      .set({ pausedRemainingMs: Math.max(0, base + deltaSeconds * 1000) })
      .where(eq(gameRounds.id, round.id));
    return;
  }
  const base = round.phaseEndsAt ?? Date.now();
  await db
    .update(gameRounds)
    .set({ phaseEndsAt: Math.max(Date.now(), base + deltaSeconds * 1000) })
    .where(eq(gameRounds.id, round.id));
}

// ---------------------------------------------------------------------------
// Peer comparison assignment (DESIGN.md §18)
// ---------------------------------------------------------------------------

/**
 * Assigns each active student up to `comparisonsPerStudent` anonymous
 * side-by-side comparisons. Rules: never your own submission, balance how
 * often each submission is shown, avoid repeating a pair for one reviewer.
 * Requires at least 3 usable submissions so that authors always have two
 * foreign submissions to compare.
 */
export async function generateComparisons(
  round: GameRound,
  settings: RoundSettings,
): Promise<{ ok: true } | { error: string }> {
  const existing = await db
    .select({ id: peerComparisons.id })
    .from(peerComparisons)
    .where(eq(peerComparisons.roundId, round.id))
    .limit(1);
  if (existing.length > 0) return { ok: true }; // already generated (re-entry after pause etc.)

  const subs = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.roundId, round.id), eq(submissions.status, "submitted")));
  if (subs.length < 3) {
    return {
      error: `Peer review needs at least 3 submissions (you have ${subs.length}). Wait for more submissions or skip ahead.`,
    };
  }
  const students = await db
    .select()
    .from(studentSessions)
    .where(and(eq(studentSessions.roundId, round.id), eq(studentSessions.status, "active")));

  const shownCount = new Map<string, number>(subs.map((s) => [s.id, 0]));
  const rows: (typeof peerComparisons.$inferInsert)[] = [];

  for (const student of students) {
    const eligible = subs.filter((s) => s.studentSessionId !== student.id);
    if (eligible.length < 2) continue;
    const seenPairs = new Set<string>();
    for (let k = 0; k < settings.comparisonsPerStudent; k++) {
      // Pick the two least-shown eligible submissions, shuffled for tie-breaks.
      const ranked = shuffle(eligible).sort(
        (a, b) => (shownCount.get(a.id) ?? 0) - (shownCount.get(b.id) ?? 0),
      );
      let a = ranked[0];
      let b = ranked.find((s) => s.id !== a.id && !seenPairs.has(pairKey(a.id, s.id)));
      if (!b) b = ranked.find((s) => s.id !== a.id);
      if (!b) break;
      seenPairs.add(pairKey(a.id, b.id));
      shownCount.set(a.id, (shownCount.get(a.id) ?? 0) + 1);
      shownCount.set(b.id, (shownCount.get(b.id) ?? 0) + 1);
      if (Math.random() < 0.5) [a, b] = [b, a];
      rows.push({
        id: newId(),
        roundId: round.id,
        reviewerSessionId: student.id,
        submissionAId: a.id,
        submissionBId: b.id,
        createdAt: Date.now(),
      });
    }
  }
  if (rows.length === 0) return { error: "Could not assign any peer comparisons." };
  await db.insert(peerComparisons).values(rows);
  return { ok: true };
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------------------------------------------------------------------------
// Aggregation for dashboard + reveal (DESIGN.md §14)
// ---------------------------------------------------------------------------

export interface EvidenceCluster {
  start: number;
  end: number;
  text: string;
  count: number;
  votes: number;
  submissionIds: string[];
}

export interface SubmissionFlags {
  shortReasoning: boolean;
  restatesEvidence: boolean;
}

export function submissionFlags(sub: Pick<Submission, "reasoning" | "evidenceText">): SubmissionFlags {
  return {
    shortReasoning: sub.reasoning.length < 80,
    restatesEvidence: restatesEvidence(sub.reasoning, sub.evidenceText),
  };
}

/** Groups overlapping evidence ranges into clusters over the passage text. */
export function clusterRanges(
  items: { id: string; start: number; end: number; votes?: number }[],
  passageText: string,
): EvidenceCluster[] {
  const sorted = [...items].sort((a, b) => a.start - b.start);
  const clusters: EvidenceCluster[] = [];
  for (const item of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && item.start < last.end) {
      last.end = Math.max(last.end, item.end);
      last.count++;
      last.votes += item.votes ?? 0;
      last.submissionIds.push(item.id);
    } else {
      clusters.push({
        start: item.start,
        end: item.end,
        text: "",
        count: 1,
        votes: item.votes ?? 0,
        submissionIds: [item.id],
      });
    }
  }
  for (const c of clusters) {
    c.text = snippet(passageText, c.start, c.end);
  }
  return clusters.sort((a, b) => b.count - a.count);
}

function snippet(text: string, start: number, end: number, max = 220): string {
  const s = text.slice(start, end).replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max) + "…" : s;
}

/** Whether a revision meaningfully changed the original work. */
export function revisionImproved(
  original: { claim: string; reasoning: string; evidenceStart: number; evidenceEnd: number },
  revised: {
    revisedClaim: string;
    revisedReasoning: string;
    revisedEvidenceStart: number;
    revisedEvidenceEnd: number;
  },
): boolean {
  const evidenceChanged =
    original.evidenceStart !== revised.revisedEvidenceStart ||
    original.evidenceEnd !== revised.revisedEvidenceEnd;
  const reasoningChanged = tokenOverlap(original.reasoning, revised.revisedReasoning) < 0.85;
  const claimChanged = tokenOverlap(original.claim, revised.revisedClaim) < 0.85;
  const grew = revised.revisedReasoning.length > original.reasoning.length * 1.15;
  return evidenceChanged || reasoningChanged || claimChanged || grew;
}

/** Full data bundle for the teacher control panel / dashboard. */
export async function buildTeacherStatus(round: GameRound) {
  const [passage] = await db.select().from(passages).where(eq(passages.id, round.passageId)).limit(1);
  const [prompt] = await db.select().from(prompts).where(eq(prompts.id, round.promptId)).limit(1);
  const students = await db.select().from(studentSessions).where(eq(studentSessions.roundId, round.id));
  const subs = await db.select().from(submissions).where(eq(submissions.roundId, round.id));
  const annos = await db.select().from(annotations).where(eq(annotations.roundId, round.id));
  const comparisons = await db.select().from(peerComparisons).where(eq(peerComparisons.roundId, round.id));
  const refls = await db.select().from(reflections).where(eq(reflections.roundId, round.id));

  // revisions has no roundId column; fetch via the round's submission ids.
  const subIdList = subs.map((s) => s.id);
  const roundRevisions =
    subIdList.length > 0
      ? await db.select().from(revisions).where(inArray(revisions.submissionId, subIdList))
      : [];

  const votesBySubmission = new Map<string, number>();
  for (const c of comparisons) {
    if (c.selectedSubmissionId) {
      votesBySubmission.set(c.selectedSubmissionId, (votesBySubmission.get(c.selectedSubmissionId) ?? 0) + 1);
    }
  }
  const revisionBySubmission = new Map(roundRevisions.map((r) => [r.submissionId, r]));
  const studentById = new Map(students.map((s) => [s.id, s]));

  const activeSubs = subs.filter((s) => s.status === "submitted");
  const evidenceClusters = passage
    ? clusterRanges(
        activeSubs.map((s) => ({
          id: s.id,
          start: s.evidenceStart,
          end: s.evidenceEnd,
          votes: votesBySubmission.get(s.id) ?? 0,
        })),
        passage.text,
      )
    : [];
  const annotationClusters = passage
    ? clusterRanges(
        annos.map((a) => ({ id: a.id, start: a.startOffset, end: a.endOffset })),
        passage.text,
      ).slice(0, 8)
    : [];

  const submissionViews = subs.map((s) => {
    const rev = revisionBySubmission.get(s.id);
    const flags = submissionFlags(s);
    return {
      id: s.id,
      studentSessionId: s.studentSessionId,
      studentName: studentById.get(s.studentSessionId)?.displayName ?? "Unknown",
      claim: s.claim,
      reasoning: s.reasoning,
      confidence: s.confidence,
      evidenceText: s.evidenceText,
      evidenceStart: s.evidenceStart,
      evidenceEnd: s.evidenceEnd,
      status: s.status,
      spotlighted: s.spotlighted === 1,
      votes: votesBySubmission.get(s.id) ?? 0,
      flags,
      revision: rev
        ? {
            claim: rev.revisedClaim,
            reasoning: rev.revisedReasoning,
            evidenceText: rev.revisedEvidenceText,
            changeExplanation: rev.changeExplanation,
            keptOriginal: rev.keptOriginal === 1,
            improved: revisionImproved(s, rev),
          }
        : null,
    };
  });

  const comparisonsByReviewer = new Map<string, { assigned: number; done: number }>();
  for (const c of comparisons) {
    const entry = comparisonsByReviewer.get(c.reviewerSessionId) ?? { assigned: 0, done: 0 };
    entry.assigned++;
    if (c.completedAt) entry.done++;
    comparisonsByReviewer.set(c.reviewerSessionId, entry);
  }
  const annotationCountByStudent = new Map<string, number>();
  for (const a of annos) {
    annotationCountByStudent.set(a.studentSessionId, (annotationCountByStudent.get(a.studentSessionId) ?? 0) + 1);
  }
  const reflectionByStudent = new Set(refls.map((r) => r.studentSessionId));
  const submissionByStudent = new Map(subs.map((s) => [s.studentSessionId, s]));

  const studentViews = students.map((s) => {
    const sub = submissionByStudent.get(s.id);
    const rev = sub ? revisionBySubmission.get(sub.id) : undefined;
    const reviews = comparisonsByReviewer.get(s.id) ?? { assigned: 0, done: 0 };
    return {
      id: s.id,
      displayName: s.displayName,
      status: s.status,
      joinedAt: s.joinedAt,
      lastSeenAt: s.lastSeenAt,
      annotationCount: annotationCountByStudent.get(s.id) ?? 0,
      hasSubmitted: !!sub && sub.status === "submitted",
      reviewsAssigned: reviews.assigned,
      reviewsDone: reviews.done,
      hasRevised: !!rev,
      revisionImproved: sub && rev ? revisionImproved(sub, rev) : false,
      hasReflected: reflectionByStudent.has(s.id),
    };
  });

  const justifications = comparisons
    .filter((c) => c.completedAt && c.justification)
    .map((c) => ({
      reviewerName: studentById.get(c.reviewerSessionId)?.displayName ?? "Unknown",
      justification: c.justification!,
      criteria: safeParseArray(c.criteriaUsed),
    }));

  return {
    round: publicRoundState(round),
    passage: passage ? { id: passage.id, title: passage.title, text: passage.text } : null,
    prompt: prompt ? { id: prompt.id, text: prompt.text, promptType: prompt.promptType } : null,
    students: studentViews,
    submissions: submissionViews,
    evidenceClusters,
    annotationClusters,
    justifications,
    reflections: refls.map((r) => ({
      studentName: studentById.get(r.studentSessionId)?.displayName ?? "Unknown",
      text: r.text,
    })),
    counts: {
      joined: students.filter((s) => s.status === "active").length,
      submitted: activeSubs.length,
      reviewed: comparisons.filter((c) => c.completedAt).length,
      reviewsAssigned: comparisons.length,
      revised: roundRevisions.length,
      reflected: refls.length,
      improved: submissionViews.filter((v) => v.revision?.improved).length,
      flagged: submissionViews.filter(
        (v) => v.status === "submitted" && (v.flags.shortReasoning || v.flags.restatesEvidence),
      ).length,
    },
  };
}

export type TeacherStatus = Awaited<ReturnType<typeof buildTeacherStatus>>;

function safeParseArray(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function publicRoundState(round: GameRound) {
  return {
    id: round.id,
    joinCode: round.joinCode,
    phase: round.pausedFromPhase ? "paused" : round.phase,
    underlyingPhase: round.pausedFromPhase ?? round.phase,
    paused: !!round.pausedFromPhase,
    phaseEndsAt: round.pausedFromPhase ? null : round.phaseEndsAt,
    pausedRemainingMs: round.pausedRemainingMs,
    submissionsLocked: round.submissionsLocked === 1,
    namesHidden: round.namesHidden === 1,
    joinLocked: round.joinLocked === 1,
    settings: parseSettings(round),
  };
}
