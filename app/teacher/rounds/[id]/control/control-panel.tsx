"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { PHASE_ORDER, PHASE_LABELS } from "@/lib/phases";
import type { TeacherStatus } from "@/lib/rounds";

const POLL_MS = 2000;

export function ControlPanel({ roundId }: { roundId: string }) {
  const [status, setStatus] = useState<TeacherStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/teacher/rounds/${roundId}/status`, { cache: "no-store" });
      if (res.ok) setStatus(await res.json());
    } catch {
      // transient network failure — next poll will recover
    }
  }, [roundId]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const act = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/teacher/rounds/${roundId}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Action failed.");
        }
      } catch {
        setError("Network hiccup — try again.");
      } finally {
        setBusy(false);
        await refresh();
      }
    },
    [roundId, refresh],
  );

  if (!status) return <p className="text-smoke-400">Loading round…</p>;

  const { round, counts } = status;
  const phase = round.underlyingPhase;
  const phaseIndex = (PHASE_ORDER as readonly string[]).indexOf(phase);
  const isOver = phase === "complete" || phase === "cancelled";
  const nextLabel =
    phaseIndex >= 0 && phaseIndex < PHASE_ORDER.length - 1 ? PHASE_LABELS[PHASE_ORDER[phaseIndex + 1]] : null;

  return (
    <div>
      {/* Command bar */}
      <div className="card relative mb-5 overflow-hidden">
        <div className="tape h-2.5 w-full" />
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-smoke-400">
                Join at <span className="text-gold-400">{typeof window !== "undefined" ? window.location.host : ""}/play</span>
              </div>
              <div className="display text-7xl tracking-[0.12em] text-gold-400" data-testid="join-code">
                {round.joinCode}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-smoke-400">Phase</div>
              <div className="display text-4xl" data-testid="phase-label">
                {round.paused ? `⏸ Paused (${PHASE_LABELS[phase]})` : PHASE_LABELS[phase]}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-smoke-400">Timer</div>
              <div className="flex items-center gap-1.5">
                <Countdown endsAt={round.phaseEndsAt} pausedRemainingMs={round.paused ? round.pausedRemainingMs : null} />
                <button onClick={() => act({ type: "timer_add", seconds: 60 })} disabled={busy}
                  className="rounded-lg border-2 border-night-600 px-2 py-1 text-xs font-bold text-smoke-300 hover:border-smoke-400">
                  +1m
                </button>
                <button onClick={() => act({ type: "timer_add", seconds: -60 })} disabled={busy}
                  className="rounded-lg border-2 border-night-600 px-2 py-1 text-xs font-bold text-smoke-300 hover:border-smoke-400">
                  −1m
                </button>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {!isOver && (
                <>
                  {round.paused ? (
                    <button onClick={() => act({ type: "resume" })} disabled={busy} className="btn btn-win px-5 py-3">
                      ▶ Resume
                    </button>
                  ) : (
                    <button onClick={() => act({ type: "pause" })} disabled={busy} className="btn btn-dark px-5 py-3">
                      ⏸ Pause
                    </button>
                  )}
                  {nextLabel && (
                    <button onClick={() => act({ type: "advance" })} disabled={busy || round.paused}
                      className="btn btn-gold display px-6 py-3 text-2xl">
                      Next: {nextLabel} →
                    </button>
                  )}
                </>
              )}
              {isOver && (
                <Link href={`/teacher/rounds/${roundId}/dashboard`} className="btn btn-gold px-5 py-3">
                  View results dashboard
                </Link>
              )}
            </div>
          </div>

          {/* Phase stepper */}
          <ol className="mt-4 flex flex-wrap gap-1">
            {PHASE_ORDER.map((p, i) => (
              <li key={p}>
                <button
                  onClick={() => act({ type: "goto", phase: p })}
                  disabled={busy || isOver}
                  title={`Jump to ${PHASE_LABELS[p]}`}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    i === phaseIndex
                      ? "bg-gold-400 text-night-950"
                      : i < phaseIndex
                        ? "bg-night-700 text-smoke-300"
                        : "bg-night-800 text-smoke-400 hover:bg-night-700"
                  }`}
                >
                  {PHASE_LABELS[p]}
                </button>
              </li>
            ))}
          </ol>

          {/* Toggles */}
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-night-700 pt-4 text-sm text-smoke-300">
            <Toggle label="Hide names on reveal" checked={round.namesHidden} onChange={(v) => act({ type: "set_names_hidden", hidden: v })} />
            <Toggle label="Lock joining" checked={round.joinLocked} onChange={(v) => act({ type: "set_join_locked", locked: v })} />
            {phase === "submitting" && (
              <Toggle label="Lock submissions" checked={round.submissionsLocked} onChange={(v) => act({ type: "set_submissions_locked", locked: v })} />
            )}
            {!isOver && (
              <button
                onClick={() => {
                  if (confirm("End this round for everyone? Students will see the completion screen.")) {
                    act({ type: "end" });
                  }
                }}
                className="ml-auto text-smoke-400 underline hover:text-alarm-400"
              >
                End round
              </button>
            )}
          </div>
          {error && (
            <p className="mt-3 rounded-xl border-2 border-alarm-500 bg-alarm-500/10 px-4 py-2 text-sm font-bold text-alarm-400">
              {error}
            </p>
          )}
          {phase === "submitting" && counts.submitted < 3 && (
            <p className="mt-3 rounded-xl border-2 border-gold-400 bg-gold-400/10 px-4 py-2 text-sm text-smoke-300">
              ⚠️ Peer review needs at least 3 submissions — currently {counts.submitted}.
            </p>
          )}
        </div>
      </div>

      {/* Live counts */}
      <div className="mb-5 grid grid-cols-3 gap-3 sm:grid-cols-7">
        <Stat label="Joined" value={counts.joined} />
        <Stat label="Submitted" value={counts.submitted} />
        <Stat label="Reviews" value={`${counts.reviewed}/${counts.reviewsAssigned}`} />
        <Stat label="Revised" value={counts.revised} />
        <Stat label="Improved" value={counts.improved} accent />
        <Stat label="Reflected" value={counts.reflected} />
        <Stat label="Flagged" value={counts.flagged} warn={counts.flagged > 0} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <StudentsPanel status={status} act={act} />
        <SubmissionsPanel status={status} act={act} />
        <TrendsPanel status={status} />
        <VoicesPanel status={status} />
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-gold-400" />
      {label}
    </label>
  );
}

