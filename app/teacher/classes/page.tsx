import { and, eq } from "drizzle-orm";
import { db, classes } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { createClass, archiveClass } from "../actions";

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const teacher = await requireTeacher();
  const { error } = await searchParams;
  const list = await db
    .select()
    .from(classes)
    .where(and(eq(classes.teacherId, teacher.id), eq(classes.archived, 0)));

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 font-serif text-3xl font-bold">Classes</h1>
      {error && <p className="mb-4 rounded-lg bg-rose-100 px-4 py-3 text-sm text-rose-900">{error}</p>}

      <form action={createClass} className="mb-8 flex flex-wrap items-end gap-3 rounded-xl border border-paper-200 bg-white p-4">
        <label className="flex grow flex-col gap-1">
          <span className="text-sm font-medium">Class name</span>
          <input name="name" required placeholder="Block B — Grade 8" className="rounded-lg border border-paper-200 px-3 py-2" />
        </label>
        <label className="flex w-28 flex-col gap-1">
          <span className="text-sm font-medium">Grade</span>
          <input name="grade" placeholder="8" className="rounded-lg border border-paper-200 px-3 py-2" />
        </label>
        <button type="submit" className="rounded-lg bg-ink-950 px-4 py-2 font-semibold text-paper-50 hover:bg-ink-900">
          Add class
        </button>
      </form>

      {list.length === 0 ? (
        <p className="text-sm text-ink-500">No classes yet. Add one above — it takes ten seconds.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-xl border border-paper-200 bg-white px-4 py-3">
              <div>
                <div className="font-semibold">{c.name}</div>
                {c.grade && <div className="text-sm text-ink-500">Grade {c.grade}</div>}
              </div>
              <form action={archiveClass}>
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" className="text-sm text-ink-500 underline hover:text-rose-700">
                  Archive
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
