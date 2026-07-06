import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { getTeacherRound, buildTeacherStatus } from "@/lib/rounds";
import { PHASE_LABELS, isActivePhase } from "@/lib/phases";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const teacher = await requireTeacher();
  const { id } = await params;
  const round = await getTeacherRound(id, teacher.id);
  if (!round) notFound();
  const status = await buildTeacherStatus(round);
  const { counts } = status;

  const needsSupport = status.students.filter((s) => {
    const sub = status.submissions.find((x) => x.studentSessionId === s.id);
    return (
      s.status === "active" &&
      (!s.hasSubmitted || (sub && (sub.flags.shortReasoning || sub.flags.restatesEvidence) && !sub.revision?.improved))
    );
  });
  const improved = status.submissions.filter((s) => s.revision?.improved);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-5xl">Case report — {status.passage?.title}</h1>
          <p className="text-smoke-400">
            {PHASE_LABELS[round.phase]} · Code <span className="text-gold-400">{round.joinCode}</span> · Prompt:{" "}
            {status.prompt?.text}
          </p>
        </div>
        <div className="flex gap-2">
          {isActivePhase(round.phase) && (
            <Link href={`/teacher/rounds/${id}/control`} className="btn btn-gold px-4 py-2">
              Back to live controls
            </Link>
          )}
          <a href={`/api/teacher/rounds/${id}/export`} className="btn btn-dark px-4 py-2">
            Export CSV (anonymous)
          </a>
          <a href={`/api/teacher/rounds/${id}/export?names=1`} className="btn btn-dark px-4 py-2">
            Export with names
          </a>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
        <Card label="Joined" value={counts.joined} />
        <Card label="Submitted" value={counts.submitted} />
        <Card label="Jury votes" value={counts.reviewed} />
        <Card label="Revised" value={counts.revised} />
        <Card label="Improved" value={counts.improved} highlight />
        <Card label="Reflected" value={counts.reflected} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="display mb-3 text-3xl">💬 Discussion starters</h2>
          <ul className="list-inside list-disc space-y-2 text-sm text-smoke-300">
            {status.evidenceClusters[0] && (
              <li>
                <strong className="text-smoke-50">{plural(status.evidenceClusters[0].count, "student")}</strong> chose
                evidence from &ldquo;{status.evidenceClusters[0].text.slice(0, 60)}…&rdquo; — ask:{" "}
                <em>what makes this moment so provable?</em>
              </li>
            )}
            {counts.flagged > 0 && (
              <li>
                <strong className="text-smoke-50">{plural(counts.flagged, "response")}</strong> restated the quote or
                gave thin reasoning — model the difference between <em>retelling</em> and <em>proving</em>.
              </li>
            )}
            {counts.improved > 0 && (
              <li>
                <strong className="text-smoke-50">{plural(counts.improved, "student")}</strong> meaningfully improved
                after peer review — spotlight a before/after pair and ask what changed.
              </li>
            )}
            {counts.submitted - counts.revised > 0 && counts.revised > 0 && (
              <li>
                <strong className="text-smoke-50">{plural(counts.submitted - counts.revised, "student")}</strong>{" "}
                didn&apos;t revise — ask the class: <em>when is defending your first answer the right move?</em>
              </li>
            )}
            {status.evidenceClusters.length > 2 && (
              <li>
                Evidence came from{" "}
                <strong className="text-smoke-50">{status.evidenceClusters.length} different spots</strong> in the
                text — compare two clusters and debate which better answers the prompt.
              </li>
            )}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="display mb-3 text-3xl">🧭 Who needs what</h2>
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-smoke-400">
            May need support ({needsSupport.length})
          </h3>
          {needsSupport.length === 0 ? (
            <p className="mb-3 text-sm text-smoke-400">Everyone submitted workable reasoning. 🎉</p>
          ) : (
            <p className="mb-3 text-sm text-smoke-300">{needsSupport.map((s) => s.displayName).join(", ")}</p>
          )}
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-smoke-400">
            Improved after revision ({improved.length})
          </h3>
          {improved.length === 0 ? (
            <p className="text-sm text-smoke-400">No measurable revision gains this round.</p>
          ) : (
            <p className="text-sm text-smoke-300">{improved.map((s) => s.studentName).join(", ")}</p>
          )}
        </section>

        <section className="card p-5">
          <h2 className="display mb-3 text-3xl">🔥 Evidence choices</h2>
          {status.evidenceClusters.length === 0 ? (
            <p className="text-sm text-smoke-400">No submissions.</p>
          ) : (
            <ul className="space-y-2">
              {status.evidenceClusters.map((c, i) => (
                <li key={i} className="rounded-lg bg-night-950 p-3 text-sm">
                  <div className="mb-1 flex gap-2 text-xs">
                    <span className="display rounded-md bg-gold-400 px-2 py-0.5 text-sm text-night-950">
                      {plural(c.count, "student")}
                    </span>
                    {c.votes > 0 && <span className="text-smoke-400">{plural(c.votes, "jury vote")}</span>}
                  </div>
                  <p className="font-serif italic text-smoke-300">&ldquo;{c.text}&rdquo;</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="display mb-3 text-3xl">📝 All responses</h2>
          <ul className="max-h-[32rem] space-y-2 overflow-y-auto">
            {status.submissions.map((s) => (
              <li key={s.id} className="rounded-xl border border-night-700 bg-night-950 p-3 text-sm">
                <div className="mb-1 flex flex-wrap gap-1.5 text-xs">
                  <span className="font-bold text-smoke-50">{s.studentName}</span>
                  {s.votes > 0 && <span className="rounded-full bg-win-400/15 px-1.5 py-0.5 font-semibold text-win-400">{s.votes} votes</span>}
                  {s.flags.shortReasoning && <span className="rounded-full bg-gold-400/15 px-1.5 py-0.5 font-semibold text-gold-400">thin reasoning</span>}
                  {s.flags.restatesEvidence && <span className="rounded-full bg-gold-400/15 px-1.5 py-0.5 font-semibold text-gold-400">restates quote</span>}
                  {s.revision?.improved && <span className="rounded-full bg-win-400/15 px-1.5 py-0.5 font-semibold text-win-400">improved</span>}
                </div>
                <p className="font-semibold text-smoke-50">{s.claim}</p>
                <blockquote className="my-1 border-l-2 border-gold-600 pl-2 font-serif italic text-smoke-300">
                  &ldquo;{s.evidenceText}&rdquo;
                </blockquote>
                <p className="text-smoke-300">{s.reasoning}</p>
                {s.revision && (
                  <div className="mt-1.5 rounded border-l-4 border-win-400 bg-win-400/10 p-2">
                    <span className="text-xs font-bold text-win-400">
                      {s.revision.keptOriginal ? "Defended original: " : "Revision: "}
                    </span>
                    {!s.revision.keptOriginal && <span className="text-smoke-300">{s.revision.reasoning} </span>}
                    <span className="text-xs italic text-win-400">({s.revision.changeExplanation})</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

function Card({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`card p-3 text-center ${highlight ? "border-gold-400" : ""}`}>
      <div className={`display text-3xl ${highlight ? "text-gold-400" : "text-smoke-50"}`}>{value}</div>
      <div className="text-xs font-bold uppercase tracking-wider text-smoke-400">{label}</div>
    </div>
  );
}
