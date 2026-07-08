import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getTeacherRound, buildTeacherStatus } from "@/lib/rounds";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const round = await getTeacherRound(id, user.id);
  if (!round) return NextResponse.json({ error: "Round not found" }, { status: 404 });
  return NextResponse.json(await buildTeacherStatus(round));
}
