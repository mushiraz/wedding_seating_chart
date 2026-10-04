"use client";

import { useCallback, useEffect, useState } from "react";
import { QUESTS_TO_WIN, questById } from "@/lib/quests";
import { photoUrl } from "@/lib/uploadPhoto";

interface Standing {
  guestId: string;
  name: string;
  completions: { questId: string; at: number }[];
  finishedAt: number | null;
  disqualified: boolean;
}

interface AdminPhoto {
  id: string;
  guestId: string | null;
  name: string | null;
  questId: string | null;
  quest: string | null;
  at: number;
  hidden: boolean;
}

interface Board {
  standings: Standing[];
  photos: AdminPhoto[];
}

const time = (ms: number) =>
  new Date(ms).toLocaleTimeString("en-CA", { timeZone: "America/Toronto", hour: "numeric", minute: "2-digit", second: "2-digit" });

const pill = "rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";

export default function AdminBoard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"leaderboard" | "photos">("leaderboard");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin", { cache: "no-store" });
    if (response.status === 401) return setSignedIn(false);
    if (!response.ok) return;
    setBoard((await response.json()) as Board);
    setSignedIn(true);
  }, []);

  useEffect(() => {
    let live = true;
    const tick = () => {
      if (live) void load();
    };
    tick();
    const timer = setInterval(tick, 15000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [load]);

  async function act(body: object) {
    await fetch("/api/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    await load();
  }

  if (signedIn === false) return <SignIn onDone={load} />;
  if (!board) return <p className="p-8 text-center text-soft">Loading…</p>;

  const hidden = board.photos.filter((photo) => photo.hidden).length;
  return (
    <div className="min-h-screen px-4 pb-16 text-ink">
      <header className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3 py-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-label">Photo booth admin</p>
          <h1 className="font-serif text-4xl">Side quests</h1>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void load()} className={`${pill} border-line bg-white`}>
            Refresh
          </button>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/admin/session", { method: "DELETE" });
              setSignedIn(false);
            }}
            className={`${pill} border-line bg-white`}
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto">
        <div className="mb-5 inline-flex rounded-full border border-line bg-white p-1 text-sm">
          {(["leaderboard", "photos"] as const).map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={tab === name}
              onClick={() => setTab(name)}
              className={`rounded-full px-4 py-1.5 font-semibold ${tab === name ? "bg-sage text-cream" : "text-body"}`}
            >
              {name === "leaderboard" ? `Leaderboard (${board.standings.length})` : `Photos (${board.photos.length})`}
            </button>
          ))}
        </div>

        {tab === "leaderboard" ? (
          <Leaderboard standings={board.standings} photos={board.photos} act={act} />
        ) : (
          <PhotoGrid photos={board.photos} hidden={hidden} act={act} />
        )}
      </div>
    </div>
  );
}

function SignIn({ onDone }: { onDone: () => Promise<void> }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="mx-auto mt-24 max-w-sm rounded-3xl border border-line bg-paper p-6"
      onSubmit={async (event) => {
        event.preventDefault();
        const response = await fetch("/api/admin/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key }),
        });
        if (!response.ok) return setError(((await response.json().catch(() => ({}))) as { error?: string }).error ?? "Could not sign in.");
        await onDone();
      }}
    >
      <h1 className="font-serif text-3xl">Photo booth admin</h1>
      <label htmlFor="admin-key" className="mt-4 block text-sm text-soft">
        Admin key
      </label>
      <input
        id="admin-key"
        type="password"
        value={key}
        onChange={(event) => setKey(event.target.value)}
        autoComplete="current-password"
        className="mt-1 w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-sage focus:ring-4 focus:ring-sage/15"
      />
      {error && <p className="mt-2 text-sm text-[#9a3b2e]">{error}</p>}
      <button type="submit" className="mt-4 w-full rounded-2xl bg-sage px-5 py-3 font-semibold text-cream">
        Sign in
      </button>
    </form>
  );
}

