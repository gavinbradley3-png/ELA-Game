"use client";

import { useState } from "react";
import { PassageView } from "@/components/PassageView";
import { PEER_CRITERIA } from "@/lib/tags";
import { LIMITS } from "@/lib/validate";
import { postJson, type PlayState, type PlayComparison, type AnonSubmission } from "./types";

// ---------------------------------------------------------------------------
// Peer review: anonymous side-by-side comparison with required justification
// ---------------------------------------------------------------------------

export function ReviewScreen({ state, refresh }: { state: PlayState; refresh: () => Promise<void> }) {
  const comparisons = state.comparisons ?? [];
  const current = comparisons.find((c) => !c.completed);
  const doneCount = comparisons.filter((c) => c.completed).length;

  if (comparisons.length === 0) {
    return (
      <p className="mx-auto max-w-md text-center text-ink-700">
        No comparisons assigned to you this round. Watch the board — discussion is coming.
      </p>
    );
  }
  if (!current) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="mb-3 text-5xl">🧑‍⚖️</div>
        <h1 className="mb-2 font-serif text-2xl font-bold">All comparisons done</h1>
        <p className="text-ink-700">
          You judged {doneCount} matchup{doneCount === 1 ? "" : "s"}. Next: use what you saw to make your
          own answer stronger.
        </p>
      </div>
    );
  }
  return (
    <ComparisonCard
      key={current.id}
      comparison={current}
      index={doneCount + 1}
      total={comparisons.length}
      state={state}
      refresh={refresh}
    />
  );
}

