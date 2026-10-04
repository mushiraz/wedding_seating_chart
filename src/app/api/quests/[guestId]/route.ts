import { isGuest, questProgress } from "@/lib/photoStore";

export const dynamic = "force-dynamic";

/** A player's quests and which ones already have a photo. */
export async function GET(_request: Request, { params }: { params: Promise<{ guestId: string }> }) {
  const { guestId } = await params;
  if (!isGuest(guestId)) return Response.json({ error: "Unknown guest." }, { status: 404 });
  return Response.json(await questProgress(guestId), { headers: { "cache-control": "no-store" } });
}
