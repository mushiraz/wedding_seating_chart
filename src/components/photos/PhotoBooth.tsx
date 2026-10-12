"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Guest } from "@/lib/types";
import type { PublicPhoto } from "@/lib/photoStore";
import { findGuests } from "@/lib/tableDisplay";
import { QUESTS_PER_GUEST, QUESTS_TO_WIN, questsFor, type Quest } from "@/lib/quests";
import { photoUrl, uploadPhoto } from "@/lib/uploadPhoto";
import { allGuests, useGuest } from "./useGuest";

const card =
  "rounded-3xl border border-line bg-paper p-5 sm:p-6 shadow-[0_1px_2px_rgba(28,43,36,0.04),0_12px_32px_-12px_rgba(28,43,36,0.18)]";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-sage disabled:opacity-50";

type Tab = "upload" | "quests";

export default function PhotoBooth({ initialTab = "upload" }: { initialTab?: Tab }) {
  const [guest, setGuest] = useGuest();
  const [tab, setTab] = useState<Tab>(initialTab);

  function choose(next: Tab) {
    setTab(next);
    window.history.replaceState(null, "", next === "quests" ? "?tab=quests" : window.location.pathname);
  }

  return (
    <div className="min-h-screen text-ink">
      <nav className="sticky top-0 z-20 border-b border-line/80 bg-cream/90 backdrop-blur-md">
        <div className="max-w-xl mx-auto flex items-center justify-between px-4 py-2.5 text-sm">
          <Link href="/" className="rounded-full px-2 py-1.5 text-body hover:bg-white hover:text-ink">
            &larr; Seating &amp; schedule
          </Link>
          <span className="font-script text-2xl leading-none">Ahad &amp; Rehnuba</span>
        </div>
      </nav>

      <header className="max-w-xl mx-auto px-5 pt-8 pb-6 text-center animate-fade-in-up">
        <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-label">Photo booth</p>
        <h1 className="font-serif text-4xl sm:text-5xl mt-2 leading-tight">Share the night</h1>
        <p className="mt-2 text-sm text-soft">Every photo you add plays on the screen in the hall.</p>
      </header>

      <main className="px-4 pb-10 max-w-xl mx-auto">
        <SeeAllPhotos />

        <div role="tablist" aria-label="What would you like to do?" className="grid grid-cols-2 gap-3">
          <TabButton active={tab === "upload"} onClick={() => choose("upload")} title="Upload photos" detail="Add any photos from your phone">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.6-4.6a2 2 0 012.8 0L16 16m-2-2 1.6-1.6a2 2 0 012.8 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2zm8-12h.01" />
          </TabButton>
          <TabButton active={tab === "quests"} onClick={() => choose("quests")} title="Side quests" detail={`Photo challenges. First to ${QUESTS_TO_WIN} wins`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.8 4.7a3.4 3.4 0 001.9-.8 3.4 3.4 0 014.6 0 3.4 3.4 0 001.9.8 3.4 3.4 0 013.1 3.1c.1.7.4 1.4.8 1.9a3.4 3.4 0 010 4.6 3.4 3.4 0 00-.8 1.9 3.4 3.4 0 01-3.1 3.1 3.4 3.4 0 00-1.9.8 3.4 3.4 0 01-4.6 0 3.4 3.4 0 00-1.9-.8 3.4 3.4 0 01-3.1-3.1 3.4 3.4 0 00-.8-1.9 3.4 3.4 0 010-4.6c.4-.5.7-1.2.8-1.9a3.4 3.4 0 013.1-3.1z" />
          </TabButton>
        </div>

        <div className="mt-6 space-y-6" role="tabpanel">
          {tab === "upload" ? (
            <BulkUpload />
          ) : guest ? (
            <QuestBoard key={guest.id} guest={guest} setGuest={setGuest} />
          ) : (
            <section className={card}>
              <QuestIntro />
              <div className="mt-5 border-t border-line pt-5">
                <GuestPicker onPick={setGuest} />
              </div>
            </section>
          )}
        </div>
      </main>

      <footer className="max-w-xl mx-auto flex justify-end px-4 pb-6">
        <Link href="/photos/admin" className="px-2 py-1 text-[11px] text-label/40 hover:text-label">
          Admin
        </Link>
      </footer>
    </div>
  );
}

/** The way into the gallery: a strip of the newest photos and the running total. */
function SeeAllPhotos() {
  const [photos, setPhotos] = useState<PublicPhoto[] | null>(null);
  useEffect(() => {
    let active = true;
    const load = () =>
      fetch("/api/photos", { cache: "no-store" })
        .then((response) => (response.ok ? (response.json() as Promise<{ photos: PublicPhoto[] }>) : null))
        .then((body) => active && body && setPhotos(body.photos))
        .catch(() => {});
    void load();
    const timer = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const latest = (photos ?? []).slice(0, 4);
  return (
    <Link
      href="/photos/all"
      className="mb-5 block rounded-3xl border border-line bg-paper p-4 shadow-[0_1px_2px_rgba(28,43,36,0.04)] transition hover:border-sage"
    >
      <span className="flex items-center justify-between gap-3">
        <span>
          <span className="block font-serif text-2xl leading-tight">See all photos</span>
          <span className="block text-sm text-soft tabular-nums">
            {photos === null ? "Everything guests have shared" : photos.length === 0 ? "Nothing yet. Be the first." : `${photos.length} shared so far. Tap to browse them all.`}
          </span>
        </span>
        <span aria-hidden className="shrink-0 text-xl text-label">&rarr;</span>
      </span>
      {latest.length > 0 && (
        <span className="mt-3 grid grid-cols-4 gap-1.5">
          {latest.map((photo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={photo.id} src={photoUrl(photo.id, "thumb")} alt="" className="aspect-square w-full rounded-lg bg-cream object-cover" />
          ))}
        </span>
      )}
    </Link>
  );
}

function TabButton({
  active,
  onClick,
  title,
  detail,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-3xl border p-4 text-left transition ${active ? "border-sage bg-sage text-cream shadow-[0_12px_28px_-14px_rgba(61,92,61,0.7)]" : "border-line bg-paper text-ink hover:border-sage"}`}
    >
      <svg aria-hidden className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        {children}
      </svg>
      <span className="mt-3 block font-serif text-2xl leading-tight">{title}</span>
      <span className={`mt-0.5 block text-[13px] leading-snug ${active ? "text-cream/80" : "text-soft"}`}>{detail}</span>
    </button>
  );
}

/** Who is playing the quests. */
function SharingAs({ guest, setGuest }: { guest: Guest; setGuest: (guest: Guest | null) => void }) {
  const [picking, setPicking] = useState(false);
  if (picking) {
    return (
      <div className="rounded-2xl border border-line bg-white p-4">
        <GuestPicker
          onPick={(picked) => {
            setGuest(picked);
            setPicking(false);
          }}
          onCancel={() => setPicking(false)}
        />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3">
      <p className="min-w-0 truncate text-sm">
        Playing as <strong className="font-semibold">{guest.name}</strong>
      </p>
      <button type="button" onClick={() => setPicking(true)} className="shrink-0 text-sm font-semibold text-sage underline underline-offset-4">
        Not you?
      </button>
    </div>
  );
}

function GuestPicker({ onPick, onCancel }: { onPick: (guest: Guest) => void; onCancel?: () => void }) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => findGuests(allGuests, query).slice(0, 6), [query]);
  return (
    <div>
      <label htmlFor="guest-search" className="font-serif text-2xl leading-tight">
        Who are you?
      </label>
      <p className="mt-1 text-sm text-soft">
        Your quests are picked for you, and your name goes on the leaderboard.
      </p>
      <input
        id="guest-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Your name"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="words"
        spellCheck={false}
        enterKeyHint="search"
        className="mt-3 w-full rounded-2xl border border-line bg-white px-4 py-3.5 text-lg text-ink placeholder:text-[#a59d8f] outline-none transition focus:border-sage focus:ring-4 focus:ring-sage/15"
      />
      {query.trim() && (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white" aria-live="polite">
          {matches.length === 0 && <li className="px-4 py-3 text-sm text-soft">We could not find that name. Try just your first or last name.</li>}
          {matches.map((guest) => (
            <li key={guest.id}>
              <button type="button" onClick={() => onPick(guest)} className="w-full px-4 py-3 text-left font-medium hover:bg-cream/70">
                {guest.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {onCancel && (
        <button type="button" onClick={onCancel} className="mt-3 text-sm text-label underline underline-offset-4">
          Cancel
        </button>
      )}
    </div>
  );
}

interface Item {
  key: string;
  status: "waiting" | "uploading" | "done" | "error";
  id?: string;
  error?: string;
}

function BulkUpload() {
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const files = useRef(new Map<string, File>());
  const input = useRef<HTMLInputElement>(null);

  const patch = (key: string, change: Partial<Item>) =>
    setItems((list) => list.map((item) => (item.key === key ? { ...item, ...change } : item)));

  async function run(keys: string[]) {
    let next = 0;
    // Two at a time keeps phones responsive and finishes a big batch quickly.
    const worker = async () => {
      while (next < keys.length) {
        const key = keys[next++];
        patch(key, { status: "uploading", error: undefined });
        try {
          // Uploads are anonymous; names are only for quests, so the couple knows who won.
          const id = await uploadPhoto(files.current.get(key)!, {});
          files.current.delete(key);
          patch(key, { status: "done", id });
        } catch (error) {
          patch(key, { status: "error", error: (error as Error).message });
        }
      }
    };
    await Promise.all([worker(), worker()]);
  }

  function choose(list: FileList | null) {
    const images = [...(list ?? [])].filter((file) => file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name));
    if (!images.length) return;
    const added = images.map((file) => {
      const key = crypto.randomUUID();
      files.current.set(key, file);
      return { key, status: "waiting" as const };
    });
    setItems((current) => [...current, ...added]);
    void run(added.map((item) => item.key));
  }

  const done = items.filter((item) => item.status === "done");
  const failed = items.filter((item) => item.status === "error");
  const busy = items.some((item) => item.status === "waiting" || item.status === "uploading");

  return (
    <section className={card} aria-labelledby="share">
      <h2 id="share" className="font-serif text-3xl leading-tight">Upload photos</h2>
      <p className="mt-1 text-sm text-soft">Select as many as you like at once. They go straight to the screen.</p>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          choose(event.target.files);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          choose(event.dataTransfer.files);
        }}
        className={`mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed px-5 py-9 text-center transition ${
          dragging ? "border-sage bg-sage-tint" : "border-sage/40 bg-sage-tint/40 hover:border-sage hover:bg-sage-tint"
        }`}
      >
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-sage text-cream">
          <svg aria-hidden className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
          </svg>
        </span>
        <span className="font-serif text-2xl leading-tight">{items.length ? "Add more photos" : "Choose photos"}</span>
        <span className="text-sm text-soft">Opens your photo library. Tap every photo you want, then tap Add.</span>
      </button>

      {items.length > 0 && (
        <div className="mt-5" aria-live="polite">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">
              {busy ? `Sharing ${done.length + failed.length + 1} of ${items.length}` : `${done.length} shared`}
            </span>
            {failed.length > 0 && !busy && (
              <button
                type="button"
                onClick={() => void run(failed.map((item) => item.key))}
                className="font-semibold text-sage underline underline-offset-4"
              >
                Retry {failed.length} failed
              </button>
            )}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream">
            <div
              className="h-full rounded-full bg-sage transition-[width] duration-300"
              style={{ width: `${(100 * (done.length + failed.length)) / items.length}%` }}
            />
          </div>
          {failed[0]?.error && !busy && <p className="mt-2 text-sm text-[#9a3b2e]">{failed[0].error}</p>}
          <ul className="mt-3 grid grid-cols-4 gap-1.5">
            {items.map((item) => (
              <li key={item.key} className="aspect-square overflow-hidden rounded-lg bg-cream">
                {item.id ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl(item.id, "thumb")} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span
                    className={`grid h-full place-items-center text-xs ${item.status === "error" ? "text-[#9a3b2e]" : "text-label"}`}
                  >
                    {item.status === "error" ? "Failed" : item.status === "uploading" ? "…" : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function QuestIntro() {
  return (
    <>
      <h2 id="quests" className="font-serif text-3xl leading-tight">Side quests</h2>
      <p className="mt-1 text-sm text-soft">
        You get {QUESTS_PER_GUEST} photo challenges. Finish any {QUESTS_TO_WIN} and you are done. The first guest to{" "}
        {QUESTS_TO_WIN} wins a prize from the couple.
      </p>
    </>
  );
}

function QuestBoard({ guest, setGuest }: { guest: Guest; setGuest: (guest: Guest | null) => void }) {
  const quests = useMemo(() => questsFor(guest.id), [guest.id]);
  const [done, setDone] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/quests/${guest.id}`, { cache: "no-store" });
    if (response.ok) setDone(((await response.json()) as { done: Record<string, string> }).done);
    setLoaded(true);
  }, [guest.id]);

  useEffect(() => {
    let live = true;
    fetch(`/api/quests/${guest.id}`, { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<{ done: Record<string, string> }>) : { done: {} }))
      .then((body) => {
        if (!live) return;
        setDone(body.done);
        setLoaded(true);
      })
      .catch(() => live && setLoaded(true));
    return () => {
      live = false;
    };
  }, [guest.id]);

  const count = quests.filter((quest) => done[quest.id]).length;
  const finished = count >= QUESTS_TO_WIN;

  return (
    <section className={card} aria-labelledby="quests">
      <QuestIntro />
      <div className="mt-4">
        <SharingAs guest={guest} setGuest={setGuest} />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-cream">
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-500"
            style={{ width: `${(100 * Math.min(count, QUESTS_TO_WIN)) / QUESTS_TO_WIN}%` }}
          />
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {loaded ? `${Math.min(count, QUESTS_TO_WIN)} of ${QUESTS_TO_WIN}` : "…"}
        </span>
      </div>
      {finished && (
        <p className="mt-4 rounded-2xl bg-sage-tint px-4 py-3 text-sm text-ink">
          <strong>You finished.</strong> The couple will check the photos and announce the winner. Keep going if you like,
          the extra photos still play on the screen.
        </p>
      )}
      <ol className="mt-5 space-y-3">
        {quests.map((quest, index) => (
          <QuestCard key={quest.id} index={index} quest={quest} guest={guest} photoId={done[quest.id]} onDone={refresh} />
        ))}
      </ol>
    </section>
  );
}