function ComparisonCard({
  comparison,
  index,
  total,
  state,
  refresh,
}: {
  comparison: PlayComparison;
  index: number;
  total: number;
  state: PlayState;
  refresh: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [criteria, setCriteria] = useState<string[]>([]);
  const [justification, setJustification] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    if (!selected) {
      setError("Pick the stronger response first.");
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
    await refresh();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 text-center">
        <h1 className="font-serif text-2xl font-bold">Which response is stronger?</h1>
        <p className="text-sm text-ink-500">
          Matchup {index} of {total} · Responses are anonymous. Judge the thinking, not the person.
        </p>
        {state.prompt && (
          <p className="mx-auto mt-2 max-w-2xl rounded-lg bg-paper-100 px-3 py-2 text-sm">
            <span className="font-semibold">The challenge was:</span> {state.prompt.text}
          </p>
        )}
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-2">
        {([["A", comparison.a], ["B", comparison.b]] as [string, AnonSubmission][]).map(([label, sub]) => (
          <button
            key={sub.id}
            onClick={() => setSelected(sub.id)}
            className={`rounded-xl border-2 bg-white p-4 text-left transition ${
              selected === sub.id ? "border-accent-600 ring-2 ring-accent-600/30" : "border-paper-200 hover:border-ink-500"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="rounded-full bg-ink-950 px-2.5 py-0.5 text-xs font-bold text-paper-50">
                Response {label}
              </span>
              {selected === sub.id && <span className="text-sm font-semibold text-accent-600">Your pick ✓</span>}
            </div>
            <div className="mb-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">Claim</div>
              <p className="text-sm font-medium">{sub.claim}</p>
            </div>
            <div className="mb-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">Evidence</div>
              <blockquote className="border-l-2 border-paper-200 pl-2 font-serif text-sm italic text-ink-700">
                &ldquo;{sub.evidenceText}&rdquo;
              </blockquote>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">Reasoning</div>
              <p className="text-sm text-ink-700">{sub.reasoning}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-2xl rounded-xl border border-paper-200 bg-white p-5">
        <div className="mb-3">
          <div className="mb-1.5 text-sm font-medium">Why is it stronger? Pick your reasons:</div>
          <div className="flex flex-wrap gap-1.5">
            {PEER_CRITERIA.map((c) => (
              <button
                key={c.id}
                onClick={() =>
                  setCriteria((prev) => (prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]))
                }
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                  criteria.includes(c.id) ? "border-ink-950 bg-ink-950 text-paper-50" : "border-paper-200 hover:bg-paper-100"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <label className="mb-3 block">
          <div className="mb-1 text-sm font-medium">Justify your vote — be specific:</div>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={3}
            maxLength={LIMITS.justification.max}
            placeholder="Response A's evidence actually shows fear, not anger, because…"
            className="w-full rounded-lg border border-paper-200 px-3 py-2 text-sm"
          />
          <div className="mt-1 text-right text-xs text-ink-500">
            {justification.length}/{LIMITS.justification.min}+ characters
          </div>
        </label>
        {error && <p className="mb-3 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-900">{error}</p>}
        <button
          onClick={submit}
          disabled={busy}
          className="w-full rounded-xl bg-ink-950 px-4 py-3 font-semibold text-paper-50 hover:bg-ink-900 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Lock in my vote"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Revision: see peer feedback, then revise or defend
// ---------------------------------------------------------------------------

export function ReviseScreen({ state, refresh }: { state: PlayState; refresh: () => Promise<void> }) {
  const sub = state.submission;
  const rev = state.revision;
  const [mode, setMode] = useState<"choose" | "revise" | "defend">(rev ? "choose" : "choose");
  const [evidence, setEvidence] = useState<{ start: number; end: number; text: string } | null>(
    sub ? { start: sub.evidenceStart, end: sub.evidenceEnd, text: sub.evidenceText } : null,
  );
  const [claim, setClaim] = useState(rev?.claim ?? sub?.claim ?? "");
  const [reasoning, setReasoning] = useState(rev?.reasoning ?? sub?.reasoning ?? "");
  const [explanation, setExplanation] = useState(rev?.changeExplanation ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!sub) {
    return (
      <p className="mx-auto max-w-md text-center text-ink-700">
        You didn&apos;t submit a response this round, so there&apos;s nothing to revise. Follow the class
        discussion — you&apos;ll battle next round.
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
    await refresh();
    setMode("choose");
  }

  const fb = state.peerFeedback;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-center font-serif text-2xl font-bold">Second draft beats first draft</h1>
      <p className="mb-5 text-center text-sm text-ink-500">
        You just judged other responses. Now make yours stronger — or defend why it already holds up.
      </p>

      {rev && (
        <p className="mx-auto mb-4 max-w-2xl rounded-lg bg-emerald-100 px-4 py-2 text-center text-sm font-medium text-emerald-900">
          ✓ Revision saved{rev.keptOriginal ? " (defended original)" : ""}. You can still change it until the phase ends.
        </p>
      )}

      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-paper-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">Your original response</h2>
          <p className="mb-1 text-sm font-medium">{sub.claim}</p>
          <blockquote className="mb-1 border-l-2 border-paper-200 pl-2 font-serif text-sm italic text-ink-700">
            &ldquo;{sub.evidenceText}&rdquo;
          </blockquote>
          <p className="text-sm text-ink-700">{sub.reasoning}</p>
        </div>
        <div className="rounded-xl border border-paper-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">What peers thought</h2>
          {fb && fb.timesCompared > 0 ? (
            <>
              <p className="mb-2 text-sm">
                Your response appeared in <strong>{fb.timesCompared}</strong> matchup{fb.timesCompared === 1 ? "" : "s"} and
                won <strong>{fb.votesFor}</strong>.
              </p>
              <ul className="space-y-1.5">
                {fb.justifications.slice(0, 4).map((j, i) => (
                  <li key={i} className={`rounded-lg px-2.5 py-1.5 text-xs ${j.pickedMine ? "bg-emerald-50 text-emerald-900" : "bg-paper-100 text-ink-700"}`}>
                    {j.pickedMine ? "✓ Picked yours: " : "✗ Picked the other: "}
                    {j.text}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-ink-500">No peer votes on your response yet. Revise based on the strong work you just read.</p>
          )}
        </div>
      </div>

      {mode === "choose" && (
        <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row">
          <button
            onClick={() => setMode("revise")}
            className="flex-1 rounded-xl bg-accent-600 px-4 py-4 font-semibold text-white hover:bg-accent-500"
          >
            ✏️ Revise my response
            <span className="block text-xs font-normal opacity-90">Change evidence, claim, or reasoning</span>
          </button>
          <button
            onClick={() => setMode("defend")}
            className="flex-1 rounded-xl border-2 border-ink-950 bg-white px-4 py-4 font-semibold hover:bg-paper-100"
          >
            🛡️ Defend my original
            <span className="block text-xs font-normal text-ink-500">Explain why it holds up against what you saw</span>
          </button>
        </div>
      )}

      {mode === "revise" && state.passage && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm text-ink-500">Want stronger evidence? Select a new quote from the passage.</p>
            <PassageView
              text={state.passage.text}
              highlights={state.annotations}
              evidenceRange={evidence ? { start: evidence.start, end: evidence.end } : null}
              selectable
              onSelectRange={(start, end, text) => setEvidence({ start, end, text })}
            />
          </div>
          <div className="lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-xl border border-paper-200 bg-white p-5">
              <h2 className="mb-3 font-serif text-lg font-bold">Revised response</h2>
              {evidence && (
                <blockquote className="mb-3 rounded-lg border-l-4 border-accent-600 bg-paper-100 px-3 py-2 font-serif text-sm italic">
                  &ldquo;{truncate(evidence.text, 220)}&rdquo;
                </blockquote>
              )}
              <label className="mb-3 block">
                <div className="mb-1 text-sm font-medium">Claim</div>
                <textarea value={claim} onChange={(e) => setClaim(e.target.value)} rows={2}
                  className="w-full rounded-lg border border-paper-200 px-3 py-2 text-sm" />
              </label>
              <label className="mb-3 block">
                <div className="mb-1 text-sm font-medium">Reasoning</div>
                <textarea value={reasoning} onChange={(e) => setReasoning(e.target.value)} rows={4}
                  className="w-full rounded-lg border border-paper-200 px-3 py-2 text-sm" />
              </label>
              <label className="mb-3 block">
                <div className="mb-1 text-sm font-medium">What did you change, and why?</div>
                <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2}
                  placeholder="I swapped my evidence because the quote about her hands shaking proves fear better than…"
                  className="w-full rounded-lg border border-paper-200 px-3 py-2 text-sm" />
              </label>
              {error && <p className="mb-3 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-900">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => save(false)} disabled={busy}
                  className="flex-1 rounded-xl bg-accent-600 px-4 py-3 font-semibold text-white hover:bg-accent-500 disabled:opacity-60">
                  {busy ? "Saving…" : "Save revision"}
                </button>
                <button onClick={() => setMode("choose")} className="rounded-xl px-3 py-3 text-sm text-ink-500 underline">
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === "defend" && (
        <div className="mx-auto max-w-2xl rounded-xl border border-paper-200 bg-white p-5">
          <h2 className="mb-2 font-serif text-lg font-bold">Defend your original</h2>
          <p className="mb-3 text-sm text-ink-500">
            Keeping your answer is a reasoning move too — but you have to earn it. What did you see in
            other responses, and why does yours still stand?
          </p>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={4}
            placeholder="I'm keeping my evidence because it's the only quote that shows what Lena does when nobody is watching, which matters because…"
            className="mb-3 w-full rounded-lg border border-paper-200 px-3 py-2 text-sm"
          />
          {error && <p className="mb-3 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-900">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => save(true)} disabled={busy}
              className="flex-1 rounded-xl bg-ink-950 px-4 py-3 font-semibold text-paper-50 hover:bg-ink-900 disabled:opacity-60">
              {busy ? "Saving…" : "Save my defense"}
            </button>
            <button onClick={() => setMode("choose")} className="rounded-xl px-3 py-3 text-sm text-ink-500 underline">
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reveal + Reflection
// ---------------------------------------------------------------------------

export function RevealScreen({ state }: { state: PlayState }) {
  const reveal = state.reveal;
  if (!reveal) return <p className="text-center text-ink-500">Waiting for the reveal…</p>;
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-center font-serif text-2xl font-bold">How the class thought</h1>
      <div className="mb-5 grid grid-cols-3 gap-3 text-center">
        <Stat label="Responses" value={reveal.totalSubmissions} />
        <Stat label="Peer votes cast" value={reveal.totalVotesCast} />
        <Stat label="Revisions made" value={reveal.totalRevised} />
      </div>

      {reveal.spotlights.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 font-serif text-lg font-bold">⭐ Spotlighted thinking</h2>
          <div className="space-y-3">
            {reveal.spotlights.map((s, i) => (
              <div key={i} className="rounded-xl border-2 border-accent-600 bg-white p-4">
                <p className="mb-1 text-sm font-semibold">{s.claim}</p>
                <blockquote className="mb-1 border-l-2 border-accent-600 pl-2 font-serif text-sm italic text-ink-700">
                  &ldquo;{s.evidenceText}&rdquo;
                </blockquote>
                <p className="text-sm text-ink-700">{s.reasoning}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {reveal.evidenceClusters.length > 0 && (
        <section>
          <h2 className="mb-2 font-serif text-lg font-bold">Where the class found evidence</h2>
          <ul className="space-y-2">
            {reveal.evidenceClusters.map((c, i) => (
              <li key={i} className="rounded-xl border border-paper-200 bg-white p-3">
                <div className="mb-1 flex items-center gap-2 text-xs text-ink-500">
                  <span className="rounded-full bg-paper-100 px-2 py-0.5 font-semibold">{c.count} student{c.count === 1 ? "" : "s"}</span>
                  {c.votes > 0 && <span>{c.votes} peer vote{c.votes === 1 ? "" : "s"}</span>}
                </div>
                <p className="font-serif text-sm italic">&ldquo;{c.text}&rdquo;</p>
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
    <div className="rounded-xl border border-paper-200 bg-white p-3">
      <div className="font-serif text-2xl font-bold">{value}</div>
      <div className="text-xs text-ink-500">{label}</div>
    </div>
  );
}

export function ReflectScreen({ state, refresh }: { state: PlayState; refresh: () => Promise<void> }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (state.reflected) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="mb-3 text-5xl">💭</div>
        <h1 className="mb-2 font-serif text-2xl font-bold">Reflection saved</h1>
        <p className="text-ink-700">Great round. Your teacher can see how your thinking changed.</p>
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
      <h1 className="mb-2 text-center font-serif text-2xl font-bold">Exit reflection</h1>
      <p className="mb-4 text-center text-sm text-ink-500">One honest sentence or two. Pick a starter if you&apos;re stuck:</p>
      <div className="mb-3 flex flex-wrap justify-center gap-1.5">
        {[
          "My evidence got stronger when…",
          "I changed my claim because…",
          "The other response I read taught me…",
          "I defended my answer because…",
        ].map((starter) => (
          <button key={starter} onClick={() => setText((t) => (t ? t : starter + " "))}
            className="rounded-lg border border-paper-200 bg-white px-2.5 py-1 text-xs hover:bg-paper-100">
            {starter}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="mb-3 w-full rounded-xl border border-paper-200 bg-white px-4 py-3 text-sm"
        placeholder="What actually changed in your thinking this round?"
      />
      {error && <p className="mb-3 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-900">{error}</p>}
      <button onClick={submit} disabled={busy}
        className="w-full rounded-xl bg-ink-950 px-4 py-3 font-semibold text-paper-50 hover:bg-ink-900 disabled:opacity-60">
        {busy ? "Saving…" : "Save reflection"}
      </button>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}
