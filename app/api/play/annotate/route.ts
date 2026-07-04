import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, annotations, passages } from "@/lib/db";
import { requirePlay } from "@/lib/play";
import { newId } from "@/lib/ids";
import { parseSettings } from "@/lib/rounds";
import { TAG_BY_ID } from "@/lib/tags";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const ctx = await requirePlay(String(body.roundId ?? ""), "annotate");
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { round, session } = ctx;

  if (body.action === "remove") {
    await db
      .delete(annotations)
      .where(
        and(
          eq(annotations.id, String(body.annotationId ?? "")),
          eq(annotations.studentSessionId, session.id),
        ),
      );
    return NextResponse.json({ ok: true });
  }

  const settings = parseSettings(round);
  const start = Number(body.startOffset);
  const end = Number(body.endOffset);
  const tag = String(body.tag ?? "");

  if (!TAG_BY_ID[tag]) return NextResponse.json({ error: "Pick a tag for your highlight." }, { status: 400 });
  const [passage] = await db.select().from(passages).where(eq(passages.id, round.passageId)).limit(1);
  if (!passage) return NextResponse.json({ error: "Passage missing." }, { status: 500 });
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > passage.text.length || end <= start) {
    return NextResponse.json({ error: "That highlight doesn't line up with the text. Try again." }, { status: 400 });
  }
  const text = passage.text.slice(start, end);
  if (text.trim().length < 3) {
    return NextResponse.json({ error: "Highlight at least a few words." }, { status: 400 });
  }
  if (end - start > settings.maxHighlightChars) {
    return NextResponse.json(
      { error: "That's most of a paragraph, not a highlight. Zero in on the words that matter." },
      { status: 400 },
    );
  }
  const mine = await db
    .select({ id: annotations.id })
    .from(annotations)
    .where(and(eq(annotations.roundId, round.id), eq(annotations.studentSessionId, session.id)));
  if (mine.length >= settings.maxAnnotations) {
    return NextResponse.json(
      { error: `Highlight limit reached (${settings.maxAnnotations}). Delete one that matters less.` },
      { status: 400 },
    );
  }

  const id = newId();
  await db.insert(annotations).values({
    id,
    roundId: round.id,
    studentSessionId: session.id,
    startOffset: start,
    endOffset: end,
    text,
    tag,
    note: null,
    createdAt: Date.now(),
  });
  return NextResponse.json({ ok: true, id });
}
