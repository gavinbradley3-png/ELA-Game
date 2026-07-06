import Link from "next/link";
import { signup } from "../actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="display mb-1 text-5xl">Create a teacher account</h1>
      <p className="mb-6 text-smoke-400">Free for the MVP. Students never need accounts or emails.</p>
      {error && (
        <p className="mb-4 rounded-xl border-2 border-alarm-500 bg-alarm-500/10 px-4 py-3 text-sm font-semibold text-alarm-400">
          {error}
        </p>
      )}
      <form action={signup} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-smoke-400">Your name</span>
          <input name="name" required placeholder="Ms. Bradley" className="field" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-smoke-400">Email</span>
          <input name="email" type="email" required autoComplete="email" className="field" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-smoke-400">Password</span>
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className="field" />
          <span className="text-xs text-smoke-400">At least 8 characters.</span>
        </label>
        <button type="submit" className="btn btn-gold mt-2 py-3 text-lg">
          Create account
        </button>
      </form>
      <p className="mt-6 text-sm text-smoke-400">
        Already have an account? <Link href="/login" className="text-gold-400 underline">Sign in</Link>.
      </p>
    </main>
  );
}
