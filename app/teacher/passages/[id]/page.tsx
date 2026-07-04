import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db, passages, prompts } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { PROMPT_TYPES } from "@/lib/tags";
import { updatePassage, archivePassage, createPrompt, deletePrompt } from "../../actions";
import { PassageFormFields } from "../passage-form";

export default async function PassageDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const teacher = await requireTeacher();
  const { id } = await params;
  const { error, saved } = await searchParams;
  const [passage] = await db
    .select()
    .from(passages)
    .where(and(eq(passages.id, id), eq(passages.teacherId, teacher.id)))
    .limit(1);
  if (!passage) notFound();
  const promptList = await db.select().from(prompts).where(eq(prompts.passageId, id));

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl font-bold">{passage.title}</h1>
        <Link
          href={`/teacher/rounds/new?passageId=${passage.id}`}
          className="rounded-lg bg-accent-600 px-4 py-2 font-semibold text-white hover:bg-accent-500"
        >
          Launch a round with this passage
        </Link>
      </div>

      {error && <p className="mb-4 rounded-lg bg-rose-100 px-4 py-3 text-sm text-rose-900">{error}</p>}
      {saved && <p className="mb-4 rounded-lg bg-emerald-100 px-4 py-3 text-sm text-emerald-900">Saved.</p>}

      <section className="mb-10 rounded-xl border border-paper-200 bg-white p-5">
        <h2 className="mb-3 font-serif text-xl font-bold">Challenge prompts</h2>
        <p className="mb-4 text-sm text-ink-500">
          A strong prompt is arguable, answerable from this text alone, and requires evidence.
          Weak: &ldquo;Did you like the story?&rdquo; Strong: &ldquo;What best explains Lena&apos;s behavior —
          anger, guilt, or fear? Choose the strongest evidence and explain how it supports your claim.&rdquo;
        </p>
        {promptList.length > 0 && (
          <ul className="mb-5 space-y-2">
            {promptList.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 rounded-lg border border-paper-200 px-4 py-3">
                <div>
                  <div className="text-sm font-medium">{p.text}</div>
                  <div className="mt-1 text-xs text-ink-500">
                    {p.promptType}
                    {p.focusSkill ? ` · Focus: ${p.focusSkill}` : ""}
                  </div>
                </div>
                <form action={deletePrompt}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="passageId" value={passage.id} />
                  <button type="submit" className="text-xs text-ink-500 underline hover:text-rose-700">
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={createPrompt} className="flex flex-col gap-3">
          <input type="hidden" name="passageId" value={passage.id} />
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Prompt text</span>
            <textarea name="text" required rows={2}
              placeholder="What best explains the narrator's silence in the final scene? Support your claim with the strongest evidence."
              className="rounded-lg border border-paper-200 px-3 py-2" />
          </label>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Type</span>
              <select name="promptType" className="rounded-lg border border-paper-200 bg-white px-3 py-2">
                {PROMPT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="flex grow flex-col gap-1">
              <span className="text-sm font-medium">Focus skill (optional)</span>
              <input name="focusSkill" placeholder="Character motivation" className="rounded-lg border border-paper-200 px-3 py-2" />
            </label>
            <button type="submit" className="rounded-lg bg-ink-950 px-4 py-2 font-semibold text-paper-50 hover:bg-ink-900">
              Add prompt
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-paper-200 bg-white p-5">
        <h2 className="mb-3 font-serif text-xl font-bold">Edit passage</h2>
        <form action={updatePassage} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={passage.id} />
          <PassageFormFields passage={passage} />
          <div className="flex items-center gap-4">
            <button type="submit" className="rounded-lg bg-ink-950 px-5 py-2.5 font-semibold text-paper-50 hover:bg-ink-900">
              Save changes
            </button>
          </div>
        </form>
        <form action={archivePassage} className="mt-4 border-t border-paper-100 pt-4">
          <input type="hidden" name="id" value={passage.id} />
          <button type="submit" className="text-sm text-ink-500 underline hover:text-rose-700">
            Archive this passage
          </button>
        </form>
      </section>
    </div>
  );
}
