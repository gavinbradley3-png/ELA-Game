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
      <h1 className="display mb-1 text-5xl">Welcome back, {teacher.name}</h1>
      <p className="mb-8 text-smoke-400">Run a live Evidence Battle: pick a class, a passage, a prompt — go.</p>

      {!ready && (
        <div className="mb-8 rounded-xl border-2 border-gold-400 bg-gold-400/10 p-5">
          <h2 className="mb-1 font-bold text-smoke-50">Two quick steps before your first round</h2>
          <ol className="list-inside list-decimal text-sm text-smoke-300">
            {classList.length === 0 && (
              <li>
                <Link href="/teacher/classes" className="text-gold-400 underline">Create a class</Link>{" "}
                (just a name, like &ldquo;Block B — Grade 8&rdquo;).
              </li>
            )}
            {passageList.length === 0 && (
              <li>
                <Link href="/teacher/passages/new" className="text-gold-400 underline">Add a passage</Link>{" "}
                and write one challenge prompt for it.
              </li>
            )}
          </ol>
        </div>
      )}

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <Link href="/teacher/rounds/new" className="card border-2 border-gold-400 p-5 transition hover:bg-night-800">
          <div className="text-3xl">🧾</div>
          <div className="display text-2xl text-gold-400">Launch a round</div>
          <div className="text-sm text-smoke-400">Start a live Evidence Battle</div>
        </Link>
        <Link href="/teacher/passages" className="card p-5 transition hover:bg-night-800">
          <div className="text-3xl">📂</div>
          <div className="display text-2xl">Passages ({passageList.length})</div>
          <div className="text-sm text-smoke-400">Your case-file bank</div>
        </Link>
        <Link href="/teacher/classes" className="card p-5 transition hover:bg-night-800">
          <div className="text-3xl">🏫</div>
          <div className="display text-2xl">Classes ({classList.length})</div>
          <div className="text-sm text-smoke-400">Groups you teach</div>
        </Link>
      </div>

      <h2 className="display mb-3 text-3xl">Recent rounds</h2>
      {roundList.length === 0 ? (
        <p className="text-sm text-smoke-400">No rounds yet. Your first one is a click away.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-night-700 text-left text-smoke-400">
                <th className="px-4 py-2.5 font-semibold">Passage</th>
                <th className="px-4 py-2.5 font-semibold">Class</th>
                <th className="px-4 py-2.5 font-semibold">Code</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {roundList.map((r) => (
                <tr key={r.id} className="border-b border-night-800 last:border-0">
                  <td className="px-4 py-2.5 text-smoke-50">{passageById.get(r.passageId)?.title ?? "—"}</td>
                  <td className="px-4 py-2.5 text-smoke-300">{classById.get(r.classId)?.name ?? "—"}</td>
                  <td className="display px-4 py-2.5 text-lg text-gold-400">{r.joinCode}</td>
                  <td className="px-4 py-2.5 text-smoke-300">{PHASE_LABELS[r.phase] ?? r.phase}</td>
                  <td className="px-4 py-2.5 text-right">
                    {isActivePhase(r.phase) ? (
                      <Link href={`/teacher/rounds/${r.id}/control`} className="font-bold text-gold-400 underline">
                        Control panel
                      </Link>
                    ) : (
                      <Link href={`/teacher/rounds/${r.id}/dashboard`} className="text-smoke-300 underline">
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
