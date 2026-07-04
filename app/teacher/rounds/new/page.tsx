import { and, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { db, classes, passages, prompts } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { createRound } from "../../actions";
import { RoundSetupForm } from "./setup-form";

export default async function NewRoundPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; passageId?: string }>;
}) {
  const teacher = await requireTeacher();
  const { error, passageId } = await searchParams;

  const classList = await db
    .select()
    .from(classes)
    .where(and(eq(classes.teacherId, teacher.id), eq(classes.archived, 0)));
  const passageList = await db
    .select({ id: passages.id, title: passages.title })
    .from(passages)
    .where(and(eq(passages.teacherId, teacher.id), eq(passages.archived, 0)));
  const promptList =
    passageList.length > 0
      ? await db
          .select({ id: prompts.id, passageId: prompts.passageId, text: prompts.text, promptType: prompts.promptType })
          .from(prompts)
          .where(inArray(prompts.passageId, passageList.map((p) => p.id)))
      : [];

  const missing: string[] = [];
  if (classList.length === 0) missing.push("a class");
  if (passageList.length === 0) missing.push("a passage");
  if (passageList.length > 0 && promptList.length === 0) missing.push("a challenge prompt on one of your passages");

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 font-serif text-3xl font-bold">Launch a live round</h1>
      <p className="mb-6 text-ink-500">Evidence Battle · target setup time: under 3 minutes.</p>
      {error && <p className="mb-4 rounded-lg bg-rose-100 px-4 py-3 text-sm text-rose-900">{error}</p>}
      {missing.length > 0 ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm">
          You still need {missing.join(", ")}.{" "}
          <Link href="/teacher/classes" className="underline">Classes</Link> ·{" "}
          <Link href="/teacher/passages" className="underline">Passages</Link>
        </div>
      ) : (
        <RoundSetupForm
          action={createRound}
          classes={classList.map((c) => ({ id: c.id, name: c.name }))}
          passages={passageList}
          prompts={promptList}
          initialPassageId={passageId}
        />
      )}
    </div>
  );
}
