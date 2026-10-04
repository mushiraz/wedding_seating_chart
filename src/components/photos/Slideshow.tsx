"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import type { PublicPhoto } from "@/lib/photoStore";
import { photoUrl } from "@/lib/uploadPhoto";

const SLIDE_MS = 8000;
const POLL_MS = 10000;
const UPLOAD_URL = "https://ahadandrehnuba.com/photos";

function shuffle<T>(list: T[]): T[] {
  const deck = [...list];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function preload(src: string): Promise<void> {
  const img = new Image();
  img.src = src;
  return Promise.race([img.decode(), new Promise<void>((_, reject) => setTimeout(reject, 15000))]);
}

/** Full-screen loop for the TV: new uploads go next, everything else cycles in random order. */
export default function Slideshow() {
  const [count, setCount] = useState(0);
  const [slide, setSlide] = useState<{ current: PublicPhoto | null; previous: PublicPhoto | null }>({
    current: null,
    previous: null,
  });
  const [idle, setIdle] = useState(false);
  const queue = useRef({ seen: new Set<string>(), fresh: [] as PublicPhoto[], deck: [] as PublicPhoto[], all: [] as PublicPhoto[] });

  // Poll for photos. Anything not seen before jumps the queue, oldest first.
  useEffect(() => {
    let live = true;
    let first = true;
    async function poll() {
      try {
        const response = await fetch("/api/photos", { cache: "no-store" });
        if (!response.ok) return;
        const { photos } = (await response.json()) as { photos: PublicPhoto[] };
        const q = queue.current;
        const unseen = photos.filter((photo) => !q.seen.has(photo.id));
        unseen.forEach((photo) => q.seen.add(photo.id));
        if (!first) q.fresh.push(...unseen.reverse());
        first = false;
        const visible = new Set(photos.map((photo) => photo.id));
        q.fresh = q.fresh.filter((photo) => visible.has(photo.id));
        q.deck = q.deck.filter((photo) => visible.has(photo.id));
        q.all = photos;
        if (live) setCount(photos.length);
      } catch {
        // Venue Wi-Fi drops; keep showing what we have and try again next tick.
      }
    }
    void poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);

  // Advance the slide once the next image has loaded, so the TV never shows a half-drawn photo.
  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    let shown: string | null = null;
    async function advance() {
      const q = queue.current;
      let next = q.fresh.shift();
      if (!next) {
        if (q.deck.length === 0) q.deck = shuffle(q.all);
        if (q.deck.length > 1 && q.deck[0].id === shown) q.deck.push(q.deck.shift()!);
        next = q.deck.shift();
      }
      let ok = false;
      if (next && next.id !== shown) {
        try {
          await preload(photoUrl(next.id));
          ok = true;
        } catch {
          // Hidden or unreachable photo: skip it.
        }
      }
      if (!live) return;
      if (ok && next) {
        shown = next.id;
        const current = next;
        setSlide((prev) => ({ previous: prev.current, current }));
      }
      timer = setTimeout(advance, ok ? SLIDE_MS : 1500);
    }
    void advance();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, []);

  // Keep the screen awake and hide the cursor when the mouse is still.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const wake = () => {
      if (document.visibilityState === "visible") {
        navigator.wakeLock?.request("screen").then((sentinel) => (lock = sentinel), () => {});
      }
    };
    wake();
    document.addEventListener("visibilitychange", wake);
    let still: ReturnType<typeof setTimeout>;
    const moved = () => {
      setIdle(false);
      clearTimeout(still);
      still = setTimeout(() => setIdle(true), 3000);
    };
    moved();
    window.addEventListener("mousemove", moved);
    return () => {
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("mousemove", moved);
      clearTimeout(still);
      void lock?.release();
    };
  }, []);

  const { current, previous } = slide;
  return (
    <div className={`fixed inset-0 overflow-hidden bg-[#0e1511] text-[#f6f1e8] ${idle ? "cursor-none" : ""}`}>
      {previous && <Layer photo={previous} />}
      {current && <Layer key={current.id} photo={current} entering />}

      {!current && (
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-script text-7xl">Ahad &amp; Rehnuba</p>
            <p className="mt-4 font-serif text-3xl">Photos from tonight will play here.</p>
            <div className="mx-auto mt-8 w-fit rounded-3xl bg-[#f6f1e8] p-5">
              <QRCodeSVG value={UPLOAD_URL} size={220} bgColor="#f6f1e8" fgColor="#1c2b24" />
            </div>
            <p className="mt-4 text-xl text-[#d9cfbd]">Scan to add yours</p>
          </div>
        </div>
      )}

      {current && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent" />
          <div key={`caption-${current.id}`} className="absolute bottom-8 left-10 max-w-[60vw] animate-fade-in-up">
            {current.quest && (
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#e2c58f]">Side quest · {current.quest}</p>
            )}
            {current.name && <p className="mt-1 font-serif text-4xl drop-shadow">{current.name}</p>}
          </div>
          <div className="absolute bottom-8 right-10 flex items-center gap-4 rounded-2xl bg-black/45 p-3 pr-5 backdrop-blur-md">
            <div className="rounded-xl bg-[#f6f1e8] p-2">
              <QRCodeSVG value={UPLOAD_URL} size={96} bgColor="#f6f1e8" fgColor="#1c2b24" />
            </div>
            <div>
              <p className="font-serif text-2xl leading-tight">Add your photos</p>
              <p className="text-sm text-[#d9cfbd]">ahadandrehnuba.com/photos</p>
              <p className="mt-1 text-xs text-[#b9ae9a] tabular-nums">{count} shared so far</p>
            </div>
          </div>
        </>
      )}

      {!idle && (
        <button
          type="button"
          onClick={() => void document.documentElement.requestFullscreen?.()}
          className="absolute right-6 top-6 rounded-full bg-black/50 px-4 py-2 text-sm backdrop-blur-md hover:bg-black/70"
        >
          Full screen
        </button>
      )}
    </div>
  );
}

function Layer({ photo, entering = false }: { photo: PublicPhoto; entering?: boolean }) {
  return (
    <div className={`absolute inset-0 ${entering ? "animate-crossfade" : ""}`}>
      {/* Blurred copy fills the edges so portrait shots look intentional on a wide TV. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoUrl(photo.id, "thumb")} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl(photo.id)}
        alt={photo.name ? `Photo shared by ${photo.name}` : "Photo shared by a guest"}
        className={`relative h-full w-full object-contain ${entering ? "animate-slow-zoom" : ""}`}
      />
    </div>
  );
}
