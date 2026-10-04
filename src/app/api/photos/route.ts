import { env } from "cloudflare:workers";
import { isGuest, objectKey, ready, toPublic, type PhotoRow } from "@/lib/photoStore";
import { questsFor } from "@/lib/quests";

export const dynamic = "force-dynamic";

const MAX_BYTES = 6 * 1024 * 1024;
const MAX_THUMB_BYTES = 512 * 1024;

/** Every visible photo, newest first. The TV polls this. */
export async function GET() {
  const database = await ready();
  // ponytail: one list for the whole night; page it if a wedding ever passes a few thousand photos
  const { results } = await database
    .prepare("SELECT * FROM photos WHERE hidden = 0 ORDER BY created_at DESC LIMIT 3000")
    .all<PhotoRow>();
  return Response.json({ photos: results.map(toPublic) }, { headers: { "cache-control": "no-store" } });
}

function bad(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

async function isJpeg(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 3).arrayBuffer());
  return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
}

/**
 * One photo per request. The browser has already resized it to a JPEG and
 * made a thumbnail, so the Worker only checks and stores.
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return bad("Expected a form upload.");
  }
  const photo = form.get("photo");
  const thumb = form.get("thumb");
  if (!(photo instanceof File) || !(thumb instanceof File)) return bad("Missing photo.");
  if (photo.size > MAX_BYTES || thumb.size > MAX_THUMB_BYTES) return bad("Photo is too large.", 413);
  if (!(await isJpeg(photo)) || !(await isJpeg(thumb))) return bad("Photos must be JPEG.", 415);

  const width = Number(form.get("width"));
  const height = Number(form.get("height"));
  if (![width, height].every((n) => Number.isInteger(n) && n > 0 && n <= 10000)) return bad("Bad photo size.");

  const guestId = (form.get("guestId") as string | null) || null;
  if (guestId && !isGuest(guestId)) return bad("Unknown guest.");
  const questId = (form.get("questId") as string | null) || null;
  if (questId) {
    if (!guestId) return bad("Pick your name before doing a quest.");
    if (!questsFor(guestId).some((quest) => quest.id === questId)) return bad("That quest is not on your list.");
  }

  const id = crypto.randomUUID();
  const database = await ready();
  const meta = { httpMetadata: { contentType: "image/jpeg" } };
  await Promise.all([
    env.PHOTOS.put(objectKey(id, "full"), photo.stream(), meta),
    env.PHOTOS.put(objectKey(id, "thumb"), thumb.stream(), meta),
  ]);
  try {
    await database
      .prepare("INSERT INTO photos (id, guest_id, quest_id, width, height, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, guestId, questId, width, height, Date.now())
      .run();
  } catch (error) {
    await env.PHOTOS.delete([objectKey(id, "full"), objectKey(id, "thumb")]);
    throw error;
  }
  return Response.json({ id }, { status: 201 });
}
