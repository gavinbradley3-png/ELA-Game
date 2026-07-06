"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { PassageView } from "@/components/PassageView";
import { PhaseSplash, Confetti, FloatingQuotes, HypeTicker, ScrollProgress } from "@/components/juice";
import { Check } from "@/components/Logo";
import type { PlayState } from "./types";
import { AnnotateScreen, SubmitScreen } from "./work-screens";
import { ReviewScreen, ReviseScreen, RevealScreen, ReflectScreen } from "./review-screens";

const POLL_MS = 2000;

const SPLASH: Record<string, { text: string; sub: string }> = {
  reading: { text: "Reading", sub: "Every answer lives in the text" },
  annotating: { text: "Annotate", sub: "Mark what matters" },
  prompt: { text: "The Prompt", sub: "Think before you type" },
  submitting: { text: "Submit Receipt", sub: "Show your proof" },
  peer_review: { text: "Vote", sub: "Which receipt holds up?" },
  revising: { text: "Revise", sub: "Second draft beats first draft" },
  reveal: { text: "Reveal", sub: "How the class thought" },
  reflection: { text: "Reflect", sub: "What changed in your thinking?" },
  complete: { text: "Round Complete", sub: "Evidence. Claims. Proof." },
};

const PHASE_TITLES: Record<string, string> = {
  lobby: "Lobby",
  reading: "Reading",
  annotating: "Annotate",
  prompt: "The Prompt",
  submitting: "Submit Receipt",
  peer_review: "Vote",
  revising: "Revise",
  reveal: "Reveal",
  reflection: "Reflect",
  complete: "Done",
  cancelled: "Ended",
};

