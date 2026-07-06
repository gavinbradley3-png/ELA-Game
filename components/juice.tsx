"use client";

import { useEffect, useMemo, useState } from "react";

/** Full-screen rubber-stamp splash shown on phase transitions. */
export function PhaseSplash({ text, emoji, splashKey }: { text: string; emoji: string; splashKey: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1500);
    return () => clearTimeout(t);
  }, [splashKey]);
  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="stamp-in text-center">
        <div className="mb-2 text-6xl">{emoji}</div>
        <div className="display stamp border-8 px-6 py-2 text-6xl text-gold-400 sm:text-8xl">{text}</div>
      </div>
    </div>
  );
}

const CONFETTI_COLORS = ["#ffc800", "#f0453c", "#3ddc85", "#a5e3fc", "#f7c4fc"];

/** CSS-only confetti burst (hidden automatically under prefers-reduced-motion). */
export function Confetti({ count = 80 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        duration: 2.2 + Math.random() * 2,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        tilt: Math.random() * 360,
      })),
    [count],
  );
  return (
    <>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.tilt}deg)`,
          }}
        />
      ))}
    </>
  );
}

/** Class-wide hype meter: "18/26 receipts in". */
export function ClassMeter({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="card p-3">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-smoke-400">{label}</span>
        <span className="display text-2xl text-gold-400">
          {value}<span className="text-smoke-400">/{total}</span>
        </span>
      </div>
      <div className="h-3.5 overflow-hidden rounded-full bg-night-950">
        <div className="meter-fill h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
