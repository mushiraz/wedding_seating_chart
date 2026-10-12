import { env } from "cloudflare:workers";
import { isGuest, objectKey, ready, toPublic, type PhotoRow } from "@/lib/photoStore";
import { questsFor } from "@/lib/quests";

export const dynamic = "force-dynamic";

const MAX_JPEG_BYTES = 12 * 1024 * 1024;
const MAX_THUMB_BYTES = 1024 * 1024;
/** Cloudflare Images refuses inputs over 20 MB. */
const MAX_CONVERT_BYTES = 20 * 1024 * 1024;
const FULL_EDGE = 2048;
const THUMB_EDGE = 480;

/** Everything visible, newest first. The TV, the gallery and the photo page poll this. */
export async function GET() {
  const database = await ready();
  // ponytail: one list for the whole night; page it if a wedding ever passes a few thousand uploads
  const { results } = await database
    .prepare("SELECT * FROM photos WHERE hidden = 0 ORDER BY created_at DESC LIMIT 3000")
    .all<PhotoRow>();
  return Response.json({ photos: results.map(toPublic) }, { headers: { "cache-control": "no-store" } });
}

function bad(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

async function isJpeg(file: Blob): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 3).arrayBuffer());
  return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
}

const meta = { httpMetadata: { contentType: "image/jpeg" } };

/** Cloudflare Images turns any format it reads (HEIC, WebP, GIF, PNG...) into our full and thumb JPEGs. */
async function convert(original: File) {
  const bytes = await original.arrayBuffer();
  const stream = () => new Blob([bytes]).stream();
  const render = async (edge: number, quality: number) => {
    const result = await env.IMAGES.input(stream())
      .transform({ width: edge, height: edge, fit: "scale-down" })
      .output({ format: "image/jpeg", quality });
    return new Uint8Array(await new Response(result.image()).arrayBuffer());
  };
  const full = await render(FULL_EDGE, 85);
  const thumb = await render(THUMB_EDGE, 75);
  const info = await env.IMAGES.info(new Blob([full]).stream());
  if (!("width" in info)) throw new Error("not a raster image");
  return { full, thumb, width: info.width, height: info.height };
}

/**
 * Three ways in, one row out:
 * - `photo` + `thumb`: the browser already made the JPEGs (the normal path).
 * - `original`: the browser could not open it; Cloudflare Images converts it here.
 * - `videoId` + `thumb`: the video itself was streamed to PUT /api/photos/video; this adds its poster.
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return bad("Expected a form upload.");
  }

  const guestId = (form.get("guestId") as string | null) || null;
  if (guestId && !isGuest(guestId)) return bad("Unknown guest.");
  const questId = (form.get("questId") as string | null) || null;
  if (questId) {
    if (!guestId) return bad("Please choose your name first.");
    if (!questsFor(guestId).some((quest) => quest.id === questId)) return bad("This challenge is not on your list.");
  }

  const original = form.get("original");
  const videoId = form.get("videoId");
  const thumb = form.get("thumb");
  let id: string = crypto.randomUUID();
  let kind: "image" | "video" = "image";
  let width = Number(form.get("width"));
  let height = Number(form.get("height"));
  let duration: number | null = null;

  if (original instanceof File) {
    if (original.size > MAX_CONVERT_BYTES) return bad("This photo is too large to convert. Please try a smaller one.", 413);
    let converted;
    try {
      converted = await convert(original);
    } catch {
      return bad("This file could not be read as a photo. Please try a different one.", 415);
    }
    ({ width, height } = converted);
    await Promise.all([
      env.PHOTOS.put(objectKey(id, "full"), converted.full, meta),
      env.PHOTOS.put(objectKey(id, "thumb"), converted.thumb, meta),
    ]);
  } else if (typeof videoId === "string") {
    if (!/^[0-9a-f-]{36}$/.test(videoId) || !(thumb instanceof File)) return bad("Missing video.");
    if (thumb.size > MAX_THUMB_BYTES || !(await isJpeg(thumb))) return bad("Bad video preview.", 415);
    const video = await env.PHOTOS.head(objectKey(videoId, "video"));
    if (!video) return bad("The video did not finish uploading. Please try again.");
    const database = await ready();
    // A retried request after a dropped connection: the video is already in, so say so instead of failing.
    if (await database.prepare("SELECT 1 FROM photos WHERE id = ?").bind(videoId).first()) return Response.json({ id: videoId });
    id = videoId;
    kind = "video";
    duration = Number(form.get("duration")) || null;
    await env.PHOTOS.put(objectKey(id, "thumb"), thumb.stream(), meta);
  } else {
    const photo = form.get("photo");
    if (!(photo instanceof File) || !(thumb instanceof File)) return bad("Missing photo.");
    if (photo.size > MAX_JPEG_BYTES || thumb.size > MAX_THUMB_BYTES) return bad("Photo is too large.", 413);
    if (!(await isJpeg(photo)) || !(await isJpeg(thumb))) return bad("Photos must be JPEG.", 415);
    await Promise.all([
      env.PHOTOS.put(objectKey(id, "full"), photo.stream(), meta),
      env.PHOTOS.put(objectKey(id, "thumb"), thumb.stream(), meta),
    ]);
  }

  if (![width, height].every((n) => Number.isInteger(n) && n > 0 && n <= 20000)) {
    // A video whose size the phone could not read still plays; assume landscape for the layout.
    if (kind !== "video") return bad("Bad photo size.");
    [width, height] = [1920, 1080];
  }

  const database = await ready();
  try {
    await database
      .prepare("INSERT INTO photos (id, guest_id, quest_id, width, height, created_at, kind, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, guestId, questId, width, height, Date.now(), kind, duration)
      .run();
  } catch (error) {
    await env.PHOTOS.delete([objectKey(id, "full"), objectKey(id, "thumb"), objectKey(id, "video")]);
    throw error;
  }
  return Response.json({ id }, { status: 201 });
}
