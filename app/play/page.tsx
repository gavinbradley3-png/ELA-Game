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
    <main className="flex min-h-screen flex-col">
      <div className="tape h-4 w-full" />
      <div className="mx-auto flex w-full max-w-md grow flex-col justify-center px-6 py-12">
        <h1 className="display mb-1 text-center text-6xl">Join the case</h1>
        <p className="mb-8 text-center text-smoke-400">Your teacher has the code on the board.</p>
        {error && (
          <p className="pop mb-4 rounded-xl border-2 border-alarm-500 bg-alarm-500/10 px-4 py-3 text-sm font-semibold text-alarm-400">
            {error}
          </p>
        )}
        <form onSubmit={join} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-smoke-400">Case code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              autoFocus
              autoComplete="off"
              maxLength={8}
              placeholder="ABC123"
              className="field display px-4 py-3 text-center text-5xl tracking-[0.25em]"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-smoke-400">Your first name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={24}
              placeholder="Sam"
              className="field px-4 py-3 text-xl"
            />
            <span className="text-xs text-smoke-400">Real first name — your teacher needs to know it&apos;s you.</span>
          </label>
          <button type="submit" disabled={busy} className="btn btn-gold display py-4 text-4xl">
            {busy ? "Joining…" : "Let's go"}
          </button>
        </form>
      </div>
      <div className="tape h-4 w-full" />
    </main>
  );
}
