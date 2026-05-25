import { EventData } from "./types";

const STORAGE_KEY_PREFIX = "wedding_event_";

export function saveEvent(data: EventData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    `${STORAGE_KEY_PREFIX}${data.event.slug}`,
    JSON.stringify(data)
  );
}

export function loadEvent(slug: string): EventData | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${slug}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EventData;
  } catch {
    return null;
  }
}

export function deleteEvent(slug: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${STORAGE_KEY_PREFIX}${slug}`);
}

export function listEventSlugs(): string[] {
  if (typeof window === "undefined") return [];
  const slugs: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_KEY_PREFIX)) {
      slugs.push(key.replace(STORAGE_KEY_PREFIX, ""));
    }
  }
  return slugs;
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
