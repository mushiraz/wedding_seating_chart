export interface TvSettings {
  /** Which uploads play. */
  show: "all" | "quests" | "shared";
  /** One quest id, or "" for any. */
  quest: string;
  /** One uploader's name, or "" for anyone. */
  who: string;
  /** Only photos from the last N minutes; 0 means the whole night. */
  since: number;
  /** Seconds each photo stays up. */
  speed: number;
  captions: boolean;
  qr: boolean;
}

export const DEFAULT_TV: TvSettings = { show: "all", quest: "", who: "", since: 0, speed: 8, captions: true, qr: true };

export const SPEEDS = [5, 8, 12, 20];
export const WINDOWS = [0, 60, 15];

type Params = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/** Reads settings from the page URL, falling back to defaults for anything missing or odd. */
export function parseTv(params: Params): TvSettings {
  const show = one(params.show);
  const since = Number(one(params.since));
  const speed = Number(one(params.speed));
  return {
    show: show === "quests" || show === "shared" ? show : "all",
    quest: one(params.quest).slice(0, 40),
    who: one(params.who).slice(0, 80),
    since: WINDOWS.includes(since) ? since : 0,
    speed: SPEEDS.includes(speed) ? speed : DEFAULT_TV.speed,
    captions: one(params.captions) !== "0",
    qr: one(params.qr) !== "0",
  };
}

/** Only the settings that differ from the defaults, so the URL stays short. */
export function tvQuery(settings: TvSettings): string {
  const params = new URLSearchParams();
  if (settings.show !== "all") params.set("show", settings.show);
  if (settings.quest) params.set("quest", settings.quest);
  if (settings.who) params.set("who", settings.who);
  if (settings.since) params.set("since", String(settings.since));
  if (settings.speed !== DEFAULT_TV.speed) params.set("speed", String(settings.speed));
  if (!settings.captions) params.set("captions", "0");
  if (!settings.qr) params.set("qr", "0");
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function matchesTv(
  photo: { questId: string | null; name: string | null; at: number },
  settings: TvSettings,
  now: number,
): boolean {
  if (settings.show === "quests" && !photo.questId) return false;
  if (settings.show === "shared" && photo.questId) return false;
  if (settings.quest && photo.questId !== settings.quest) return false;
  if (settings.who && photo.name !== settings.who) return false;
  if (settings.since && photo.at < now - settings.since * 60_000) return false;
  return true;
}
