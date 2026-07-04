import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db, classes, passages, gameRounds } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { PHASE_LABELS, isActivePhase } from "@/lib/phases";

export default async function TeacherHome() {
  const teacher = await requireTeacher();
  const [classList, passageList, roundList] = await Promise.all([
    db.select().from(classes).where(and(eq(classes.teacherId, teacher.id), eq(classes.archived, 0))),
    db.select().from(passages).where(and(eq(passages.teacherId, teacher.id), eq(passages.archived, 0))),
    db
      .select()
      .from(gameRounds)
      .where(eq(gameRounds.teacherId, teacher.id))
      .orderBy(desc(gameRounds.createdAt))
      .limit(10),
  ]);
  const classById = new Map(classList.map((c) => [c.id, c]));
  const passageById = new Map(passageList.map((p) => [p.id, p]));

  const ready = classList.length > 0 && passageList.length > 0;

  return (
    <div>
      <h1 className="mb-2 font-serif text-3xl font-bold">Welcome back, {teacher.name}</h1>
      <p className="mb-8 text-ink-500">Run a live Evidence Battle: pick a class, a passage, a prompt — go.</p>

      {!ready && (
        <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-5">
          <h2 className="mb-1 font-semibold">Two quick steps before your first round</h2>
          <ol className="list-inside list-decimal text-sm text-ink-700">
            {classList.length === 0 && (
              <li><Link href="/teacher/classes" className="underline">Create a class</Link> (just a name, like &ldquo;Block B — Grade 8&rdquo;).</li>
            )}
            {passageList.length === 0 && (
              <li><Link href="/teacher/passages/new" className="underline">Add a passage</Link> and write one challenge prompt for it.</li>
            )}
          </ol>
        </div>
      )}

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <Link href="/teacher/rounds/new" className="rounded-xl border-2 border-ink-950 bg-white p-5 hover:bg-paper-100">
          <div className="text-2xl">🚀</div>
          <div className="font-semibold">Launch a round</div>
          <div className="text-sm text-ink-500">Start a live Evidence Battle</div>
        </Link>
        <Link href="/teacher/passages" className="rounded-xl border border-paper-200 bg-white p-5 hover:bg-paper-100">
          <div className="text-2xl">📄</div>
          <div className="font-semibold">Passages ({passageList.length})</div>
          <div className="text-sm text-ink-500">Your reusable passage bank</div>
        </Link>
        <Link href="/teacher/classes" className="rounded-xl border border-paper-200 bg-white p-5 hover:bg-paper-100">
          <div className="text-2xl">🏫</div>
          <div className="font-semibold">Classes ({classList.length})</div>
          <div className="text-sm text-ink-500">Groups you teach</div>
        </Link>
      </div>

      <h2 className="mb-3 font-serif text-xl font-bold">Recent rounds</h2>
      {roundList.length === 0 ? (
        <p className="text-sm text-ink-500">No rounds yet. Your first one is a click away.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-paper-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-paper-200 text-left text-ink-500">
                <th className="px-4 py-2 font-medium">Passage</th>
                <th className="px-4 py-2 font-medium">Class</th>
                <th className="px-4 py-2 font-medium">Code</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {roundList.map((r) => (
                <tr key={r.id} className="border-b border-paper-100 last:border-0">
                  <td className="px-4 py-2">{passageById.get(r.passageId)?.title ?? "—"}</td>
                  <td className="px-4 py-2">{classById.get(r.classId)?.name ?? "—"}</td>
                  <td className="px-4 py-2 font-mono">{r.joinCode}</td>
                  <td className="px-4 py-2">{PHASE_LABELS[r.phase] ?? r.phase}</td>
                  <td className="px-4 py-2 text-right">
                    {isActivePhase(r.phase) ? (
                      <Link href={`/teacher/rounds/${r.id}/control`} className="font-semibold text-accent-600 underline">
                        Control panel
                      </Link>
                    ) : (
                      <Link href={`/teacher/rounds/${r.id}/dashboard`} className="underline">
                        Results
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
