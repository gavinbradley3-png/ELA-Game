"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Full-screen phase/action splash: the phase name gets a highlighter swipe on
 * a receipt-style card. Confident, not cartoonish.
 */
export function PhaseSplash({
  text,
  sub,
  splashKey,
  durationMs = 1400,
}: {
  text: string;
  sub?: string;
  splashKey: string;
  durationMs?: number;
}) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(t);
  }, [splashKey, durationMs]);
  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60">
      <div className="splash-card paper receipt-jagged px-10 py-8 text-center">
        <div className="display text-5xl sm:text-7xl">
          <span className="hl-swipe">{text}</span>
        </div>
        {sub && <p className="accent-label mt-3 text-teal-600">{sub}</p>}
      </div>
    </div>
  );
}

const CONFETTI_COLORS = ["#ffe44d", "#14b8a6", "#ff6b4a", "#0f1d2d", "#fffdf6"];

/** Brand-colored confetti (hidden automatically under prefers-reduced-motion). */
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

/** Faint drifting quotation marks — ambient brand texture for wait screens. */
export function FloatingQuotes() {
  const bits = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        left: 5 + Math.random() * 88,
        top: 8 + Math.random() * 80,
        delay: Math.random() * 6,
        size: 40 + Math.random() * 50,
        teal: i % 3 === 0,
      })),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {bits.map((b, i) => (
        <span
          key={i}
          className="float-bit font-serif font-bold"
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            fontSize: b.size,
            animationDelay: `${b.delay}s`,
            color: b.teal ? "var(--color-teal-500)" : "var(--color-navy-950)",
            opacity: 0.07,
          }}
        >
          &ldquo;
        </span>
      ))}
    </div>
  );
}

/** Rotating one-liner — confident, classroom-ready. */
export function HypeTicker({ lines, intervalMs = 3000 }: { lines: string[]; intervalMs?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % lines.length), intervalMs);
    return () => clearInterval(t);
  }, [lines.length, intervalMs]);
  return (
    <p key={i} className="pop text-sm font-bold text-teal-600">
      {lines[i]}
    </p>
  );
}

/** Number that counts up from 0 when it mounts. */
export function CountUp({ value, durationMs = 900 }: { value: number; durationMs?: number }) {
  const [shown, setShown] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, durationMs]);
  return <>{shown}</>;
}

/** Small confirmation toast that flies up and fades. */
export function FlyToast({ text, toastKey }: { text: string; toastKey: string | number }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1200);
    return () => clearTimeout(t);
  }, [toastKey]);
  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-1/3 z-50 flex justify-center">
      <span className="fly-up display rounded-xl border-2 border-teal-500 bg-paper-50 px-4 py-1.5 text-2xl text-teal-600 shadow-lg">
        {text}
      </span>
    </div>
  );
}

/** Class-wide progress meter: "18/26 receipts in". */
export function ClassMeter({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="card p-3">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="accent-label text-muted-500">{label}</span>
        <span key={value} className="display pop text-2xl">
          {value}
          <span className="text-muted-500">/{total}</span>
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-cream-200">
        <div className="meter-fill h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
      {pct === 100 && (
        <div className="pop mt-1 text-center text-xs font-bold text-teal-600">Everyone&apos;s in. Full class.</div>
      )}
    </div>
  );
}

/** Thin teal reading-progress bar pinned to the top of the viewport. */
export function ScrollProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setPct(max > 0 ? Math.min(100, Math.round((el.scrollTop / max) * 100)) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1 bg-transparent">
      <div className="h-full bg-teal-500 transition-[width] duration-150" style={{ width: `${pct}%` }} />
      {pct >= 100 && (
        <span className="accent-label pop absolute right-2 top-1.5 rounded-md bg-teal-500 px-1.5 py-0.5 text-white">
          Read ✓
        </span>
      )}
    </div>
  );
}
