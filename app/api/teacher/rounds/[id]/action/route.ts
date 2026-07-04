import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, gameRounds, studentSessions, submissions } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  getTeacherRound,
  advanceRound,
  enterPhase,
  pauseRound,
  resumeRound,
  adjustTimer,
} from "@/lib/rounds";
import { PHASE_ORDER } from "@/lib/phases";

/**
 * Single teacher control endpoint for live round actions (DESIGN.md §11).
 * Body: { type: string, ...args }. All actions require round ownership.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const round = await getTeacherRound(id, user.id);
  if (!round) return NextResponse.json({ error: "Round not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const type = String(body.type ?? "");

  switch (type) {
    case "advance": {
      const result = await advanceRound(round);
      if ("error" in result) return NextResponse.json(result, { status: 409 });
      return NextResponse.json(result);
    }
    case "goto": {
      const phase = String(body.phase ?? "");
      if (!(PHASE_ORDER as readonly string[]).includes(phase)) {
        return NextResponse.json({ error: "Unknown phase" }, { status: 400 });
      }
      const result = await enterPhase(round, phase);
      if ("error" in result) return NextResponse.json(result, { status: 409 });
      return NextResponse.json(result);
    }
    case "pause": {
      const result = await pauseRound(round);
      if (result.error) return NextResponse.json(result, { status: 409 });
      return NextResponse.json({ ok: true });
    }
    case "resume": {
      const result = await resumeRound(round);
      if (result.error) return NextResponse.json(result, { status: 409 });
      return NextResponse.json({ ok: true });
    }
    case "timer_add": {
      const delta = Number(body.seconds);
      if (!Number.isFinite(delta) || Math.abs(delta) > 30 * 60) {
        return NextResponse.json({ error: "Bad timer delta" }, { status: 400 });
      }
      await adjustTimer(round, delta);
      return NextResponse.json({ ok: true });
    }
    case "timer_clear": {
      await db.update(gameRounds).set({ phaseEndsAt: null, pausedRemainingMs: null }).where(eq(gameRounds.id, round.id));
      return NextResponse.json({ ok: true });
    }
    case "set_names_hidden": {
      await db
        .update(gameRounds)
        .set({ namesHidden: body.hidden ? 1 : 0 })
        .where(eq(gameRounds.id, round.id));
      return NextResponse.json({ ok: true });
    }
    case "set_join_locked": {
      await db
        .update(gameRounds)
        .set({ joinLocked: body.locked ? 1 : 0 })
        .where(eq(gameRounds.id, round.id));
      return NextResponse.json({ ok: true });
    }
    case "set_submissions_locked": {
      await db
        .update(gameRounds)
        .set({ submissionsLocked: body.locked ? 1 : 0 })
        .where(eq(gameRounds.id, round.id));
      return NextResponse.json({ ok: true });
    }
    case "remove_student":
    case "restore_student": {
      const sessionId = String(body.studentSessionId ?? "");
      await db
        .update(studentSessions)
        .set({ status: type === "remove_student" ? "removed" : "active" })
        .where(and(eq(studentSessions.id, sessionId), eq(studentSessions.roundId, round.id)));
      return NextResponse.json({ ok: true });
    }
    case "remove_submission":
    case "restore_submission": {
      const submissionId = String(body.submissionId ?? "");
      await db
        .update(submissions)
        .set({ status: type === "remove_submission" ? "removed" : "submitted" })
        .where(and(eq(submissions.id, submissionId), eq(submissions.roundId, round.id)));
      return NextResponse.json({ ok: true });
    }
    case "set_spotlight": {
      const submissionId = String(body.submissionId ?? "");
      await db
        .update(submissions)
        .set({ spotlighted: body.spotlighted ? 1 : 0 })
        .where(and(eq(submissions.id, submissionId), eq(submissions.roundId, round.id)));
      return NextResponse.json({ ok: true });
    }
    case "reset_student_submission": {
      const sessionId = String(body.studentSessionId ?? "");
      await db
        .delete(submissions)
        .where(and(eq(submissions.studentSessionId, sessionId), eq(submissions.roundId, round.id)));
      return NextResponse.json({ ok: true });
    }
    case "end": {
      const result = await enterPhase(round, "complete");
      if ("error" in result) return NextResponse.json(result, { status: 409 });
      return NextResponse.json(result);
    }
    case "cancel": {
      await db
        .update(gameRounds)
        .set({ phase: "cancelled", pausedFromPhase: null, phaseEndsAt: null, endedAt: Date.now() })
        .where(eq(gameRounds.id, round.id));
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: `Unknown action: ${type}` }, { status: 400 });
  }
}
