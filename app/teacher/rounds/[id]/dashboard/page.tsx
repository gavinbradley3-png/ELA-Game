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
          <h1 className="font-serif text-3xl font-bold">Round results — {status.passage?.title}</h1>
          <p className="text-ink-500">
            {PHASE_LABELS[round.phase]} · Code {round.joinCode} · Prompt: {status.prompt?.text}
          </p>
        </div>
        <div className="flex gap-2">
          {isActivePhase(round.phase) && (
            <Link href={`/teacher/rounds/${id}/control`} className="rounded-lg bg-accent-600 px-4 py-2 font-semibold text-white hover:bg-accent-500">
              Back to live controls
            </Link>
          )}
          <a href={`/api/teacher/rounds/${id}/export`} className="rounded-lg border-2 border-ink-950 px-4 py-2 font-semibold hover:bg-paper-100">
            Export CSV (anonymous)
          </a>
          <a href={`/api/teacher/rounds/${id}/export?names=1`} className="rounded-lg border border-paper-200 px-4 py-2 font-semibold hover:bg-paper-100">
            Export with names
          </a>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
        <Card label="Joined" value={counts.joined} />
        <Card label="Submitted" value={counts.submitted} />
        <Card label="Peer votes" value={counts.reviewed} />
        <Card label="Revised" value={counts.revised} />
        <Card label="Improved" value={counts.improved} highlight />
        <Card label="Reflected" value={counts.reflected} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-paper-200 bg-white p-5">
          <h2 className="mb-3 font-serif text-xl font-bold">💬 Discussion starters</h2>
          <ul className="list-inside list-disc space-y-2 text-sm text-ink-700">
            {status.evidenceClusters[0] && (
              <li>
                <strong>{plural(status.evidenceClusters[0].count, "student")}</strong> chose evidence from
                &ldquo;{status.evidenceClusters[0].text.slice(0, 60)}…&rdquo; — ask: <em>what makes this moment so provable?</em>
              </li>
            )}
            {counts.flagged > 0 && (
              <li>
                <strong>{counts.flagged} responses</strong> restated the quote or gave thin reasoning — model the
                difference between <em>retelling</em> and <em>proving</em>.
              </li>
            )}
            {counts.improved > 0 && (
              <li>
                <strong>{plural(counts.improved, "student")}</strong> meaningfully improved after peer review — spotlight a
                before/after pair and ask what changed.
              </li>
            )}
            {counts.submitted - counts.revised > 0 && counts.revised > 0 && (
              <li>
                <strong>{plural(counts.submitted - counts.revised, "student")}</strong> didn&apos;t revise — ask the class:
                <em> when is defending your first answer the right move?</em>
              </li>
            )}
            {status.evidenceClusters.length > 2 && (
              <li>
                Evidence came from <strong>{status.evidenceClusters.length} different spots</strong> in the text —
                compare two clusters and debate which better answers the prompt.
              </li>
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-paper-200 bg-white p-5">
          <h2 className="mb-3 font-serif text-xl font-bold">🧭 Who needs what</h2>
          <h3 className="mb-1 text-sm font-semibold text-ink-700">May need support ({needsSupport.length})</h3>
          {needsSupport.length === 0 ? (
            <p className="mb-3 text-sm text-ink-500">Everyone submitted workable reasoning. 🎉</p>
          ) : (
            <p className="mb-3 text-sm">{needsSupport.map((s) => s.displayName).join(", ")}</p>
          )}
          <h3 className="mb-1 text-sm font-semibold text-ink-700">Improved after revision ({improved.length})</h3>
          {improved.length === 0 ? (
            <p className="text-sm text-ink-500">No measurable revision gains this round.</p>
          ) : (
            <p className="text-sm">{improved.map((s) => s.studentName).join(", ")}</p>
          )}
        </section>

        <section className="rounded-2xl border border-paper-200 bg-white p-5">
          <h2 className="mb-3 font-serif text-xl font-bold">🔥 Evidence choices</h2>
          {status.evidenceClusters.length === 0 ? (
            <p className="text-sm text-ink-500">No submissions.</p>
          ) : (
            <ul className="space-y-2">
              {status.evidenceClusters.map((c, i) => (
                <li key={i} className="rounded-lg bg-paper-100 p-3 text-sm">
                  <div className="mb-1 flex gap-2 text-xs text-ink-500">
                    <span className="rounded-full bg-white px-2 py-0.5 font-bold text-ink-950">{plural(c.count, "student")}</span>
                    {c.votes > 0 && <span>{plural(c.votes, "peer vote")}</span>}
                  </div>
                  <p className="font-serif italic">&ldquo;{c.text}&rdquo;</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-paper-200 bg-white p-5">
          <h2 className="mb-3 font-serif text-xl font-bold">📝 All responses</h2>
          <ul className="max-h-[32rem] space-y-2 overflow-y-auto">
            {status.submissions.map((s) => (
              <li key={s.id} className="rounded-lg border border-paper-200 p-3 text-sm">
                <div className="mb-1 flex flex-wrap gap-1.5 text-xs">
                  <span className="font-semibold">{s.studentName}</span>
                  {s.votes > 0 && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-emerald-900">{s.votes} votes</span>}
                  {s.flags.shortReasoning && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-amber-900">thin reasoning</span>}
                  {s.flags.restatesEvidence && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-amber-900">restates quote</span>}
                  {s.revision?.improved && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-emerald-900">improved</span>}
                </div>
                <p className="font-medium">{s.claim}</p>
                <blockquote className="my-1 border-l-2 border-paper-200 pl-2 font-serif italic text-ink-700">
                  &ldquo;{s.evidenceText}&rdquo;
                </blockquote>
                <p className="text-ink-700">{s.reasoning}</p>
                {s.revision && (
                  <div className="mt-1.5 rounded bg-emerald-50 p-2">
                    <span className="text-xs font-semibold text-emerald-800">
                      {s.revision.keptOriginal ? "Defended original: " : "Revision: "}
                    </span>
                    {!s.revision.keptOriginal && <span className="text-ink-700">{s.revision.reasoning} </span>}
                    <span className="text-xs italic text-emerald-800">({s.revision.changeExplanation})</span>
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
    <div className={`rounded-xl border p-3 text-center ${highlight ? "border-accent-600" : "border-paper-200"} bg-white`}>
      <div className="font-serif text-2xl font-bold">{value}</div>
      <div className="text-xs text-ink-500">{label}</div>
    </div>
  );
}
