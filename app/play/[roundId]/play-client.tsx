"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { PassageView } from "@/components/PassageView";
import { PHASE_LABELS } from "@/lib/phases";
import type { PlayState } from "./types";
import { AnnotateScreen, SubmitScreen } from "./work-screens";
import { ReviewScreen, ReviseScreen, RevealScreen, ReflectScreen } from "./review-screens";

const POLL_MS = 2000;

export function PlayClient({ roundId }: { roundId: string }) {
  const [state, setState] = useState<PlayState | null>(null);
  const [gone, setGone] = useState(false);
  const [offline, setOffline] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/play/state?roundId=${encodeURIComponent(roundId)}`, { cache: "no-store" });
      if (res.status === 401) {
        setGone(true);
        return;
      }
      if (!res.ok) return;
      setState(await res.json());
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [roundId]);

  useEffect(() => {
    refresh();
    timer.current = setInterval(refresh, POLL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [refresh]);

  if (gone) {
    return (
      <Shell>
        <div className="mx-auto max-w-md text-center">
          <h1 className="mb-3 font-serif text-2xl font-bold">You&apos;re not in this round</h1>
          <p className="mb-6 text-ink-700">
            You may have been removed, or your session expired.
          </p>
          <Link href="/play" className="rounded-xl bg-ink-950 px-6 py-3 font-semibold text-paper-50">
            Join again
          </Link>
        </div>
      </Shell>
    );
  }
  if (!state) {
    return (
      <Shell>
        <p className="text-center text-ink-500">Connecting to your class…</p>
      </Shell>
    );
  }

  const { round } = state;
  const phase = round.underlyingPhase;

  return (
    <Shell>
      <header className="mx-auto mb-6 flex max-w-3xl items-center justify-between gap-3">
        <div>
          <div className="text-sm text-ink-500">
            Playing as <span className="font-semibold text-ink-950">{state.me.name}</span>
          </div>
          <div className="font-serif text-lg font-bold">{PHASE_LABELS[phase] ?? phase}</div>
        </div>
        <div className="flex items-center gap-2">
          {offline && <span className="rounded-lg bg-amber-100 px-2 py-1 text-xs text-amber-900">Reconnecting…</span>}
          <Countdown endsAt={round.phaseEndsAt} pausedRemainingMs={round.paused ? round.pausedRemainingMs : null} />
        </div>
      </header>

      {round.paused && (
        <div className="mx-auto mb-6 max-w-3xl rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-center font-semibold">
          ⏸ Game paused — eyes on your teacher. Your work is saved.
        </div>
      )}

      <div className={round.paused ? "pointer-events-none opacity-60" : ""}>
        <PhaseBody state={state} refresh={refresh} />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen px-4 py-6 sm:px-6">{children}</main>;
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
        <p className="mx-auto max-w-md text-center text-lg">This round was ended by your teacher.</p>
      );
    default:
      return null;
  }
}

function LobbyScreen({ state }: { state: PlayState }) {
  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mb-6 text-6xl">✅</div>
      <h1 className="mb-2 font-serif text-3xl font-bold">You&apos;re in, {state.me.name}!</h1>
      <p className="mb-8 text-ink-700">Waiting for your teacher to start the round.</p>
      <div className="rounded-xl border border-paper-200 bg-white p-5 text-left text-sm text-ink-700">
        <h2 className="mb-2 font-semibold text-ink-950">How Evidence Battle works</h2>
        <ol className="list-inside list-decimal space-y-1">
          <li>Read the passage carefully.</li>
          <li>Highlight and tag what matters.</li>
          <li>Answer the challenge with a claim + evidence + reasoning.</li>
          <li>Judge two anonymous classmates&apos; responses.</li>
          <li>Revise your answer — or defend it.</li>
        </ol>
        <p className="mt-3 font-medium text-accent-600">Bring the receipts. Random quotes don&apos;t win.</p>
      </div>
    </div>
  );
}

function ReadingScreen({ state }: { state: PlayState }) {
  if (!state.passage) return null;
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 font-serif text-2xl font-bold">{state.passage.title}</h1>
      <p className="mb-4 text-sm text-ink-500">
        Read the whole passage. You&apos;ll annotate next, so notice moments that feel important.
      </p>
      <PassageView text={state.passage.text} />
      <VocabNotes notes={state.passage.vocabNotes} />
    </div>
  );
}

function PromptScreen({ state }: { state: PlayState }) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 rounded-xl border-2 border-accent-600 bg-white p-6">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent-600">
          Challenge · {state.prompt?.promptType}
        </div>
        <p className="font-serif text-2xl font-bold leading-snug">{state.prompt?.text}</p>
        <p className="mt-3 text-sm text-ink-500">
          Think before you type: which piece of the text is your strongest receipt? Submission opens when
          your teacher advances.
        </p>
      </div>
      {state.passage && (
        <PassageView text={state.passage.text} highlights={state.annotations} />
      )}
    </div>
  );
}

function CompleteScreen({ state }: { state: PlayState }) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 text-center">
        <div className="mb-3 text-5xl">🏁</div>
        <h1 className="mb-2 font-serif text-3xl font-bold">Round complete</h1>
        <p className="text-ink-700">Nice work, {state.me.name}. Your thinking is saved for your teacher.</p>
      </div>
      {state.reveal && <RevealScreen state={state} />}
    </div>
  );
}

export function VocabNotes({ notes }: { notes: string | null | undefined }) {
  if (!notes) return null;
  return (
    <details className="mt-4 rounded-xl border border-paper-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold">Vocabulary help</summary>
      <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">{notes}</p>
    </details>
  );
}
