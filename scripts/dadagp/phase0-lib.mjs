import { createHash } from "node:crypto";

export const POLICY_VERSION = "phase0-v1";

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeTokenText(text) {
  return text.replace(/\r\n?/g, "\n").trimEnd() + "\n";
}

export function musicBody(text) {
  const lines = normalizeTokenText(text).split("\n");
  const start = lines.indexOf("start");
  return (start >= 0 ? lines.slice(start) : lines).join("\n");
}

export function normalizeIdentityPart(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\.(?:gp[345])(?:\.tokens\.txt)?$/i, "")
    .replace(/\s*\((?:\d+|version\s*\d*|ver\.?\s*\d*)\)\s*$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "_");
}

export function identityFromRelativePath(relativePath) {
  const parts = relativePath.replace(/\\/g, "/").split("/");
  const artist = parts.length >= 2 ? parts.at(-2) : "unknown";
  const rawFile = parts.at(-1) ?? "unknown";
  const stem = rawFile.replace(/\.gp[345]\.tokens\.txt$/i, "");
  const separator = stem.indexOf(" - ");
  const title = separator >= 0 ? stem.slice(separator + 3) : stem;
  return {
    artist: normalizeIdentityPart(artist) || "unknown",
    title: normalizeIdentityPart(title) || "unknown",
  };
}

export function deterministicBucket(key, modulus = 10) {
  return Number.parseInt(sha256(key).slice(0, 8), 16) % modulus;
}

export class UnionFind {
  constructor(size) {
    this.parent = Array.from({ length: size }, (_, index) => index);
    this.rank = new Uint8Array(size);
  }

  find(index) {
    let root = index;
    while (this.parent[root] !== root) root = this.parent[root];
    while (this.parent[index] !== index) {
      const next = this.parent[index];
      this.parent[index] = root;
      index = next;
    }
    return root;
  }

  union(left, right) {
    let a = this.find(left);
    let b = this.find(right);
    if (a === b) return;
    if (this.rank[a] < this.rank[b]) [a, b] = [b, a];
    this.parent[b] = a;
    if (this.rank[a] === this.rank[b]) this.rank[a] += 1;
  }
}

export function unionBy(records, unionFind, keyFor) {
  const first = new Map();
  records.forEach((record, index) => {
    const key = keyFor(record);
    if (!key) return;
    const prior = first.get(key);
    if (prior === undefined) first.set(key, index);
    else unionFind.union(prior, index);
  });
}

export function assignGroupedSplit(records, keyFunctions) {
  const unionFind = new UnionFind(records.length);
  for (const keyFor of keyFunctions) unionBy(records, unionFind, keyFor);

  const groups = new Map();
  records.forEach((_, index) => {
    const root = unionFind.find(index);
    const members = groups.get(root) ?? [];
    members.push(index);
    groups.set(root, members);
  });

  const assignments = new Array(records.length);
  const groupIds = new Array(records.length);
  for (const members of groups.values()) {
    const stableKey = members.map((index) => records[index].bodyHash).sort()[0];
    const groupId = sha256(`${POLICY_VERSION}:${stableKey}`).slice(0, 24);
    const split = deterministicBucket(stableKey) === 0 ? "validation" : "training";
    for (const index of members) {
      assignments[index] = split;
      groupIds[index] = groupId;
    }
  }
  return { assignments, groupIds, groupCount: groups.size };
}

export function countCrossSplitLeakage(records, assignments, keyFor) {
  const seen = new Map();
  for (let index = 0; index < records.length; index += 1) {
    const key = keyFor(records[index]);
    if (!key) continue;
    const splits = seen.get(key) ?? new Set();
    splits.add(assignments[index]);
    seen.set(key, splits);
  }
  return [...seen.values()].filter((splits) => splits.size > 1).length;
}
