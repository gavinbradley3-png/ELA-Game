import { getSessionUser } from "@/lib/auth";
import { getTeacherRound, buildTeacherStatus } from "@/lib/rounds";

/** CSV export of round results (DESIGN.md §14, §21). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("Not authenticated", { status: 401 });
  const { id } = await params;
  const round = await getTeacherRound(id, user.id);
  if (!round) return new Response("Round not found", { status: 404 });

  const url = new URL(req.url);
  const anonymous = url.searchParams.get("names") !== "1";
  const status = await buildTeacherStatus(round);

  const header = [
    "student",
    "claim",
    "evidence",
    "reasoning",
    "confidence",
    "votes_received",
    "flags",
    "revised_claim",
    "revised_evidence",
    "revised_reasoning",
    "change_explanation",
    "revision_improved",
  ];
  const bySession = new Map(status.submissions.map((s) => [s.studentSessionId, s]));
  const reflectionsByName = new Map(status.reflections.map((r) => [r.studentName, r.text]));

  const rows = status.students
    .filter((st) => st.status === "active")
    .map((st, i) => {
      const sub = bySession.get(st.id);
      const flags = sub
        ? [sub.flags.shortReasoning && "short reasoning", sub.flags.restatesEvidence && "restates evidence"]
            .filter(Boolean)
            .join("; ")
        : "no submission";
      return [
        anonymous ? `Student ${i + 1}` : st.displayName,
        sub?.claim ?? "",
        sub?.evidenceText ?? "",
        sub?.reasoning ?? "",
        sub ? String(sub.confidence) : "",
        sub ? String(sub.votes) : "",
        flags,
        sub?.revision?.claim ?? "",
        sub?.revision?.evidenceText ?? "",
        sub?.revision?.reasoning ?? "",
        sub?.revision?.changeExplanation ?? "",
        sub?.revision ? (sub.revision.improved ? "yes" : "no") : "",
      ];
    });

  // Reflections included only in the named export to keep anonymous exports clean.
  if (!anonymous) {
    header.push("reflection");
    for (const row of rows) {
      row.push(reflectionsByName.get(row[0]) ?? "");
    }
  }

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="receipts-round-${round.joinCode}.csv"`,
    },
  });
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
