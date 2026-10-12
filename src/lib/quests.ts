export interface Quest {
  id: string;
  title: string;
}

/** Photos needed to finish the game. */
export const QUESTS_TO_WIN = 5;
/** Quests each guest is dealt, so they can skip a few. */
export const QUESTS_PER_GUEST = 8;

export const QUESTS: Quest[] = [
  { id: "bride", title: "With the bride" },
  { id: "groom", title: "With the groom" },
  { id: "couple", title: "With the bride and groom together" },
  { id: "bride-family", title: "With someone from the bride's family" },
  { id: "groom-family", title: "With someone from the groom's family" },
  { id: "new-friend", title: "With someone you met today" },
  { id: "far-side", title: "With a guest from the other side of the room" },
  { id: "table", title: "Your whole table in one selfie" },
  { id: "wedding-party", title: "With a bridesmaid, groomsman or groomswoman" },
  { id: "elder", title: "With an elder of either family" },
  { id: "dance", title: "On the dance floor" },
  { id: "cake", title: "With the cake" },
  { id: "dj", title: "With the DJ" },
  { id: "big-group", title: "A group of eight or more" },
  { id: "same-colour", title: "With someone wearing your colour" },
];

const byId = new Map(QUESTS.map((quest) => [quest.id, quest]));

export function questById(id: string): Quest | undefined {
  return byId.get(id);
}

function seed(text: string): number {
  // FNV-1a, so the same guest gets the same quests on every device and on the server.
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** The guest's own quests: a stable shuffle of the full list, cut to QUESTS_PER_GUEST. */
export function questsFor(guestId: string): Quest[] {
  let state = seed(guestId);
  const random = () => {
    // mulberry32
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const deck = [...QUESTS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, QUESTS_PER_GUEST);
}

export interface QuestPhoto {
  guestId: string;
  questId: string;
  createdAt: number;
  hidden: boolean;
}

export interface Standing {
  guestId: string;
  /** Earliest visible photo per quest, oldest first. */
  completions: { questId: string; at: number }[];
  /** When the winning photo landed, or null if not there yet. */
  finishedAt: number | null;
  disqualified: boolean;
}

/**
 * Finishers first, by the time of their QUESTS_TO_WIN-th quest; then everyone
 * else by quests done. Hidden photos do not count, and disqualified players
 * sink to the bottom so the runner-up moves up.
 */
export function rankPlayers(photos: QuestPhoto[], disqualified: Set<string>): Standing[] {
  const firsts = new Map<string, Map<string, number>>();
  for (const photo of photos) {
    if (photo.hidden) continue;
    const quests = firsts.get(photo.guestId) ?? new Map<string, number>();
    const prev = quests.get(photo.questId);
    if (prev === undefined || photo.createdAt < prev) quests.set(photo.questId, photo.createdAt);
    firsts.set(photo.guestId, quests);
  }
  const standings: Standing[] = [...firsts].map(([guestId, quests]) => {
    const completions = [...quests]
      .map(([questId, at]) => ({ questId, at }))
      .sort((a, b) => a.at - b.at);
    return {
      guestId,
      completions,
      finishedAt: completions.length >= QUESTS_TO_WIN ? completions[QUESTS_TO_WIN - 1].at : null,
      disqualified: disqualified.has(guestId),
    };
  });
  const last = (s: Standing) => s.completions[s.completions.length - 1]?.at ?? Infinity;
  return standings.sort(
    (a, b) =>
      Number(a.disqualified) - Number(b.disqualified) ||
      (a.finishedAt ?? Infinity) - (b.finishedAt ?? Infinity) ||
      b.completions.length - a.completions.length ||
      last(a) - last(b),
  );
}
