import { createRequire } from 'node:module';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { CHORD_REGISTRY_LIST } from '../../src/domain/chord/registry';
import { searchDeductiveVoicings } from '../../src/domain/chord/voicingSearch';
import { STANDARD_GUITAR_STRING_MIDI_PITCHES } from '../../src/domain/shared/tuning';
import {
    addObservation,
    deterministicReferencePartition,
    evaluateShape,
    isTopologyReason,
    parseGuitarOnsets,
    physicalShapeSignature,
    qualifiesStrong,
    qualifiesVeryStrong,
    referenceFretsToEngineOrder,
    relativeShapeSignature,
    sha256,
    type ShapeEvidence,
} from './phase1-lib';

const require = createRequire(import.meta.url);
const guitarChordsDb = require('@tombatossals/chords-db/lib/guitar.json') as {
    chords: Record<string, Array<{
        suffix: string;
        positions: Array<{ frets: number[]; fingers?: number[]; barres?: number[]; baseFret?: number }>;
    }>>;
};

const workspace = process.cwd();
const cliArgs = process.argv.slice(2);
const enforceGates = cliArgs.includes('--enforce');
const positionalArgs = cliArgs.filter((argument) => !argument.startsWith('--'));
const datasetRoot = path.resolve(positionalArgs[0] ?? path.join(workspace, 'DadaGP-v1.1', 'DadaGP-v1.1'));
const privateOutput = path.resolve(positionalArgs[1] ?? path.join(workspace, '.dadagp'));
const aggregateOutput = path.resolve(positionalArgs[2] ?? path.join(workspace, 'DADAGP_PHASE1_SUMMARY.json'));
const phase0ManifestPath = path.join(privateOutput, 'phase0-manifest.jsonl');
const baselinePath = path.join(privateOutput, 'phase1-baseline.json');

const REFERENCE_SUFFIX_BY_CHORD_ID: Record<string, string> = {
    major: 'major',
    minor: 'minor',
    augmented: 'aug',
    diminished: 'dim',
    'major-7': 'maj7',
    'major-6': '6',
    'minor-7': 'm7',
    'dominant-7': '7',
    'half-diminished-7': 'm7b5',
    'diminished-7': 'dim7',
    'major-9': 'maj9',
    'minor-9': 'm9',
    'dominant-9': '9',
    'dominant-11': '11',
    'dominant-13': '13',
    'hendrix-7-sharp-9': '7#9',
    'dominant-7-flat-9': '7b9',
    sus4: 'sus4',
    sus2: 'sus2',
};

const referenceSuffixes = new Set(Object.values(REFERENCE_SUFFIX_BY_CHORD_ID));

interface Phase0Record {
    status: 'resolved';
    relativePath: string;
    songGroupId: string;
    artistGroupId: string;
    artistToken: string;
    songSplit: 'training' | 'validation';
    artistSplit: 'training' | 'validation';
    downtuneToken: string;
}

interface FamilyEvidence {
    signature: string;
    shapes: ShapeEvidence[];
    songs: Set<string>;
    knownArtists: Set<string>;
    roots: Set<number>;
    referenceCorroborated: boolean;
}

function ratio(numerator: number, denominator: number): number {
    return denominator === 0 ? 0 : Number((numerator / denominator).toFixed(6));
}

function pitchSetSignature(pitches: number[]): string {
    return [...new Set(pitches.map((pitch) => ((pitch % 12) + 12) % 12))].sort((a, b) => a - b).join(',');
}

function voicingSignature(notes: Array<{ string: number; fret: number; isMuted?: boolean }>): string {
    const frets: Array<number | null> = Array.from({ length: 6 }, () => null);
    for (const note of notes) if (!note.isMuted) frets[note.string] = note.fret;
    return physicalShapeSignature(frets);
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        return (await stat(filePath)).isFile();
    } catch {
        return false;
    }
}

function buildExactChordLookup() {
    const lookup = new Map<string, Array<{ chordId: string; rootPitchClass: number }>>();
    for (const entry of CHORD_REGISTRY_LIST) {
        for (let rootPitchClass = 0; rootPitchClass < 12; rootPitchClass += 1) {
            const signature = pitchSetSignature(entry.formula.intervals.map((interval) => rootPitchClass + interval));
            const candidates = lookup.get(signature) ?? [];
            candidates.push({ chordId: entry.id, rootPitchClass });
            lookup.set(signature, candidates);
        }
    }
    return lookup;
}

