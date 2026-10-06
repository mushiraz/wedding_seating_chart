import { env } from "cloudflare:workers";
import seating from "@/data/ahad-rehnuba.json";
import { questById, questsFor, rankPlayers, type QuestPhoto } from "./quests";

export interface PhotoRow {
  id: string;
  guest_id: string | null;
  quest_id: string | null;
  width: number;
  height: number;
  created_at: number;
  hidden: number;
}

/** What the guest pages and the TV get: no hidden photos, names resolved. */
export interface PublicPhoto {
  id: string;
  name: string | null;
  questId: string | null;
  quest: string | null;
  width: number;
  height: number;
  at: number;
}

const guestNames = new Map(seating.guests.map((guest) => [guest.id, guest.name]));

export function guestName(guestId: string | null): string | null {
  return guestId ? guestNames.get(guestId) ?? null : null;
}

export function isGuest(guestId: string): boolean {
  return guestNames.has(guestId);
}

let schema: Promise<unknown> | null = null;

/** Creates the tables on first use, once per isolate, so there is no migration step to forget. */
export function db(): D1Database {
  schema ??= env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      guest_id TEXT,
      quest_id TEXT,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      hidden INTEGER NOT NULL DEFAULT 0
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS photos_by_time ON photos (created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS photos_by_guest ON photos (guest_id, quest_id)"),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS disqualified (
      guest_id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL
    )`),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS failed_logins (ip TEXT NOT NULL, at INTEGER NOT NULL)"),
  ]).catch((error) => {
    schema = null;
    throw error;
  });
  return env.DB;
}

export async function ready(): Promise<D1Database> {
  const database = db();
  await schema;
  return database;
}

export function toPublic(row: PhotoRow): PublicPhoto {
  return {
    id: row.id,
    name: guestName(row.guest_id),
    questId: row.quest_id,
    quest: row.quest_id ? questById(row.quest_id)?.title ?? null : null,
    width: row.width,
    height: row.height,
    at: row.created_at,
  };
}

export const objectKey = (id: string, size: "full" | "thumb") => `${size}/${id}.jpg`;

export async function questProgress(guestId: string) {
  const database = await ready();
  const { results } = await database
    .prepare("SELECT * FROM photos WHERE guest_id = ? AND quest_id IS NOT NULL AND hidden = 0 ORDER BY created_at")
    .bind(guestId)
    .all<PhotoRow>();
  const done: Record<string, string> = {};
  for (const row of results) done[row.quest_id!] ??= row.id;
  return { quests: questsFor(guestId).map((quest) => quest.id), done };
}

export async function leaderboard() {
  const database = await ready();
  const [photos, dq] = await database.batch<PhotoRow | { guest_id: string }>([
    database.prepare("SELECT * FROM photos WHERE quest_id IS NOT NULL AND guest_id IS NOT NULL"),
    database.prepare("SELECT guest_id FROM disqualified"),
  ]);
  const questPhotos: QuestPhoto[] = (photos.results as PhotoRow[]).map((row) => ({
    guestId: row.guest_id!,
    questId: row.quest_id!,
    createdAt: row.created_at,
    hidden: row.hidden === 1,
  }));
  const disqualified = new Set((dq.results as { guest_id: string }[]).map((row) => row.guest_id));
  return rankPlayers(questPhotos, disqualified).map((standing) => ({
    ...standing,
    name: guestName(standing.guestId) ?? standing.guestId,
  }));
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const ADMIN_COOKIE = "pb_admin";

/** Cookie value for a signed-in admin: a hash of the key, never the key itself. */
export async function adminToken(): Promise<string | null> {
  const key = env.PHOTO_ADMIN_KEY;
  return key ? sha256(`photo-booth-admin:${key}`) : null;
}

const LOCKOUT_TRIES = 10;
const LOCKOUT_MS = 15 * 60 * 1000;

/** True when this connection has used up its wrong guesses; the admin key can be short. */
export async function lockedOut(ip: string): Promise<boolean> {
  const database = await ready();
  const row = await database
    .prepare("SELECT count(*) AS n FROM failed_logins WHERE ip = ? AND at > ?")
    .bind(ip, Date.now() - LOCKOUT_MS)
    .first<{ n: number }>();
  return (row?.n ?? 0) >= LOCKOUT_TRIES;
}

export async function recordFailedLogin(ip: string): Promise<void> {
  const database = await ready();
  await database.batch([
    database.prepare("INSERT INTO failed_logins (ip, at) VALUES (?, ?)").bind(ip, Date.now()),
    database.prepare("DELETE FROM failed_logins WHERE at < ?").bind(Date.now() - LOCKOUT_MS),
  ]);
}

export async function keyMatches(candidate: string): Promise<boolean> {
  const key = env.PHOTO_ADMIN_KEY;
  if (!key || !candidate) return false;
  const [a, b] = await Promise.all([sha256(candidate), sha256(key)]);
  return a === b;
}

/** Admin requests carry the cookie set by /api/admin/session. Fails closed when no key is configured. */
export async function isAdmin(request: Request): Promise<boolean> {
  const token = await adminToken();
  if (!token) return false;
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.split(/;\s*/).some((part) => part === `${ADMIN_COOKIE}=${token}`);
}

