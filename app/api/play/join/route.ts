import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, studentSessions } from "@/lib/db";
import { newId, newToken, normalizeJoinCode } from "@/lib/ids";
import { getRoundByCode, getStudentSession, setStudentCookie } from "@/lib/student";
import { clean, nicknameError } from "@/lib/validate";
import { isActivePhase } from "@/lib/phases";
import { readJson } from "@/lib/play";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export async function POST(req: Request) {
  // A whole school can sit behind one NAT IP, so this must never touch
  // legitimate classes (even two joining back-to-back) — only scripted floods.
  if (!rateLimit(`join:${clientIp(req)}`, 240, 60_000)) {
    return NextResponse.json({ error: "Too many join attempts. Wait a minute." }, { status: 429 });
  }
  const body = await readJson(req);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const code = normalizeJoinCode(String(body.code ?? ""));
  const name = clean(body.name);

  const round = code ? await getRoundByCode(code) : null;
  if (!round || !isActivePhase(round.phase)) {
    return NextResponse.json({ error: "No live game with that code. Check the board and try again." }, { status: 404 });
  }

  // Rejoin: same browser already has a session for this round.
  const existing = await getStudentSession(round.id);
  if (existing) {
    return NextResponse.json({ roundId: round.id, name: existing.displayName, rejoined: true });
  }

  if (round.joinLocked === 1) {
    return NextResponse.json(
      { error: "This round is locked. Ask your teacher to unlock joining." },
      { status: 403 },
    );
  }
  const nameErr = nicknameError(name);
  if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 });

  // De-duplicate display names within the round: "Sam" → "Sam 2".
  const peers = await db
    .select({ displayName: studentSessions.displayName })
    .from(studentSessions)
    .where(and(eq(studentSessions.roundId, round.id), eq(studentSessions.status, "active")));
  const taken = new Set(peers.map((p) => p.displayName.toLowerCase()));
  let displayName = name;
  for (let n = 2; taken.has(displayName.toLowerCase()); n++) {
    displayName = `${name} ${n}`;
  }

  const id = newId();
  const token = newToken();
  await db.insert(studentSessions).values({
    id,
    roundId: round.id,
    displayName,
    sessionToken: token,
    status: "active",
    joinedAt: Date.now(),
    lastSeenAt: Date.now(),
  });
  await setStudentCookie(round.id, id, token);
  return NextResponse.json({ roundId: round.id, name: displayName, rejoined: false });
}
