import { guestName, isAdmin, leaderboard, ready, type PhotoRow } from "@/lib/photoStore";
import { questById } from "@/lib/quests";

export const dynamic = "force-dynamic";

const denied = () => Response.json({ error: "Sign in first." }, { status: 401 });

/** Leaderboard plus every photo, hidden ones included. */
export async function GET(request: Request) {
  if (!(await isAdmin(request))) return denied();
  const database = await ready();
  const [standings, photos] = await Promise.all([
    leaderboard(),
    database.prepare("SELECT * FROM photos ORDER BY created_at DESC").all<PhotoRow>(),
  ]);
  return Response.json(
    {
      standings,
      photos: photos.results.map((row) => ({
        id: row.id,
        guestId: row.guest_id,
        name: guestName(row.guest_id),
        questId: row.quest_id,
        quest: row.quest_id ? questById(row.quest_id)?.title ?? row.quest_id : null,
        at: row.created_at,
        hidden: row.hidden === 1,
      })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}

type Action =
  | { action: "hide" | "show"; photoId: string }
  | { action: "disqualify" | "reinstate"; guestId: string };

export async function POST(request: Request) {
  if (!(await isAdmin(request))) return denied();
  const body = (await request.json().catch(() => null)) as Action | null;
  const database = await ready();
  switch (body?.action) {
    case "hide":
    case "show":
      await database
        .prepare("UPDATE photos SET hidden = ? WHERE id = ?")
        .bind(body.action === "hide" ? 1 : 0, String(body.photoId))
        .run();
      break;
    case "disqualify":
      await database
        .prepare("INSERT OR IGNORE INTO disqualified (guest_id, created_at) VALUES (?, ?)")
        .bind(String(body.guestId), Date.now())
        .run();
      break;
    case "reinstate":
      await database.prepare("DELETE FROM disqualified WHERE guest_id = ?").bind(String(body.guestId)).run();
      break;
    default:
      return Response.json({ error: "Unknown action." }, { status: 400 });
  }
  return Response.json({ ok: true });
}
