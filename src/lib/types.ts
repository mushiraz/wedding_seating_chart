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
}
