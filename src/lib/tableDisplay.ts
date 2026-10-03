import type { Guest, Table } from "./types";

export function isHeadTable(table: Table): boolean {
  return /^rect\s+\d+/i.test(table.label);
}

export function tableTitle(table: Table): string {
  const head = table.label.match(/^rect\s+(\d+)/i);
  if (head) return `Head Table ${head[1]}`;
  return table.label;
}

export function tableNumber(table: Table): string {
  const head = table.label.match(/^rect\s+(\d+)/i);
  if (head) return `H${head[1]}`;
  if (/vendor/i.test(table.label)) return "V";
  const digits = table.label.match(/\d+/);
  return digits ? digits[0] : table.label;
}

export function tablesInOrder(tables: Table[]): Table[] {
  return [...tables].sort((a, b) => {
    const rank = (table: Table) => {
      if (isHeadTable(table)) return 100 + Number(table.label.match(/\d+/)?.[0] ?? 0);
      if (/vendor/i.test(table.label)) return 200;
      return Number(table.label.match(/\d+/)?.[0] ?? 99);
    };
    return rank(a) - rank(b);
  });
}

export function findGuests(guests: Guest[], query: string): Guest[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return guests
    .filter((guest) => {
      const name = guest.name.toLowerCase();
      return words.every((word) => name.includes(word));
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
