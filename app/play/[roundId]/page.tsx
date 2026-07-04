import { PlayClient } from "./play-client";

export default async function PlayRoundPage({ params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  return <PlayClient roundId={roundId} />;
}
