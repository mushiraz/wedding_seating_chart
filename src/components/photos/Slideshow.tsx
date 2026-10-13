"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { PublicPhoto } from "@/lib/photoStore";
import { QUESTS } from "@/lib/quests";
import { DEFAULT_TV, PACE, fromCutoff, matchesTv, tvQuery, type TvSettings } from "@/lib/tvSettings";
import { photoUrl } from "@/lib/uploadPhoto";
import { AdminOnly } from "./Gallery";

const POLL_MS = 10000;
const UPLOAD_URL = "https://ahadandrehnuba.com/photos";

interface Control {
  next: () => void;
  prev: () => void;
}

function subscribeResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}
const readSize = () => `${window.innerWidth}x${window.innerHeight}`;

function useViewport(): [number, number] {
  const size = useSyncExternalStore(subscribeResize, readSize, () => "1920x1080");
  const [w, h] = size.split("x").map(Number);
  return [w, h];
}

function preload(src: string): Promise<void> {
  const img = new Image();
  img.src = src;
  return Promise.race([img.decode(), new Promise<void>((_, reject) => setTimeout(reject, 15000))]);
}

/**
 * The screen in the hall. Plays every matching photo in upload order, first to
 * last, then loops; new uploads join the end of the loop.
 */
export default function Slideshow({ initial = DEFAULT_TV }: { initial?: TvSettings }) {
  // `at` stamps each poll, so time filters never call Date.now() during render.
  const [{ list: photos, at: polledAt }, setPhotos] = useState<{ list: PublicPhoto[]; at: number }>({ list: [], at: 0 });
  const [settings, setSettings] = useState(initial);
  const [idle, setIdle] = useState(false);
  const [panel, setPanel] = useState(false);
  const [paused, setPaused] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [locked, setLocked] = useState(false);
  const control = useRef<Control>({ next: () => {}, prev: () => {} });

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const response = await fetch("/api/photos", { cache: "no-store" });
        if (response.status === 401) {
          if (active) setLocked(true);
          return;
        }
        if (!response.ok) return;
        const { photos: list } = (await response.json()) as { photos: PublicPhoto[] };
        if (active) setPhotos({ list, at: Date.now() });
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

  const order = useMemo(() => {
    const cutoff = fromCutoff(settings.from, new Date(polledAt));
    return photos.filter((photo) => matchesTv(photo, settings, cutoff)).sort((a, b) => a.at - b.at);
  }, [photos, settings, polledAt]);

  function update(change: Partial<TvSettings>) {
    const next = { ...settings, ...change };
    setSettings(next);
    window.history.replaceState(null, "", `${window.location.pathname}${tvQuery(next)}`);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
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
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    let still: ReturnType<typeof setTimeout>;
    const moved = () => {
      setIdle(false);
      clearTimeout(still);
      still = setTimeout(() => setIdle(true), 3000);
    };
    moved();
    const keys = (event: KeyboardEvent) => {
      // Dropdowns and the time box need their own keys; everywhere else the shortcuts win.
      if ((event.target as HTMLElement).closest("select, input")) return;
      const key = event.key.toLowerCase();
      if (key === " ") {
        event.preventDefault();
        setPaused((value) => !value);
      } else if (key === "arrowright") control.current.next();
      else if (key === "arrowleft") control.current.prev();
      else if (key === "f") toggleFullscreen();
      else if (key === "s") setPanel((open) => !open);
      else if (key === "escape") setPanel(false);
      else return;
      moved();
    };
    window.addEventListener("mousemove", moved);
    window.addEventListener("keydown", keys);
    return () => {
      document.removeEventListener("visibilitychange", wake);
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("mousemove", moved);
      window.removeEventListener("keydown", keys);
      clearTimeout(still);
      void lock?.release();
    };
  }, []);

  const people = useMemo(
    () => [...new Set(photos.map((photo) => photo.name).filter((name): name is string => Boolean(name)))].sort(),
    [photos],
  );
  const showChrome = !idle || panel;
  if (locked) return <AdminOnly dark />;

  return (
    <div className={`fixed inset-0 overflow-hidden bg-black text-[#f6f1e8] ${showChrome ? "" : "cursor-none"}`}>
      {order.length > 0 &&
        (settings.mode === "scroll" ? (
          <ScrollStrip order={order} pace={PACE[settings.pace].scroll} paused={paused} captions={settings.captions} controlRef={control} />
        ) : (
          <SingleView order={order} seconds={PACE[settings.pace].seconds} paused={paused} captions={settings.captions} controlRef={control} />
        ))}

      {order.length === 0 && photos.length === 0 && (
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

      {order.length === 0 && photos.length > 0 && (
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-serif text-4xl">No photos match these settings yet.</p>
            <p className="mt-3 text-lg text-[#d9cfbd]">They start playing as soon as one does. Press S to change the settings.</p>
          </div>
        </div>
      )}

      {settings.qr && order.length > 0 && (
        <div className="absolute bottom-6 right-6 flex items-center gap-4 rounded-2xl bg-black/70 p-3 pr-5 backdrop-blur-md">
          <div className="rounded-xl bg-[#f6f1e8] p-2">
            <QRCodeSVG value={UPLOAD_URL} size={88} bgColor="#f6f1e8" fgColor="#1c2b24" />
          </div>
          <div>
            <p className="font-serif text-2xl leading-tight">Add your photos</p>
            <p className="text-sm text-[#d9cfbd]">ahadandrehnuba.com/photos</p>
            <p className="mt-1 text-xs text-[#b9ae9a] tabular-nums">{photos.length} shared so far</p>
          </div>
        </div>
      )}

      {paused && (
        <p className="absolute left-6 top-6 rounded-full bg-black/70 px-4 py-2 text-sm font-semibold">Paused · press space to resume</p>
      )}

      {showChrome && (
        <div className="absolute right-6 top-6 flex gap-2">
          <button type="button" onClick={() => setPanel((open) => !open)} aria-expanded={panel} className={chrome}>
            {panel ? "Close" : "Settings"}
          </button>
          <button type="button" onClick={toggleFullscreen} className={chrome}>
            {fullscreen ? "Exit full screen" : "Full screen"}
          </button>
        </div>
      )}

      {panel && (
        <div className="absolute right-6 top-20 max-h-[calc(100vh-7rem)] w-[380px] overflow-y-auto rounded-2xl bg-black/85 p-5 text-sm shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
          <p className="font-serif text-2xl">Screen settings</p>
          <p className="mt-0.5 text-[#b9ae9a] tabular-nums">
            Playing {order.length} of {photos.length} photos, oldest first, on a loop
          </p>

          <Field label="Style">
            <Choice
              value={settings.mode}
              options={[["scroll", "Slow scroll"], ["single", "One at a time"]]}
              onChange={(mode) => update({ mode })}
            />
          </Field>

          <Field label="Show">
            <Choice
              value={settings.show}
              options={[["all", "Everything"], ["quests", "Quest photos"], ["shared", "Shared photos"]]}
              onChange={(show) => update({ show, quest: show === "shared" ? "" : settings.quest })}
            />
          </Field>

          <Field label="Quest">
            <select value={settings.quest} disabled={settings.show === "shared"} onChange={(event) => update({ quest: event.target.value })} className={field}>
              <option value="">Any quest</option>
              {QUESTS.map((quest) => (
                <option key={quest.id} value={quest.id}>
                  {quest.title}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Shared by">
            <select value={settings.who} onChange={(event) => update({ who: event.target.value })} className={field}>
              <option value="">Anyone</option>
              {settings.who && !people.includes(settings.who) && <option value={settings.who}>{settings.who}</option>}
              {people.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Start from">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-pressed={!settings.from}
                onClick={() => update({ from: "" })}
                className={`shrink-0 rounded-full px-3 py-1.5 font-semibold ${!settings.from ? "bg-[#f6f1e8] text-[#1c2b24]" : "bg-white/10 hover:bg-white/20"}`}
              >
                All photos
              </button>
              <input
                type="time"
                aria-label="Only photos from this time"
                value={settings.from}
                onChange={(event) => update({ from: event.target.value })}
                className={`${field} [color-scheme:dark]`}
              />
            </div>
          </Field>

          <Field label="Speed">
            <Choice
              value={settings.pace}
              options={[["slow", "Slow"], ["normal", "Normal"], ["fast", "Fast"]]}
              onChange={(pace) => update({ pace })}
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
            <button type="button" onClick={() => setPaused((value) => !value)} className={chrome}>
              {paused ? "Resume" : "Pause"}
            </button>
            <button type="button" onClick={() => update(DEFAULT_TV)} className="text-[#d9cfbd] underline underline-offset-4">
              Reset
            </button>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[#b9ae9a]">
            Space pause · ← → previous / next · F full screen · S or Esc settings. These settings are saved in the address bar,
            so bookmark the page to reopen this setup.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * An endless strip moving left. Widths come from each photo's stored size, so
 * nothing jumps as images load. When the first photo has fully left the
 * screen it moves to the back of the line.
 */
function ScrollStrip({
  order,
  pace,
  paused,
  captions,
  controlRef,
}: {
  order: PublicPhoto[];
  pace: number;
  paused: boolean;
  captions: boolean;
  controlRef: React.RefObject<Control>;
}) {
  const [vw, vh] = useViewport();
  const gap = Math.round(vh * 0.025);
  const width = (photo: PublicPhoto) => Math.round((vh * photo.width) / photo.height);
  const [headId, setHeadId] = useState<string | null>(null);
  const head = Math.max(0, order.findIndex((photo) => photo.id === headId));

  const track = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const consumed = useRef(0);
  const live = useRef({ order, head, paused, pace });
  live.current = { order, head, paused, pace };

  // Fill a screen and a half past the left edge so the next photo is always already drawn.
  const items: { photo: PublicPhoto; key: string; w: number }[] = [];
  const seen = new Map<string, number>();
  for (let i = 0, acc = 0; acc < vw * 1.5 + vh * 2 && i < 200; i++) {
    const photo = order[(head + i) % order.length];
    const n = (seen.get(photo.id) ?? 0) + 1;
    seen.set(photo.id, n);
    const w = width(photo);
    items.push({ photo, key: `${photo.id}#${n}`, w });
    acc += w + gap;
  }

  // A wrap swaps the first item and the offset in the same commit, so the strip never jumps.
  useLayoutEffect(() => {
    offset.current = Math.max(0, offset.current - consumed.current);
    consumed.current = 0;
    if (track.current) track.current.style.transform = `translate3d(${-offset.current}px,0,0)`;
  }, [head]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const { order: list, head: index, paused: isPaused, pace: speed } = live.current;
      if (!isPaused) offset.current += speed * vh * dt;
      const first = list[index];
      const span = first ? width(first) + gap : Infinity;
      if (consumed.current === 0 && offset.current >= span) {
        const next = list[(index + 1) % list.length];
        if (next.id === first.id) {
          offset.current -= span; // one photo repeating: the strip looks the same one step on
        } else {
          consumed.current = span;
          setHeadId(next.id);
        }
      }
      if (track.current) track.current.style.transform = `translate3d(${-offset.current}px,0,0)`;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- width/gap derive from vh
  }, [vh]);

  useEffect(() => {
    controlRef.current = {
      next: () => {
        const { order: list, head: index } = live.current;
        offset.current = 0;
        consumed.current = 0;
        setHeadId(list[(index + 1) % list.length].id);
      },
      prev: () => {
        const { order: list, head: index } = live.current;
        offset.current = 0;
        consumed.current = 0;
        setHeadId(list[(index - 1 + list.length) % list.length].id);
      },
    };
  }, [controlRef]);

  return (
    <div ref={track} className="absolute inset-y-0 left-0 flex will-change-transform" style={{ gap }}>
      {items.map(({ photo, key, w }) => (
        <figure key={key} className="relative h-full shrink-0" style={{ width: w }}>
          {photo.kind === "video" ? (
            // object-contain: if a phone could not read the video's size, a wrong guess shows black bars, not a crop.
            <video src={photoUrl(photo.id)} poster={photoUrl(photo.id, "thumb")} muted autoPlay loop playsInline className="h-full w-full bg-black object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl(photo.id)} alt={photo.name ? `Photo shared by ${photo.name}` : "Photo shared by a guest"} className="h-full w-full object-cover" decoding="async" />
          )}
          {captions && (photo.name || photo.quest) && <Caption photo={photo} small />}
        </figure>
      ))}
    </div>
  );
}

/** One photo at a time, centered and fit to the screen with black bars, crossfading to the next. */
function SingleView({
  order,
  seconds,
  paused,
  captions,
  controlRef,
}: {
  order: PublicPhoto[];
  seconds: number;
  paused: boolean;
  captions: boolean;
  controlRef: React.RefObject<Control>;
}) {
  const [pair, setPair] = useState<{ current: string | null; previous: string | null }>({ current: null, previous: null });
  const current = order.find((photo) => photo.id === pair.current) ?? order[0];
  const previous = order.find((photo) => photo.id === pair.previous) ?? null;
  const index = order.indexOf(current);
  // A video plays through (at least the normal photo time, at most a minute) before moving on.
  const hold = current.kind === "video" ? Math.min(Math.max(current.duration ?? seconds, seconds), 60) : seconds;

  const go = (target: PublicPhoto) => setPair((prev) => (prev.current === target.id ? prev : { previous: current.id, current: target.id }));

  useEffect(() => {
    if (paused || order.length < 2) return;
    let active = true;
    const timer = setTimeout(async () => {
      const next = order[(index + 1) % order.length];
      try {
        await preload(photoUrl(next.id, next.kind === "video" ? "thumb" : "full"));
      } catch {
        // Unreachable photo: move on anyway; the next tick tries the one after.
      }
      if (active) setPair({ previous: current.id, current: next.id });
    }, hold * 1000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [order, index, current.id, hold, paused]);

  useEffect(() => {
    controlRef.current = {
      next: () => go(order[(index + 1) % order.length]),
      prev: () => go(order[(index - 1 + order.length) % order.length]),
    };
  });

  return (
    <>
      {previous && previous.id !== current.id && <Frame photo={previous} />}
      <Frame key={current.id} photo={current} entering />
      {captions && (current.name || current.quest) && <Caption key={`c-${current.id}`} photo={current} />}
    </>
  );
}

function Frame({ photo, entering = false }: { photo: PublicPhoto; entering?: boolean }) {
  return (
    <div className={`absolute inset-0 bg-black ${entering ? "animate-crossfade" : ""}`}>
      {/* object-contain inside a full-screen box: the whole photo, centered, black bars on the spare sides. */}
      {photo.kind === "video" ? (
        <video src={photoUrl(photo.id)} poster={photoUrl(photo.id, "thumb")} muted autoPlay playsInline className="h-full w-full object-contain" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl(photo.id)}
          alt={photo.name ? `Photo shared by ${photo.name}` : "Photo shared by a guest"}
          className="h-full w-full object-contain"
        />
      )}
    </div>
  );
}

function Caption({ photo, small = false }: { photo: PublicPhoto; small?: boolean }) {
  return (
    <figcaption
      className={`pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent ${small ? "px-5 pb-4 pt-12" : "px-10 pb-8 pt-24"} animate-fade-in-up`}
    >
      {photo.quest && (
        <p className={`${small ? "text-xs" : "text-sm"} font-semibold uppercase tracking-[0.22em] text-[#e2c58f]`}>
          Side quest · {photo.quest}
        </p>
      )}
      {photo.name && <p className={`font-serif ${small ? "text-2xl" : "text-4xl"} leading-tight`}>{photo.name}</p>}
    </figcaption>
  );
}

const chrome = "rounded-full bg-black/70 px-4 py-2 text-sm font-semibold ring-1 ring-white/15 backdrop-blur-md hover:bg-black/85";
const field = "w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-[#f6f1e8] disabled:opacity-40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#b9ae9a]">{label}</p>
      {children}
    </div>
  );
}

function Choice<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (value: T) => void }) {
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