function buildReferenceEvidence() {
    const uniqueShapes = new Map<string, {
        signature: string;
        familySignature: string;
        playable: boolean;
        reason?: string;
        chordIds: Set<string>;
        partition: 'development' | 'holdout';
    }>();
    const positionsByChord = new Map<string, { total: number; rejected: number }>();
    let labeledPositions = 0;
    let annotatedPositions = 0;

    for (const groups of Object.values(guitarChordsDb.chords)) {
        for (const group of groups) {
            if (!referenceSuffixes.has(group.suffix)) continue;
            const chordId = Object.entries(REFERENCE_SUFFIX_BY_CHORD_ID).find(([, suffix]) => suffix === group.suffix)?.[0];
            if (!chordId) continue;
            for (const position of group.positions) {
                labeledPositions += 1;
                if (position.fingers?.length === 6) annotatedPositions += 1;
                const frets = referenceFretsToEngineOrder(position.frets, position.baseFret ?? 1);
                const signature = physicalShapeSignature(frets);
                const familySignature = relativeShapeSignature(frets);
                const playability = evaluateShape(frets);
                const family = positionsByChord.get(chordId) ?? { total: 0, rejected: 0 };
                family.total += 1;
                if (!playability.playable) family.rejected += 1;
                positionsByChord.set(chordId, family);

                const existing = uniqueShapes.get(signature);
                if (existing) existing.chordIds.add(chordId);
                else uniqueShapes.set(signature, {
                    signature,
                    familySignature,
                    playable: playability.playable,
                    reason: playability.reason,
                    chordIds: new Set([chordId]),
                    partition: deterministicReferencePartition(familySignature),
                });
            }
        }
    }

    const shapes = [...uniqueShapes.values()];
    const rejected = shapes.filter((shape) => !shape.playable);
    const holdout = shapes.filter((shape) => shape.partition === 'holdout');
    const reasonCounts: Record<string, number> = {};
    for (const shape of rejected) reasonCounts[shape.reason ?? 'unknown'] = (reasonCounts[shape.reason ?? 'unknown'] ?? 0) + 1;
    return {
        relativeSignatures: new Set(shapes.map((shape) => shape.familySignature)),
        passingSignatures: shapes.filter((shape) => shape.playable).map((shape) => shape.signature),
        rejectedSignatures: shapes.filter((shape) => !shape.playable).map((shape) => shape.signature),
        summary: {
            representedChordFamilies: Object.keys(REFERENCE_SUFFIX_BY_CHORD_ID).length,
            missingChordFamilies: CHORD_REGISTRY_LIST.map((entry) => entry.id).filter((id) => !REFERENCE_SUFFIX_BY_CHORD_ID[id]),
            labeledPositions,
            annotatedPositions,
            uniqueAbsoluteShapes: shapes.length,
            rejectedUniqueShapes: rejected.length,
            falseRejectRate: ratio(rejected.length, shapes.length),
            holdoutShapes: holdout.length,
            holdoutRejected: holdout.filter((shape) => !shape.playable).length,
            holdoutFalseRejectRate: ratio(holdout.filter((shape) => !shape.playable).length, holdout.length),
            rejectionReasons: reasonCounts,
            positionsByChord: Object.fromEntries([...positionsByChord.entries()].sort(([a], [b]) => a.localeCompare(b))),
        },
    };
}

function buildFamilies(evidenceByShape: Map<string, ShapeEvidence>, referenceFamilies: Set<string>): FamilyEvidence[] {
    const families = new Map<string, FamilyEvidence>();
    for (const shape of evidenceByShape.values()) {
        let family = families.get(shape.familySignature);
        if (!family) {
            family = {
                signature: shape.familySignature,
                shapes: [],
                songs: new Set(),
                knownArtists: new Set(),
                roots: new Set(),
                referenceCorroborated: referenceFamilies.has(shape.familySignature),
            };
            families.set(shape.familySignature, family);
        }
        family.shapes.push(shape);
        for (const song of shape.songs) family.songs.add(song);
        for (const artist of shape.knownArtists) family.knownArtists.add(artist);
        for (const root of shape.roots) family.roots.add(root);
    }
    return [...families.values()];
}

function countObservationRate(
    shapes: ShapeEvidence[],
    include: (shape: ShapeEvidence) => boolean,
    split: 'all' | 'song-validation' | 'artist-validation',
) {
    let total = 0;
    let rejected = 0;
    for (const shape of shapes) {
        if (!include(shape)) continue;
        const songs = split === 'all' ? shape.songs
            : split === 'song-validation' ? shape.songValidationSongs
                : shape.artistValidationSongs;
        total += songs.size;
        if (!shape.playability.playable) rejected += songs.size;
    }
    return { total, rejected, rate: ratio(rejected, total) };
}

