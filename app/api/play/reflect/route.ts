import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, reflections } from "@/lib/db";
import { requirePlay, readJson } from "@/lib/play";
import { newId } from "@/lib/ids";
import { clean, lengthError } from "@/lib/validate";

export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const ctx = await requirePlay(String(body.roundId ?? ""), "reflect");
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { round, session } = ctx;

  const text = clean(body.text);
  const err = lengthError(text, "reflection", "Your reflection");
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  // Atomic upsert against the (round, student) unique index.
  await db
    .insert(reflections)
    .values({
      id: newId(),
      roundId: round.id,
      studentSessionId: session.id,
      text,
      submittedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: [reflections.roundId, reflections.studentSessionId],
      set: { text, submittedAt: Date.now() },
    });
  return NextResponse.json({ ok: true });
}
