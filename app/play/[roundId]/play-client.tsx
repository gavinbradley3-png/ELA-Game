"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { PassageView } from "@/components/PassageView";
import { PhaseSplash, Confetti, EmojiRain, FloatingBits, HypeTicker, ScrollProgress } from "@/components/juice";
import type { PlayState } from "./types";
import { AnnotateScreen, SubmitScreen } from "./work-screens";
import { ReviewScreen, ReviseScreen, RevealScreen, ReflectScreen } from "./review-screens";

const POLL_MS = 2000;

const SPLASH: Record<string, { text: string; emoji: string }> = {
  reading: { text: "Case file opened", emoji: "📂" },
  annotating: { text: "Mark it up", emoji: "🖍️" },
  prompt: { text: "The big question", emoji: "❓" },
  submitting: { text: "Bring the receipts", emoji: "🧾" },
  peer_review: { text: "Jury duty", emoji: "⚖️" },
  revising: { text: "The appeal", emoji: "✏️" },
  reveal: { text: "The verdict", emoji: "📣" },
  reflection: { text: "Case notes", emoji: "📝" },
  complete: { text: "Case closed", emoji: "✅" },
};

const PHASE_TITLES: Record<string, string> = {
  lobby: "The Lobby",
  reading: "Case File",
  annotating: "Mark It Up",
  prompt: "The Big Question",
  submitting: "Bring the Receipts",
  peer_review: "Jury Duty",
  revising: "The Appeal",
  reveal: "The Verdict",
  reflection: "Case Notes",
  complete: "Case Closed",
  cancelled: "Case Dismissed",
};

