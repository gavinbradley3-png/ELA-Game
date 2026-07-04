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

  if (!status) return <p className="text-ink-500">Loading round…</p>;

  const { round, counts } = status;
  const phase = round.underlyingPhase;
  const phaseIndex = (PHASE_ORDER as readonly string[]).indexOf(phase);
  const isOver = phase === "complete" || phase === "cancelled";
  const nextLabel = phaseIndex >= 0 && phaseIndex < PHASE_ORDER.length - 1 ? PHASE_LABELS[PHASE_ORDER[phaseIndex + 1]] : null;

  return (
    <div>
      {/* Command bar */}
      <div className="mb-5 rounded-2xl border border-paper-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">Join at {typeof window !== "undefined" ? window.location.host : ""}/play</div>
            <div className="font-mono text-5xl font-bold tracking-[0.15em]">{round.joinCode}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">Phase</div>
            <div className="font-serif text-2xl font-bold">
              {round.paused ? `⏸ Paused (${PHASE_LABELS[phase]})` : PHASE_LABELS[phase]}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">Timer</div>
            <div className="flex items-center gap-1.5">
              <Countdown endsAt={round.phaseEndsAt} pausedRemainingMs={round.paused ? round.pausedRemainingMs : null} />
              <button onClick={() => act({ type: "timer_add", seconds: 60 })} disabled={busy} className="rounded-lg border border-paper-200 px-2 py-1 text-xs font-semibold hover:bg-paper-100">+1m</button>
              <button onClick={() => act({ type: "timer_add", seconds: -60 })} disabled={busy} className="rounded-lg border border-paper-200 px-2 py-1 text-xs font-semibold hover:bg-paper-100">−1m</button>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {!isOver && (
              <>
                {round.paused ? (
                  <button onClick={() => act({ type: "resume" })} disabled={busy}
                    className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-500">
                    ▶ Resume
                  </button>
                ) : (
                  <button onClick={() => act({ type: "pause" })} disabled={busy}
                    className="rounded-xl border-2 border-ink-950 px-5 py-3 font-semibold hover:bg-paper-100">
                    ⏸ Pause
                  </button>
                )}
                {nextLabel && (
                  <button onClick={() => act({ type: "advance" })} disabled={busy || round.paused}
                    className="rounded-xl bg-accent-600 px-6 py-3 text-lg font-semibold text-white hover:bg-accent-500 disabled:opacity-50">
                    Next: {nextLabel} →
                  </button>
                )}
              </>
            )}
            {isOver && (
              <Link href={`/teacher/rounds/${roundId}/dashboard`} className="rounded-xl bg-ink-950 px-5 py-3 font-semibold text-paper-50 hover:bg-ink-900">
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
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  i === phaseIndex
                    ? "bg-ink-950 text-paper-50"
                    : i < phaseIndex
                      ? "bg-paper-200 text-ink-700"
                      : "bg-paper-100 text-ink-500 hover:bg-paper-200"
                }`}
              >
                {PHASE_LABELS[p]}
              </button>
            </li>
          ))}
        </ol>

        {/* Toggles */}
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-paper-100 pt-4 text-sm">
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
              className="ml-auto text-ink-500 underline hover:text-rose-700"
            >
              End round
            </button>
          )}
        </div>
        {error && <p className="mt-3 rounded-lg bg-rose-100 px-4 py-2 text-sm font-medium text-rose-900">{error}</p>}
        {phase === "submitting" && counts.submitted < 3 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-900">
            Peer review needs at least 3 submissions — currently {counts.submitted}.
          </p>
        )}
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
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
      {label}
    </label>
  );
}

function Stat({ label, value, accent, warn }: { label: string; value: number | string; accent?: boolean; warn?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 text-center ${warn ? "border-amber-300 bg-amber-50" : accent ? "border-accent-600 bg-white" : "border-paper-200 bg-white"}`}>
      <div className="font-serif text-2xl font-bold">{value}</div>
      <div className="text-xs text-ink-500">{label}</div>
    </div>
  );
}

