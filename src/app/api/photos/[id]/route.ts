import { env } from "cloudflare:workers";
import { isAdmin, objectKey, ready } from "@/lib/photoStore";

/** `bytes=start-end`, `bytes=start-` or `bytes=-suffix` against a known size. */
function parseRange(header: string | null, size: number): { offset: number; length: number } | null {
  const match = header?.match(/^bytes=(\d*)-(\d*)$/);
  if (!match || (!match[1] && !match[2])) return null;
  let start: number;
  let end: number;
  if (!match[1]) {
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  }
  if (start > end || start >= size) return null;
  return { offset: start, length: end - start + 1 };
}

/**
 * The image or video itself. Hidden uploads only load for a signed-in admin.
 * Videos answer byte ranges, which iPhones need before they will play anything.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const wantThumb = new URL(request.url).searchParams.get("size") === "thumb";

  const database = await ready();
  const row = await database.prepare("SELECT hidden, kind FROM photos WHERE id = ?").bind(id).first<{ hidden: number; kind: string }>();
  if (!row || (row.hidden === 1 && !(await isAdmin(request)))) return new Response("Not found", { status: 404 });
  const cache = row.hidden === 1 ? "private, no-store" : "public, max-age=31536000, immutable";

  if (wantThumb || row.kind !== "video") {
    const object = await env.PHOTOS.get(objectKey(id, wantThumb ? "thumb" : "full"));
    if (!object) return new Response("Not found", { status: 404 });
    // Uploads never change; hiding one only removes it from the lists.
    return new Response(object.body, { headers: { "content-type": "image/jpeg", etag: object.httpEtag, "cache-control": cache } });
  }

  const key = objectKey(id, "video");
  const info = await env.PHOTOS.head(key);
  if (!info) return new Response("Not found", { status: 404 });
  const headers = {
    "content-type": info.httpMetadata?.contentType ?? "video/mp4",
    "accept-ranges": "bytes",
    etag: info.httpEtag,
    "cache-control": cache,
  };
  const range = parseRange(request.headers.get("range"), info.size);
  if (request.headers.has("range") && !range) {
    return new Response(null, { status: 416, headers: { ...headers, "content-range": `bytes */${info.size}` } });
  }
  const object = await env.PHOTOS.get(key, range ? { range } : undefined);
  if (!object) return new Response("Not found", { status: 404 });
  if (!range) return new Response(object.body, { headers: { ...headers, "content-length": String(info.size) } });
  return new Response(object.body, {
    status: 206,
    headers: {
      ...headers,
      "content-length": String(range.length),
      "content-range": `bytes ${range.offset}-${range.offset + range.length - 1}/${info.size}`,
    },
  });
}
