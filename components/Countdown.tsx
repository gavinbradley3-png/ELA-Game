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
  const urgent = totalSeconds <= 30 && totalSeconds > 0 && pausedRemainingMs == null;
  return (
    <span
      className={`display inline-block rounded-lg border-2 px-2.5 py-1 text-2xl tabular-nums ${
        totalSeconds === 0
          ? "border-coral-500 bg-coral-100 text-coral-600"
          : urgent
            ? "timer-urgent border-coral-500 bg-paper-50 text-coral-600"
            : "border-navy-950 bg-paper-50 text-navy-950"
      }`}
      aria-live={urgent ? "polite" : undefined}
    >
      {totalSeconds === 0 ? "Time" : `${m}:${String(s).padStart(2, "0")}`}
    </span>
  );
}