function transpositionViolations(families: FamilyEvidence[]) {
    let topology = 0;
    let spanMonotonicity = 0;
    for (const family of families.filter((item) => item.signature.startsWith('closed:') && item.shapes.length > 1)) {
        const hasTopologyReject = family.shapes.some((shape) => isTopologyReason(shape.playability.reason));
        const hasNonTopologyResult = family.shapes.some((shape) => !isTopologyReason(shape.playability.reason));
        if (hasTopologyReject && hasNonTopologyResult) topology += 1;

        const ordered = family.shapes
            .map((shape) => ({
                shape,
                minFret: Math.min(...shape.frets.filter((fret): fret is number => fret !== null && fret > 0)),
            }))
            .sort((a, b) => a.minFret - b.minFret);
        let lowerPassed = false;
        for (const item of ordered) {
            if (item.shape.playability.playable) lowerPassed = true;
            else if (lowerPassed && item.shape.playability.reason === 'exceeds-hand-span') spanMonotonicity += 1;
        }
    }
    return { topologyFamilyViolations: topology, handSpanMonotonicityViolations: spanMonotonicity };
}

function generatorRecall(evidenceByShape: Map<string, ShapeEvidence>) {
    const generated = new Map<string, Set<string>>();
    const styles = ['close', 'drop-2', 'drop-3', 'shell'] as const;
    for (const entry of CHORD_REGISTRY_LIST) {
        for (let root = 0; root < 12; root += 1) {
            const signatures = new Set<string>();
            for (const position of styles) {
                for (const voicing of searchDeductiveVoicings(entry, root, { position }, { maxFret: 15 })) {
                    signatures.add(voicingSignature(voicing.notes));
                }
            }
            generated.set(`${entry.id}:${root}`, signatures);
        }
    }

    let total = 0;
    let reproduced = 0;
    for (const shape of evidenceByShape.values()) {
        for (const observation of shape.observations.values()) {
            total += 1;
            if (generated.get(`${observation.chordId}:${observation.rootPitchClass}`)?.has(shape.signature)) reproduced += 1;
        }
    }
    return { songMacroTotal: total, songMacroReproduced: reproduced, recall: ratio(reproduced, total) };
}

