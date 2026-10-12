"use client";

import { MAX_UPLOAD_BYTES } from "./limits";

const FULL_EDGE = 2048;
const THUMB_EDGE = 480;
/** Cloudflare Images' input limit for the server-side conversion fallback. */
const MAX_CONVERT_BYTES = 20 * 1024 * 1024;

const VIDEO_EXT = /\.(mov|mp4|m4v|webm|3gp|3g2|mkv)$/i;
const VIDEO_TYPE_BY_EXT: Record<string, string> = {
  mov: "video/quicktime",
  mp4: "video/mp4",
  m4v: "video/x-m4v",
  webm: "video/webm",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  mkv: "video/x-matroska",
};

export const isVideoFile = (file: File) => file.type.startsWith("video/") || VIDEO_EXT.test(file.name);
const isHeicFile = (file: File) => /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);

type Progress = (fraction: number) => void;
type Source = ImageBitmap | HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;
const sizeOf = (source: Source) =>
  source instanceof HTMLVideoElement ? { width: source.videoWidth, height: source.videoHeight } : { width: source.width, height: source.height };

/** XHR rather than fetch, because only XHR reports upload progress for big files on slow venue Wi-Fi. */
function send(method: "POST" | "PUT", url: string, body: XMLHttpRequestBodyInit, onProgress?: Progress, contentType?: string) {
  return new Promise<{ id: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    if (contentType) xhr.setRequestHeader("content-type", contentType);
    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress?.(event.loaded / event.total);
    xhr.onload = () => {
      let parsed: { id?: string; error?: string } = {};
      try {
        parsed = JSON.parse(xhr.responseText);
      } catch {
        // Fall through to the generic message.
      }
      if (xhr.status >= 200 && xhr.status < 300 && parsed.id) resolve({ id: parsed.id });
      else reject(new Error(parsed.error ?? "That upload did not go through. Please check your connection and try again."));
    };
    xhr.onerror = () => reject(new Error("That upload did not go through. Please check your connection and try again."));
    xhr.send(body);
  });
}

async function decodeWithBrowser(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    // Older Safari: an <img> decodes more formats and also applies EXIF rotation.
    const url = URL.createObjectURL(blob);
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

/** Opens any photo the phone can give us: natively first, then a HEIC decoder that only downloads when needed. */
async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement | null> {
  try {
    return await decodeWithBrowser(file);
  } catch {
    if (!isHeicFile(file)) return null;
  }
  try {
    const { heicTo } = await import("heic-to/csp");
    return await decodeWithBrowser(await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 }));
  } catch {
    return null;
  }
}

function render(source: Source, edge: number, quality: number) {
  const { width, height } = sizeOf(source);
  const scale = Math.min(1, edge / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise<{ blob: Blob; width: number; height: number }>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve({ blob, width: canvas.width, height: canvas.height }) : reject(new Error("encode"))),
      "image/jpeg",
      quality,
    ),
  );
}

function once(target: HTMLVideoElement, event: string, ms: number) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout: ${event}`)), ms);
    target.addEventListener(event, () => (clearTimeout(timer), resolve()), { once: true });
    target.addEventListener("error", () => (clearTimeout(timer), reject(new Error("video error"))), { once: true });
  });
}

/** A plain card with a play symbol, for videos this browser cannot draw a frame from. */
function placeholderPoster() {
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 270;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#1c2b24";
  ctx.fillRect(0, 0, 480, 270);
  ctx.fillStyle = "#f6f1e8";
  ctx.beginPath();
  ctx.moveTo(210, 100);
  ctx.lineTo(210, 170);
  ctx.lineTo(270, 135);
  ctx.closePath();
  ctx.fill();
  return render(canvas, THUMB_EDGE, 0.8);
}

/** Size, length and a poster frame, read on the phone so the server never decodes video. */
async function inspectVideo(file: File) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  let width = 0;
  let height = 0;
  let duration = 0;
  let poster: Blob | null = null;
  try {
    await once(video, "loadedmetadata", 10000);
    width = video.videoWidth;
    height = video.videoHeight;
    duration = Number.isFinite(video.duration) ? video.duration : 0;
    video.currentTime = Math.min(1, duration / 2 || 0);
    await once(video, "seeked", 8000);
    if (video.readyState < 2) await once(video, "loadeddata", 4000);
    poster = (await render(video, THUMB_EDGE, 0.8)).blob;
  } catch {
    // Codec this browser can't decode (e.g. HEVC on some Android phones): it still uploads and plays where supported.
  } finally {
    URL.revokeObjectURL(url);
  }
  return { width, height, duration, poster: poster ?? (await placeholderPoster()).blob };
}

/**
 * Uploads one photo or video, whatever the phone produced. Resolves to the new id.
 * Photos become a 2048px JPEG plus a thumbnail on the phone, which also strips
 * location data; videos go up as they are.
 */
export async function uploadMedia(
  file: File,
  extra: { guestId?: string | null; questId?: string | null },
  onProgress?: Progress,
): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("This file is over 50 MB. Please choose a smaller one.");
  const form = new FormData();
  if (extra.guestId) form.set("guestId", extra.guestId);
  if (extra.questId) form.set("questId", extra.questId);

  if (isVideoFile(file)) {
    const info = await inspectVideo(file);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const type = file.type || VIDEO_TYPE_BY_EXT[ext] || "video/mp4";
    const { id } = await send("PUT", "/api/photos/video", file, (f) => onProgress?.(f * 0.95), type);
    form.set("videoId", id);
    form.set("thumb", info.poster, "thumb.jpg");
    form.set("width", String(info.width));
    form.set("height", String(info.height));
    form.set("duration", String(info.duration));
    const result = await send("POST", "/api/photos", form);
    onProgress?.(1);
    return result.id;
  }

  const source = await decodeImage(file);
  if (!source) {
    // Nothing on the phone could open it; Cloudflare Images can read more formats.
    if (file.size > MAX_CONVERT_BYTES) throw new Error("This photo could not be opened. Please try a different one.");
    form.set("original", file, file.name || "photo");
    return (await send("POST", "/api/photos", form, onProgress)).id;
  }
  const full = await render(source, FULL_EDGE, 0.85);
  const thumb = await render(source, THUMB_EDGE, 0.75);
  if ("close" in source) source.close();
  form.set("photo", full.blob, "photo.jpg");
  form.set("thumb", thumb.blob, "thumb.jpg");
  form.set("width", String(full.width));
  form.set("height", String(full.height));
  return (await send("POST", "/api/photos", form, onProgress)).id;
}

export const photoUrl = (id: string, size: "full" | "thumb" = "full") =>
  size === "thumb" ? `/api/photos/${id}?size=thumb` : `/api/photos/${id}`;
