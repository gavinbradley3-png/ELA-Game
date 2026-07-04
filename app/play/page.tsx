"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/play/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't join. Try again.");
        return;
      }
      router.push(`/play/${data.roundId}`);
    } catch {
      setError("Network hiccup. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="mb-1 text-center font-serif text-4xl font-bold">Join the game</h1>
      <p className="mb-8 text-center text-ink-500">Your teacher has the code on the board.</p>
      {error && <p className="mb-4 rounded-lg bg-rose-100 px-4 py-3 text-sm text-rose-900">{error}</p>}
      <form onSubmit={join} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Game code</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            autoFocus
            autoComplete="off"
            maxLength={8}
            placeholder="ABC123"
            className="rounded-xl border-2 border-paper-200 bg-white px-4 py-3 text-center font-mono text-3xl tracking-[0.3em] uppercase"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Your first name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={24}
            placeholder="Sam"
            className="rounded-xl border-2 border-paper-200 bg-white px-4 py-3 text-xl"
          />
          <span className="text-xs text-ink-500">Use your real first name so your teacher knows it&apos;s you.</span>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-ink-950 px-6 py-4 text-xl font-semibold text-paper-50 hover:bg-ink-900 disabled:opacity-60"
        >
          {busy ? "Joining…" : "Join"}
        </button>
      </form>
    </main>
  );
}
