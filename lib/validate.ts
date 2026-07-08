/**
 * Anti-garbage safeguards per DESIGN.md §24: minimum-effort validation that
 * blocks blank or throwaway work without punishing genuine attempts.
 */

export const LIMITS = {
  claim: { min: 10, max: 300 },
  reasoning: { min: 40, max: 1200 },
  evidence: { min: 3, max: 400 },
  justification: { min: 25, max: 800 },
  changeExplanation: { min: 20, max: 600 },
  reflection: { min: 15, max: 600 },
  nickname: { min: 2, max: 24 },
};

export function clean(input: unknown): string {
  return typeof input === "string" ? input.replace(/\s+/g, " ").trim() : "";
}

export function lengthError(
  value: string,
  field: keyof typeof LIMITS,
  label: string,
): string | null {
  const { min, max } = LIMITS[field];
  if (value.length < min) return `${label} needs at least ${min} characters. Say more about your thinking.`;
  if (value.length > max) return `${label} must be under ${max} characters. Tighten it up.`;
  return null;
}

/** Detects reasoning that mostly restates the quote instead of explaining it. */
export function restatesEvidence(reasoning: string, evidence: string): boolean {
  const r = normalizeWords(reasoning);
  const e = new Set(normalizeWords(evidence));
  if (r.length === 0 || e.size === 0) return false;
  const overlap = r.filter((w) => e.has(w)).length / r.length;
  return overlap > 0.8;
}

/** Detects a "revision" that changed nothing meaningful. */
export function meaningfullyDifferent(before: string, after: string): boolean {
  const a = normalizeWords(before).join(" ");
  const b = normalizeWords(after).join(" ");
  return a !== b;
}

/** Rough token-overlap ratio (0..1) used for improvement heuristics. */
export function tokenOverlap(a: string, b: string): number {
  const wa = new Set(normalizeWords(a));
  const wb = new Set(normalizeWords(b));
  if (wa.size === 0 && wb.size === 0) return 1;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared / Math.max(wa.size, wb.size);
}

function normalizeWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

const NICKNAME_BLOCKLIST = [
  // Obvious junk and slur-adjacent patterns; teachers can also remove any name live.
  /fuck|shit|bitch|cunt|nigg|fag|dick|penis|vagina|porn|sex|hitler|kys|retard/i,
];

export function nicknameError(name: string): string | null {
  if (name.length < LIMITS.nickname.min) return "Name is too short.";
  if (name.length > LIMITS.nickname.max) return "Name is too long.";
  if (!/^[\p{L}\p{N} .'-]+$/u.test(name)) return "Use letters and numbers only.";
  if (NICKNAME_BLOCKLIST.some((re) => re.test(name))) return "Pick a different name.";
  return null;
}
