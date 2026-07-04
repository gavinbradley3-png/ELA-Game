import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { getTeacherRound } from "@/lib/rounds";
import { ControlPanel } from "./control-panel";

export default async function ControlPage({ params }: { params: Promise<{ id: string }> }) {
  const teacher = await requireTeacher();
  const { id } = await params;
  const round = await getTeacherRound(id, teacher.id);
  if (!round) notFound();
  return <ControlPanel roundId={id} />;
}
