import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, reflections } from "@/lib/db";
import { requirePlay } from "@/lib/play";
import { newId } from "@/lib/ids";
import { clean, lengthError } from "@/lib/validate";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const ctx = await requirePlay(String(body.roundId ?? ""), "reflect");
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { round, session } = ctx;

  const text = clean(body.text);
  const err = lengthError(text, "reflection", "Your reflection");
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const [existing] = await db
    .select()
    .from(reflections)
    .where(and(eq(reflections.roundId, round.id), eq(reflections.studentSessionId, session.id)))
    .limit(1);
  if (existing) {
    await db.update(reflections).set({ text, submittedAt: Date.now() }).where(eq(reflections.id, existing.id));
    return NextResponse.json({ ok: true });
  }
  await db.insert(reflections).values({
    id: newId(),
    roundId: round.id,
    studentSessionId: session.id,
    text,
    submittedAt: Date.now(),
  });
  return NextResponse.json({ ok: true });
}
