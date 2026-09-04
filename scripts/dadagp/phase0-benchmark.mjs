import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  POLICY_VERSION,
  assignGroupedSplit,
  countCrossSplitLeakage,
  identityFromRelativePath,
  musicBody,
  normalizeTokenText,
  sha256,
} from "./phase0-lib.mjs";

const workspace = process.cwd();
const datasetRoot = path.resolve(process.argv[2] ?? path.join(workspace, "DadaGP-v1.1", "DadaGP-v1.1"));
const privateOutput = path.resolve(process.argv[3] ?? path.join(workspace, ".dadagp"));
const aggregateOutput = path.resolve(process.argv[4] ?? path.join(workspace, "DADAGP_PHASE0_SUMMARY.json"));
const metadataPath = path.join(datasetRoot, "_DadaGP_all_metadata.json");

function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function distribution(map) {
  return Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function duplicateStats(records, keyFor) {
  const groups = new Map();
  for (const record of records) increment(groups, keyFor(record));
  const duplicated = [...groups.values()].filter((size) => size > 1);
  return {
    groups: duplicated.length,
    files: duplicated.reduce((sum, size) => sum + size, 0),
    maxGroupSize: duplicated.length ? Math.max(...duplicated) : 0,
  };
}

function splitStats(assignments) {
  const validation = assignments.filter((split) => split === "validation").length;
  return {
    training: assignments.length - validation,
    validation,
    validationRatio: Number((validation / assignments.length).toFixed(6)),
  };
}

async function exists(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
const entries = Object.entries(metadata).sort(([a], [b]) => a.localeCompare(b));
const records = [];
const exclusions = [];
const originalSplit = new Map();
const downtune = new Map();
const extension = new Map();
let totalTokens = 0;
let negativeFretNotes = 0;
let string7Notes = 0;
let maxFret = Number.NEGATIVE_INFINITY;

for (let index = 0; index < entries.length; index += 1) {
  const [relativePath, item] = entries[index];
  const absolutePath = path.join(datasetRoot, ...relativePath.split("/"));
  if (!(await exists(absolutePath))) {
    exclusions.push({ relativePath, reason: "metadata-path-not-found" });
    continue;
  }

  const raw = await readFile(absolutePath, "utf8");
  const normalized = normalizeTokenText(raw);
  const body = musicBody(normalized);
  const lines = normalized.trimEnd().split("\n");
  const identity = identityFromRelativePath(relativePath);
  const bodyHash = sha256(body);
  const downtuneToken = lines.find((line) => line.startsWith("downtune:")) ?? "downtune:missing";
  const format = relativePath.match(/\.(gp[345])\.tokens\.txt$/i)?.[1].toLowerCase() ?? "unknown";
  let guitarNoteTokens = 0;

  for (const line of lines) {
    const match = line.match(/^(?:clean\d+|distorted\d+):note:s(\d+):f(-?\d+)$/);
    if (!match) continue;
    guitarNoteTokens += 1;
    const string = Number(match[1]);
    const fret = Number(match[2]);
    if (string === 7) string7Notes += 1;
    if (fret < 0) negativeFretNotes += 1;
    if (fret > maxFret) maxFret = fret;
  }

  totalTokens += lines.length;
  increment(originalSplit, item.validation_set ? "validation" : "training");
  increment(downtune, downtuneToken);
  increment(extension, format);
  records.push({
    relativePath,
    status: "resolved",
    byteLength: Buffer.byteLength(raw),
    tokenCount: lines.length,
    guitarNoteTokens,
    fileHash: createHash("sha256").update(raw).digest("hex"),
    bodyHash,
    identity: `${identity.artist}|${identity.title}`,
    artistToken: item.artist_token,
    genreTokens: item.genre_tokens,
    originalSplit: item.validation_set ? "validation" : "training",
    downtuneToken,
    format,
  });

  if ((index + 1) % 2000 === 0) process.stderr.write(`scanned ${index + 1}/${entries.length}\n`);
}

const songSplit = assignGroupedSplit(records, [
  (record) => record.bodyHash,
  (record) => record.identity,
]);
const artistSplit = assignGroupedSplit(records, [
  (record) => record.bodyHash,
  (record) => record.identity,
  (record) => record.artistToken === "artist:unknown_artist" ? null : record.artistToken,
]);

records.forEach((record, index) => {
  record.songSplit = songSplit.assignments[index];
  record.songGroupId = songSplit.groupIds[index];
  record.artistSplit = artistSplit.assignments[index];
  record.artistGroupId = artistSplit.groupIds[index];
});

const manifestLines = [
  ...records.map((record) => JSON.stringify(record)),
  ...exclusions.map((exclusion) => JSON.stringify({ ...exclusion, status: "excluded" })),
].join("\n") + "\n";
const manifestHash = sha256(manifestLines);
const exactDuplicates = duplicateStats(records, (record) => record.bodyHash);
const identityCandidates = duplicateStats(records, (record) => record.identity);

const summary = {
  schemaVersion: 1,
  policyVersion: POLICY_VERSION,
  generatedAt: new Date().toISOString(),
  input: {
    metadataEntries: entries.length,
    resolved: records.length,
    excluded: exclusions.length,
    resolutionRate: Number((records.length / entries.length).toFixed(6)),
    exclusionReasons: distribution(exclusions.reduce((map, item) => (increment(map, item.reason), map), new Map())),
  },
  inventory: {
    tokenFiles: records.length,
    totalTokens,
    format: distribution(extension),
    originalSplit: distribution(originalSplit),
    downtune: distribution(downtune),
    guitarNoteTokens: records.reduce((sum, record) => sum + record.guitarNoteTokens, 0),
    negativeFretNotes,
    string7Notes,
    maxFret: Number.isFinite(maxFret) ? maxFret : null,
  },
  duplicates: {
    exactMusicBody: exactDuplicates,
    normalizedArtistTitleCandidates: identityCandidates,
  },
  splits: {
    songGrouped: {
      groupCount: songSplit.groupCount,
      ...splitStats(songSplit.assignments),
      exactBodyLeakageGroups: countCrossSplitLeakage(records, songSplit.assignments, (record) => record.bodyHash),
      identityLeakageGroups: countCrossSplitLeakage(records, songSplit.assignments, (record) => record.identity),
    },
    artistGrouped: {
      groupCount: artistSplit.groupCount,
      ...splitStats(artistSplit.assignments),
      exactBodyLeakageGroups: countCrossSplitLeakage(records, artistSplit.assignments, (record) => record.bodyHash),
      identityLeakageGroups: countCrossSplitLeakage(records, artistSplit.assignments, (record) => record.identity),
      knownArtistLeakageGroups: countCrossSplitLeakage(
        records,
        artistSplit.assignments,
        (record) => record.artistToken === "artist:unknown_artist" ? null : record.artistToken,
      ),
    },
  },
  reproducibility: {
    manifestSha256: manifestHash,
    metadataSha256: sha256(await readFile(metadataPath)),
  },
  evidenceTiers: {
    reference: "Independent explicit fingering fixtures, currently chords-db; never learned from DadaGP.",
    corpus: "Deduplicated direct DadaGP observations whose strength depends on song, artist, and transposition support.",
    exploratory: "Single occurrences, ambiguous chords, non-product cohorts, or inferred key/scale/context; never a hard-rule gate.",
  },
};

summary.reproducibility.benchmarkPayloadSha256 = sha256(JSON.stringify({
  ...summary,
  generatedAt: undefined,
  reproducibility: {
    manifestSha256: summary.reproducibility.manifestSha256,
    metadataSha256: summary.reproducibility.metadataSha256,
  },
}));

await mkdir(privateOutput, { recursive: true });
await writeFile(path.join(privateOutput, "phase0-manifest.jsonl"), manifestLines, "utf8");
await writeFile(path.join(privateOutput, "phase0-exclusions.json"), JSON.stringify(exclusions, null, 2) + "\n", "utf8");
await writeFile(aggregateOutput, JSON.stringify(summary, null, 2) + "\n", "utf8");
console.log(JSON.stringify(summary, null, 2));
