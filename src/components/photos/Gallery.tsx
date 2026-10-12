"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PublicPhoto } from "@/lib/photoStore";
import { photoUrl } from "@/lib/uploadPhoto";

type Filter = "all" | "quests" | "shared";

const time = (ms: number) =>
  new Date(ms).toLocaleTimeString("en-CA", { timeZone: "America/Toronto", hour: "numeric", minute: "2-digit" });

/** Every photo guests have shared, newest first. Tap one to see it full size. */
export default function Gallery() {
  const [photos, setPhotos] = useState<PublicPhoto[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/photos", { cache: "no-store" });
        if (response.ok && active) setPhotos(((await response.json()) as { photos: PublicPhoto[] }).photos);
      } catch {
        // Try again on the next tick.
      }
    };
    void load();
    const timer = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const shown = (photos ?? []).filter((photo) => (filter === "quests" ? photo.questId : filter === "shared" ? !photo.questId : true));
  const index = shown.findIndex((photo) => photo.id === open);

  return (
    <div className="min-h-screen text-ink">
      <nav className="sticky top-0 z-20 border-b border-line/80 bg-cream/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-2.5 text-sm">
          <Link href="/photos" className="rounded-full px-2 py-1.5 text-body hover:bg-white hover:text-ink">
            &larr; Photo booth
          </Link>
          <span className="font-script text-2xl leading-none">Ahad &amp; Rehnuba</span>
        </div>
      </nav>

      <header className="max-w-5xl mx-auto px-4 pt-8 pb-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-label">Photo booth</p>
        <h1 className="font-serif text-4xl sm:text-5xl mt-1 leading-tight">All photos</h1>
        <p className="mt-1 text-sm text-soft tabular-nums">
          {photos === null ? "Loading…" : `${photos.length} shared so far. New ones appear on their own.`}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ["all", "Everything"],
              ["quests", "Quest photos"],
              ["shared", "Uploads"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                filter === value ? "border-sage bg-sage text-cream" : "border-line bg-white hover:border-sage"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-16">
        {photos !== null && shown.length === 0 && (
          <div className="rounded-3xl border border-line bg-paper px-5 py-10 text-center">
            <p className="font-serif text-2xl">No photos here yet.</p>
            <Link href="/photos" className="mt-3 inline-block text-sm font-semibold text-sage underline underline-offset-4">
              Be the first to add one
            </Link>
          </div>
        )}
        <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 lg:grid-cols-5">
          {shown.map((photo) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setOpen(photo.id)}
                aria-label={photo.name ? `Open photo shared by ${photo.name}` : "Open photo"}
                className="block aspect-square w-full overflow-hidden rounded-lg bg-cream"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl(photo.id, "thumb")} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition hover:scale-[1.03]" />
              </button>
            </li>
          ))}
        </ul>
      </main>

      {index >= 0 && (
        <Lightbox
          photo={shown[index]}
          position={`${index + 1} of ${shown.length}`}
          onClose={() => setOpen(null)}
          onPrev={() => setOpen(shown[(index - 1 + shown.length) % shown.length].id)}
          onNext={() => setOpen(shown[(index + 1) % shown.length].id)}
        />
      )}
    </div>
  );
}

function Lightbox({
  photo,
  position,
  onClose,
  onPrev,
  onNext,
}: {
  photo: PublicPhoto;
  position: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const startX = useRef<number | null>(null);
  const actions = useRef({ onClose, onPrev, onNext });
  useEffect(() => {
    actions.current = { onClose, onPrev, onNext };
  });

  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape") actions.current.onClose();
      else if (event.key === "ArrowLeft") actions.current.onPrev();
      else if (event.key === "ArrowRight") actions.current.onNext();
    };
    window.addEventListener("keydown", keys);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", keys);
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo"
      className="fixed inset-0 z-50 flex flex-col bg-black text-[#f6f1e8]"
      onPointerDown={(event) => (startX.current = event.clientX)}
      onPointerUp={(event) => {
        if (startX.current === null) return;
        const dx = event.clientX - startX.current;
        startX.current = null;
        if (dx > 60) onPrev();
        else if (dx < -60) onNext();
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 text-sm">
        <span className="tabular-nums text-[#b9ae9a]">{position}</span>
        <button type="button" onClick={onClose} className="rounded-full bg-white/10 px-4 py-2 font-semibold hover:bg-white/20">
          Close
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={photoUrl(photo.id)}
          alt={photo.name ? `Photo shared by ${photo.name}` : "Photo shared by a guest"}
          className="max-h-full max-w-full select-none object-contain animate-crossfade"
          draggable={false}
        />
        <button type="button" onClick={onPrev} aria-label="Previous photo" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-2xl leading-none hover:bg-black/70">
          &lsaquo;
        </button>
        <button type="button" onClick={onNext} aria-label="Next photo" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-2xl leading-none hover:bg-black/70">
          &rsaquo;
        </button>
      </div>
      <div className="px-5 py-4 text-center">
        {photo.quest && <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#e2c58f]">Side quest · {photo.quest}</p>}
        <p className="font-serif text-2xl">{photo.name ?? "A guest"}</p>
        <p className="text-xs text-[#b9ae9a]">{time(photo.at)}</p>
      </div>
    </div>
  );
}
