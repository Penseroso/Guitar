import test from "node:test";
import assert from "node:assert/strict";
import {
  assignGroupedSplit,
  countCrossSplitLeakage,
  identityFromRelativePath,
  musicBody,
  normalizeIdentityPart,
} from "./phase0-lib.mjs";

test("musicBody ignores metadata before start and line endings", () => {
  assert.equal(musicBody("artist:a\r\ndowntune:0\r\nstart\r\nwait:120\r\n"), "start\nwait:120\n");
});

test("identity normalization removes common numbered variants", () => {
  assert.equal(normalizeIdentityPart("Café Song (2).gp4.tokens.txt"), "cafe_song");
  assert.deepEqual(identityFromRelativePath("Z/Artist/Artist - Café Song (2).gp4.tokens.txt"), {
    artist: "artist",
    title: "cafe_song",
  });
});

test("grouped split keeps body and identity duplicates together", () => {
  const records = [
    { bodyHash: "a", identity: "artist|song", artistToken: "artist:a" },
    { bodyHash: "b", identity: "artist|song", artistToken: "artist:a" },
    { bodyHash: "b", identity: "other|copy", artistToken: "artist:b" },
    { bodyHash: "c", identity: "third|song", artistToken: "artist:c" },
  ];
  const result = assignGroupedSplit(records, [(record) => record.bodyHash, (record) => record.identity]);
  assert.equal(result.groupCount, 2);
  assert.equal(result.groupIds[0], result.groupIds[1]);
  assert.equal(result.groupIds[1], result.groupIds[2]);
  assert.notEqual(result.groupIds[2], result.groupIds[3]);
  assert.equal(countCrossSplitLeakage(records, result.assignments, (record) => record.bodyHash), 0);
  assert.equal(countCrossSplitLeakage(records, result.assignments, (record) => record.identity), 0);
});
