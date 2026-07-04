/**
 * Live round state machine per DESIGN.md §31.
 * Phase changes are server-authoritative: the teacher drives transitions and
 * every student action is validated against the round's current phase.
 */

export const PHASE_ORDER = [
  "lobby",
  "reading",
  "annotating",
  "prompt",
  "submitting",
  "peer_review",
  "revising",
  "reveal",
  "reflection",
  "complete",
] as const;

export type Phase = (typeof PHASE_ORDER)[number] | "paused" | "cancelled";

export const PHASE_LABELS: Record<string, string> = {
  lobby: "Lobby",
  reading: "Reading",
  annotating: "Annotating",
  prompt: "Challenge Prompt",
  submitting: "Submitting",
  peer_review: "Peer Review",
  revising: "Revising",
  reveal: "Reveal",
  reflection: "Reflection",
  complete: "Complete",
  paused: "Paused",
  cancelled: "Cancelled",
};

export function nextPhase(current: string): string | null {
  const i = PHASE_ORDER.indexOf(current as (typeof PHASE_ORDER)[number]);
  if (i === -1 || i === PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[i + 1];
}

export function prevPhase(current: string): string | null {
  const i = PHASE_ORDER.indexOf(current as (typeof PHASE_ORDER)[number]);
  if (i <= 0) return null;
  return PHASE_ORDER[i - 1];
}

export function isActivePhase(phase: string): boolean {
  return phase !== "complete" && phase !== "cancelled";
}

/** Which student write-action is allowed in which phase. */
export const PHASE_ACTIONS: Record<string, string[]> = {
  annotating: ["annotate"],
  // Evidence selection continues to be possible while submitting.
  submitting: ["annotate", "submit"],
  peer_review: ["review"],
  revising: ["revise"],
  reflection: ["reflect"],
};

export function actionAllowed(phase: string, action: string): boolean {
  return PHASE_ACTIONS[phase]?.includes(action) ?? false;
}

export interface RoundSettings {
  readingSeconds: number;
  annotatingSeconds: number;
  submittingSeconds: number;
  reviewSeconds: number;
  revisingSeconds: number;
  reflectionSeconds: number;
  maxAnnotations: number;
  maxHighlightChars: number;
  comparisonsPerStudent: number;
}

export const DEFAULT_SETTINGS: RoundSettings = {
  readingSeconds: 6 * 60,
  annotatingSeconds: 5 * 60,
  submittingSeconds: 8 * 60,
  reviewSeconds: 6 * 60,
  revisingSeconds: 6 * 60,
  reflectionSeconds: 3 * 60,
  maxAnnotations: 8,
  maxHighlightChars: 320,
  comparisonsPerStudent: 2,
};

/** Default timer (seconds) applied when a phase begins; null = untimed phase. */
export function phaseTimerSeconds(phase: string, settings: RoundSettings): number | null {
  switch (phase) {
    case "reading":
      return settings.readingSeconds;
    case "annotating":
      return settings.annotatingSeconds;
    case "submitting":
      return settings.submittingSeconds;
    case "peer_review":
      return settings.reviewSeconds;
    case "revising":
      return settings.revisingSeconds;
    case "reflection":
      return settings.reflectionSeconds;
    default:
      return null;
  }
}
