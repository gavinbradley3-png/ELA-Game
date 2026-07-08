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
      <p className="mb-6 text-muted-500">
        Students don&apos;t sign in — they <Link className="font-semibold text-teal-600 underline" href="/play">join with a code</Link>.
      </p>
      {error && (
        <p className="mb-4 rounded-xl border-2 border-coral-500 bg-coral-100 px-4 py-3 text-sm font-semibold text-coral-600">
          {error}
        </p>
      )}
      <form action={login} className="card flex flex-col gap-4 p-6">
        <label className="flex flex-col gap-1.5">
          <span className="accent-label text-muted-500">Email</span>
          <input name="email" type="email" required autoComplete="email" className="field" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="accent-label text-muted-500">Password</span>
          <input name="password" type="password" required autoComplete="current-password" className="field" />
        </label>
        <button type="submit" className="btn btn-primary mt-1 py-3 text-lg">
          Sign in
        </button>
      </form>
      <p className="mt-6 text-sm text-muted-500">
        No account? <Link href="/signup" className="font-semibold text-teal-600 underline">Create one</Link>.
      </p>
    </main>
  );
}
