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

test("search hits middle names, nicknames and any word order", () => {
  const guests = [guest("Asadur Rahman Akand"), guest("Chinmayee (May) Gidwani"), guest("Md. Shameem Iqbal"), guest("Asad Rahim")];
  const names = (query: string) => findGuests(guests, query).map((item) => item.name);
  assert.deepEqual(names("rahman"), ["Asadur Rahman Akand"]);
  assert.deepEqual(names("akand asadur"), ["Asadur Rahman Akand"]);
  assert.deepEqual(names("may"), ["Chinmayee (May) Gidwani"]);
  assert.deepEqual(names("md shameem"), ["Md. Shameem Iqbal"]);
  assert.deepEqual(names("asad"), ["Asad Rahim", "Asadur Rahman Akand"], "whole-word hit ranks first");
});

test("search forgives a typo only when nothing matches exactly", () => {
  const guests = [guest("Muhammad Shirazi"), guest("Sana Ali"), guest("Sara Khan")];
  assert.deepEqual(findGuests(guests, "mohammed").map((item) => item.name), ["Muhammad Shirazi"]);
  assert.deepEqual(findGuests(guests, "sara").map((item) => item.name), ["Sara Khan"]);
  assert.deepEqual(findGuests([guest("Md Shahadat Hossain")], "mohammad shahadat").length, 1);
});
