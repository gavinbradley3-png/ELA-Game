"use client";

import { useEffect, useState } from "react";

export function Countdown({
  endsAt,
  pausedRemainingMs,
}: {
  endsAt: number | null;
  pausedRemainingMs?: number | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  let remaining: number | null = null;
  if (pausedRemainingMs != null) remaining = pausedRemainingMs;
  else if (endsAt != null) remaining = Math.max(0, endsAt - now);
  if (remaining == null) return null;

  const totalSeconds = Math.ceil(remaining / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const urgent = totalSeconds <= 30 && pausedRemainingMs == null;
  return (
    <span
      className={`rounded-lg px-3 py-1 font-mono text-lg font-bold tabular-nums ${
        totalSeconds === 0
          ? "bg-rose-100 text-rose-800"
          : urgent
            ? "bg-amber-100 text-amber-900"
            : "bg-paper-100 text-ink-900"
      }`}
      aria-live={urgent ? "polite" : undefined}
    >
      {totalSeconds === 0 ? "Time" : `${m}:${String(s).padStart(2, "0")}`}
    </span>
  );
}
