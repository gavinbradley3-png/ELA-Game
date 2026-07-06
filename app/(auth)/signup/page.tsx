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
      <p className="mb-6 text-muted-500">Free for the MVP. Students never need accounts or emails.</p>
      {error && (
        <p className="mb-4 rounded-xl border-2 border-coral-500 bg-coral-100 px-4 py-3 text-sm font-semibold text-coral-600">
          {error}
        </p>
      )}
      <form action={signup} className="card flex flex-col gap-4 p-6">
        <label className="flex flex-col gap-1.5">
          <span className="accent-label text-muted-500">Your name</span>
          <input name="name" required placeholder="Ms. Bradley" className="field" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="accent-label text-muted-500">Email</span>
          <input name="email" type="email" required autoComplete="email" className="field" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="accent-label text-muted-500">Password</span>
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className="field" />
          <span className="text-xs text-muted-500">At least 8 characters.</span>
        </label>
        <button type="submit" className="btn btn-primary mt-1 py-3 text-lg">
          Create account
        </button>
      </form>
      <p className="mt-6 text-sm text-muted-500">
        Already have an account? <Link href="/login" className="font-semibold text-teal-600 underline">Sign in</Link>.
      </p>
    </main>
  );
}