function Leaderboard({
  standings,
  photos,
  act,
}: {
  standings: Standing[];
  photos: AdminPhoto[];
  act: (body: object) => Promise<void>;
}) {
  const [open, setOpen] = useState<string | null>(null);
  if (standings.length === 0) return <p className="text-soft">No quest photos yet.</p>;
  let place = 0;
  return (
    <ol className="space-y-2">
      {standings.map((standing) => {
        const rank = standing.disqualified ? null : ++place;
        const done = standing.completions.length;
        const label =
          rank === 1 && standing.finishedAt ? "Winner" : rank === 2 && standing.finishedAt ? "Runner-up" : null;
        const theirs = photos.filter((photo) => photo.guestId === standing.guestId && photo.questId);
        return (
          <li key={standing.guestId} className={`rounded-2xl border bg-white ${standing.disqualified ? "border-line opacity-60" : label === "Winner" ? "border-gold" : "border-line"}`}>
            <div className="flex flex-wrap items-center gap-3 p-4">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-bold tabular-nums ${rank === 1 ? "bg-gold text-white" : "bg-cream text-body"}`}>
                {rank ?? "DQ"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {standing.name}
                  {label && <span className="ml-2 rounded-full bg-sage-tint px-2 py-0.5 text-xs text-sage">{label}</span>}
                </p>
                <p className="text-sm text-soft tabular-nums">
                  {Math.min(done, QUESTS_TO_WIN)}/{QUESTS_TO_WIN} quests
                  {standing.finishedAt ? ` · finished ${time(standing.finishedAt)}` : done ? ` · last ${time(standing.completions[done - 1].at)}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(open === standing.guestId ? null : standing.guestId)}
                aria-expanded={open === standing.guestId}
                className={`${pill} border-line bg-white`}
              >
                {open === standing.guestId ? "Hide photos" : "Review"}
              </button>
              <button
                type="button"
                onClick={() => void act({ action: standing.disqualified ? "reinstate" : "disqualify", guestId: standing.guestId })}
                className={`${pill} ${standing.disqualified ? "border-sage text-sage" : "border-[#d8b4ac] text-[#9a3b2e]"} bg-white`}
              >
                {standing.disqualified ? "Reinstate" : "Disqualify"}
              </button>
            </div>
            {open === standing.guestId && (
              <ul className="grid grid-cols-2 gap-3 border-t border-line p-4 sm:grid-cols-3">
                {theirs.map((photo) => (
                  <PhotoTile key={photo.id} photo={photo} act={act} />
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function PhotoGrid({ photos, hidden, act }: { photos: AdminPhoto[]; hidden: number; act: (body: object) => Promise<void> }) {
  const [filter, setFilter] = useState<"all" | "quests" | "hidden">("all");
  const shown = photos.filter((photo) => (filter === "quests" ? photo.questId : filter === "hidden" ? photo.hidden : true));
  return (
    <>
      <div className="mb-4 flex gap-2">
        {(["all", "quests", "hidden"] as const).map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={filter === name}
            onClick={() => setFilter(name)}
            className={`${pill} ${filter === name ? "border-sage bg-sage text-cream" : "border-line bg-white"}`}
          >
            {name === "all" ? "All" : name === "quests" ? "Quest photos" : `Hidden (${hidden})`}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="text-soft">Nothing here yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {shown.map((photo) => (
            <PhotoTile key={photo.id} photo={photo} act={act} />
          ))}
        </ul>
      )}
    </>
  );
}

function PhotoTile({ photo, act }: { photo: AdminPhoto; act: (body: object) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <li className={`overflow-hidden rounded-xl border bg-white ${photo.hidden ? "border-[#d8b4ac]" : "border-line"}`}>
      <a href={photoUrl(photo.id)} target="_blank" rel="noopener noreferrer" className="block aspect-square bg-cream">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl(photo.id, "thumb")} alt="" loading="lazy" className={`h-full w-full object-cover ${photo.hidden ? "opacity-40" : ""}`} />
      </a>
      <div className="p-2.5 text-xs">
        <p className="truncate font-semibold">{photo.name ?? "Anonymous"}</p>
        <p className="truncate text-soft">{photo.questId ? questById(photo.questId)?.title ?? photo.quest : "Shared photo"}</p>
        <p className="text-soft tabular-nums">{time(photo.at)}</p>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await act({ action: photo.hidden ? "show" : "hide", photoId: photo.id });
            setBusy(false);
          }}
          className={`${pill} mt-2 w-full ${photo.hidden ? "border-sage text-sage" : "border-[#d8b4ac] text-[#9a3b2e]"} bg-white`}
        >
          {photo.hidden ? "Show again" : "Hide from TV"}
        </button>
      </div>
    </li>
  );
}
