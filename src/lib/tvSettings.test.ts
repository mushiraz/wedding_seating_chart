import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_TV, matchesTv, parseTv, tvQuery } from "./tvSettings.ts";

test("settings survive a round trip through the URL, and junk falls back to defaults", () => {
  const settings = { ...DEFAULT_TV, show: "quests" as const, quest: "cake", since: 15, speed: 12, qr: false };
  const query = tvQuery(settings);
  assert.deepEqual(parseTv(Object.fromEntries(new URLSearchParams(query))), settings);
  assert.equal(tvQuery(DEFAULT_TV), "", "defaults keep the URL clean");
  assert.deepEqual(parseTv({ show: "everything", since: "7", speed: "-1" }), DEFAULT_TV);
});

test("filters combine, and the time window is measured from now", () => {
  const now = 10_000_000;
  const quest = { questId: "cake", name: "Sara Khan", at: now - 5 * 60_000 };
  const shared = { questId: null, name: "Omar Ali", at: now - 90 * 60_000 };
  const all = [quest, shared];
  const pick = (overrides: Partial<typeof DEFAULT_TV>) =>
    all.filter((photo) => matchesTv(photo, { ...DEFAULT_TV, ...overrides }, now));
  assert.deepEqual(pick({}), all);
  assert.deepEqual(pick({ show: "quests" }), [quest]);
  assert.deepEqual(pick({ show: "shared" }), [shared]);
  assert.deepEqual(pick({ quest: "dj" }), []);
  assert.deepEqual(pick({ who: "Omar Ali" }), [shared]);
  assert.deepEqual(pick({ since: 60 }), [quest], "90-minute-old photo is outside the last hour");
  assert.deepEqual(pick({ show: "shared", since: 15 }), []);
});
