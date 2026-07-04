import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db, passages } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";

export default async function PassagesPage() {
  const teacher = await requireTeacher();
  const list = await db
    .select()
    .from(passages)
    .where(and(eq(passages.teacherId, teacher.id), eq(passages.archived, 0)))
    .orderBy(desc(passages.updatedAt));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl font-bold">Passage bank</h1>
        <Link href="/teacher/passages/new" className="rounded-lg bg-ink-950 px-4 py-2 font-semibold text-paper-50 hover:bg-ink-900">
          + New passage
        </Link>
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-ink-500">
          No passages yet. Add a short story excerpt, article, or poem — anything worth arguing about.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((p) => (
            <li key={p.id}>
              <Link href={`/teacher/passages/${p.id}`} className="block rounded-xl border border-paper-200 bg-white p-4 hover:bg-paper-100">
                <div className="font-semibold">{p.title}</div>
                <div className="mt-1 text-sm text-ink-500">
                  {[p.genre, p.gradeLevel && `Grade ${p.gradeLevel}`, `${Math.max(1, Math.round(p.text.split(/\s+/).length / 200))} min read`]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-ink-700">{p.text}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