export function PlayClient({ roundId }: { roundId: string }) {
  const [state, setState] = useState<PlayState | null>(null);
  const [gone, setGone] = useState(false);
  const [offline, setOffline] = useState(false);
  const [splash, setSplash] = useState<{ text: string; emoji: string; key: string } | null>(null);
  const prevPhase = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/play/state?roundId=${encodeURIComponent(roundId)}`, { cache: "no-store" });
      if (res.status === 401) {
        setGone(true);
        return;
      }
      if (!res.ok) return;
      const next: PlayState = await res.json();
      const phase = next.round.underlyingPhase;
      if (prevPhase.current && prevPhase.current !== phase && SPLASH[phase]) {
        setSplash({ ...SPLASH[phase], key: `${phase}-${Date.now()}` });
      }
      prevPhase.current = phase;
      setState(next);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [roundId]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  if (gone) {
    return (
      <Shell>
        <div className="mx-auto max-w-md pt-16 text-center">
          <span className="stamp mb-6 inline-block text-3xl text-alarm-400">Off the case</span>
          <p className="mb-8 text-smoke-300">You may have been removed, or your session expired.</p>
          <Link href="/play" className="btn btn-gold display px-8 py-3 text-3xl">
            Rejoin
          </Link>
        </div>
      </Shell>
    );
  }
  if (!state) {
    return (
      <Shell>
        <p className="pt-24 text-center text-smoke-400">Connecting to your class…</p>
      </Shell>
    );
  }

  const { round } = state;
  const phase = round.underlyingPhase;

  return (
    <Shell>
      {splash && <PhaseSplash text={splash.text} emoji={splash.emoji} splashKey={splash.key} />}
      {phase === "reveal" && <Confetti />}

      <header className="sticky top-0 z-40 border-b border-night-700 bg-night-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <span className="display text-2xl text-gold-400">Receipts</span>
          <span className="hidden text-xs font-bold uppercase tracking-wider text-smoke-400 sm:inline">
            Case #{round.joinCode}
          </span>
          <span className="stamp -rotate-1 border-2 px-2 py-0 text-sm text-smoke-50" data-testid="student-phase">
            {PHASE_TITLES[phase] ?? phase}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {offline && (
              <span className="rounded-lg bg-alarm-500/15 px-2 py-1 text-xs font-bold text-alarm-400">
                Reconnecting…
              </span>
            )}
            <span className="hidden text-sm text-smoke-400 sm:inline">
              🕵️ <span className="font-bold text-smoke-50">{state.me.name}</span>
            </span>
            <Countdown endsAt={round.phaseEndsAt} pausedRemainingMs={round.paused ? round.pausedRemainingMs : null} />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl grow px-4 py-6 sm:px-6">
        {round.paused && (
          <div className="pop mx-auto mb-6 max-w-3xl">
            <div className="tape h-3 w-full rounded-t-xl" />
            <div className="border-x-2 border-b-2 border-gold-400 bg-night-900 p-4 text-center">
              <span className="display text-4xl text-gold-400">⏸ Paused</span>
              <p className="mt-1 text-sm text-smoke-300">Eyes on your teacher. Your work is saved.</p>
            </div>
          </div>
        )}
        <div className={round.paused ? "pointer-events-none opacity-50" : ""}>
          <PhaseBody state={state} refresh={refresh} />
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen flex-col">{children}</main>;
}

function PhaseBody({ state, refresh }: { state: PlayState; refresh: () => Promise<void> }) {
  switch (state.round.underlyingPhase) {
    case "lobby":
      return <LobbyScreen state={state} />;
    case "reading":
      return <ReadingScreen state={state} />;
    case "annotating":
      return <AnnotateScreen state={state} refresh={refresh} />;
    case "prompt":
      return <PromptScreen state={state} />;
    case "submitting":
      return <SubmitScreen state={state} refresh={refresh} />;
    case "peer_review":
      return <ReviewScreen state={state} refresh={refresh} />;
    case "revising":
      return <ReviseScreen state={state} refresh={refresh} />;
    case "reveal":
      return <RevealScreen state={state} />;
    case "reflection":
      return <ReflectScreen state={state} refresh={refresh} />;
    case "complete":
      return <CompleteScreen state={state} />;
    case "cancelled":
      return (
        <p className="mx-auto max-w-md pt-16 text-center text-lg text-smoke-300">
          This round was ended by your teacher.
        </p>
      );
    default:
      return null;
  }
}

const HYPE_LINES = [
  "Lock in. 🔒",
  "Reading is the meta. 📖",
  "No random quotes. We keep receipts. 🧾",
  "Cook with evidence, not vibes. 🍳",
  "Snipers > sprayers. 🎯",
  "It's giving… textual evidence. ✨",
  "Your claim needs a lawyer. Be the lawyer. ⚖️",
  "Skimming is a crime in this jurisdiction. 🚔",
  "Second drafts are a glow-up, not an L. 💅",
  "Receipts or it didn't happen. 🫡",
];

function LobbyScreen({ state }: { state: PlayState }) {
  return (
    <div className="relative mx-auto max-w-md pt-4 text-center">
      <FloatingBits emojis={["🧾", "🔍", "⚖️", "📂", "✨", "🖍️"]} />
      <div className="bounce-soft mb-2 text-7xl">🕵️</div>
      <h1 className="display mb-1 text-6xl">You&apos;re on the case,</h1>
      <h2 className="display mb-4 text-6xl text-gold-400">{state.me.name}!</h2>

      <div className="mb-4 min-h-6">
        <HypeTicker lines={HYPE_LINES} />
      </div>

      <div className="card rise mb-4 p-4">
        <div key={state.pulse.joined} className="display pop text-5xl text-gold-400">
          {state.pulse.joined}
        </div>
        <div className="text-xs font-bold uppercase tracking-widest text-smoke-400">
          detective{state.pulse.joined === 1 ? "" : "s"} in the room
        </div>
      </div>

      <div className="card rise p-5 text-left text-sm text-smoke-300">
        <h3 className="display mb-3 text-2xl text-smoke-50">How to win the room</h3>
        <ol className="space-y-2">
          <Step n={1} title="Read the case file">Every answer lives in the text.</Step>
          <Step n={2} title="Mark it up">Highlight what matters — snipers beat sprayers.</Step>
          <Step n={3} title="Bring the receipt">Claim + exact quote + why it proves you right.</Step>
          <Step n={4} title="Jury duty">Judge two anonymous responses. Thinking, not friends.</Step>
          <Step n={5} title="The appeal">Give it a glow-up — or stand on business and defend it.</Step>
        </ol>
        <p className="mt-4 text-center font-bold text-gold-400">Random quotes don&apos;t win. Receipts do.</p>
      </div>
      <p className="mt-4 animate-pulse text-sm text-smoke-400">Waiting for your teacher to open the case…</p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="display mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-400 text-base text-night-950">
        {n}
      </span>
      <span>
        <span className="font-bold text-smoke-50">{title}.</span> {children}
      </span>
    </li>
  );
}

function ReadingScreen({ state }: { state: PlayState }) {
  if (!state.passage) return null;
  return (
    <div className="mx-auto max-w-3xl">
      <ScrollProgress />
      <CaseFileHeader
        title={state.passage.title}
        subtitle="Read the WHOLE thing — skimming is a crime in this jurisdiction. 🚔 You'll annotate next, so notice moments that feel important."
      />
      <PassageView text={state.passage.text} />
      <VocabNotes notes={state.passage.vocabNotes} />
      <p className="mt-4 text-center text-xs font-bold uppercase tracking-widest text-smoke-400">
        Fill the gold bar at the top. Then you&apos;re certified. ✅
      </p>
    </div>
  );
}

function PromptScreen({ state }: { state: PlayState }) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="pop relative mb-6 rounded-2xl border-4 border-gold-400 bg-night-900 p-6 sm:p-8">
        <span className="stamp absolute -top-4 left-4 bg-night-900 text-sm text-alarm-400">
          {state.prompt?.promptType}
        </span>
        <p className="display mb-3 text-4xl leading-tight text-smoke-50 sm:text-5xl">{state.prompt?.text}</p>
        <p className="text-sm text-smoke-400">
          Think before you type. Which exact words in the text are your strongest receipt? 🤔
          Submissions open when your teacher says go — lock in.
        </p>
      </div>
      {state.passage && <PassageView text={state.passage.text} highlights={state.annotations} />}
    </div>
  );
}

function CompleteScreen({ state }: { state: PlayState }) {
  return (
    <div className="mx-auto max-w-3xl">
      <EmojiRain emojis={["🧾", "⭐", "🔍", "💯", "⚖️"]} />
      <div className="mb-8 pt-4 text-center">
        <span className="stamp pop inline-block border-8 px-6 py-2 text-6xl text-win-400">Case closed</span>
        <p className="mt-4 text-smoke-300">
          W performance, {state.me.name}. 🫡 Your thinking is saved for your teacher.
        </p>
      </div>
      {state.reveal && <RevealScreen state={state} noConfetti />}
    </div>
  );
}

export function CaseFileHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-3">
        <span className="stamp text-xs text-alarm-400">Case file</span>
        <h1 className="display text-4xl">{title}</h1>
      </div>
      {subtitle && <p className="text-sm text-smoke-400">{subtitle}</p>}
    </div>
  );
}

export function VocabNotes({ notes }: { notes: string | null | undefined }) {
  if (!notes) return null;
  return (
    <details className="card mt-4 p-4">
      <summary className="cursor-pointer text-sm font-bold text-gold-400">📖 Vocabulary help</summary>
      <p className="mt-2 whitespace-pre-wrap text-sm text-smoke-300">{notes}</p>
    </details>
  );
}
