import assert from "node:assert/strict";
import test from "node:test";
import { findGuests, tableNumber, tableTitle } from "./tableDisplay.ts";
import type { Guest, Table } from "./types.ts";

function table(label: string): Table {
  return { id: label, label, shape: "round", x: 0, y: 0, seats: 8 };
}

function guest(name: string, tableId = "t1"): Guest {
  return { id: name, name, tableId };
}

test("head tables use a short number and a spoken title", () => {
  const head = { ...table("Rect 1"), shape: "rectangle" as const };
  assert.equal(tableNumber(head), "H1");
  assert.equal(tableTitle(head), "Head Table 1");
  assert.equal(tableNumber(table("Vendor Table")), "V");
  assert.equal(tableNumber(table("Table 19")), "19");
});

test("search requires every word and does not invent a match", () => {
  const guests = [guest("Rehnuba Fairoj", "t32"), guest("Ahad Shirazi", "t35"), guest("Anamika Bhowmik", "")];
  assert.deepEqual(findGuests(guests, "rehnuba").map((item) => item.name), ["Rehnuba Fairoj"]);
  assert.deepEqual(findGuests(guests, "fairoj shirazi"), []);
  assert.equal(findGuests(guests, "   ").length, 0);
});
