import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db, studentSessions, gameRounds, type StudentSession, type GameRound } from "@/lib/db";

/**
 * Student identity per DESIGN.md §12: no accounts, no emails. A student joins
 * a round with a nickname; the browser holds a per-round session token cookie
 * so refresh/reconnect returns them to the current phase with work intact.
 */

function cookieName(roundId: string): string {
  return `receipts_student_${roundId}`;
}

export async function setStudentCookie(roundId: string, sessionId: string, token: string) {
  const store = await cookies();
  store.set(cookieName(roundId), `${sessionId}.${token}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 60 * 60, // one school day is plenty
  });
}

export async function getStudentSession(roundId: string): Promise<StudentSession | null> {
  const store = await cookies();
  const value = store.get(cookieName(roundId))?.value;
  if (!value) return null;
  const dot = value.indexOf(".");
  if (dot === -1) return null;
  const sessionId = value.slice(0, dot);
  const token = value.slice(dot + 1);
  const rows = await db
    .select()
    .from(studentSessions)
    .where(and(eq(studentSessions.id, sessionId), eq(studentSessions.roundId, roundId)))
    .limit(1);
  const session = rows[0];
  if (!session || session.sessionToken !== token || session.status === "removed") return null;
  return session;
}

export async function getRoundByCode(code: string): Promise<GameRound | null> {
  const rows = await db.select().from(gameRounds).where(eq(gameRounds.joinCode, code)).limit(1);
  return rows[0] ?? null;
}

export async function touchStudentSession(sessionId: string) {
  await db
    .update(studentSessions)
    .set({ lastSeenAt: Date.now() })
    .where(eq(studentSessions.id, sessionId));
}
