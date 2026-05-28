export interface WeddingEvent {
  slug: string;
  title: string;
  date: string;
  heroImage?: string;
  floorPlanBg?: string;
}

export interface Table {
  id: string;
  label: string;
  shape: "round" | "rectangle";
  seats: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export type FixtureType = "door" | "stage" | "walkway" | "dancefloor" | "bar" | "dj";

export interface Fixture {
  id: string;
  type: FixtureType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export const FIXTURE_PRESETS: Record<FixtureType, { label: string; width: number; height: number; icon: string }> = {
  door: { label: "Door", width: 6, height: 3, icon: "🚪" },
  stage: { label: "Stage", width: 25, height: 12, icon: "🎤" },
  walkway: { label: "Walkway", width: 30, height: 4, icon: "🚶" },
  dancefloor: { label: "Dance Floor", width: 20, height: 20, icon: "💃" },
  bar: { label: "Bar", width: 15, height: 5, icon: "🍸" },
  dj: { label: "DJ Booth", width: 10, height: 6, icon: "🎧" },
};

export interface Guest {
  id: string;
  name: string;
  tableId: string;
  seatNumber?: number;
}

export interface EventData {
  event: WeddingEvent;
  tables: Table[];
  guests: Guest[];
  fixtures?: Fixture[];
}
