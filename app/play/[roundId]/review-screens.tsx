"use client";

import { useEffect, useRef, useState } from "react";
import { PassageView } from "@/components/PassageView";
import { ClassMeter, CountUp, PhaseSplash } from "@/components/juice";
import { Check } from "@/components/Logo";
import { PEER_CRITERIA } from "@/lib/tags";
import { LIMITS } from "@/lib/validate";
import { postJson, type PlayState, type PlayComparison, type AnonSubmission } from "./types";

// ---------------------------------------------------------------------------
// Vote — anonymous side-by-side comparison with required justification
// ---------------------------------------------------------------------------

export function ReviewScreen({ state, refresh }: { state: PlayState; refresh: () => Promise<void> }) {
  const comparisons = state.comparisons ?? [];
  const current = comparisons.find((c) => !c.completed);
  const doneCount = comparisons.filter((c) => c.completed).length;
  const [lockKey, setLockKey] = useState(0);

  if (comparisons.length === 0) {
    return (
      <p className="mx-auto max-w-md pt-12 text-center text-muted-500">
        No comparisons assigned to you this round. Watch the board — the reveal is coming.
      </p>
    );
  }
  if (!current) {
    return (
      <div className="mx-auto max-w-md pt-8 text-center">
        {lockKey > 0 && <PhaseSplash text="Vote locked" splashKey={`lock-${lockKey}`} durationMs={1100} />}
        <div className="mb-3 flex justify-center"><Check className="h-12 w-12" /></div>
        <h1 className="display text-4xl">Voting complete</h1>
        <p className="mt-3 text-muted-500">
          You judged {doneCount} matchup{doneCount === 1 ? "" : "s"}. Next: use what you saw to
          strengthen your own receipt.
        </p>
        <div className="mx-auto mt-6 max-w-xs">
          <ClassMeter label="Class votes in" value={state.pulse.reviewsDone} total={state.pulse.reviewsAssigned} />
        </div>
      </div>
    );
  }
  return (
    <>
      {lockKey > 0 && <PhaseSplash text="Vote locked" splashKey={`lock-${lockKey}`} durationMs={1100} />}
      <ComparisonCard
        key={current.id}
        comparison={current}
        index={doneCount + 1}
        total={comparisons.length}
        state={state}
        refresh={refresh}
        onLocked={() => setLockKey((k) => k + 1)}
      />
    </>
  );
}