function StudentsPanel({ status, act }: { status: TeacherStatus; act: (b: Record<string, unknown>) => Promise<void> }) {
  return (
    <section className="rounded-2xl border border-paper-200 bg-white p-4">
      <h2 className="mb-3 font-serif text-lg font-bold">Students ({status.counts.joined})</h2>
      {status.students.length === 0 ? (
        <p className="text-sm text-ink-500">Waiting for students — the join code is on the command bar.</p>
      ) : (
        <ul className="max-h-96 space-y-1 overflow-y-auto">
          {status.students.map((s) => (
            <li key={s.id} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm ${s.status === "removed" ? "opacity-50" : ""}`}>
              <span className="font-medium">{s.displayName}</span>
              <span className="flex gap-1 text-xs">
                {s.annotationCount > 0 && <Chip>{s.annotationCount} 🖍</Chip>}
                {s.hasSubmitted && <Chip tone="good">submitted</Chip>}
                {s.reviewsAssigned > 0 && <Chip tone={s.reviewsDone === s.reviewsAssigned ? "good" : "neutral"}>{s.reviewsDone}/{s.reviewsAssigned} votes</Chip>}
                {s.hasRevised && <Chip tone={s.revisionImproved ? "good" : "neutral"}>{s.revisionImproved ? "improved" : "revised"}</Chip>}
                {s.hasReflected && <Chip tone="good">reflected</Chip>}
                {Date.now() - s.lastSeenAt > 15000 && s.status === "active" && <Chip tone="warn">offline?</Chip>}
              </span>
              <span className="ml-auto flex shrink-0 gap-2 text-xs">
                {s.status === "active" ? (
                  <button onClick={() => act({ type: "remove_student", studentSessionId: s.id })} className="text-ink-500 underline hover:text-rose-700">
                    Remove
                  </button>
                ) : (
                  <button onClick={() => act({ type: "restore_student", studentSessionId: s.id })} className="text-ink-500 underline">
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
    <section className="rounded-2xl border border-paper-200 bg-white p-4">
      <h2 className="mb-3 font-serif text-lg font-bold">Submissions ({status.counts.submitted})</h2>
      {status.submissions.length === 0 ? (
        <p className="text-sm text-ink-500">Responses will appear here as students submit.</p>
      ) : (
        <ul className="max-h-96 space-y-2 overflow-y-auto">
          {status.submissions.map((s) => (
            <li key={s.id} className={`rounded-xl border p-3 ${s.status === "removed" ? "border-rose-200 opacity-50" : s.spotlighted ? "border-accent-600" : "border-paper-200"}`}>
              <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-semibold">{s.studentName}</span>
                {s.votes > 0 && <Chip tone="good">{s.votes} vote{s.votes === 1 ? "" : "s"}</Chip>}
                {s.flags.shortReasoning && <Chip tone="warn">thin reasoning</Chip>}
                {s.flags.restatesEvidence && <Chip tone="warn">restates quote</Chip>}
                {s.revision && <Chip tone={s.revision.improved ? "good" : "neutral"}>{s.revision.keptOriginal ? "defended" : s.revision.improved ? "improved" : "revised"}</Chip>}
                <span className="ml-auto flex gap-2">
                  <button onClick={() => act({ type: "set_spotlight", submissionId: s.id, spotlighted: !s.spotlighted })}
                    className={`underline ${s.spotlighted ? "text-accent-600" : "text-ink-500"}`}>
                    {s.spotlighted ? "★ Spotlighted" : "☆ Spotlight"}
                  </button>
                  {s.status === "submitted" ? (
                    <button onClick={() => act({ type: "remove_submission", submissionId: s.id })} className="text-ink-500 underline hover:text-rose-700">
                      Remove
                    </button>
                  ) : (
                    <button onClick={() => act({ type: "restore_submission", submissionId: s.id })} className="text-ink-500 underline">
                      Restore
                    </button>
                  )}
                </span>
              </div>
              <p className="text-sm font-medium">{s.claim}</p>
              <blockquote className="my-1 border-l-2 border-paper-200 pl-2 font-serif text-sm italic text-ink-700">
                &ldquo;{s.evidenceText}&rdquo;
              </blockquote>
              <p className="text-sm text-ink-700">{s.reasoning}</p>
              {s.revision && !s.revision.keptOriginal && (
                <div className="mt-2 rounded-lg bg-emerald-50 p-2 text-sm">
                  <div className="mb-0.5 text-xs font-semibold text-emerald-800">After revision:</div>
                  <p className="font-medium">{s.revision.claim}</p>
                  <p className="text-ink-700">{s.revision.reasoning}</p>
                  <p className="mt-1 text-xs italic text-emerald-800">Why: {s.revision.changeExplanation}</p>
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
    <section className="rounded-2xl border border-paper-200 bg-white p-4">
      <h2 className="mb-3 font-serif text-lg font-bold">Class trends</h2>
      <h3 className="mb-1.5 text-sm font-semibold text-ink-700">Evidence hot spots (submissions)</h3>
      {status.evidenceClusters.length === 0 ? (
        <p className="mb-3 text-sm text-ink-500">No evidence selected yet.</p>
      ) : (
        <ul className="mb-4 space-y-1.5">
          {status.evidenceClusters.slice(0, 5).map((c, i) => (
            <li key={i} className="rounded-lg bg-paper-100 p-2 text-sm">
              <span className="mr-2 rounded-full bg-white px-2 py-0.5 text-xs font-bold">{c.count}×</span>
              <span className="font-serif italic">&ldquo;{c.text}&rdquo;</span>
              {c.votes > 0 && <span className="ml-2 text-xs text-ink-500">{c.votes} peer votes</span>}
            </li>
          ))}
        </ul>
      )}
      <h3 className="mb-1.5 text-sm font-semibold text-ink-700">Annotation heat map</h3>
      {status.annotationClusters.length === 0 ? (
        <p className="text-sm text-ink-500">No annotations yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {status.annotationClusters.slice(0, 5).map((c, i) => (
            <li key={i} className="rounded-lg bg-paper-100 p-2 text-sm">
              <span className="mr-2 rounded-full bg-white px-2 py-0.5 text-xs font-bold">{c.count}×</span>
              <span className="font-serif italic">&ldquo;{c.text}&rdquo;</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function VoicesPanel({ status }: { status: TeacherStatus }) {
  return (
    <section className="rounded-2xl border border-paper-200 bg-white p-4">
      <h2 className="mb-3 font-serif text-lg font-bold">Peer justifications & reflections</h2>
      <h3 className="mb-1.5 text-sm font-semibold text-ink-700">Vote justifications ({status.justifications.length})</h3>
      {status.justifications.length === 0 ? (
        <p className="mb-3 text-sm text-ink-500">None yet.</p>
      ) : (
        <ul className="mb-4 max-h-40 space-y-1.5 overflow-y-auto">
          {status.justifications.map((j, i) => (
            <li key={i} className="rounded-lg bg-paper-100 p-2 text-sm">
              <span className="font-semibold">{j.reviewerName}:</span> {j.justification}
            </li>
          ))}
        </ul>
      )}
      <h3 className="mb-1.5 text-sm font-semibold text-ink-700">Reflections ({status.reflections.length})</h3>
      {status.reflections.length === 0 ? (
        <p className="text-sm text-ink-500">None yet.</p>
      ) : (
        <ul className="max-h-40 space-y-1.5 overflow-y-auto">
          {status.reflections.map((r, i) => (
            <li key={i} className="rounded-lg bg-paper-100 p-2 text-sm">
              <span className="font-semibold">{r.studentName}:</span> {r.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" }) {
  const cls =
    tone === "good" ? "bg-emerald-100 text-emerald-900" : tone === "warn" ? "bg-amber-100 text-amber-900" : "bg-paper-100 text-ink-700";
  return <span className={`rounded-full px-1.5 py-0.5 ${cls}`}>{children}</span>;
}
