"use client";

const FULL_EDGE = 2048;
const THUMB_EDGE = 480;

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Older Safari: fall back to an <img>, which also applies EXIF rotation.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function render(source: ImageBitmap | HTMLImageElement, edge: number, quality: number) {
  const scale = Math.min(1, edge / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise<{ blob: Blob; width: number; height: number }>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve({ blob, width: canvas.width, height: canvas.height }) : reject(new Error("encode"))),
      "image/jpeg",
      quality,
    ),
  );
}

/**
 * Re-encodes the photo as a JPEG (which also drops GPS and other metadata),
 * makes a thumbnail, and uploads both. Resolves to the new photo id.
 */
export async function uploadPhoto(file: File, extra: { guestId?: string | null; questId?: string | null }) {
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decode(file);
  } catch {
    throw new Error("This photo format can't be opened here. Try a different photo.");
  }
  const full = await render(source, FULL_EDGE, 0.85);
  const thumb = await render(source, THUMB_EDGE, 0.75);
  if ("close" in source) source.close();

  const form = new FormData();
  form.set("photo", full.blob, "photo.jpg");
  form.set("thumb", thumb.blob, "thumb.jpg");
  form.set("width", String(full.width));
  form.set("height", String(full.height));
  if (extra.guestId) form.set("guestId", extra.guestId);
  if (extra.questId) form.set("questId", extra.questId);

  const response = await fetch("/api/photos", { method: "POST", body: form });
  const body = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!response.ok || !body.id) throw new Error(body.error ?? "Upload failed. Check your signal and try again.");
  return body.id;
}

export const photoUrl = (id: string, size: "full" | "thumb" = "full") =>
  size === "thumb" ? `/api/photos/${id}?size=thumb` : `/api/photos/${id}`;
