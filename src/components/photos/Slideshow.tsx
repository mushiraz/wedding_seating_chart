"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicPhoto } from "@/lib/photoStore";
import { QUESTS } from "@/lib/quests";
import { DEFAULT_TV, SPEEDS, WINDOWS, matchesTv, tvQuery, type TvSettings } from "@/lib/tvSettings";
import { photoUrl } from "@/lib/uploadPhoto";

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

/**
 * Full-screen loop for the TV. New uploads that match the filters go next;
 * everything else cycles in a fresh random order each lap.
 */
export default function Slideshow({ initial = DEFAULT_TV }: { initial?: TvSettings }) {
  // `at` stamps each poll, so the match count for time windows doesn't call Date.now() during render.
  const [{ list: photos, at: polledAt }, setPhotos] = useState<{ list: PublicPhoto[]; at: number }>({ list: [], at: 0 });
  const [settings, setSettings] = useState(initial);
  const [slide, setSlide] = useState<{ current: PublicPhoto | null; previous: PublicPhoto | null }>({
    current: null,
    previous: null,
  });
  const [idle, setIdle] = useState(false);
  const [panel, setPanel] = useState(false);
  const [paused, setPaused] = useState(false);

  const queue = useRef({ seen: new Set<string>(), fresh: [] as PublicPhoto[], deck: [] as PublicPhoto[], all: [] as PublicPhoto[] });
  const live = useRef({ settings: initial, paused: false });
  const control = useRef({ skip: () => {}, back: () => {} });

  // Poll for photos. Anything not seen before jumps the queue, oldest first.
  useEffect(() => {
    let active = true;
    let first = true;
    async function poll() {
      try {
        const response = await fetch("/api/photos", { cache: "no-store" });
        if (!response.ok) return;
        const { photos: list } = (await response.json()) as { photos: PublicPhoto[] };
        const q = queue.current;
        const unseen = list.filter((photo) => !q.seen.has(photo.id));
        unseen.forEach((photo) => q.seen.add(photo.id));
        if (!first) q.fresh.push(...unseen.reverse());
        const visible = new Set(list.map((photo) => photo.id));
        q.fresh = q.fresh.filter((photo) => visible.has(photo.id));
        q.deck = q.deck.filter((photo) => visible.has(photo.id));
        q.all = list;
        if (active) setPhotos({ list, at: Date.now() });
        if (first) control.current.skip();
        first = false;
      } catch {
        // Venue Wi-Fi drops; keep showing what we have and try again next tick.
      }
    }
    void poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  // The rotation. Only swaps once the next image has fully loaded.
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const history: PublicPhoto[] = [];
    const schedule = (ms: number) => {
      clearTimeout(timer);
      timer = setTimeout(advance, ms);
    };
    const show = (photo: PublicPhoto) => setSlide((prev) => (prev.current?.id === photo.id ? prev : { previous: prev.current, current: photo }));

    async function advance() {
      const { settings: s, paused: isPaused } = live.current;
      if (isPaused) return schedule(500);
      const q = queue.current;
      const now = Date.now();
      const ok = (photo: PublicPhoto) => matchesTv(photo, s, now);
      const shown = history[history.length - 1]?.id ?? null;
      q.fresh = q.fresh.filter(ok);
      let next = q.fresh.shift();
      if (!next) {
        if (q.deck.length === 0) q.deck = shuffle(q.all.filter(ok));
        if (q.deck.length > 1 && q.deck[0].id === shown) q.deck.push(q.deck.shift()!);
        next = q.deck.shift();
      }
      if (!next) {
        // Nothing matches: clear the screen rather than keep a photo the filters exclude.
        const current = history[history.length - 1];
        if (current && !ok(current)) {
          history.length = 0;
          setSlide({ current: null, previous: null });
        }
        return schedule(1500);
      }
      if (next.id === shown) return schedule(s.speed * 1000);
      try {
        await preload(photoUrl(next.id));
      } catch {
        return schedule(500); // Hidden or unreachable: skip it.
      }
      if (!active) return;
      history.push(next);
      if (history.length > 50) history.shift();
      show(next);
      schedule(s.speed * 1000);
    }

    control.current = {
      skip: () => schedule(0),
      back: () => {
        if (history.length < 2) return;
        history.pop();
        show(history[history.length - 1]);
        schedule(live.current.settings.speed * 1000);
      },
    };
    void advance();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  function update(change: Partial<TvSettings>) {
    const next = { ...settings, ...change };
    setSettings(next);
    live.current.settings = next;
    queue.current.deck = [];
    window.history.replaceState(null, "", `${window.location.pathname}${tvQuery(next)}`);
    if (slide.current && !matchesTv(slide.current, next, Date.now())) control.current.skip();
  }

  function togglePause() {
    live.current.paused = !live.current.paused;
    setPaused(live.current.paused);
  }

  // Keep the screen awake, hide the cursor when the mouse is still, and take keyboard shortcuts.
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
    const keys = (event: KeyboardEvent) => {
      // Dropdowns need their own arrow keys; everywhere else the shortcuts win, even on a focused button.
      if ((event.target as HTMLElement).closest("select, input")) return;
      const key = event.key.toLowerCase();
      if (key === " ") {
        event.preventDefault();
        live.current.paused = !live.current.paused;
        setPaused(live.current.paused);
      } else if (key === "arrowright") control.current.skip();
      else if (key === "arrowleft") control.current.back();
      else if (key === "f") void document.documentElement.requestFullscreen?.();
      else if (key === "s") setPanel((open) => !open);
      else if (key === "escape") setPanel(false);
      else return;
      moved();
    };
    window.addEventListener("mousemove", moved);
    window.addEventListener("keydown", keys);
    return () => {
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("mousemove", moved);
      window.removeEventListener("keydown", keys);
      clearTimeout(still);
      void lock?.release();
    };
  }, []);

  const matching = photos.filter((photo) => matchesTv(photo, settings, polledAt)).length;
  const people = useMemo(
    () => [...new Set(photos.map((photo) => photo.name).filter((name): name is string => Boolean(name)))].sort(),
    [photos],
  );
  const showChrome = !idle || panel;
  const { current, previous } = slide;

  return (
    <div className={`fixed inset-0 overflow-hidden bg-[#0e1511] text-[#f6f1e8] ${showChrome ? "" : "cursor-none"}`}>
      {previous && <Layer photo={previous} />}
      {current && <Layer key={current.id} photo={current} entering />}

      {!current && photos.length === 0 && (
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

      {!current && photos.length > 0 && (
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-serif text-4xl">No photos match these filters yet.</p>
            <p className="mt-3 text-lg text-[#d9cfbd]">They will start playing as soon as one does. Press S to change the filters.</p>
          </div>
        </div>
      )}

      {current && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent" />
          {settings.captions && (
            <div key={`caption-${current.id}`} className="absolute bottom-8 left-10 max-w-[60vw] animate-fade-in-up">
              {current.quest && (
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#e2c58f]">Side quest · {current.quest}</p>
              )}
              {current.name && <p className="mt-1 font-serif text-4xl drop-shadow">{current.name}</p>}
            </div>
          )}
          {settings.qr && (
            <div className="absolute bottom-8 right-10 flex items-center gap-4 rounded-2xl bg-black/45 p-3 pr-5 backdrop-blur-md">
              <div className="rounded-xl bg-[#f6f1e8] p-2">
                <QRCodeSVG value={UPLOAD_URL} size={96} bgColor="#f6f1e8" fgColor="#1c2b24" />
              </div>
              <div>
                <p className="font-serif text-2xl leading-tight">Add your photos</p>
                <p className="text-sm text-[#d9cfbd]">ahadandrehnuba.com/photos</p>
                <p className="mt-1 text-xs text-[#b9ae9a] tabular-nums">{photos.length} shared so far</p>
              </div>
            </div>
          )}
        </>
      )}

      {paused && (
        <p className="absolute left-6 top-6 rounded-full bg-black/55 px-4 py-2 text-sm font-semibold backdrop-blur-md">
          Paused · press space to resume
        </p>
      )}

      {showChrome && (
        <div className="absolute right-6 top-6 flex gap-2">
          <button type="button" onClick={() => setPanel((open) => !open)} aria-expanded={panel} className={chrome}>
            {panel ? "Close" : "Settings"}
          </button>
          <button type="button" onClick={() => void document.documentElement.requestFullscreen?.()} className={chrome}>
            Full screen
          </button>
        </div>
      )}

      {panel && (
        <div
          data-tv-panel
          className="absolute right-6 top-20 max-h-[calc(100vh-7rem)] w-[380px] overflow-y-auto rounded-2xl bg-black/75 p-5 text-sm shadow-2xl backdrop-blur-xl"
        >
          <p className="font-serif text-2xl">Slideshow</p>
          <p className="mt-0.5 text-[#b9ae9a] tabular-nums">
            {matching} of {photos.length} photos match
          </p>

          <Field label="Show">
            <Choice
              value={settings.show}
              options={[["all", "Everything"], ["quests", "Quest photos"], ["shared", "Shared photos"]]}
              onChange={(show) => update({ show, quest: show === "shared" ? "" : settings.quest })}
            />
          </Field>

          <Field label="Quest">
            <select
              value={settings.quest}
              disabled={settings.show === "shared"}
              onChange={(event) => update({ quest: event.target.value })}
              className={select}
            >
              <option value="">Any quest</option>
              {QUESTS.map((quest) => (
                <option key={quest.id} value={quest.id}>
                  {quest.title}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Shared by">
            <select value={settings.who} onChange={(event) => update({ who: event.target.value })} className={select}>
              <option value="">Anyone</option>
              {settings.who && !people.includes(settings.who) && <option value={settings.who}>{settings.who}</option>}
              {people.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="From">
            <Choice
              value={String(settings.since)}
              options={WINDOWS.map((minutes) => [String(minutes), minutes === 0 ? "All night" : minutes === 60 ? "Last hour" : `Last ${minutes} min`])}
              onChange={(since) => update({ since: Number(since) })}
            />
          </Field>

          <Field label="Each photo for">
            <Choice
              value={String(settings.speed)}
              options={SPEEDS.map((seconds) => [String(seconds), `${seconds}s`])}
              onChange={(speed) => update({ speed: Number(speed) })}
            />
          </Field>

          <Field label="On screen">
            <div className="flex gap-2">
              <Toggle on={settings.captions} onClick={() => update({ captions: !settings.captions })}>
                Names &amp; quests
              </Toggle>
              <Toggle on={settings.qr} onClick={() => update({ qr: !settings.qr })}>
                QR code
              </Toggle>
            </div>
          </Field>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/15 pt-4">
            <button type="button" onClick={togglePause} className={chrome}>
              {paused ? "Resume" : "Pause"}
            </button>
            <button type="button" onClick={() => update(DEFAULT_TV)} className="text-[#d9cfbd] underline underline-offset-4">
              Reset filters
            </button>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[#b9ae9a]">
            Space pause · ← → previous / next · F full screen · S or Esc settings. Settings are saved in the address bar, so bookmark it to reopen this setup.
          </p>
        </div>
      )}
    </div>
  );
}

const chrome = "rounded-full bg-black/55 px-4 py-2 text-sm font-semibold backdrop-blur-md hover:bg-black/75";
const select = "w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-[#f6f1e8] disabled:opacity-40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#b9ae9a]">{label}</p>
      {children}
    </div>
  );
}

function Choice<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([option, label]) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={`rounded-full px-3 py-1.5 font-semibold ${value === option ? "bg-[#f6f1e8] text-[#1c2b24]" : "bg-white/10 hover:bg-white/20"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 font-semibold ${on ? "bg-[#f6f1e8] text-[#1c2b24]" : "bg-white/10 text-[#d9cfbd] line-through"}`}
    >
      {children}
    </button>
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
