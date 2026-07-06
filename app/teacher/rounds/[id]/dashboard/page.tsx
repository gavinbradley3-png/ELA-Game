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
          <h1 className="display text-5xl">Round report — {status.passage?.title}</h1>
          <p className="text-muted-500">
            {PHASE_LABELS[round.phase]} · Code <span className="text-teal-600">{round.joinCode}</span> · Prompt:{" "}
            {status.prompt?.text}
          </p>
        </div>
        <div className="flex gap-2">
          {isActivePhase(round.phase) && (
            <Link href={`/teacher/rounds/${id}/control`} className="btn btn-primary px-4 py-2">
              Back to live controls
            </Link>
          )}
          <a href={`/api/teacher/rounds/${id}/export`} className="btn btn-secondary px-4 py-2">
            Export CSV (anonymous)
          </a>
          <a href={`/api/teacher/rounds/${id}/export?names=1`} className="btn btn-secondary px-4 py-2">
            Export with names
          </a>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
        <Card label="Joined" value={counts.joined} />
        <Card label="Submitted" value={counts.submitted} />
        <Card label="Votes cast" value={counts.reviewed} />
        <Card label="Revised" value={counts.revised} />
        <Card label="Improved" value={counts.improved} highlight />
        <Card label="Reflected" value={counts.reflected} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="display mb-3 text-3xl">Discussion starters</h2>
          <ul className="list-inside list-disc space-y-2 text-sm text-ink-900/80">
            {status.evidenceClusters[0] && (
              <li>
                <strong className="text-navy-950">{plural(status.evidenceClusters[0].count, "student")}</strong> chose
                evidence from &ldquo;{status.evidenceClusters[0].text.slice(0, 60)}…&rdquo; — ask:{" "}
                <em>what makes this moment so provable?</em>
              </li>
            )}
            {counts.flagged > 0 && (
              <li>
                <strong className="text-navy-950">{plural(counts.flagged, "response")}</strong> restated the quote or
                gave thin reasoning — model the difference between <em>retelling</em> and <em>proving</em>.
              </li>
            )}
            {counts.improved > 0 && (
              <li>
                <strong className="text-navy-950">{plural(counts.improved, "student")}</strong> meaningfully improved
                after peer review — spotlight a before/after pair and ask what changed.
              </li>
            )}
            {counts.submitted - counts.revised > 0 && counts.revised > 0 && (
              <li>
                <strong className="text-navy-950">{plural(counts.submitted - counts.revised, "student")}</strong>{" "}
                didn&apos;t revise — ask the class: <em>when is defending your first answer the right move?</em>
              </li>
            )}
            {status.evidenceClusters.length > 2 && (
              <li>
                Evidence came from{" "}
                <strong className="text-navy-950">{status.evidenceClusters.length} different spots</strong> in the
                text — compare two clusters and debate which better answers the prompt.
              </li>
            )}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="display mb-3 text-3xl">Who needs what</h2>
          <h3 className="mb-1 accent-label text-muted-500">
            May need support ({needsSupport.length})
          </h3>
          {needsSupport.length === 0 ? (
            <p className="mb-3 text-sm text-muted-500">Everyone submitted workable reasoning.</p>
          ) : (
            <p className="mb-3 text-sm text-ink-900/80">{needsSupport.map((s) => s.displayName).join(", ")}</p>
          )}
          <h3 className="mb-1 accent-label text-muted-500">
            Improved after revision ({improved.length})
          </h3>
          {improved.length === 0 ? (
            <p className="text-sm text-muted-500">No measurable revision gains this round.</p>
          ) : (
            <p className="text-sm text-ink-900/80">{improved.map((s) => s.studentName).join(", ")}</p>
          )}
        </section>

        <section className="card p-5">
          <h2 className="display mb-3 text-3xl">Evidence choices</h2>
          {status.evidenceClusters.length === 0 ? (
            <p className="text-sm text-muted-500">No submissions.</p>
          ) : (
            <ul className="space-y-2">
              {status.evidenceClusters.map((c, i) => (
                <li key={i} className="rounded-lg bg-cream-100 p-3 text-sm">
                  <div className="mb-1 flex gap-2 text-xs">
                    <span className="display rounded-md bg-mark-400 px-2 py-0.5 text-sm text-navy-950">
                      {plural(c.count, "student")}
                    </span>
                    {c.votes > 0 && <span className="text-muted-500">{plural(c.votes, "vote")}</span>}
                  </div>
                  <p className="font-serif italic text-ink-900/80">&ldquo;{c.text}&rdquo;</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="display mb-3 text-3xl">All responses</h2>
          <ul className="max-h-[32rem] space-y-2 overflow-y-auto">
            {status.submissions.map((s) => (
              <li key={s.id} className="rounded-xl border border-line-300 bg-cream-100 p-3 text-sm">
                <div className="mb-1 flex flex-wrap gap-1.5 text-xs">
                  <span className="font-bold text-navy-950">{s.studentName}</span>
                  {s.votes > 0 && <span className="rounded-full bg-teal-100 px-1.5 py-0.5 font-semibold text-teal-600">{s.votes} votes</span>}
                  {s.flags.shortReasoning && <span className="rounded-full bg-coral-100 px-1.5 py-0.5 font-semibold text-coral-600">thin reasoning</span>}
                  {s.flags.restatesEvidence && <span className="rounded-full bg-coral-100 px-1.5 py-0.5 font-semibold text-coral-600">restates quote</span>}
                  {s.revision?.improved && <span className="rounded-full bg-teal-100 px-1.5 py-0.5 font-semibold text-teal-600">improved</span>}
                </div>
                <p className="font-semibold text-navy-950">{s.claim}</p>
                <blockquote className="my-1 border-l-2 border-mark-400 pl-2 font-serif italic text-ink-900/80">
                  &ldquo;{s.evidenceText}&rdquo;
                </blockquote>
                <p className="text-ink-900/80">{s.reasoning}</p>
                {s.revision && (
                  <div className="mt-1.5 rounded border-l-4 border-teal-500 bg-teal-100 p-2">
                    <span className="text-xs font-bold text-teal-600">
                      {s.revision.keptOriginal ? "Defended original: " : "Revision: "}
                    </span>
                    {!s.revision.keptOriginal && <span className="text-ink-900/80">{s.revision.reasoning} </span>}
                    <span className="text-xs italic text-teal-600">({s.revision.changeExplanation})</span>
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
    <div className={`card p-3 text-center ${highlight ? "border-mark-400" : ""}`}>
      <div className={`display text-3xl ${highlight ? "text-teal-600" : "text-navy-950"}`}>{value}</div>
      <div className="accent-label text-muted-500">{label}</div>
    </div>
  );
}
