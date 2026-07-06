"use client";

import { useState } from "react";
import { PassageView } from "@/components/PassageView";
import { ClassMeter } from "@/components/juice";
import { PEER_CRITERIA } from "@/lib/tags";
import { LIMITS } from "@/lib/validate";
import { postJson, type PlayState, type PlayComparison, type AnonSubmission } from "./types";

// ---------------------------------------------------------------------------
// Peer review — "Jury duty"
// ---------------------------------------------------------------------------

export function ReviewScreen({ state, refresh }: { state: PlayState; refresh: () => Promise<void> }) {
  const comparisons = state.comparisons ?? [];
  const current = comparisons.find((c) => !c.completed);
  const doneCount = comparisons.filter((c) => c.completed).length;

  if (comparisons.length === 0) {
    return (
      <p className="mx-auto max-w-md pt-12 text-center text-smoke-300">
        No cases assigned to you this round. Watch the board — the verdict is coming.
      </p>
    );
  }
  if (!current) {
    return (
      <div className="mx-auto max-w-md pt-8 text-center">
        <span className="stamp pop inline-block border-4 px-4 py-1 text-4xl text-win-400">Jury duty done</span>
        <p className="mt-4 text-smoke-300">
          You judged {doneCount} matchup{doneCount === 1 ? "" : "s"}. Next: use what you saw to make your own
          answer stronger.
        </p>
        <div className="mx-auto mt-6 max-w-xs">
          <ClassMeter label="Class votes in" value={state.pulse.reviewsDone} total={state.pulse.reviewsAssigned} />
        </div>
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
      setError("Pick the stronger exhibit first.");
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
        <h1 className="display text-5xl">Which one holds up in court?</h1>
        <p className="text-sm text-smoke-400">
          Matchup {index} of {total} · Exhibits are anonymous. Judge the thinking, not the person.
        </p>
        {state.prompt && (
          <p className="mx-auto mt-2 max-w-2xl rounded-xl bg-night-800 px-3 py-2 text-sm text-smoke-300">
            <span className="font-bold text-smoke-50">The question was:</span> {state.prompt.text}
          </p>
        )}
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-2">
        {([["A", comparison.a], ["B", comparison.b]] as [string, AnonSubmission][]).map(([label, sub]) => (
          <button
            key={sub.id}
            onClick={() => setSelected(sub.id)}
            className={`rise card relative p-4 pt-5 text-left transition ${
              selected === sub.id
                ? "border-4 border-gold-400 shadow-[0_0_30px_-8px_var(--color-gold-400)]"
                : "border-night-700 hover:border-smoke-400"
            }`}
          >
            <span
              className={`stamp absolute -top-3.5 left-4 border-2 px-2 py-0 text-sm ${
                selected === sub.id ? "bg-night-900 text-gold-400" : "bg-night-900 text-smoke-300"
              }`}
            >
              Exhibit {label}
            </span>
            {selected === sub.id && (
              <span className="pop absolute -top-3.5 right-4 rounded-full bg-gold-400 px-2.5 py-0.5 text-xs font-black text-night-950">
                YOUR PICK ✓
              </span>
            )}
            <div className="mb-2">
              <div className="text-xs font-bold uppercase tracking-wider text-smoke-400">Claim</div>
              <p className="text-sm font-semibold text-smoke-50">{sub.claim}</p>
            </div>
            <div className="mb-2">
              <div className="text-xs font-bold uppercase tracking-wider text-smoke-400">The receipt</div>
              <blockquote className="paper mt-1 px-2.5 py-1.5 font-serif text-sm italic">
                &ldquo;{sub.evidenceText}&rdquo;
              </blockquote>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-smoke-400">Reasoning</div>
              <p className="text-sm text-smoke-300">{sub.reasoning}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="card mx-auto max-w-2xl p-5">
        <div className="mb-3">
          <div className="mb-1.5 text-sm font-bold text-smoke-50">Why does it win? Pick your reasons:</div>
          <div className="flex flex-wrap gap-1.5">
            {PEER_CRITERIA.map((c) => (
              <button
                key={c.id}
                onClick={() =>
                  setCriteria((prev) => (prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]))
                }
                className={`rounded-lg border-2 px-2.5 py-1 text-xs font-bold transition ${
                  criteria.includes(c.id)
                    ? "border-gold-400 bg-gold-400 text-night-950"
                    : "border-night-600 text-smoke-300 hover:border-smoke-400"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <label className="mb-3 block">
          <div className="mb-1 text-sm font-bold text-smoke-50">Justify your verdict — be specific:</div>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={3}
            maxLength={LIMITS.justification.max}
            placeholder="Exhibit A's receipt actually shows fear, not anger, because…"
            className="field text-sm"
          />
          <div className="mt-1 text-right text-xs text-smoke-400">
            {justification.length}/{LIMITS.justification.min}+ characters
          </div>
        </label>
        {error && (
          <p className="pop mb-3 rounded-xl border-2 border-alarm-500 bg-alarm-500/10 px-3 py-2 text-sm font-semibold text-alarm-400">
            {error}
          </p>
        )}
        <button onClick={submit} disabled={busy} className="btn btn-gold display w-full py-3 text-3xl">
          {busy ? "Saving…" : "Lock in my verdict ⚖️"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Revision — "The appeal"
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

  if (!sub) {
    return (
      <p className="mx-auto max-w-md pt-12 text-center text-smoke-300">
        You didn&apos;t file a receipt this round, so there&apos;s nothing to revise. Follow the discussion —
        you&apos;ll battle next round.
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
      <h1 className="display mb-1 text-center text-5xl">Second draft beats first draft</h1>
      <p className="mb-5 text-center text-sm text-smoke-400">
        You just judged other detectives. Now upgrade your answer — or defend it like a pro.
      </p>

      {rev && (
        <p className="pop mx-auto mb-4 max-w-2xl rounded-xl border-2 border-win-400 bg-win-400/10 px-4 py-2 text-center text-sm font-bold text-win-400">
          ✓ {rev.keptOriginal ? "Defense filed" : "Appeal filed"}. You can still change it until time&apos;s up.
        </p>
      )}

      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-smoke-400">Your original response</h2>
          <p className="mb-1 text-sm font-semibold text-smoke-50">{sub.claim}</p>
          <blockquote className="paper my-1.5 px-2.5 py-1.5 font-serif text-sm italic">
            &ldquo;{sub.evidenceText}&rdquo;
          </blockquote>
          <p className="text-sm text-smoke-300">{sub.reasoning}</p>
        </div>
        <div className="card p-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-smoke-400">The jury&apos;s take</h2>
          {fb && fb.timesCompared > 0 ? (
            <>
              <p className="mb-2 text-sm text-smoke-300">
                Your response went to court <strong className="text-smoke-50">{fb.timesCompared}</strong> time
                {fb.timesCompared === 1 ? "" : "s"} and won{" "}
                <strong className="display text-xl text-gold-400">{fb.votesFor}</strong>.
              </p>
              <ul className="space-y-1.5">
                {fb.justifications.slice(0, 4).map((j, i) => (
                  <li
                    key={i}
                    className={`rounded-lg border-l-4 px-2.5 py-1.5 text-xs ${
                      j.pickedMine
                        ? "border-win-400 bg-win-400/10 text-win-400"
                        : "border-night-600 bg-night-800 text-smoke-300"
                    }`}
                  >
                    {j.pickedMine ? "✓ Picked yours: " : "✗ Picked the other: "}
                    {j.text}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-smoke-400">
              No jury votes on your response yet. Revise based on the strong work you just read.
            </p>
          )}
        </div>
      </div>

      {mode === "choose" && (
        <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row">
          <button onClick={() => setMode("revise")} className="btn btn-gold flex-1 flex-col py-4">
            <span className="display text-3xl">✏️ File an appeal</span>
            <span className="text-xs font-semibold opacity-80">Upgrade your evidence, claim, or reasoning</span>
          </button>
          <button onClick={() => setMode("defend")} className="btn btn-dark flex-1 flex-col py-4">
            <span className="display text-3xl">🛡️ Defend my original</span>
            <span className="text-xs font-semibold text-smoke-400">Explain why it still holds up</span>
          </button>
        </div>
      )}

      {mode === "revise" && state.passage && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm text-smoke-400">Want a stronger receipt? Select a new quote from the case file.</p>
            <PassageView
              text={state.passage.text}
              highlights={state.annotations}
              evidenceRange={evidence ? { start: evidence.start, end: evidence.end } : null}
              selectable
              onSelectRange={(start, end, text) => setEvidence({ start, end, text })}
            />
          </div>
          <div className="lg:sticky lg:top-16 lg:self-start">
            <div className="card p-5">
              <h2 className="display mb-3 text-2xl">The appeal</h2>
              {evidence && (
                <blockquote className="paper mb-3 px-3 py-2 font-serif text-sm italic">
                  &ldquo;{truncate(evidence.text, 220)}&rdquo;
                </blockquote>
              )}
              <label className="mb-3 block">
                <div className="mb-1 text-sm font-bold text-smoke-50">Claim</div>
                <textarea value={claim} onChange={(e) => setClaim(e.target.value)} rows={2} className="field text-sm" />
              </label>
              <label className="mb-3 block">
                <div className="mb-1 text-sm font-bold text-smoke-50">Reasoning</div>
                <textarea value={reasoning} onChange={(e) => setReasoning(e.target.value)} rows={4} className="field text-sm" />
              </label>
              <label className="mb-3 block">
                <div className="mb-1 text-sm font-bold text-smoke-50">What did you change, and why?</div>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  rows={2}
                  placeholder="I swapped my receipt because the trust line proves WHY the shaking hands matter…"
                  className="field text-sm"
                />
              </label>
              {error && (
                <p className="pop mb-3 rounded-xl border-2 border-alarm-500 bg-alarm-500/10 px-3 py-2 text-sm font-semibold text-alarm-400">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <button onClick={() => save(false)} disabled={busy} className="btn btn-gold display flex-1 py-2.5 text-2xl">
                  {busy ? "Filing…" : "File the appeal"}
                </button>
                <button onClick={() => setMode("choose")} className="px-3 text-sm text-smoke-400 underline">
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === "defend" && (
        <div className="card mx-auto max-w-2xl p-5">
          <h2 className="display mb-2 text-2xl">Defend your original</h2>
          <p className="mb-3 text-sm text-smoke-400">
            Keeping your answer is a power move — but you have to earn it. What did you see in other
            responses, and why does yours still win?
          </p>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={4}
            placeholder="I'm keeping my receipt because it's the only quote that shows what Lena does when nobody is watching, which matters because…"
            className="field mb-3 text-sm"
          />
          {error && (
            <p className="pop mb-3 rounded-xl border-2 border-alarm-500 bg-alarm-500/10 px-3 py-2 text-sm font-semibold text-alarm-400">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={() => save(true)} disabled={busy} className="btn btn-dark display flex-1 py-2.5 text-2xl">
              {busy ? "Filing…" : "File my defense 🛡️"}
            </button>
            <button onClick={() => setMode("choose")} className="px-3 text-sm text-smoke-400 underline">
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reveal — "The verdict" + Reflection — "Case notes"
// ---------------------------------------------------------------------------

export function RevealScreen({ state, noConfetti }: { state: PlayState; noConfetti?: boolean }) {
  void noConfetti; // confetti is rendered by the shell only during the reveal phase
  const reveal = state.reveal;
  if (!reveal) return <p className="pt-12 text-center text-smoke-400">Waiting for the verdict…</p>;
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="display mb-5 text-center text-6xl">
        The <span className="text-gold-400">verdict</span>
      </h1>
      <div className="mb-6 grid grid-cols-3 gap-3 text-center">
        <Stat label="Receipts filed" value={reveal.totalSubmissions} />
        <Stat label="Jury votes" value={reveal.totalVotesCast} />
        <Stat label="Appeals + defenses" value={reveal.totalRevised} />
      </div>

      {reveal.spotlights.length > 0 && (
        <section className="mb-6">
          <h2 className="display mb-3 text-3xl">⭐ Spotlight thinking</h2>
          <div className="space-y-4">
            {reveal.spotlights.map((s, i) => (
              <div key={i} className="rise card relative border-2 border-gold-400 p-4 pt-5">
                <span className="stamp absolute -top-3.5 left-4 bg-night-900 text-sm text-gold-400">Star witness</span>
                <p className="mb-1 text-sm font-semibold text-smoke-50">{s.claim}</p>
                <blockquote className="paper my-1.5 px-2.5 py-1.5 font-serif text-sm italic">
                  &ldquo;{s.evidenceText}&rdquo;
                </blockquote>
                <p className="text-sm text-smoke-300">{s.reasoning}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {reveal.evidenceClusters.length > 0 && (
        <section>
          <h2 className="display mb-3 text-3xl">Where the class found receipts</h2>
          <ul className="space-y-2">
            {reveal.evidenceClusters.map((c, i) => (
              <li key={i} className="rise card p-3" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="mb-1 flex items-center gap-2 text-xs">
                  <span className="display rounded-md bg-gold-400 px-2 py-0.5 text-base text-night-950">
                    {c.count}×
                  </span>
                  {c.votes > 0 && (
                    <span className="font-bold text-smoke-400">
                      {c.votes} jury vote{c.votes === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <p className="font-serif text-sm italic text-smoke-300">&ldquo;{c.text}&rdquo;</p>
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
      <div className="display text-4xl text-gold-400">{value}</div>
      <div className="text-xs font-bold uppercase tracking-wider text-smoke-400">{label}</div>
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
        <span className="stamp pop inline-block border-4 px-4 py-1 text-4xl text-win-400">Notes filed</span>
        <p className="mt-4 text-smoke-300">Great round. Your teacher can see how your thinking leveled up.</p>
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
      <h1 className="display mb-1 text-center text-5xl">Case notes</h1>
      <p className="mb-4 text-center text-sm text-smoke-400">
        One honest sentence or two. Pick a starter if you&apos;re stuck:
      </p>
      <div className="mb-3 flex flex-wrap justify-center gap-1.5">
        {[
          "My evidence got stronger when…",
          "I changed my claim because…",
          "The other response I read taught me…",
          "I defended my answer because…",
        ].map((starter) => (
          <button
            key={starter}
            onClick={() => setText((t) => (t ? t : starter + " "))}
            className="rounded-lg border-2 border-night-600 px-2.5 py-1 text-xs font-semibold text-smoke-300 hover:border-gold-400 hover:text-gold-400"
          >
            {starter}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="field mb-3 text-sm"
        placeholder="What actually changed in your thinking this round?"
      />
      {error && (
        <p className="pop mb-3 rounded-xl border-2 border-alarm-500 bg-alarm-500/10 px-3 py-2 text-sm font-semibold text-alarm-400">
          {error}
        </p>
      )}
      <button onClick={submit} disabled={busy} className="btn btn-gold display w-full py-3 text-3xl">
        {busy ? "Filing…" : "File my case notes 📝"}
      </button>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}
