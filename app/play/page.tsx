"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandDescriptor } from "@/components/Logo";

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
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <h1 className="display mb-1 text-center text-6xl">
        Join the <span className="hl-mark">round</span>
      </h1>
      <p className="mb-2 text-center text-muted-500">Your teacher has the code on the board.</p>
      <div className="mb-6 text-center"><BrandDescriptor /></div>
      {error && (
        <p className="pop mb-4 rounded-xl border-2 border-coral-500 bg-coral-100 px-4 py-3 text-sm font-semibold text-coral-600">
          {error}
        </p>
      )}
      <form onSubmit={join} className="paper receipt-jagged flex flex-col gap-5 p-6">
        <label className="flex flex-col gap-1.5">
          <span className="accent-label text-muted-500">Game code</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            autoFocus
            autoComplete="off"
            maxLength={8}
            placeholder="ABC123"
            className="field display px-4 py-3 text-center text-5xl tracking-[0.2em]"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="accent-label text-muted-500">Your first name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={24}
            placeholder="Sam"
            className="field px-4 py-3 text-xl"
          />
          <span className="text-xs text-muted-500">Real first name — your teacher needs to know it&apos;s you.</span>
        </label>
        <button type="submit" disabled={busy} className="btn btn-primary display py-3.5 text-3xl">
          {busy ? "Joining…" : "Join"}
        </button>
      </form>
    </main>
  );
}