function QuestCard({
  index,
  quest,
  guest,
  photoId,
  onDone,
}: {
  index: number;
  quest: Quest;
  guest: Guest;
  photoId?: string;
  onDone: () => Promise<void>;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{ busy: boolean; error?: string }>({ busy: false });

  async function submit(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    setState({ busy: true });
    try {
      await uploadPhoto(file, { guestId: guest.id, questId: quest.id });
      await onDone();
      setState({ busy: false });
    } catch (error) {
      setState({ busy: false, error: (error as Error).message });
    }
  }

  const done = Boolean(photoId);
  return (
    <li className={`rounded-2xl border p-4 ${done ? "border-sage/40 bg-sage-tint/60" : "border-line bg-white"}`}>
      <div className="flex gap-3">
        {done ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl(photoId!, "thumb")} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
        ) : (
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-cream font-serif text-2xl text-label">
            {index + 1}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{quest.title}</p>
          <p className="text-[13px] text-soft">{done ? "Done. You can add another." : "Not done yet"}</p>
        </div>
      </div>
      <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1}
        onChange={(event) => { void submit(event.target.files); event.target.value = ""; }} />
      <input ref={gallery} type="file" accept="image/*" className="sr-only" tabIndex={-1}
        onChange={(event) => { void submit(event.target.files); event.target.value = ""; }} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" disabled={state.busy} onClick={() => camera.current?.click()} className={secondaryButton}>
          {state.busy ? "Sending…" : "Take photo"}
        </button>
        <button type="button" disabled={state.busy} onClick={() => gallery.current?.click()} className={secondaryButton}>
          From gallery
        </button>
      </div>
      {state.error && <p className="mt-2 text-sm text-[#9a3b2e]">{state.error}</p>}
    </li>
  );
}
