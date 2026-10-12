import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_TV, fromCutoff, matchesTv, parseTv, tvQuery } from "./tvSettings.ts";

test("settings survive a round trip through the URL, and junk falls back to defaults", () => {
  const settings = { ...DEFAULT_TV, mode: "single" as const, show: "quests" as const, quest: "cake", from: "17:30", pace: "slow" as const, qr: false };
  assert.deepEqual(parseTv(Object.fromEntries(new URLSearchParams(tvQuery(settings)))), settings);
  assert.equal(tvQuery(DEFAULT_TV), "", "defaults keep the URL clean");
  assert.deepEqual(parseTv({ mode: "zoom", show: "everything", from: "25:99", pace: "warp" }), DEFAULT_TV);
});

test("'from' means the last time the clock showed it, even after midnight", () => {
  const evening = new Date(2026, 9, 12, 21, 0);
  assert.equal(fromCutoff("17:30", evening), new Date(2026, 9, 12, 17, 30).getTime());
  const afterMidnight = new Date(2026, 9, 13, 0, 20);
  assert.equal(fromCutoff("17:30", afterMidnight), new Date(2026, 9, 12, 17, 30).getTime());
  assert.equal(fromCutoff("", evening), 0, "no start time keeps every photo");
});

test("filters combine with the start time", () => {
  const cutoff = 1_000_000;
  const quest = { questId: "cake", name: "Sara Khan", at: cutoff + 10 };
  const shared = { questId: null, name: "Omar Ali", at: cutoff - 10 };
  const all = [quest, shared];
  const pick = (overrides: Partial<typeof DEFAULT_TV>, from = 0) =>
    all.filter((photo) => matchesTv(photo, { ...DEFAULT_TV, ...overrides }, from));
  assert.deepEqual(pick({}), all);
  assert.deepEqual(pick({ show: "quests" }), [quest]);
  assert.deepEqual(pick({ show: "shared" }), [shared]);
  assert.deepEqual(pick({ quest: "dj" }), []);
  assert.deepEqual(pick({ who: "Omar Ali" }), [shared]);
  assert.deepEqual(pick({}, cutoff), [quest], "photo from before the start time is left out");
});
