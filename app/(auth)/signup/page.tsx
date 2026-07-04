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
      <h1 className="mb-1 font-serif text-3xl font-bold">Create a teacher account</h1>
      <p className="mb-6 text-ink-500">Free for the MVP. Students never need accounts or emails.</p>
      {error && <p className="mb-4 rounded-lg bg-rose-100 px-4 py-3 text-sm text-rose-900">{error}</p>}
      <form action={signup} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Your name</span>
          <input name="name" required placeholder="Ms. Bradley"
            className="rounded-lg border border-paper-200 bg-white px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Email</span>
          <input name="email" type="email" required autoComplete="email"
            className="rounded-lg border border-paper-200 bg-white px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Password</span>
          <input name="password" type="password" required minLength={8} autoComplete="new-password"
            className="rounded-lg border border-paper-200 bg-white px-3 py-2" />
          <span className="text-xs text-ink-500">At least 8 characters.</span>
        </label>
        <button type="submit" className="mt-2 rounded-lg bg-ink-950 px-4 py-2.5 font-semibold text-paper-50 hover:bg-ink-900">
          Create account
        </button>
      </form>
      <p className="mt-6 text-sm text-ink-500">
        Already have an account? <Link href="/login" className="underline">Sign in</Link>.
      </p>
    </main>
  );
}
