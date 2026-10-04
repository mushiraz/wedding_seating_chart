"use client";

import { useSyncExternalStore } from "react";
import seating from "@/data/ahad-rehnuba.json";
import type { Guest } from "@/lib/types";

const KEY = "photo-booth:guest";
const CHANGED = "photo-booth:guest-changed";

export const allGuests = seating.guests as Guest[];
const byId = new Map(allGuests.map((guest) => [guest.id, guest]));

// Private mode can block storage; then the choice lives here for this page view.
let memory: string | null = null;

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return memory;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

/** The guest using this phone, remembered between visits. */
export function useGuest(): [Guest | null, (guest: Guest | null) => void] {
  const id = useSyncExternalStore(subscribe, read, () => null);
  const set = (guest: Guest | null) => {
    memory = guest?.id ?? null;
    try {
      if (guest) localStorage.setItem(KEY, guest.id);
      else localStorage.removeItem(KEY);
    } catch {
      // Falls back to `memory`.
    }
    window.dispatchEvent(new Event(CHANGED));
  };
  return [id ? byId.get(id) ?? null : null, set];
}
