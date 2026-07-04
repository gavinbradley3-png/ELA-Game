"use client";

import { useState } from "react";
import { PassageView } from "@/components/PassageView";
import { ANNOTATION_TAGS, TAG_BY_ID, CONFIDENCE_LABELS } from "@/lib/tags";
import { LIMITS } from "@/lib/validate";
import { postJson, type PlayState } from "./types";
import { VocabNotes } from "./play-client";

// ---------------------------------------------------------------------------
// Annotation phase
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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold">Annotate: {state.passage.title}</h1>
        <span className={`text-sm font-medium ${remaining <= 0 ? "text-rose-700" : "text-ink-500"}`}>
          {remaining} highlight{remaining === 1 ? "" : "s"} left
        </span>
      </div>
      <p className="mb-4 text-sm text-ink-500">
        Select the words that matter, then tag <em>why</em> they matter. Fewer, sharper highlights beat
        painting the page.
      </p>
      {error && <p className="mb-3 rounded-lg bg-rose-100 px-4 py-2 text-sm text-rose-900">{error}</p>}

      {pending && (
        <div className="sticky top-2 z-10 mb-3 rounded-xl border-2 border-ink-950 bg-white p-3 shadow-lg">
          <div className="mb-2 text-sm">
            Tag: <span className="font-serif italic">&ldquo;{truncate(pending.text, 90)}&rdquo;</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ANNOTATION_TAGS.map((t) => (
              <button
                key={t.id}
                onClick={() => tagSelection(t.id)}
                disabled={busy}
                title={t.hint}
                className={`hl-${t.color} rounded-lg px-2.5 py-1 text-xs font-semibold text-ink-900 hover:brightness-95 disabled:opacity-50`}
              >
                {t.label}
              </button>
            ))}
            <button onClick={() => setPending(null)} className="rounded-lg px-2.5 py-1 text-xs text-ink-500 underline">
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
        <div className="mt-5 rounded-xl border border-paper-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold">Your highlights</h2>
          <ul className="space-y-1.5">
            {state.annotations.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 text-sm">
                <span>
                  <span className={`hl-${TAG_BY_ID[a.tag]?.color ?? "slate"} mr-1.5 rounded px-1.5 py-0.5 text-xs font-semibold`}>
                    {TAG_BY_ID[a.tag]?.label ?? a.tag}
                  </span>
                  <span className="font-serif italic text-ink-700">&ldquo;{truncate(a.text, 80)}&rdquo;</span>
                </span>
                <button onClick={() => removeAnnotation(a.id)} className="shrink-0 text-xs text-ink-500 underline hover:text-rose-700">
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
// Submission phase: evidence → claim → reasoning → confidence
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
      setError("Select your evidence from the passage first — that's your receipt.");
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
        <div className="mb-4 rounded-xl border-2 border-accent-600 bg-white p-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent-600">
            Challenge · {state.prompt.promptType}
          </div>
          <p className="font-serif text-lg font-bold leading-snug">{state.prompt.text}</p>
        </div>
        <p className="mb-2 text-sm text-ink-500">
          Select the exact words that prove your claim, then press &ldquo;Use as my evidence&rdquo;.
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

      <div className="lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-xl border border-paper-200 bg-white p-5">
          <h2 className="mb-4 font-serif text-xl font-bold">Your response</h2>

          <div className="mb-4">
            <div className="mb-1 text-sm font-medium">1 · Evidence (your receipt)</div>
            {evidence ? (
              <blockquote className="rounded-lg border-l-4 border-accent-600 bg-paper-100 px-3 py-2 font-serif text-sm italic">
                &ldquo;{truncate(evidence.text, 220)}&rdquo;
              </blockquote>
            ) : (
              <p className="rounded-lg border border-dashed border-paper-200 px-3 py-2 text-sm text-ink-500">
                Select text in the passage — your quote appears here.
              </p>
            )}
          </div>

          <label className="mb-4 block">
            <div className="mb-1 text-sm font-medium">2 · Claim — what do you say is true?</div>
            <textarea
              value={claim}
              onChange={(e) => { setClaim(e.target.value); setSaved(false); }}
              disabled={locked}
              rows={2}
              maxLength={LIMITS.claim.max}
              placeholder="Lena hides the truth because she is afraid of losing her friend."
              className="w-full rounded-lg border border-paper-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="mb-4 block">
            <div className="mb-1 text-sm font-medium">3 · Reasoning — how does the quote prove it?</div>
            <textarea
              value={reasoning}
              onChange={(e) => { setReasoning(e.target.value); setSaved(false); }}
              disabled={locked}
              rows={4}
              maxLength={LIMITS.reasoning.max}
              placeholder="Don't retell the quote — explain what it shows. 'This shows... because...'"
              className="w-full rounded-lg border border-paper-200 px-3 py-2 text-sm"
            />
            <div className="mt-1 text-right text-xs text-ink-500">
              {reasoning.length}/{LIMITS.reasoning.min}+ characters
            </div>
          </label>

          <div className="mb-5">
            <div className="mb-1 text-sm font-medium">4 · How confident are you?</div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => { setConfidence(n); setSaved(false); }}
                  disabled={locked}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                    confidence === n ? "border-ink-950 bg-ink-950 text-paper-50" : "border-paper-200 hover:bg-paper-100"
                  }`}
                >
                  {CONFIDENCE_LABELS[n]}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="mb-3 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-900">{error}</p>}
          {locked ? (
            <p className="rounded-lg bg-paper-100 px-3 py-2 text-center text-sm font-medium">
              Submissions are locked.
            </p>
          ) : (
            <button
              onClick={submit}
              disabled={busy}
              className="w-full rounded-xl bg-accent-600 px-4 py-3 font-semibold text-white hover:bg-accent-500 disabled:opacity-60"
            >
              {busy ? "Submitting…" : saved ? "Update my response" : "Submit my response"}
            </button>
          )}
          {saved && !locked && (
            <p className="mt-2 text-center text-sm font-medium text-emerald-700">
              ✓ Submitted. You can still improve it until the phase ends.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}
