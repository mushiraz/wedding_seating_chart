export type TvMode = "scroll" | "single";
export type TvPace = "slow" | "normal" | "fast";

export interface TvSettings {
  /** A slow endless strip of photos, or one photo at a time. */
  mode: TvMode;
  /** Which uploads play. */
  show: "all" | "quests" | "shared";
  /** One quest id, or "" for any. */
  quest: string;
  /** One uploader's name, or "" for anyone. */
  who: string;
  /** "HH:MM" local time to start from, or "" for every photo. */
  from: string;
  pace: TvPace;
  captions: boolean;
  qr: boolean;
}

export const DEFAULT_TV: TvSettings = {
  mode: "scroll",
  show: "all",
  quest: "",
  who: "",
  from: "",
  pace: "normal",
  captions: true,
  qr: true,
};

/** Scroll speed as a fraction of the screen height per second, and seconds per photo one at a time. */
export const PACE: Record<TvPace, { scroll: number; seconds: number }> = {
  slow: { scroll: 0.035, seconds: 12 },
  normal: { scroll: 0.06, seconds: 8 },
  fast: { scroll: 0.1, seconds: 5 },
};

type Params = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/** Reads settings from the page URL, falling back to defaults for anything missing or odd. */
export function parseTv(params: Params): TvSettings {
  const show = one(params.show);
  const pace = one(params.pace);
  const from = one(params.from);
  return {
    mode: one(params.mode) === "single" ? "single" : "scroll",
    show: show === "quests" || show === "shared" ? show : "all",
    quest: one(params.quest).slice(0, 40),
    who: one(params.who).slice(0, 80),
    from: /^([01]\d|2[0-3]):[0-5]\d$/.test(from) ? from : "",
    pace: pace === "slow" || pace === "fast" ? pace : "normal",
    captions: one(params.captions) !== "0",
    qr: one(params.qr) !== "0",
  };
}

/** Only the settings that differ from the defaults, so the URL stays short. */
export function tvQuery(settings: TvSettings): string {
  const params = new URLSearchParams();
  if (settings.mode !== "scroll") params.set("mode", settings.mode);
  if (settings.show !== "all") params.set("show", settings.show);
  if (settings.quest) params.set("quest", settings.quest);
  if (settings.who) params.set("who", settings.who);
  if (settings.from) params.set("from", settings.from);
  if (settings.pace !== "normal") params.set("pace", settings.pace);
  if (!settings.captions) params.set("captions", "0");
  if (!settings.qr) params.set("qr", "0");
  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * The most recent moment the clock read `from` (today, or yesterday if that
 * time hasn't come yet), so "from 17:30" still works after midnight.
 */
export function fromCutoff(from: string, now: Date): number {
  if (!from) return 0;
  const [hours, minutes] = from.split(":").map(Number);
  const cutoff = new Date(now);
  cutoff.setHours(hours, minutes, 0, 0);
  if (cutoff.getTime() > now.getTime()) cutoff.setDate(cutoff.getDate() - 1);
  return cutoff.getTime();
}

export function matchesTv(
  photo: { questId: string | null; name: string | null; at: number },
  settings: TvSettings,
  cutoff: number,
): boolean {
  if (settings.show === "quests" && !photo.questId) return false;
  if (settings.show === "shared" && photo.questId) return false;
  if (settings.quest && photo.questId !== settings.quest) return false;
  if (settings.who && photo.name !== settings.who) return false;
  return photo.at >= cutoff;
}
