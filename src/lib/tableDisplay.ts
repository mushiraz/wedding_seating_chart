import type { Guest, Table } from "./types";

export function isHeadTable(table: Table): boolean {
  return /^rect\s+\d+/i.test(table.label);
}

export function isVendorTable(table: Table): boolean {
  return /vendor/i.test(table.label);
}

export function tableTitle(table: Table): string {
  const head = table.label.match(/^rect\s+(\d+)/i);
  if (head) return `Head Table ${head[1]}`;
  return table.label;
}

export function tableNumber(table: Table): string {
  const head = table.label.match(/^rect\s+(\d+)/i);
  if (head) return `H${head[1]}`;
  if (isVendorTable(table)) return "V";
  const digits = table.label.match(/\d+/);
  return digits ? digits[0] : table.label;
}

/** Where the table sits, in words a guest standing at the entrance can use. */
export function tableArea(table: Table): string {
  if (isHeadTable(table)) return "Beside the dance floor, on the stage side";
  const half = table.y < 47 ? "Entrance half of the room" : "Bar half of the room";
  const side = table.x < 35 ? "toward the stage" : table.x > 65 ? "toward the DJ" : "in the middle";
  return `${half}, ${side}`;
}

export function tablesInOrder(tables: Table[]): Table[] {
  return [...tables].sort((a, b) => {
    const rank = (table: Table) => {
      if (isHeadTable(table)) return 100 + Number(table.label.match(/\d+/)?.[0] ?? 0);
      if (isVendorTable(table)) return 200;
      return Number(table.label.match(/\d+/)?.[0] ?? 99);
    };
    return rank(a) - rank(b);
  });
}

/** Lowercase, accent-free words: "Chinmayee (May) Gidwani" -> ["chinmayee", "may", "gidwani"]. */
export function nameWords(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}

function strictScore(word: string, tokens: string[]): number {
  if (tokens.includes(word)) return 3;
  if (tokens.some((token) => token.startsWith(word))) return 2;
  if (word.length >= 3 && tokens.some((token) => token.includes(word))) return 1;
  return 0;
}

function fuzzyScore(word: string, tokens: string[]): number {
  if (word.length < 4) return strictScore(word, tokens);
  const allowed = word.length >= 7 ? 2 : 1;
  return tokens.some((token) => editDistance(word, token) <= allowed) ? 1 : strictScore(word, tokens);
}

/**
 * Every typed word must hit some part of the name (first, middle, last or
 * nickname), in any order. Whole-word hits rank above prefixes and
 * substrings. When nothing matches, one more pass forgives a typo or a
 * spelling variant (Mohammed / Muhammad).
 */
export function findGuests(guests: Guest[], query: string): Guest[] {
  const words = nameWords(query);
  if (words.length === 0) return [];
  // ponytail: linear scan with edit distance, fine for a few hundred guests
  const run = (score: (word: string, tokens: string[]) => number) =>
    guests
      .map((guest) => {
        const tokens = nameWords(guest.name);
        // "Md" is how many guests write Muhammad; fuzzy matching covers the other spellings.
        if (tokens.includes("md") || tokens.includes("mohd")) tokens.push("muhammad");
        const scores = words.map((word) => score(word, tokens));
        return { guest, total: scores.every(Boolean) ? scores.reduce((a, b) => a + b, 0) : 0 };
      })
      .filter((hit) => hit.total > 0)
      .sort((a, b) => b.total - a.total || a.guest.name.localeCompare(b.guest.name))
      .map((hit) => hit.guest);
  const strict = run(strictScore);
  return strict.length > 0 ? strict : run(fuzzyScore);
}
