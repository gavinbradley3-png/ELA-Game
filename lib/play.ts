import { eq } from "drizzle-orm";
import { db, gameRounds, type GameRound, type StudentSession } from "@/lib/db";
import { getStudentSession } from "@/lib/student";
import { actionAllowed } from "@/lib/phases";

export type PlayContext =
  | { ok: true; round: GameRound; session: StudentSession }
  | { ok: false; status: number; error: string };

const MAX_BODY_BYTES = 64 * 1024;

/** Parses a JSON body with a hard size cap so oversized payloads die early. */
export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY_BYTES) return null;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return null;
    const parsed = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Validates a student write action against the server-side round phase.
 * Every student mutation goes through this gate (DESIGN.md §31).
 */
export async function requirePlay(roundId: string, action: string): Promise<PlayContext> {
  const [round] = await db.select().from(gameRounds).where(eq(gameRounds.id, roundId)).limit(1);
  if (!round) return { ok: false, status: 404, error: "Round not found." };
  const session = await getStudentSession(round.id);
  if (!session) return { ok: false, status: 401, error: "You're not in this round anymore." };
  if (round.pausedFromPhase) {
    return { ok: false, status: 409, error: "The game is paused. Hang tight." };
  }
  if (!actionAllowed(round.phase, action)) {
    return { ok: false, status: 409, error: "That part of the round is closed right now." };
  }
  return { ok: true, round, session };
}
