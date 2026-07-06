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
      <h1 className="display mb-6 text-5xl">Classes</h1>
      {error && (
        <p className="mb-4 rounded-xl border-2 border-alarm-500 bg-alarm-500/10 px-4 py-3 text-sm font-semibold text-alarm-400">
          {error}
        </p>
      )}

      <form action={createClass} className="card mb-8 flex flex-wrap items-end gap-3 p-4">
        <label className="flex grow flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-smoke-400">Class name</span>
          <input name="name" required placeholder="Block B — Grade 8" className="field" />
        </label>
        <label className="flex w-28 flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-smoke-400">Grade</span>
          <input name="grade" placeholder="8" className="field" />
        </label>
        <button type="submit" className="btn btn-gold px-4 py-2.5">
          Add class
        </button>
      </form>

      {list.length === 0 ? (
        <p className="text-sm text-smoke-400">No classes yet. Add one above — it takes ten seconds.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((c) => (
            <li key={c.id} className="card flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-bold text-smoke-50">{c.name}</div>
                {c.grade && <div className="text-sm text-smoke-400">Grade {c.grade}</div>}
              </div>
              <form action={archiveClass}>
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" className="text-sm text-smoke-400 underline hover:text-alarm-400">
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
