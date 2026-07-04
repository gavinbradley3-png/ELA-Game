import type { RoundSettings } from "@/lib/phases";

export interface PlayRound {
  id: string;
  joinCode: string;
  phase: string;
  underlyingPhase: string;
  paused: boolean;
  phaseEndsAt: number | null;
  pausedRemainingMs: number | null;
  submissionsLocked: boolean;
  namesHidden: boolean;
  joinLocked: boolean;
  settings: RoundSettings;
}

export interface PlayAnnotation {
  id: string;
  startOffset: number;
  endOffset: number;
  text: string;
  tag: string;
}

export interface PlaySubmission {
  id: string;
  claim: string;
  reasoning: string;
  confidence: number;
  evidenceStart: number;
  evidenceEnd: number;
  evidenceText: string;
  removed: boolean;
}

export interface PlayRevision {
  claim: string;
  reasoning: string;
  evidenceStart: number;
  evidenceEnd: number;
  evidenceText: string;
  changeExplanation: string;
  keptOriginal: boolean;
}

export interface AnonSubmission {
  id: string;
  claim: string;
  evidenceText: string;
  reasoning: string;
}

export interface PlayComparison {
  id: string;
  a: AnonSubmission;
  b: AnonSubmission;
  selectedSubmissionId: string | null;
  completed: boolean;
}

export interface PeerFeedback {
  timesCompared: number;
  votesFor: number;
  justifications: { pickedMine: boolean; text: string }[];
}

export interface RevealData {
  totalSubmissions: number;
  totalVotesCast: number;
  totalRevised: number;
  evidenceClusters: { text: string; count: number; votes: number }[];
  spotlights: { claim: string; evidenceText: string; reasoning: string; votes: number }[];
}

export interface PlayState {
  round: PlayRound;
  me: { id: string; name: string };
  passage?: { title: string; text: string; vocabNotes: string | null };
  prompt?: { text: string; promptType: string };
  annotations: PlayAnnotation[];
  submission?: PlaySubmission;
  revision?: PlayRevision;
  comparisons?: PlayComparison[];
  peerFeedback?: PeerFeedback;
  reveal?: RevealData;
  reflected: boolean;
}

export async function postJson<T = Record<string, unknown>>(
  url: string,
  body: unknown,
): Promise<{ ok: boolean; data: T & { error?: string } }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  return { ok: res.ok, data };
}
