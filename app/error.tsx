"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="display mb-3 text-5xl">Something slipped.</h1>
      <p className="mb-8 text-muted-500">
        Your work is saved on the server. Try again — if it keeps happening, refresh the page.
      </p>
      <button onClick={reset} className="btn btn-primary px-8 py-3 text-lg">
        Try again
      </button>
    </main>
  );
}