function Stat({ label, value, accent, warn }: { label: string; value: number | string; accent?: boolean; warn?: boolean }) {
  return (
    <div className={`card p-3 text-center ${warn ? "border-alarm-500" : accent ? "border-gold-400" : ""}`}>
      <div className={`display text-3xl ${warn ? "text-alarm-400" : accent ? "text-gold-400" : "text-smoke-50"}`}>{value}</div>
      <div className="text-xs font-bold uppercase tracking-wider text-smoke-400">{label}</div>
    </div>
  );
}

function StudentsPanel({ status, act }: { status: TeacherStatus; act: (b: Record<string, unknown>) => Promise<void> }) {
  return (
    <section className="card p-4">
      <h2 className="display mb-3 text-2xl">Detectives ({status.counts.joined})</h2>
      {status.students.length === 0 ? (
        <p className="text-sm text-smoke-400">Waiting for students — the join code is on the command bar.</p>
      ) : (
        <ul className="max-h-96 space-y-1 overflow-y-auto">
          {status.students.map((s) => (
            <li key={s.id} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm ${s.status === "removed" ? "opacity-40" : ""}`}>
              <span className="font-bold text-smoke-50">{s.displayName}</span>
              <span className="flex gap-1 text-xs">
                {s.annotationCount > 0 && <Chip>{s.annotationCount} 🖍</Chip>}
                {s.hasSubmitted && <Chip tone="good">submitted</Chip>}
                {s.reviewsAssigned > 0 && (
                  <Chip tone={s.reviewsDone === s.reviewsAssigned ? "good" : "neutral"}>
                    {s.reviewsDone}/{s.reviewsAssigned} votes
                  </Chip>
                )}
                {s.hasRevised && <Chip tone={s.revisionImproved ? "good" : "neutral"}>{s.revisionImproved ? "improved" : "revised"}</Chip>}
                {s.hasReflected && <Chip tone="good">reflected</Chip>}
                {Date.now() - s.lastSeenAt > 15000 && s.status === "active" && <Chip tone="warn">offline?</Chip>}
              </span>
              <span className="ml-auto flex shrink-0 gap-2 text-xs">
                {s.status === "active" ? (
                  <button onClick={() => act({ type: "remove_student", studentSessionId: s.id })} className="text-smoke-400 underline hover:text-alarm-400">
                    Remove
                  </button>
                ) : (
                  <button onClick={() => act({ type: "restore_student", studentSessionId: s.id })} className="text-smoke-400 underline">
                    Restore
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SubmissionsPanel({ status, act }: { status: TeacherStatus; act: (b: Record<string, unknown>) => Promise<void> }) {
  return (
    <section className="card p-4">
      <h2 className="display mb-3 text-2xl">Receipts ({status.counts.submitted})</h2>
      {status.submissions.length === 0 ? (
        <p className="text-sm text-smoke-400">Responses will appear here as students submit.</p>
      ) : (
        <ul className="max-h-96 space-y-2 overflow-y-auto">
          {status.submissions.map((s) => (
            <li
              key={s.id}
              className={`rounded-xl border p-3 ${
                s.status === "removed" ? "border-alarm-700 opacity-40" : s.spotlighted ? "border-gold-400" : "border-night-700"
              } bg-night-950`}
            >
              <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-bold text-smoke-50">{s.studentName}</span>
                {s.votes > 0 && <Chip tone="good">{s.votes} vote{s.votes === 1 ? "" : "s"}</Chip>}
                {s.flags.shortReasoning && <Chip tone="warn">thin reasoning</Chip>}
                {s.flags.restatesEvidence && <Chip tone="warn">restates quote</Chip>}
                {s.revision && (
                  <Chip tone={s.revision.improved ? "good" : "neutral"}>
                    {s.revision.keptOriginal ? "defended" : s.revision.improved ? "improved" : "revised"}
                  </Chip>
                )}
                <span className="ml-auto flex gap-2">
                  <button
                    onClick={() => act({ type: "set_spotlight", submissionId: s.id, spotlighted: !s.spotlighted })}
                    className={`underline ${s.spotlighted ? "text-gold-400" : "text-smoke-400"}`}
                  >
                    {s.spotlighted ? "★ Spotlighted" : "☆ Spotlight"}
                  </button>
                  {s.status === "submitted" ? (
                    <button onClick={() => act({ type: "remove_submission", submissionId: s.id })} className="text-smoke-400 underline hover:text-alarm-400">
                      Remove
                    </button>
                  ) : (
                    <button onClick={() => act({ type: "restore_submission", submissionId: s.id })} className="text-smoke-400 underline">
                      Restore
                    </button>
                  )}
                </span>
              </div>
              <p className="text-sm font-semibold text-smoke-50">{s.claim}</p>
              <blockquote className="my-1 border-l-2 border-gold-600 pl-2 font-serif text-sm italic text-smoke-300">
                &ldquo;{s.evidenceText}&rdquo;
              </blockquote>
              <p className="text-sm text-smoke-300">{s.reasoning}</p>
              {s.revision && !s.revision.keptOriginal && (
                <div className="mt-2 rounded-lg border-l-4 border-win-400 bg-win-400/10 p-2 text-sm">
                  <div className="mb-0.5 text-xs font-bold text-win-400">After revision:</div>
                  <p className="font-semibold text-smoke-50">{s.revision.claim}</p>
                  <p className="text-smoke-300">{s.revision.reasoning}</p>
                  <p className="mt-1 text-xs italic text-win-400">Why: {s.revision.changeExplanation}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TrendsPanel({ status }: { status: TeacherStatus }) {
  return (
    <section className="card p-4">
      <h2 className="display mb-3 text-2xl">Class trends</h2>
      <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-smoke-400">Evidence hot spots (submissions)</h3>
      {status.evidenceClusters.length === 0 ? (
        <p className="mb-3 text-sm text-smoke-400">No evidence selected yet.</p>
      ) : (
        <ul className="mb-4 space-y-1.5">
          {status.evidenceClusters.slice(0, 5).map((c, i) => (
            <li key={i} className="rounded-lg bg-night-950 p-2 text-sm">
              <span className="display mr-2 rounded-md bg-gold-400 px-1.5 py-0.5 text-sm text-night-950">{c.count}×</span>
              <span className="font-serif italic text-smoke-300">&ldquo;{c.text}&rdquo;</span>
              {c.votes > 0 && <span className="ml-2 text-xs text-smoke-400">{c.votes} jury votes</span>}
            </li>
          ))}
        </ul>
      )}
      <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-smoke-400">Annotation heat map</h3>
      {status.annotationClusters.length === 0 ? (
        <p className="text-sm text-smoke-400">No annotations yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {status.annotationClusters.slice(0, 5).map((c, i) => (
            <li key={i} className="rounded-lg bg-night-950 p-2 text-sm">
              <span className="display mr-2 rounded-md bg-night-700 px-1.5 py-0.5 text-sm text-smoke-50">{c.count}×</span>
              <span className="font-serif italic text-smoke-300">&ldquo;{c.text}&rdquo;</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function VoicesPanel({ status }: { status: TeacherStatus }) {
  return (
    <section className="card p-4">
      <h2 className="display mb-3 text-2xl">Jury notes & reflections</h2>
      <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-smoke-400">
        Vote justifications ({status.justifications.length})
      </h3>
      {status.justifications.length === 0 ? (
        <p className="mb-3 text-sm text-smoke-400">None yet.</p>
      ) : (
        <ul className="mb-4 max-h-40 space-y-1.5 overflow-y-auto">
          {status.justifications.map((j, i) => (
            <li key={i} className="rounded-lg bg-night-950 p-2 text-sm text-smoke-300">
              <span className="font-bold text-smoke-50">{j.reviewerName}:</span> {j.justification}
            </li>
          ))}
        </ul>
      )}
      <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-smoke-400">
        Reflections ({status.reflections.length})
      </h3>
      {status.reflections.length === 0 ? (
        <p className="text-sm text-smoke-400">None yet.</p>
      ) : (
        <ul className="max-h-40 space-y-1.5 overflow-y-auto">
          {status.reflections.map((r, i) => (
            <li key={i} className="rounded-lg bg-night-950 p-2 text-sm text-smoke-300">
              <span className="font-bold text-smoke-50">{r.studentName}:</span> {r.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" }) {
  const cls =
    tone === "good"
      ? "bg-win-400/15 text-win-400"
      : tone === "warn"
        ? "bg-gold-400/15 text-gold-400"
        : "bg-night-800 text-smoke-300";
  return <span className={`rounded-full px-1.5 py-0.5 font-semibold ${cls}`}>{children}</span>;
}
