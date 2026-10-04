import { env } from "cloudflare:workers";
import { isAdmin, objectKey, ready } from "@/lib/photoStore";

/** The image itself. Hidden photos only load for a signed-in admin. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const size = new URL(request.url).searchParams.get("size") === "thumb" ? "thumb" : "full";

  const database = await ready();
  const row = await database.prepare("SELECT hidden FROM photos WHERE id = ?").bind(id).first<{ hidden: number }>();
  if (!row || (row.hidden === 1 && !(await isAdmin(request)))) return new Response("Not found", { status: 404 });

  const object = await env.PHOTOS.get(objectKey(id, size));
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "content-type": "image/jpeg",
      etag: object.httpEtag,
      // Photos never change; hiding one only removes it from the lists.
      "cache-control": row.hidden === 1 ? "private, no-store" : "public, max-age=31536000, immutable",
    },
  });
}
