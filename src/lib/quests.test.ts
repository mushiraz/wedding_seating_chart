import assert from "node:assert/strict";
import test from "node:test";
import { QUESTS, QUESTS_PER_GUEST, QUESTS_TO_WIN, questsFor, rankPlayers, type QuestPhoto } from "./quests.ts";

test("each guest gets a stable, distinct subset of the quests", () => {
  const a = questsFor("g1").map((quest) => quest.id);
  assert.deepEqual(questsFor("g1").map((quest) => quest.id), a, "same guest, same quests");
  assert.equal(a.length, QUESTS_PER_GUEST);
  assert.equal(new Set(a).size, a.length, "no repeats");
  const decks = new Set(["g1", "g2", "g3", "g4", "g5"].map((id) => questsFor(id).map((q) => q.id).join()));
  assert.ok(decks.size >= 4, "different guests mostly get different decks");
  assert.ok(QUESTS.length >= 15);
});

function photo(guestId: string, questId: string, createdAt: number, hidden = false): QuestPhoto {
  return { guestId, questId, createdAt, hidden };
}

test("the first player to five different quests wins; repeats and hidden photos do not count", () => {
  const photos = [
    // ana: five quests, fifth at t=50
    ...[10, 20, 30, 40, 50].map((t, i) => photo("ana", `q${i}`, t)),
    // ben: six photos but one quest twice and one hidden, so only four count
    photo("ben", "q0", 1), photo("ben", "q0", 2), photo("ben", "q1", 3), photo("ben", "q2", 4),
    photo("ben", "q3", 5), photo("ben", "q4", 6, true),
    // cy: five quests, fifth at t=45, so cy beats ana
    ...[5, 15, 25, 35, 45].map((t, i) => photo("cy", `q${i}`, t)),
  ];
  const ranked = rankPlayers(photos, new Set());
  assert.deepEqual(ranked.map((s) => s.guestId), ["cy", "ana", "ben"]);
  assert.equal(ranked[0].finishedAt, 45);
  assert.equal(ranked[2].completions.length, QUESTS_TO_WIN - 1);
  assert.equal(ranked[2].finishedAt, null);
});

test("disqualifying the winner moves the runner-up to first", () => {
  const photos = [
    ...[5, 15, 25, 35, 45].map((t, i) => photo("cy", `q${i}`, t)),
    ...[10, 20, 30, 40, 50].map((t, i) => photo("ana", `q${i}`, t)),
  ];
  const ranked = rankPlayers(photos, new Set(["cy"]));
  assert.deepEqual(ranked.map((s) => [s.guestId, s.disqualified]), [["ana", false], ["cy", true]]);
});
