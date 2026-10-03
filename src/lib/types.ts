export interface WeddingEvent {
  slug: string;
  title: string;
  date: string;
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
  rotation?: number;
}

export type FixtureType = "door" | "stage" | "walkway" | "dancefloor" | "bar" | "dj" | "floorwrap" | "cake";

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

export interface Guest {
  id: string;
  name: string;
  tableId: string;
}

export interface EventData {
  event: WeddingEvent;
  tables: Table[];
  guests: Guest[];
  fixtures?: Fixture[];
}
