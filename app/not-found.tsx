import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="display mb-3 text-5xl">No evidence of that page.</h1>
      <p className="mb-8 text-muted-500">The link may be old, or the round may have ended.</p>
      <div className="flex gap-3">
        <Link href="/play" className="btn btn-primary px-6 py-3">
          Join a game
        </Link>
        <Link href="/" className="btn btn-secondary px-6 py-3">
          Home
        </Link>
      </div>
    </main>
  );
}
