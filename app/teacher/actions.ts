"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, classes, passages, prompts, gameRounds } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { newId, newJoinCode } from "@/lib/ids";
import { clean } from "@/lib/validate";
import { DEFAULT_SETTINGS, type RoundSettings } from "@/lib/phases";

export async function createClass(formData: FormData) {
  const teacher = await requireTeacher();
  const name = clean(formData.get("name"));
  const grade = clean(formData.get("grade"));
  if (name.length < 1) redirect("/teacher/classes?error=Class needs a name.");
  await db.insert(classes).values({
    id: newId(),
    teacherId: teacher.id,
    name,
    grade: grade || null,
    createdAt: Date.now(),
  });
  revalidatePath("/teacher/classes");
  redirect("/teacher/classes");
}

export async function archiveClass(formData: FormData) {
  const teacher = await requireTeacher();
  const id = String(formData.get("id"));
  await db
    .update(classes)
    .set({ archived: 1 })
    .where(and(eq(classes.id, id), eq(classes.teacherId, teacher.id)));
  revalidatePath("/teacher/classes");
  redirect("/teacher/classes");
}

function passageFields(formData: FormData) {
  return {
    title: clean(formData.get("title")),
    text: String(formData.get("text") ?? "").replace(/\r\n/g, "\n").trim(),
    source: clean(formData.get("source")) || null,
    gradeLevel: clean(formData.get("gradeLevel")) || null,
    genre: clean(formData.get("genre")) || null,
    readingTimeMinutes: Number(formData.get("readingTimeMinutes")) || null,
    vocabNotes: String(formData.get("vocabNotes") ?? "").trim() || null,
    teacherNotes: String(formData.get("teacherNotes") ?? "").trim() || null,
  };
}

export async function createPassage(formData: FormData) {
  const teacher = await requireTeacher();
  const fields = passageFields(formData);
  if (fields.title.length < 1) redirect("/teacher/passages/new?error=Passage needs a title.");
  if (fields.text.length < 100)
    redirect("/teacher/passages/new?error=Passage text looks too short to run a round (minimum 100 characters).");
  const id = newId();
  await db.insert(passages).values({
    id,
    teacherId: teacher.id,
    ...fields,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  revalidatePath("/teacher/passages");
  redirect(`/teacher/passages/${id}`);
}

export async function updatePassage(formData: FormData) {
  const teacher = await requireTeacher();
  const id = String(formData.get("id"));
  const fields = passageFields(formData);
  if (fields.title.length < 1 || fields.text.length < 100)
    redirect(`/teacher/passages/${id}?error=Title and passage text (100+ characters) are required.`);
  await db
    .update(passages)
    .set({ ...fields, updatedAt: Date.now() })
    .where(and(eq(passages.id, id), eq(passages.teacherId, teacher.id)));
  revalidatePath(`/teacher/passages/${id}`);
  redirect(`/teacher/passages/${id}?saved=1`);
}

export async function archivePassage(formData: FormData) {
  const teacher = await requireTeacher();
  const id = String(formData.get("id"));
  await db
    .update(passages)
    .set({ archived: 1 })
    .where(and(eq(passages.id, id), eq(passages.teacherId, teacher.id)));
  revalidatePath("/teacher/passages");
  redirect("/teacher/passages");
}

export async function createPrompt(formData: FormData) {
  const teacher = await requireTeacher();
  const passageId = String(formData.get("passageId"));
  const text = clean(formData.get("text"));
  const promptType = clean(formData.get("promptType"));
  const focusSkill = clean(formData.get("focusSkill"));
  // Ownership check: prompts hang off the teacher's passage.
  const owned = await db
    .select({ id: passages.id })
    .from(passages)
    .where(and(eq(passages.id, passageId), eq(passages.teacherId, teacher.id)))
    .limit(1);
  if (owned.length === 0) redirect("/teacher/passages");
  if (text.length < 15)
    redirect(`/teacher/passages/${passageId}?error=A challenge prompt needs to be a real question (15+ characters).`);
  await db.insert(prompts).values({
    id: newId(),
    passageId,
    text,
    promptType: promptType || "Best evidence",
    focusSkill: focusSkill || null,
    suggestedTags: null,
    createdAt: Date.now(),
  });
  revalidatePath(`/teacher/passages/${passageId}`);
  redirect(`/teacher/passages/${passageId}`);
}

export async function deletePrompt(formData: FormData) {
  const teacher = await requireTeacher();
  const id = String(formData.get("id"));
  const passageId = String(formData.get("passageId"));
  const owned = await db
    .select({ id: passages.id })
    .from(passages)
    .where(and(eq(passages.id, passageId), eq(passages.teacherId, teacher.id)))
    .limit(1);
  if (owned.length > 0) {
    await db.delete(prompts).where(and(eq(prompts.id, id), eq(prompts.passageId, passageId)));
  }
  revalidatePath(`/teacher/passages/${passageId}`);
  redirect(`/teacher/passages/${passageId}`);
}

export async function createRound(formData: FormData) {
  const teacher = await requireTeacher();
  const classId = String(formData.get("classId"));
  const passageId = String(formData.get("passageId"));
  const promptId = String(formData.get("promptId"));

  const [klass] = await db
    .select()
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.teacherId, teacher.id)))
    .limit(1);
  const [passage] = await db
    .select()
    .from(passages)
    .where(and(eq(passages.id, passageId), eq(passages.teacherId, teacher.id)))
    .limit(1);
  const [prompt] = await db
    .select()
    .from(prompts)
    .where(and(eq(prompts.id, promptId), eq(prompts.passageId, passageId)))
    .limit(1);
  if (!klass || !passage || !prompt)
    redirect("/teacher/rounds/new?error=Pick a class, a passage, and one of its prompts.");

  const settings: RoundSettings = {
    ...DEFAULT_SETTINGS,
    readingSeconds: clampSeconds(formData.get("readingMinutes"), DEFAULT_SETTINGS.readingSeconds),
    annotatingSeconds: clampSeconds(formData.get("annotatingMinutes"), DEFAULT_SETTINGS.annotatingSeconds),
    submittingSeconds: clampSeconds(formData.get("submittingMinutes"), DEFAULT_SETTINGS.submittingSeconds),
    reviewSeconds: clampSeconds(formData.get("reviewMinutes"), DEFAULT_SETTINGS.reviewSeconds),
    revisingSeconds: clampSeconds(formData.get("revisingMinutes"), DEFAULT_SETTINGS.revisingSeconds),
  };

  // Retry a couple of times in the unlikely event of a join-code collision
  // with another active round.
  let joinCode = newJoinCode();
  for (let i = 0; i < 5; i++) {
    const clash = await db
      .select({ id: gameRounds.id })
      .from(gameRounds)
      .where(eq(gameRounds.joinCode, joinCode))
      .limit(1);
    if (clash.length === 0) break;
    joinCode = newJoinCode();
  }

  const id = newId();
  await db.insert(gameRounds).values({
    id,
    teacherId: teacher.id,
    classId,
    passageId,
    promptId,
    joinCode,
    phase: "lobby",
    namesHidden: formData.get("namesHidden") === "on" ? 1 : 0,
    settings: JSON.stringify(settings),
    createdAt: Date.now(),
    startedAt: Date.now(),
  });
  redirect(`/teacher/rounds/${id}/control`);
}

function clampSeconds(minutesValue: FormDataEntryValue | null, fallback: number): number {
  const minutes = Number(minutesValue);
  if (!Number.isFinite(minutes) || minutes <= 0) return fallback;
  return Math.min(30, Math.max(1, Math.round(minutes))) * 60;
}
