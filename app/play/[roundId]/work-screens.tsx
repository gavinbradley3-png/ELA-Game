"use client";

import { useState } from "react";
import { PassageView } from "@/components/PassageView";
import { ClassMeter } from "@/components/juice";
import { ANNOTATION_TAGS, TAG_BY_ID, CONFIDENCE_LABELS } from "@/lib/tags";
import { LIMITS } from "@/lib/validate";
import { postJson, type PlayState } from "./types";
import { CaseFileHeader, VocabNotes } from "./play-client";

// ---------------------------------------------------------------------------
// Annotation phase — "Mark it up"
// ---------------------------------------------------------------------------

export function AnnotateScreen({ state, refresh }: { state: PlayState; refresh: () => Promise<void> }) {
  const [pending, setPending] = useState<{ start: number; end: number; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!state.passage) return null;

  const remaining = state.round.settings.maxAnnotations - state.annotations.length;

  async function tagSelection(tag: string) {
    if (!pending || busy) return;
    setBusy(true);
    setError(null);
    const { ok, data } = await postJson("/api/play/annotate", {
      roundId: state.round.id,
      action: "add",
      startOffset: pending.start,
      endOffset: pending.end,
      tag,
    });
    setBusy(false);
    if (!ok) {
      setError(data.error ?? "Couldn't save that highlight.");
      return;
    }
    setPending(null);
    window.getSelection()?.removeAllRanges();
    await refresh();
  }

  async function removeAnnotation(id: string) {
    await postJson("/api/play/annotate", { roundId: state.round.id, action: "remove", annotationId: id });
    await refresh();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-1 flex items-start justify-between gap-3">
        <CaseFileHeader title={state.passage.title} />
        <span
          className={`display shrink-0 rounded-lg border-2 px-2.5 py-0.5 text-2xl ${
            remaining <= 0 ? "border-alarm-500 text-alarm-400" : "border-night-600 text-gold-400"
          }`}
        >
          {remaining} left
        </span>
      </div>
      <p className="mb-4 text-sm text-smoke-400">
        Select the words that matter, then tag <em className="text-smoke-300">why</em> they matter.
        Snipers beat sprayers — fewer, sharper highlights win.
      </p>
      {error && (
        <p className="pop mb-3 rounded-xl border-2 border-alarm-500 bg-alarm-500/10 px-4 py-2 text-sm font-semibold text-alarm-400">
          {error}
        </p>
      )}

      {pending && (
        <div className="pop sticky top-16 z-30 mb-3 rounded-xl border-2 border-gold-400 bg-night-900 p-3 shadow-2xl">
          <div className="mb-2 text-sm text-smoke-300">
            Tag it: <span className="font-serif italic text-smoke-50">&ldquo;{truncate(pending.text, 90)}&rdquo;</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ANNOTATION_TAGS.map((t) => (
              <button
                key={t.id}
                onClick={() => tagSelection(t.id)}
                disabled={busy}
                title={t.hint}
                className={`chip-${t.color} rounded-lg px-2.5 py-1 text-xs font-bold hover:brightness-110 disabled:opacity-50`}
              >
                {t.label}
              </button>
            ))}
            <button onClick={() => setPending(null)} className="rounded-lg px-2.5 py-1 text-xs text-smoke-400 underline">
              Cancel
            </button>
          </div>
        </div>
      )}

      <PassageView
        text={state.passage.text}
        highlights={state.annotations}
        selectable
        onSelectRange={(start, end, text) => setPending({ start, end, text })}
      />
      <VocabNotes notes={state.passage.vocabNotes} />

      {state.annotations.length > 0 && (
        <div className="card mt-5 p-4">
          <h2 className="display mb-2 text-xl text-smoke-50">Your evidence board</h2>
          <ul className="space-y-1.5">
            {state.annotations.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 text-sm">
                <span>
                  <span className={`chip-${TAG_BY_ID[a.tag]?.color ?? "slate"} mr-1.5 rounded px-1.5 py-0.5 text-xs font-bold`}>
                    {TAG_BY_ID[a.tag]?.label ?? a.tag}
                  </span>
                  <span className="font-serif italic text-smoke-300">&ldquo;{truncate(a.text, 80)}&rdquo;</span>
                </span>
                <button
                  onClick={() => removeAnnotation(a.id)}
                  className="shrink-0 text-xs text-smoke-400 underline hover:text-alarm-400"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Submission phase — "Bring the receipts"
// ---------------------------------------------------------------------------

export function SubmitScreen({ state, refresh }: { state: PlayState; refresh: () => Promise<void> }) {
  const sub = state.submission;
  const [evidence, setEvidence] = useState<{ start: number; end: number; text: string } | null>(
    sub ? { start: sub.evidenceStart, end: sub.evidenceEnd, text: sub.evidenceText } : null,
  );
  const [claim, setClaim] = useState(sub?.claim ?? "");
  const [reasoning, setReasoning] = useState(sub?.reasoning ?? "");
  const [confidence, setConfidence] = useState(sub?.confidence ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(!!sub);
  const [busy, setBusy] = useState(false);
  if (!state.passage || !state.prompt) return null;

  const locked = state.round.submissionsLocked;

  async function submit() {
    if (busy) return;
    setError(null);
    if (!evidence) {
      setError("Grab your receipt first — select the exact words in the case file.");
      return;
    }
    if (!confidence) {
      setError("Pick a confidence level.");
      return;
    }
    setBusy(true);
    const { ok, data } = await postJson("/api/play/submit", {
      roundId: state.round.id,
      claim,
      reasoning,
      confidence,
      evidenceStart: evidence.start,
      evidenceEnd: evidence.end,
    });
    setBusy(false);
    if (!ok) {
      setError(data.error ?? "Couldn't submit.");
      setSaved(false);
      return;
    }
    setSaved(true);
    await refresh();
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
      <div>
        <div className="relative mb-4 rounded-2xl border-4 border-gold-400 bg-night-900 p-4">
          <span className="stamp absolute -top-3.5 left-4 bg-night-900 text-xs text-alarm-400">
            {state.prompt.promptType}
          </span>
          <p className="display pt-1 text-2xl leading-tight">{state.prompt.text}</p>
        </div>
        <p className="mb-2 text-sm text-smoke-400">
          Select the exact words that prove your claim — they become your receipt.
        </p>
        <PassageView
          text={state.passage.text}
          highlights={state.annotations}
          evidenceRange={evidence ? { start: evidence.start, end: evidence.end } : null}
          selectable={!locked}
          onSelectRange={(start, end, text) => {
            setEvidence({ start, end, text });
            setSaved(false);
          }}
        />
      </div>

      <div className="lg:sticky lg:top-16 lg:self-start">
        <ClassMeter label="Receipts in" value={state.pulse.submitted} total={state.pulse.joined} />
        <div className="card relative mt-3 p-5">
          {saved && (
            <span className="stamp pop absolute -top-3 right-4 bg-night-900 text-sm text-win-400">Receipt filed ✓</span>
          )}
          <h2 className="display mb-4 text-3xl">Your response</h2>

          <div className="mb-4">
            <StepLabel n={1}>The receipt (your evidence)</StepLabel>
            {evidence ? (
              <blockquote className="paper pop px-3 py-2 font-serif text-sm italic">
                &ldquo;{truncate(evidence.text, 220)}&rdquo;
              </blockquote>
            ) : (
              <p className="rounded-lg border-2 border-dashed border-night-600 px-3 py-2.5 text-sm text-smoke-400">
                Select text in the case file — your quote appears here.
              </p>
            )}
          </div>

          <label className="mb-4 block">
            <StepLabel n={2}>Your claim — what do you say is true?</StepLabel>
            <textarea
              value={claim}
              onChange={(e) => { setClaim(e.target.value); setSaved(false); }}
              disabled={locked}
              rows={2}
              maxLength={LIMITS.claim.max}
              placeholder="Lena hides the truth because she is afraid of losing her friend."
              className="field text-sm"
            />
          </label>

          <label className="mb-4 block">
            <StepLabel n={3}>Make it stick — how does the quote prove it?</StepLabel>
            <textarea
              value={reasoning}
              onChange={(e) => { setReasoning(e.target.value); setSaved(false); }}
              disabled={locked}
              rows={4}
              maxLength={LIMITS.reasoning.max}
              placeholder="Don't retell the quote — explain what it shows. 'This proves… because…'"
              className="field text-sm"
            />
            <div className="mt-1 text-right text-xs text-smoke-400">
              {reasoning.length}/{LIMITS.reasoning.min}+ characters
            </div>
          </label>

          <div className="mb-5">
            <StepLabel n={4}>How confident are you?</StepLabel>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => { setConfidence(n); setSaved(false); }}
                  disabled={locked}
                  className={`rounded-lg border-2 px-2.5 py-1.5 text-xs font-bold transition ${
                    confidence === n
                      ? "border-gold-400 bg-gold-400 text-night-950"
                      : "border-night-600 text-smoke-300 hover:border-smoke-400"
                  }`}
                >
                  {CONFIDENCE_LABELS[n]}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="pop mb-3 rounded-xl border-2 border-alarm-500 bg-alarm-500/10 px-3 py-2 text-sm font-semibold text-alarm-400">
              {error}
            </p>
          )}
          {locked ? (
            <p className="rounded-xl bg-night-800 px-3 py-2.5 text-center text-sm font-bold text-smoke-300">
              🔒 Submissions are locked.
            </p>
          ) : (
            <button onClick={submit} disabled={busy} className="btn btn-gold display w-full py-3 text-3xl">
              {busy ? "Filing…" : saved ? "Update my receipt" : "File my receipt 🧾"}
            </button>
          )}
          {saved && !locked && (
            <p className="mt-2 text-center text-sm font-semibold text-win-400">
              Filed. You can still upgrade it until time&apos;s up.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StepLabel({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center gap-2 text-sm font-bold text-smoke-50">
      <span className="display flex h-5 w-5 items-center justify-center rounded-full bg-gold-400 text-sm text-night-950">
        {n}
      </span>
      {children}
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}
