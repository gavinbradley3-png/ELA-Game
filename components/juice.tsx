"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const TONE_CLASS: Record<string, string> = {
  gold: "text-gold-400",
  win: "text-win-400",
  alarm: "text-alarm-400",
};

/** Full-screen rubber-stamp splash: phase changes, receipts filed, verdicts locked. */
export function PhaseSplash({
  text,
  emoji,
  splashKey,
  tone = "gold",
  durationMs = 1500,
}: {
  text: string;
  emoji: string;
  splashKey: string;
  tone?: "gold" | "win" | "alarm";
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
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="stamp-in text-center">
        <div className="bounce-soft mb-2 text-6xl">{emoji}</div>
        <div className={`display stamp border-8 px-6 py-2 text-6xl sm:text-8xl ${TONE_CLASS[tone]}`}>{text}</div>
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

/** Falling emoji — like confetti but with character. */
export function EmojiRain({ emojis, count = 26 }: { emojis: string[]; count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 3 + Math.random() * 2.5,
        emoji: emojis[i % emojis.length],
        size: 16 + Math.random() * 18,
      })),
    [emojis, count],
  );
  return (
    <>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti"
          style={{
            left: `${p.left}%`,
            background: "transparent",
            fontSize: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </>
  );
}

/** Slow-drifting background emoji — ambient vibes for wait screens. */
export function FloatingBits({ emojis }: { emojis: string[] }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        left: 4 + Math.random() * 90,
        top: 6 + Math.random() * 85,
        delay: Math.random() * 6,
        size: 22 + Math.random() * 30,
        emoji: emojis[i % emojis.length],
      })),
    [emojis],
  );
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {bits.map((b, i) => (
        <span
          key={i}
          className="float-bit"
          style={{ left: `${b.left}%`, top: `${b.top}%`, fontSize: b.size, animationDelay: `${b.delay}s` }}
        >
          {b.emoji}
        </span>
      ))}
    </div>
  );
}

/** Rotating hype line — one at a time, swaps with a pop. */
export function HypeTicker({ lines, intervalMs = 2800 }: { lines: string[]; intervalMs?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % lines.length), intervalMs);
    return () => clearInterval(t);
  }, [lines.length, intervalMs]);
  return (
    <p key={i} className="pop text-sm font-bold text-gold-400">
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

/** Small "+1 CLUE" style toast that flies up and fades. */
export function FlyToast({ text, toastKey }: { text: string; toastKey: string | number }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1300);
    return () => clearTimeout(t);
  }, [toastKey]);
  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-1/3 z-50 flex justify-center">
      <span className="fly-up display rounded-xl border-4 border-win-400 bg-night-950/90 px-4 py-1 text-3xl text-win-400">
        {text}
      </span>
    </div>
  );
}

/** Class-wide hype meter: "18/26 receipts in". */
export function ClassMeter({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="card p-3">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-smoke-400">{label}</span>
        <span key={value} className="display pop text-2xl text-gold-400">
          {value}<span className="text-smoke-400">/{total}</span>
        </span>
      </div>
      <div className="h-3.5 overflow-hidden rounded-full bg-night-950">
        <div className="meter-fill h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
      {pct === 100 && <div className="pop mt-1 text-center text-xs font-bold text-win-400">FULL SEND — everyone&apos;s in 💯</div>}
    </div>
  );
}

/** Thin gold reading-progress bar pinned under the header. */
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
      <div className="h-full bg-gold-400 transition-[width] duration-150" style={{ width: `${pct}%` }} />
      {pct >= 100 && (
        <span className="display pop absolute right-2 top-1.5 rounded-md bg-win-400 px-1.5 text-xs text-night-950">
          READ ✓
        </span>
      )}
    </div>
  );
}
