import { env } from "cloudflare:workers";
import { MAX_UPLOAD_BYTES, objectKey } from "@/lib/photoStore";

const VIDEO_TYPES = /^video\/(mp4|quicktime|webm|3gpp|3gpp2|x-m4v|x-matroska)$/;

/** MP4, MOV, M4V and 3GP start with an `ftyp` box; WebM and MKV with the EBML magic. */
function looksLikeVideo(head: Uint8Array): boolean {
  const ftyp = head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70;
  const ebml = head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3;
  return ftyp || ebml;
}

/**
 * Step one of a video upload: the raw file streams straight into R2, so a
 * 50 MB clip never sits in Worker memory. Step two (POST /api/photos with
 * `videoId` and a poster) makes it visible.
 */
export async function PUT(request: Request) {
  const length = Number(request.headers.get("content-length"));
  if (!request.body || !length) return Response.json({ error: "Empty upload." }, { status: 411 });
  if (length > MAX_UPLOAD_BYTES) return Response.json({ error: "Videos can be up to 50 MB." }, { status: 413 });
  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const contentType = VIDEO_TYPES.test(type) ? type : "video/mp4";

  const id = crypto.randomUUID();
  const key = objectKey(id, "video");
  const { readable, writable } = new FixedLengthStream(length);
  const piping = request.body.pipeTo(writable);
  await Promise.all([env.PHOTOS.put(key, readable, { httpMetadata: { contentType } }), piping]);

  const head = await env.PHOTOS.get(key, { range: { offset: 0, length: 12 } });
  if (!head || !looksLikeVideo(new Uint8Array(await head.arrayBuffer()))) {
    await env.PHOTOS.delete(key);
    return Response.json({ error: "This file is not a video we can play. Please try a different one." }, { status: 415 });
  }
  return Response.json({ id }, { status: 201 });
}
