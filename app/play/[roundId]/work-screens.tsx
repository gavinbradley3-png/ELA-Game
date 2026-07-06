"use client";

import { useState } from "react";
import { PassageView } from "@/components/PassageView";
import { ClassMeter, FlyToast, PhaseSplash } from "@/components/juice";
import { ANNOTATION_TAGS, TAG_BY_ID } from "@/lib/tags";
import { LIMITS } from "@/lib/validate";
import { postJson, type PlayState } from "./types";
import { CaseHeader, VocabNotes } from "./play-client";

// ---------------------------------------------------------------------------
// Annotate
// ---------------------------------------------------------------------------

export function AnnotateScreen({ state, refresh }: { state: PlayState; refresh: () => Promise<void> }) {
  const [pending, setPending] = useState<{ start: number; end: number; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [clue, setClue] = useState<{ key: number; text: string } | null>(null);
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
    setClue((c) => ({
      key: (c?.key ?? 0) + 1,
      text: `Annotation ${state.annotations.length + 1} saved ✓`,
    }));
    window.getSelection()?.removeAllRanges();
    await refresh();
  }

  async function removeAnnotation(id: string) {
    await postJson("/api/play/annotate", { roundId: state.round.id, action: "remove", annotationId: id });
    await refresh();
  }

  return (
    <div className="mx-auto max-w-3xl">
      {clue && <FlyToast text={clue.text} toastKey={clue.key} />}
      <div className="mb-1 flex items-start justify-between gap-3">
        <CaseHeader title={state.passage.title} />
        <span
          className={`display shrink-0 rounded-lg border-2 px-2.5 py-1 text-xl ${
            remaining <= 0 ? "border-coral-500 text-coral-600" : "border-navy-950 text-navy-950"
          }`}
        >
          {remaining} left
        </span>
      </div>
      <p className="mb-4 text-sm text-muted-500">
        Select the words that matter, then tag <em>why</em> they matter. Fewer, sharper highlights
        beat painting the page.
      </p>
      {error && (
        <p className="pop mb-3 rounded-xl border-2 border-coral-500 bg-coral-100 px-4 py-2 text-sm font-semibold text-coral-600">
          {error}
        </p>
      )}

      {pending && (
        <div className="pop sticky top-14 z-30 mb-3 rounded-xl border-2 border-teal-500 bg-paper-50 p-3 shadow-xl">
          <div className="mb-2 text-sm text-ink-900/80">
            Tag it: <span className="font-serif italic">&ldquo;{truncate(pending.text, 90)}&rdquo;</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ANNOTATION_TAGS.map((t) => (
              <button
                key={t.id}
                onClick={() => tagSelection(t.id)}
                disabled={busy}
                title={t.hint}
                className={`chip-${t.color} accent-label rounded-md px-2.5 py-1 hover:brightness-95 disabled:opacity-50`}
              >
                {t.label}
              </button>
            ))}
            <button onClick={() => setPending(null)} className="rounded-md px-2.5 py-1 text-xs text-muted-500 underline">
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
        <div className="card ruled mt-5 p-4">
          <h2 className="display mb-2 text-xl">Your annotations</h2>
          <ul className="space-y-1.5">
            {state.annotations.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 text-sm">
                <span>
                  <span className={`chip-${TAG_BY_ID[a.tag]?.color ?? "slate"} accent-label mr-1.5 rounded px-1.5 py-0.5`}>
                    {TAG_BY_ID[a.tag]?.label ?? a.tag}
                  </span>
                  <span className="font-serif italic text-ink-900/75">&ldquo;{truncate(a.text, 80)}&rdquo;</span>
                </span>
                <button
                  onClick={() => removeAnnotation(a.id)}
                  className="shrink-0 text-xs text-muted-500 underline hover:text-coral-600"
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
// Submit Receipt
// ---------------------------------------------------------------------------

const CONFIDENCE_OPTIONS = ["Not sure", "Somewhat sure", "Confident", "Certain"];

/** Direct feedback on reasoning depth — filling the bar = meeting the minimum. */
function reasoningStatus(len: number): { label: string; color: string } {
  if (len === 0) return { label: "Make your case.", color: "#6b7280" };
  if (len < LIMITS.reasoning.min * 0.5) return { label: "Too thin. Say more.", color: "#e5533a" };
  if (len < LIMITS.reasoning.min) return { label: "Getting there. Keep building.", color: "#b8860b" };
  if (len < 220) return { label: "This holds up.", color: "#0d9488" };
  return { label: "Airtight.", color: "#0d9488" };
}

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
  const [filedKey, setFiledKey] = useState(0);
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
    setFiledKey((k) => k + 1);
    await refresh();
  }

  const status = reasoningStatus(reasoning.length);
  const pct = Math.min(100, Math.round((reasoning.length / LIMITS.reasoning.min) * 100));

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
      {filedKey > 0 && (
        <PhaseSplash text="Receipt submitted" sub="You can still improve it until time's up" splashKey={`filed-${filedKey}`} durationMs={1200} />
      )}
      <div>
        <div className="paper relative mb-4 p-4">
          <span className="accent-label text-coral-600">{state.prompt.promptType}</span>
          <p className="display mt-1 text-2xl leading-tight">{state.prompt.text}</p>
        </div>
        <p className="mb-2 text-sm text-muted-500">
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
        <div className="paper receipt-jagged relative mt-3 p-6">
          {saved && (
            <span className="accent-label pop absolute right-5 top-4 rounded-md bg-teal-500 px-2 py-1 text-white">
              Submitted ✓
            </span>
          )}
          <h2 className="display mb-4 text-3xl">Your receipt</h2>

          <div className="mb-4">
            <StepLabel n={1}>Evidence — the exact quote</StepLabel>
            {evidence ? (
              <blockquote className="pop rounded-md border-l-4 border-mark-400 bg-cream-100 px-3 py-2 font-serif text-sm italic">
                &ldquo;{truncate(evidence.text, 220)}&rdquo;
              </blockquote>
            ) : (
              <p className="ruled rounded-md border border-dashed border-line-300 px-3 py-3 text-sm text-muted-500">
                Select text in the passage — your quote appears here.
              </p>
            )}
          </div>

          <label className="mb-4 block">
            <StepLabel n={2}>Claim — what do you say is true?</StepLabel>
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
            <StepLabel n={3}>Reasoning — how does the quote prove it?</StepLabel>
            <textarea
              value={reasoning}
              onChange={(e) => { setReasoning(e.target.value); setSaved(false); }}
              disabled={locked}
              rows={4}
              maxLength={LIMITS.reasoning.max}
              placeholder="Don't retell the quote — explain what it proves. 'This shows… because…'"
              className="field text-sm"
            />
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-2 grow overflow-hidden rounded-full bg-cream-200">
                <div className="cook-bar h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: status.color }} />
              </div>
              <span key={status.label} className="pop shrink-0 text-xs font-bold" style={{ color: status.color }}>
                {status.label}
              </span>
            </div>
          </label>

          <div className="mb-5">
            <StepLabel n={4}>How confident are you?</StepLabel>
            <div className="flex flex-wrap gap-1.5">
              {CONFIDENCE_OPTIONS.map((label, i) => {
                const n = i + 1;
                return (
                  <button
                    key={n}
                    onClick={() => { setConfidence(n); setSaved(false); }}
                    disabled={locked}
                    className={`rounded-lg border-2 px-2.5 py-1.5 text-xs font-bold transition ${
                      confidence === n
                        ? "pop border-navy-950 bg-navy-950 text-paper-50"
                        : "border-line-300 text-ink-900/75 hover:border-navy-950"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="pop mb-3 rounded-xl border-2 border-coral-500 bg-coral-100 px-3 py-2 text-sm font-semibold text-coral-600">
              {error}
            </p>
          )}
          {locked ? (
            <p className="rounded-xl bg-cream-200 px-3 py-2.5 text-center text-sm font-bold text-ink-900/70">
              Submissions are locked.
            </p>
          ) : (
            <button onClick={submit} disabled={busy} className="btn btn-primary display w-full py-3 text-2xl">
              {busy ? "Submitting…" : saved ? "Update my receipt" : "Submit my receipt"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepLabel({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center gap-2 text-sm font-bold text-navy-950">
      <span className="display flex h-5 w-5 items-center justify-center rounded-full bg-navy-950 text-xs text-paper-50">
        {n}
      </span>
      {children}
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}
