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
      className={`display inline-block rounded-lg border-2 px-3 py-0.5 text-3xl tabular-nums ${
        totalSeconds === 0
          ? "border-alarm-500 bg-alarm-500/15 text-alarm-400"
          : urgent
            ? "timer-urgent border-alarm-500 text-alarm-400"
            : "border-night-600 bg-night-900 text-gold-400"
      }`}
      aria-live={urgent ? "polite" : undefined}
    >
      {totalSeconds === 0 ? "TIME!" : `${m}:${String(s).padStart(2, "0")}`}
    </span>
  );
}