function ComparisonCard({
  comparison,
  index,
  total,
  state,
  refresh,
  onLocked,
}: {
  comparison: PlayComparison;
  index: number;
  total: number;
  state: PlayState;
  refresh: () => Promise<void>;
  onLocked: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [criteria, setCriteria] = useState<string[]>([]);
  const [justification, setJustification] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    if (!selected) {
      setError("Pick the stronger receipt first.");
      return;
    }
    setBusy(true);
    const { ok, data } = await postJson("/api/play/review", {
      roundId: state.round.id,
      comparisonId: comparison.id,
      selectedSubmissionId: selected,
      criteria,
      justification,
    });
    setBusy(false);
    if (!ok) {
      setError(data.error ?? "Couldn't save your vote.");
      return;
    }
    onLocked();
    await refresh();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 text-center">
        <h1 className="display text-5xl">
          Which receipt <span className="hl-mark">holds up</span>?
        </h1>
        <p className="mt-1 text-sm text-muted-500">
          Matchup {index} of {total} · Receipts are anonymous. Judge the evidence, not the person.
        </p>
        {state.prompt && (
          <p className="mx-auto mt-2 max-w-2xl rounded-xl bg-cream-200 px-3 py-2 text-sm text-ink-900/80">
            <span className="font-bold text-navy-950">The prompt was:</span> {state.prompt.text}
          </p>
        )}
      </div>

      <div className="relative mb-5 grid gap-4 md:grid-cols-2">
        <span className="display pointer-events-none absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-navy-950 bg-paper-50 px-3 py-1.5 text-xl md:block">
          vs
        </span>
        {([["A", comparison.a], ["B", comparison.b]] as [string, AnonSubmission][]).map(([label, sub]) => (
          <button
            key={sub.id}
            onClick={() => setSelected(sub.id)}
            className={`${label === "A" ? "slide-in-l" : "slide-in-r"} paper relative p-4 pt-6 text-left transition ${
              selected === sub.id
                ? "border-2 border-teal-500 shadow-[0_0_0_4px_rgba(20,184,166,0.15)]"
                : "hover:border-navy-700"
            }`}
          >
            <span className="accent-label absolute -top-2.5 left-4 rounded bg-navy-950 px-2 py-0.5 text-paper-50">
              Receipt {label}
            </span>
            {selected === sub.id && (
              <span className="pop absolute -top-3 right-4 flex items-center gap-1 rounded-full bg-teal-500 px-2.5 py-0.5 text-xs font-bold text-white">
                Your pick ✓
              </span>
            )}
            <div className="mb-2">
              <div className="accent-label text-muted-500">Claim</div>
              <p className="text-sm font-semibold text-navy-950">{sub.claim}</p>
            </div>
            <div className="mb-2">
              <div className="accent-label text-muted-500">Evidence</div>
              <blockquote className="mt-1 rounded-md bg-cream-100 px-2.5 py-1.5 font-serif text-sm italic">
                <span className="hl-mark">&ldquo;{sub.evidenceText}&rdquo;</span>
              </blockquote>
            </div>
            <div>
              <div className="accent-label text-muted-500">Reasoning</div>
              <p className="text-sm text-ink-900/85">{sub.reasoning}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="card mx-auto max-w-2xl p-5">
        <div className="mb-3">
          <div className="mb-1.5 text-sm font-bold text-navy-950">Why does it hold up? Pick your reasons:</div>
          <div className="flex flex-wrap gap-1.5">
            {PEER_CRITERIA.map((c) => (
              <button
                key={c.id}
                onClick={() =>
                  setCriteria((prev) => (prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]))
                }
                className={`accent-label rounded-md border-2 px-2.5 py-1 transition ${
                  criteria.includes(c.id)
                    ? "border-teal-500 bg-teal-500 text-white"
                    : "border-line-300 text-ink-900/70 hover:border-teal-500"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <label className="mb-3 block">
          <div className="mb-1 text-sm font-bold text-navy-950">Justify your vote — be specific:</div>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={3}
            maxLength={LIMITS.justification.max}
            placeholder="Receipt A's quote actually shows fear, not anger, because…"
            className="field text-sm"
          />
          <div className="mt-1 text-right text-xs text-muted-500">
            {justification.length}/{LIMITS.justification.min}+ characters
          </div>
        </label>
        {error && (
          <p className="pop mb-3 rounded-xl border-2 border-coral-500 bg-coral-100 px-3 py-2 text-sm font-semibold text-coral-600">
            {error}
          </p>
        )}
        <button onClick={submit} disabled={busy} className="btn btn-primary display w-full py-3 text-2xl">
          {busy ? "Saving…" : "Lock in my vote"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Revise
// ---------------------------------------------------------------------------

export function ReviseScreen({ state, refresh }: { state: PlayState; refresh: () => Promise<void> }) {
  const sub = state.submission;
  const rev = state.revision;
  const [mode, setMode] = useState<"choose" | "revise" | "defend">("choose");
  const [evidence, setEvidence] = useState<{ start: number; end: number; text: string } | null>(
    sub ? { start: sub.evidenceStart, end: sub.evidenceEnd, text: sub.evidenceText } : null,
  );
  const [claim, setClaim] = useState(rev?.claim ?? sub?.claim ?? "");
  const [reasoning, setReasoning] = useState(rev?.reasoning ?? sub?.reasoning ?? "");
  const [explanation, setExplanation] = useState(rev?.changeExplanation ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedKey, setSavedKey] = useState(0);
  const [lastSaveKept, setLastSaveKept] = useState(false);

  // On phones the revision form sits below the passage — bring it into view
  // when the student picks a new quote.
  const reviseFormRef = useRef<HTMLDivElement>(null);
  const hadEvidence = useRef(true);
  useEffect(() => {
    if (mode === "revise" && evidence && !hadEvidence.current && window.matchMedia("(max-width: 1023px)").matches) {
      reviseFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    hadEvidence.current = !!evidence;
  }, [evidence, mode]);

  if (!sub) {
    return (
      <p className="mx-auto max-w-md pt-12 text-center text-muted-500">
        You didn&apos;t submit a receipt this round, so there&apos;s nothing to revise. Follow the
        discussion — you&apos;ll be in the next one.
      </p>
    );
  }

  async function save(keepOriginal: boolean) {
    setError(null);
    setBusy(true);
    const { ok, data } = await postJson("/api/play/revise", {
      roundId: state.round.id,
      keepOriginal,
      revisedClaim: claim,
      revisedReasoning: reasoning,
      revisedEvidenceStart: evidence?.start,
      revisedEvidenceEnd: evidence?.end,
      changeExplanation: explanation,
    });
    setBusy(false);
    if (!ok) {
      setError(data.error ?? "Couldn't save your revision.");
      return;
    }
    setLastSaveKept(keepOriginal);
    setSavedKey((k) => k + 1);
    await refresh();
    setMode("choose");
  }

  const fb = state.peerFeedback;

  return (
    <div className="mx-auto max-w-5xl">
      {savedKey > 0 && (
        <PhaseSplash
          text={lastSaveKept ? "Defense submitted" : "Revision submitted"}
          splashKey={`rev-${savedKey}`}
          durationMs={1200}
        />
      )}
      <h1 className="display mb-1 text-center text-5xl">
        Revise your <span className="hl-mark">reasoning</span>
      </h1>
      <p className="mb-5 text-center text-sm text-muted-500">
        Second draft beats first draft. You just judged other receipts — now strengthen yours, or
        defend it with a reason.
      </p>

      {rev && (
        <p className="pop mx-auto mb-4 flex max-w-2xl items-center justify-center gap-2 rounded-xl border-2 border-teal-500 bg-teal-100 px-4 py-2 text-center text-sm font-bold text-teal-600">
          <Check className="h-4 w-4" /> {rev.keptOriginal ? "Defense" : "Revision"} submitted. You can
          still change it until time&apos;s up.
        </p>
      )}

      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <div className="paper p-4">
          <h2 className="accent-label mb-2 text-muted-500">Your original receipt</h2>
          <p className="mb-1 text-sm font-semibold text-navy-950">{sub.claim}</p>
          <blockquote className="my-1.5 rounded-md bg-cream-100 px-2.5 py-1.5 font-serif text-sm italic">
            <span className="hl-mark">&ldquo;{sub.evidenceText}&rdquo;</span>
          </blockquote>
          <p className="text-sm text-ink-900/85">{sub.reasoning}</p>
        </div>
        <div className="card p-4">
          <h2 className="accent-label mb-2 text-muted-500">What voters said</h2>
          {fb && fb.timesCompared > 0 ? (
            <>
              <p className="mb-2 text-sm text-ink-900/85">
                Your receipt went head-to-head <strong>{fb.timesCompared}</strong> time
                {fb.timesCompared === 1 ? "" : "s"} and won{" "}
                <strong className="display text-lg text-teal-600">{fb.votesFor}</strong>.
              </p>
              <ul className="space-y-1.5">
                {fb.justifications.slice(0, 4).map((j, i) => (
                  <li
                    key={i}
                    className={`rounded-md border-l-4 px-2.5 py-1.5 text-xs ${
                      j.pickedMine
                        ? "border-teal-500 bg-teal-100 text-teal-600"
                        : "border-coral-500 bg-cream-100 text-ink-900/75"
                    }`}
                  >
                    <span className="font-bold">{j.pickedMine ? "✓ Picked yours: " : "Picked the other: "}</span>
                    {j.text}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-500">
              No votes on your receipt yet. Revise based on the strong work you just read.
            </p>
          )}
        </div>
      </div>

      {mode === "choose" && (
        <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row">
          <button onClick={() => setMode("revise")} className="btn btn-primary flex-1 flex-col py-4">
            <span className="display text-2xl">Revise it</span>
            <span className="text-xs font-semibold opacity-80">Find better evidence or sharpen the reasoning</span>
          </button>
          <button onClick={() => setMode("defend")} className="btn btn-secondary flex-1 flex-col py-4">
            <span className="display text-2xl">Defend it</span>
            <span className="text-xs font-semibold text-muted-500">Explain why your original holds up</span>
          </button>
        </div>
      )}

      {mode === "revise" && state.passage && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm text-muted-500">Want stronger evidence? Select a new quote from the passage.</p>
            <PassageView
              text={state.passage.text}
              highlights={state.annotations}
              evidenceRange={evidence ? { start: evidence.start, end: evidence.end } : null}
              selectable
              onSelectRange={(start, end, text) => setEvidence({ start, end, text })}
            />
          </div>
          <div ref={reviseFormRef} className="scroll-mt-16 lg:sticky lg:top-16 lg:self-start">
            <div className="paper receipt-jagged p-6">
              <h2 className="display mb-3 text-2xl">Your revision</h2>
              {evidence && (
                <blockquote className="mb-3 rounded-md border-l-4 border-mark-400 bg-cream-100 px-3 py-2 font-serif text-sm italic">
                  &ldquo;{truncate(evidence.text, 220)}&rdquo;
                </blockquote>
              )}
              <label className="mb-3 block">
                <div className="mb-1 text-sm font-bold text-navy-950">Claim</div>
                <textarea value={claim} onChange={(e) => setClaim(e.target.value)} rows={2} className="field text-sm" />
              </label>
              <label className="mb-3 block">
                <div className="mb-1 text-sm font-bold text-navy-950">Reasoning</div>
                <textarea value={reasoning} onChange={(e) => setReasoning(e.target.value)} rows={4} className="field text-sm" />
              </label>
              <label className="mb-3 block">
                <div className="mb-1 text-sm font-bold text-navy-950">What did you change, and why?</div>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  rows={2}
                  placeholder="I swapped my evidence because the trust line proves WHY the shaking hands matter…"
                  className="field text-sm"
                />
              </label>
              {error && (
                <p className="pop mb-3 rounded-xl border-2 border-coral-500 bg-coral-100 px-3 py-2 text-sm font-semibold text-coral-600">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <button onClick={() => save(false)} disabled={busy} className="btn btn-primary display flex-1 py-2.5 text-xl">
                  {busy ? "Saving…" : "Submit revision"}
                </button>
                <button onClick={() => setMode("choose")} className="px-3 text-sm text-muted-500 underline">
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === "defend" && (
        <div className="paper receipt-jagged mx-auto max-w-2xl p-6">
          <h2 className="display mb-2 text-2xl">Defend your original</h2>
          <p className="mb-3 text-sm text-muted-500">
            Keeping your answer is a reasoning move — but you have to earn it. What did you see in
            other receipts, and why does yours still hold up?
          </p>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={4}
            placeholder="I'm keeping my evidence because it's the only quote that shows what Lena does when nobody is watching, which matters because…"
            className="field mb-3 text-sm"
          />
          {error && (
            <p className="pop mb-3 rounded-xl border-2 border-coral-500 bg-coral-100 px-3 py-2 text-sm font-semibold text-coral-600">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={() => save(true)} disabled={busy} className="btn btn-primary display flex-1 py-2.5 text-xl">
              {busy ? "Saving…" : "Submit my defense"}
            </button>
            <button onClick={() => setMode("choose")} className="px-3 text-sm text-muted-500 underline">
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reveal + Reflect
// ---------------------------------------------------------------------------

export function RevealScreen({ state }: { state: PlayState }) {
  const reveal = state.reveal;
  if (!reveal) return <p className="pt-12 text-center text-muted-500">Waiting for the reveal…</p>;
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="display mb-5 text-center text-6xl">
        The <span className="hl-mark">reveal</span>
      </h1>
      <div className="mb-6 grid grid-cols-3 gap-3 text-center">
        <Stat label="Receipts submitted" value={reveal.totalSubmissions} />
        <Stat label="Votes cast" value={reveal.totalVotesCast} />
        <Stat label="Revisions + defenses" value={reveal.totalRevised} />
      </div>

      {reveal.spotlights.length > 0 && (
        <section className="mb-6">
          <h2 className="display mb-3 text-3xl">Teacher spotlight</h2>
          <div className="space-y-4">
            {reveal.spotlights.map((s, i) => (
              <div key={i} className="rise paper receipt-jagged relative p-5 pt-6">
                <span className="accent-label absolute -top-1 left-5 rounded bg-mark-400 px-2 py-0.5 text-navy-950">
                  This receipt holds up
                </span>
                <p className="mb-1 text-sm font-semibold text-navy-950">{s.claim}</p>
                <blockquote className="my-1.5 font-serif text-sm italic">
                  <span className="hl-mark">&ldquo;{s.evidenceText}&rdquo;</span>
                </blockquote>
                <p className="text-sm text-ink-900/85">{s.reasoning}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {reveal.evidenceClusters.length > 0 && (
        <section>
          <h2 className="display mb-3 text-3xl">Where the class found evidence</h2>
          <ul className="space-y-2">
            {reveal.evidenceClusters.map((c, i) => (
              <li key={i} className="rise card p-3" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="mb-1 flex items-center gap-2 text-xs">
                  <span className="display rounded-md bg-navy-950 px-2 py-0.5 text-sm text-paper-50">{c.count}×</span>
                  {c.votes > 0 && (
                    <span className="font-bold text-teal-600">
                      {c.votes} vote{c.votes === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <p className="font-serif text-sm italic text-ink-900/85">&ldquo;{c.text}&rdquo;</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card pop p-3">
      <div className="display text-4xl text-teal-600">
        <CountUp value={value} />
      </div>
      <div className="accent-label text-muted-500">{label}</div>
    </div>
  );
}

export function ReflectScreen({ state, refresh }: { state: PlayState; refresh: () => Promise<void> }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (state.reflected) {
    return (
      <div className="mx-auto max-w-md pt-8 text-center">
        <div className="mb-3 flex justify-center"><Check className="h-12 w-12" /></div>
        <h1 className="display text-4xl">Reflection saved</h1>
        <p className="mt-3 text-muted-500">Strong round. Your teacher can see how your thinking changed.</p>
      </div>
    );
  }

  async function submit() {
    setError(null);
    setBusy(true);
    const { ok, data } = await postJson("/api/play/reflect", { roundId: state.round.id, text });
    setBusy(false);
    if (!ok) {
      setError(data.error ?? "Couldn't save.");
      return;
    }
    await refresh();
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="display mb-1 text-center text-5xl">Reflect</h1>
      <p className="mb-4 text-center text-sm text-muted-500">
        One honest sentence or two. Pick a starter if you&apos;re stuck:
      </p>
      <div className="mb-3 flex flex-wrap justify-center gap-1.5">
        {[
          "My evidence got stronger when…",
          "I changed my claim because…",
          "The strongest receipt I saw…",
          "I defended my answer because…",
        ].map((starter) => (
          <button
            key={starter}
            onClick={() => setText((t) => (t ? t : starter + " "))}
            className="rounded-md border border-line-300 bg-paper-50 px-2.5 py-1 text-xs font-semibold text-ink-900/75 hover:border-teal-500 hover:text-teal-600"
          >
            {starter}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="field ruled mb-3 text-sm"
        placeholder="What actually changed in your thinking this round?"
      />
      {error && (
        <p className="pop mb-3 rounded-xl border-2 border-coral-500 bg-coral-100 px-3 py-2 text-sm font-semibold text-coral-600">
          {error}
        </p>
      )}
      <button onClick={submit} disabled={busy} className="btn btn-primary display w-full py-3 text-2xl">
        {busy ? "Saving…" : "Save my reflection"}
      </button>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}
