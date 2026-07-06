import Link from "next/link";
import { login } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="display mb-1 text-5xl">Teacher sign in</h1>
      <p className="mb-6 text-smoke-400">
        Students don&apos;t sign in — they <Link className="text-gold-400 underline" href="/play">join with a code</Link>.
      </p>
      {error && (
        <p className="mb-4 rounded-xl border-2 border-alarm-500 bg-alarm-500/10 px-4 py-3 text-sm font-semibold text-alarm-400">
          {error}
        </p>
      )}
      <form action={login} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-smoke-400">Email</span>
          <input name="email" type="email" required autoComplete="email" className="field" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-smoke-400">Password</span>
          <input name="password" type="password" required autoComplete="current-password" className="field" />
        </label>
        <button type="submit" className="btn btn-gold mt-2 py-3 text-lg">
          Sign in
        </button>
      </form>
      <p className="mt-6 text-sm text-smoke-400">
        No account? <Link href="/signup" className="text-gold-400 underline">Create one</Link>.
      </p>
    </main>
  );
}
