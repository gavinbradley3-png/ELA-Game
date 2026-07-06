import Link from "next/link";
import { getSessionUser } from "@/lib/auth";

export default async function Home() {
  const user = await getSessionUser();
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="tape h-4 w-full" />
      <div className="mx-auto flex w-full max-w-3xl grow flex-col items-center justify-center px-6 py-16 text-center">
        <span className="stamp mb-6 -rotate-3 text-sm text-alarm-400">Live classroom evidence battle</span>
        <h1 className="display mb-2 text-[6rem] leading-none text-smoke-50 sm:text-[9rem]">
          Receipts
        </h1>
        <p className="mb-10 max-w-xl text-lg text-smoke-300">
          No opinions without proof. Read the case file, make your claim,
          <span className="font-bold text-gold-400"> bring the receipts</span>, judge the jury round,
          and defend your thinking. Your teacher runs the room.
        </p>
        <div className="flex w-full max-w-md flex-col items-stretch gap-4">
          <Link href="/play" className="btn btn-gold display px-10 py-5 text-4xl">
            🧾 Join a game
          </Link>
          {user ? (
            <Link href="/teacher" className="btn btn-dark px-10 py-4 text-lg">
              Teacher dashboard →
            </Link>
          ) : (
            <Link href="/login" className="btn btn-dark px-10 py-4 text-lg">
              I&apos;m a teacher — sign in
            </Link>
          )}
        </div>
        {!user && (
          <p className="mt-6 text-sm text-smoke-400">
            New here? <Link href="/signup" className="text-gold-400 underline">Create a teacher account</Link>.
            Students never need one.
          </p>
        )}
      </div>
      <div className="tape h-4 w-full" />
    </main>
  );
}