export function PlayClient({ roundId }: { roundId: string }) {
  const [state, setState] = useState<PlayState | null>(null);
  const [gone, setGone] = useState(false);
  const [offline, setOffline] = useState(false);
  const [splash, setSplash] = useState<{ text: string; sub: string; key: string } | null>(null);
  const prevPhase = useRef<string | null>(null);

  const terminal = useRef(false);
  const lastPoll = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/play/state?roundId=${encodeURIComponent(roundId)}`, { cache: "no-store" });
      if (res.status === 401 || res.status === 404) {
        // Removed, expired, or the round id is bogus — don't poll forever.
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
      terminal.current = phase === "complete" || phase === "cancelled";
      setState(next);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [roundId]);

  useEffect(() => {
    refresh();
    // Once the round is over there's nothing new to fetch — drop to a slow
    // heartbeat so 30 abandoned tabs don't keep hammering the server.
    const t = setInterval(() => {
      const wait = terminal.current ? 20000 : POLL_MS;
      if (Date.now() - lastPoll.current >= wait) {
        lastPoll.current = Date.now();
        refresh();
      }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  if (gone) {
    return (
      <Shell>
        <div className="mx-auto max-w-md pt-16 text-center">
          <h1 className="display mb-3 text-4xl">You&apos;re not in this round</h1>
          <p className="mb-8 text-muted-500">You may have been removed, or your session expired.</p>
          <Link href="/play" className="btn btn-primary display px-8 py-3 text-2xl">
            Rejoin
          </Link>
        </div>
      </Shell>
    );
  }
  if (!state) {
    return (
      <Shell>
        <p className="pt-24 text-center text-muted-500">Connecting to your class…</p>
      </Shell>
    );
  }

  const { round } = state;
  const phase = round.underlyingPhase;

  return (
    <Shell>
      {splash && <PhaseSplash text={splash.text} sub={splash.sub} splashKey={splash.key} />}
      {phase === "reveal" && <Confetti />}

      <header className="sticky top-0 z-40 border-b border-line-300 bg-paper-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <span className="display hl-mark text-xl">Receipts</span>
          <span className="accent-label hidden text-muted-500 sm:inline">Code {round.joinCode}</span>
          <span
            className="phase-pill phase-active rounded-full px-3 py-1 text-xs"
            data-testid="student-phase"
          >
            {PHASE_TITLES[phase] ?? phase}
          </span>
          <div className="ml-auto flex items-center gap-2.5">
            {offline && (
              <span className="rounded-lg bg-coral-100 px-2 py-1 text-xs font-bold text-coral-600">
                Reconnecting…
              </span>
            )}
            <span className="hidden text-sm text-muted-500 sm:inline">
              <span className="font-bold text-ink-900">{state.me.name}</span>
            </span>
            <Countdown endsAt={round.phaseEndsAt} pausedRemainingMs={round.paused ? round.pausedRemainingMs : null} />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl grow px-4 py-6 sm:px-6">
        {round.paused && (
          <div className="pop mx-auto mb-6 max-w-3xl rounded-xl border-2 border-navy-950 bg-paper-50 p-4 text-center">
            <span className="display text-3xl">Paused</span>
            <p className="mt-1 text-sm text-muted-500">Eyes on your teacher. Your work is saved.</p>
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
        <p className="mx-auto max-w-md pt-16 text-center text-lg text-muted-500">
          This round was ended by your teacher.
        </p>
      );
    default:
      return null;
  }
}

const TICKER_LINES = [
  "Show your proof.",
  "Back it up.",
  "Strong claims need anchors.",
  "Quote the text, then prove why it matters.",
  "Weak evidence gets exposed in the vote.",
  "Read like the answer is hiding — because it is.",
  "A receipt is a quote plus the reasoning that makes it stick.",
];

function LobbyScreen({ state }: { state: PlayState }) {
  return (
    <div className="relative mx-auto max-w-md pt-4 text-center">
      <FloatingQuotes />
      <h1 className="display mb-1 text-6xl">
        You&apos;re in, <span className="hl-mark">{state.me.name}</span>.
      </h1>
      <div className="mb-4 mt-3 min-h-6">
        <HypeTicker lines={TICKER_LINES} />
      </div>

      <div className="card rise mb-4 p-4">
        <div key={state.pulse.joined} className="display pop text-5xl text-teal-600">
          {state.pulse.joined}
        </div>
        <div className="accent-label text-muted-500">
          student{state.pulse.joined === 1 ? "" : "s"} in the room
        </div>
      </div>

      <div className="paper receipt-jagged rise p-6 text-left text-sm">
        <h3 className="display mb-3 text-2xl">How a round works</h3>
        <ol className="space-y-2 text-ink-900/85">
          <Step n={1} title="Read">Every answer lives in the text.</Step>
          <Step n={2} title="Annotate">Mark what matters. Fewer, sharper highlights win.</Step>
          <Step n={3} title="Submit your receipt">A claim, an exact quote, and reasoning that makes it stick.</Step>
          <Step n={4} title="Vote">Judge two anonymous receipts. Evidence, not friendship.</Step>
          <Step n={5} title="Revise">Strengthen your answer — or defend it with a reason.</Step>
        </ol>
        <p className="mt-4 text-center font-bold text-navy-950">
          No opinions without <span className="hl-mark">proof</span>.
        </p>
      </div>
      <p className="mt-4 animate-pulse text-sm text-muted-500">Waiting for your teacher to start…</p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="display mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-950 text-sm text-paper-50">
        {n}
      </span>
      <span>
        <span className="font-bold text-navy-950">{title}.</span> {children}
      </span>
    </li>
  );
}

function ReadingScreen({ state }: { state: PlayState }) {
  if (!state.passage) return null;
  return (
    <div className="mx-auto max-w-3xl">
      <ScrollProgress />
      <CaseHeader
        title={state.passage.title}
        subtitle="Read the whole thing — the teal bar up top tracks your progress. You'll annotate next, so notice moments that feel important."
      />
      <PassageView text={state.passage.text} />
      <VocabNotes notes={state.passage.vocabNotes} />
    </div>
  );
}

function PromptScreen({ state }: { state: PlayState }) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="paper receipt-jagged pop relative mb-6 p-6 sm:p-8">
        <span className="accent-label text-coral-600">{state.prompt?.promptType}</span>
        <p className="display mt-2 text-4xl leading-tight sm:text-5xl">{state.prompt?.text}</p>
        <p className="mt-3 text-sm text-muted-500">
          Think before you type: which exact words in the text are your strongest proof? Submissions
          open when your teacher says go.
        </p>
      </div>
      {state.passage && <PassageView text={state.passage.text} highlights={state.annotations} />}
    </div>
  );
}

function CompleteScreen({ state }: { state: PlayState }) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 pt-4 text-center">
        <div className="mb-3 flex justify-center"><Check className="h-14 w-14" /></div>
        <h1 className="display text-5xl">
          Round <span className="hl-mark">complete</span>.
        </h1>
        <p className="mt-3 text-muted-500">
          Strong work, {state.me.name}. Your thinking is saved for your teacher.
        </p>
      </div>
      {state.reveal && <RevealScreen state={state} />}
    </div>
  );
}

export function CaseHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline gap-3">
        <span aria-hidden className="font-serif text-4xl font-bold leading-none text-teal-500">&ldquo;</span>
        <h1 className="display text-4xl">{title}</h1>
      </div>
      {subtitle && <p className="mt-1 text-sm text-muted-500">{subtitle}</p>}
    </div>
  );
}

export function VocabNotes({ notes }: { notes: string | null | undefined }) {
  if (!notes) return null;
  return (
    <details className="card mt-4 p-4">
      <summary className="cursor-pointer text-sm font-bold text-teal-600">Vocabulary help</summary>
      <p className="mt-2 whitespace-pre-wrap text-sm text-ink-900/85">{notes}</p>
    </details>
  );
}
