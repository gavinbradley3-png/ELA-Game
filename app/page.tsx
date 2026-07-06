import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { PrimaryLogo } from "@/components/Logo";

export default async function Home() {
  const user = await getSessionUser();
  return (
    <main className="flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-3xl grow flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-10">
          <PrimaryLogo />
        </div>
        <p className="mb-10 max-w-xl text-lg text-ink-900/80">
          The live classroom game where claims need proof. Read the text, mark it up, submit your
          receipt — a quote plus the reasoning that makes it stick — then vote on peer evidence,
          revise, and defend your thinking.
        </p>
        <div className="flex w-full max-w-md flex-col items-stretch gap-3">
          <Link href="/play" className="btn btn-primary display px-10 py-4 text-3xl">
            Join a game
          </Link>
          {user ? (
            <Link href="/teacher" className="btn btn-secondary px-10 py-3.5 text-lg">
              Teacher dashboard →
            </Link>
          ) : (
            <Link href="/login" className="btn btn-secondary px-10 py-3.5 text-lg">
              I&apos;m a teacher — sign in
            </Link>
          )}
        </div>
        {!user && (
          <p className="mt-6 text-sm text-muted-500">
            New here? <Link href="/signup" className="font-semibold text-teal-600 underline">Create a teacher account</Link>.
            Students never need one.
          </p>
        )}
      </div>
      <footer className="pb-6 text-center">
        <span className="display text-xl text-navy-950">Show your <span className="teal-underline">proof</span>.</span>
      </footer>
    </main>
  );
}