async function main() {
const phase0Lines = (await readFile(phase0ManifestPath, 'utf8')).trimEnd().split('\n');
const phase0Records = phase0Lines.map((line) => JSON.parse(line)).filter((record): record is Phase0Record => record.status === 'resolved');
if (phase0Records.some((record) => !record.songGroupId || !record.artistGroupId)) {
    throw new Error('Phase 0 manifest predates group IDs. Run npm run benchmark:dadagp first.');
}

const exactChordLookup = buildExactChordLookup();
const reference = buildReferenceEvidence();
const evidenceByShape = new Map<string, ShapeEvidence>();
let parsedOnsets = 0;
let primaryOnsets = 0;
let ambiguousOnsets = 0;
let exploratoryOnsets = 0;

for (let index = 0; index < phase0Records.length; index += 1) {
    const record = phase0Records[index];
    if (record.downtuneToken !== 'downtune:0') continue;
    const text = await readFile(path.join(datasetRoot, ...record.relativePath.split('/')), 'utf8');
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    for (const onset of parseGuitarOnsets(lines)) {
        parsedOnsets += 1;
        const playedFrets = onset.frets.filter((fret): fret is number => fret !== null);
        if (onset.hasDuplicateString || onset.attackCount < 3 || onset.attackCount > 6
            || playedFrets.length !== onset.attackCount || playedFrets.some((fret) => fret < 0 || fret > 15)) {
            exploratoryOnsets += 1;
            continue;
        }
        const pitches = onset.frets.flatMap((fret, string) =>
            fret === null ? [] : [STANDARD_GUITAR_STRING_MIDI_PITCHES[string] + fret]
        );
        const candidates = exactChordLookup.get(pitchSetSignature(pitches)) ?? [];
        if (candidates.length !== 1) {
            ambiguousOnsets += 1;
            continue;
        }
        primaryOnsets += 1;
        addObservation(evidenceByShape, {
            frets: onset.frets,
            chordId: candidates[0].chordId,
            rootPitchClass: candidates[0].rootPitchClass,
            songGroupId: record.songGroupId,
            artistToken: record.artistToken,
            songSplit: record.songSplit,
            artistSplit: record.artistSplit,
        });
    }
    if ((index + 1) % 2000 === 0) process.stderr.write(`phase1 scanned ${index + 1}/${phase0Records.length}\n`);
}

const families = buildFamilies(evidenceByShape, reference.relativeSignatures);
const strongFamilies = families.filter((family) => qualifiesStrong(family.songs.size));
const veryStrongFamilies = strongFamilies.filter((family) =>
    qualifiesVeryStrong(family.songs.size, family.knownArtists.size, family.roots.size)
);
const corroboratedStrong = strongFamilies.filter((family) => family.referenceCorroborated);
const strongSignatures = new Set(strongFamilies.map((family) => family.signature));
const strongShapes = [...evidenceByShape.values()].filter((shape) => strongSignatures.has(shape.familySignature));
const strongTopologyRejected = strongFamilies.filter((family) =>
    family.shapes.some((shape) => isTopologyReason(shape.playability.reason))
);
const veryStrongTopologyRejected = veryStrongFamilies.filter((family) =>
    family.shapes.some((shape) => isTopologyReason(shape.playability.reason))
);
const corroboratedRejected = corroboratedStrong.filter((family) =>
    family.shapes.some((shape) => !shape.playability.playable)
);
const veryStrongAbsoluteRejected = [...evidenceByShape.values()].filter((shape) =>
    shape.songs.size >= 10 && shape.knownArtists.size >= 3 && !shape.playability.playable
);
const allShapes = [...evidenceByShape.values()];
const corpusMetrics = {
    parsedOnsets,
    primaryOnsets,
    ambiguousOnsets,
    exploratoryOnsets,
    uniqueAbsoluteShapes: evidenceByShape.size,
    relativeFamilies: families.length,
    strongFamilies: strongFamilies.length,
    veryStrongFamilies: veryStrongFamilies.length,
    referenceCorroboratedStrongFamilies: corroboratedStrong.length,
    strongTopologyRejectedFamilies: strongTopologyRejected.length,
    strongTopologyFalseRejectRate: ratio(strongTopologyRejected.length, strongFamilies.length),
    veryStrongTopologyRejectedFamilies: veryStrongTopologyRejected.length,
    referenceCorroboratedRejectedFamilies: corroboratedRejected.length,
    veryStrongAbsoluteRejectedShapes: veryStrongAbsoluteRejected.length,
    strongSongMacro: countObservationRate(strongShapes, () => true, 'all'),
    strongSongHoldout: countObservationRate(strongShapes, () => true, 'song-validation'),
    strongArtistHoldout: countObservationRate(strongShapes, () => true, 'artist-validation'),
    eligibleSongMacro: countObservationRate(allShapes, () => true, 'all'),
    eligibleSongHoldout: countObservationRate(allShapes, () => true, 'song-validation'),
    eligibleArtistHoldout: countObservationRate(allShapes, () => true, 'artist-validation'),
    ...transpositionViolations(strongFamilies),
};
const currentGeneratorRecall = generatorRecall(evidenceByShape);

const currentSnapshot = {
    referencePassingSignatures: reference.passingSignatures,
    referenceFalseRejectRate: reference.summary.falseRejectRate,
    corpusStrongSongMacroRate: corpusMetrics.strongSongMacro.rate,
    generatorRecall: currentGeneratorRecall.recall,
};
let frozenBaseline = currentSnapshot;
let baselineCreated = false;
if (await fileExists(baselinePath)) frozenBaseline = JSON.parse(await readFile(baselinePath, 'utf8'));
else {
    await mkdir(privateOutput, { recursive: true });
    await writeFile(baselinePath, JSON.stringify(currentSnapshot, null, 2) + '\n', 'utf8');
    baselineCreated = true;
}

const currentlyRejectedReference = new Set(reference.rejectedSignatures);
const newlyRejectedReference = frozenBaseline.referencePassingSignatures.filter((signature: string) => currentlyRejectedReference.has(signature)).length;
const relativeCorpusImprovement = frozenBaseline.corpusStrongSongMacroRate === 0
    ? 0
    : (frozenBaseline.corpusStrongSongMacroRate - corpusMetrics.strongSongMacro.rate) / frozenBaseline.corpusStrongSongMacroRate;
const generatorRecallDelta = currentGeneratorRecall.recall - frozenBaseline.generatorRecall;

const gates = {
    referenceOverall: reference.summary.falseRejectRate <= 0.02,
    referenceHoldout: reference.summary.holdoutFalseRejectRate <= 0.02,
    noNewReferenceRejects: newlyRejectedReference === 0,
    veryStrongTopology: corpusMetrics.veryStrongTopologyRejectedFamilies === 0,
    corroboratedStrong: corpusMetrics.referenceCorroboratedRejectedFamilies === 0,
    strongTopologyRate: corpusMetrics.strongTopologyFalseRejectRate <= 0.01,
    strongSongMacro: corpusMetrics.strongSongMacro.rate <= 0.01,
    strongSongHoldout: corpusMetrics.strongSongHoldout.rate <= 0.01,
    strongArtistHoldout: corpusMetrics.strongArtistHoldout.rate <= 0.01,
    eligibleSongMacro: corpusMetrics.eligibleSongMacro.rate <= 0.02,
    eligibleSongHoldout: corpusMetrics.eligibleSongHoldout.rate <= 0.02,
    eligibleArtistHoldout: corpusMetrics.eligibleArtistHoldout.rate <= 0.02,
    veryStrongAbsolute: corpusMetrics.veryStrongAbsoluteRejectedShapes === 0,
    corpusRelativeImprovement: baselineCreated || relativeCorpusImprovement >= 0.5,
    transpositionTopology: corpusMetrics.topologyFamilyViolations === 0,
    handSpanMonotonicity: corpusMetrics.handSpanMonotonicityViolations === 0,
    generatorNonInferiority: generatorRecallDelta >= -0.0025,
};
const failedGates = Object.entries(gates).filter(([, passed]) => !passed).map(([gate]) => gate);
const decision = failedGates.length === 0 ? 'GO'
    : corpusMetrics.veryStrongTopologyRejectedFamilies > 0
        || corpusMetrics.referenceCorroboratedRejectedFamilies > 0
        || corpusMetrics.topologyFamilyViolations > 0
        || corpusMetrics.handSpanMonotonicityViolations > 0
        ? 'NO-GO'
        : 'CONDITIONAL GO';

const sampleCandidates = ['too-many-fingers', 'barre-behind-unreachable-position', 'exceeds-hand-span'].flatMap((reason) => {
    const candidates = allShapes
        .filter((shape) => shape.playability.reason === reason && qualifiesStrong(
            families.find((family) => family.signature === shape.familySignature)?.songs.size ?? 0
        ))
        .sort((a, b) => b.songs.size - a.songs.size || a.signature.localeCompare(b.signature));
    const top = candidates.slice(0, 25);
    const remainder = candidates.slice(25).sort((a, b) => sha256(a.signature).localeCompare(sha256(b.signature))).slice(0, 25);
    return [...top, ...remainder].map((shape) => ({
        reason,
        signature: shape.signature,
        familySignature: shape.familySignature,
        songs: shape.songs.size,
        artists: shape.knownArtists.size,
        roots: [...shape.roots].sort((a, b) => a - b),
        referenceCorroborated: reference.relativeSignatures.has(shape.familySignature),
    }));
});

const summary = {
    schemaVersion: 1,
    policyVersion: 'phase1-evidence-v1',
    generatedAt: new Date().toISOString(),
    phase0ManifestSha256: sha256(await readFile(phase0ManifestPath, 'utf8')),
    thresholds: {
        referenceFalseRejectRate: 0.02,
        strongTopologyFamilyFalseRejectRate: 0.01,
        strongSongMacroFalseRejectRate: 0.01,
        eligibleSongMacroFalseRejectRate: 0.02,
        minimumRelativeImprovement: 0.5,
        generatorRecallNonInferiorityMargin: -0.0025,
    },
    reference: reference.summary,
    corpus: corpusMetrics,
    generator: { ...currentGeneratorRecall, deltaFromFrozenBaseline: generatorRecallDelta },
    baseline: {
        createdThisRun: baselineCreated,
        referenceFalseRejectRate: frozenBaseline.referenceFalseRejectRate,
        corpusStrongSongMacroRate: frozenBaseline.corpusStrongSongMacroRate,
        generatorRecall: frozenBaseline.generatorRecall,
        corpusRelativeImprovement: relativeCorpusImprovement,
        newlyRejectedReference,
    },
    gates,
    failedGates,
    decision,
};
const stablePayload = { ...summary, generatedAt: undefined };
const output = { ...summary, reproducibility: { payloadSha256: sha256(JSON.stringify(stablePayload)) } };
await mkdir(privateOutput, { recursive: true });
await writeFile(path.join(privateOutput, 'phase1-evidence-sample.json'), JSON.stringify(sampleCandidates, null, 2) + '\n', 'utf8');
await writeFile(aggregateOutput, JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(output, null, 2));
if (enforceGates && decision !== 'GO') process.exitCode = 1;
}

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
