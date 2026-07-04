import Link from "next/link";
import { getSessionUser } from "@/lib/auth";

export default async function Home() {
  const user = await getSessionUser();
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent-600">
        Live classroom evidence battles
      </p>
      <h1 className="mb-4 font-serif text-6xl font-bold tracking-tight">Receipts</h1>
      <p className="mb-10 max-w-xl text-lg text-ink-700">
        Students don&apos;t just answer — they bring the receipt. Read, annotate, claim,
        prove it with evidence, compare reasoning, and revise. The teacher runs the room.
      </p>
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <Link
          href="/play"
          className="rounded-xl bg-ink-950 px-10 py-4 text-xl font-semibold text-paper-50 shadow-lg hover:bg-ink-900"
        >
          I&apos;m a student — Join a game
        </Link>
        {user ? (
          <Link href="/teacher" className="rounded-xl border-2 border-ink-950 px-10 py-4 text-xl font-semibold hover:bg-paper-100">
            Teacher dashboard
          </Link>
        ) : (
          <Link href="/login" className="rounded-xl border-2 border-ink-950 px-10 py-4 text-xl font-semibold hover:bg-paper-100">
            I&apos;m a teacher — Sign in
          </Link>
        )}
      </div>
      {!user && (
        <p className="mt-6 text-sm text-ink-500">
          New here? <Link href="/signup" className="underline">Create a teacher account</Link>. Students never need one.
        </p>
      )}
    </main>
  );
}
