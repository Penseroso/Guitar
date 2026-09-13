import { CHORD_REGISTRY_LIST, type ChordRegistryEntry } from '../registry';
import { deriveChordToneRole, deriveRequiredDegrees } from '../semantics';
import type { ChordTone, PitchClass } from '../types';
import type { EnteredShape } from './enteredShape';

// Reverse chord naming, entirely driven by CHORD_REGISTRY_LIST + shared semantics (deriveRequiredDegrees /
// deriveChordToneRole) — the same theory the forward voicing search already trusts. A future registry
// entry becomes reverse-recognizable purely by existing here; nothing below branches on a chord id or
// maintains a second "recognized quality" list. L3 / Physical / Recommended-surface data must never be
// imported here: whether a quality can be *named* is independent of whether the forward engine currently
// has a playable-shape catalog for it.

function normalizePitchClass(value: number): PitchClass {
    return ((value % 12) + 12) % 12;
}

export type ChordReadingRole = NonNullable<ChordTone['role']>;

export interface ChordReadingTone {
    degree: string;
    role: ChordReadingRole;
    pitchClass: PitchClass;
    sounding: boolean;
}

export type ChordReadingTier = 'direct' | 'incomplete' | 'added-tone';
export type ChordReadingBassRelation = 'root' | 'chord-tone' | 'outside';
export type ChordReadingInversion = 'first' | 'second' | 'third' | null;

export interface ChordReading {
    /** UI/grouping identity only — never displayed. */
    key: string;
    chordId: string;
    rootPitchClass: PitchClass;
    bassPitchClass: PitchClass;
    tier: ChordReadingTier;
    bass: { relation: ChordReadingBassRelation; degree: string | null; inversion: ChordReadingInversion };
    tones: readonly ChordReadingTone[];
    /** Optional formula degrees not sounding (only possible on the 'incomplete' tier). */
    omitted: readonly string[];
    /** The single pitch class outside the formula (only possible on the 'added-tone' tier). */
    added: PitchClass | null;
    /** Keys of other readings whose sounding formula pitch classes are the identical set. */
    sameNotesAs: readonly string[];
}

export type ReverseInference =
    | { status: 'empty' | 'too-few-notes' | 'no-clear-name'; shape: EnteredShape }
    | { status: 'named'; shape: EnteredShape; best: readonly ChordReading[]; other: readonly ChordReading[]; looser: readonly ChordReading[] };

function bassInversion(role: ChordReadingRole): ChordReadingInversion {
    if (role === 'third') return 'first';
    if (role === 'fifth') return 'second';
    if (role === 'seventh') return 'third';
    return null;
}

/**
 * A single (registry entry, root) reading against the played pitch classes, or null if it isn't
 * admissible at all. Admission: every required degree sounds (the recognizer's own rule — the root
 * is always required), and at most one played pitch class falls outside the formula.
 */
function buildReading(
    entry: ChordRegistryEntry,
    rootPitchClass: PitchClass,
    playedPitchClasses: readonly PitchClass[],
    bassPitchClass: PitchClass
): ChordReading | null {
    const requiredDegrees = new Set(deriveRequiredDegrees(entry));
    const formulaTones = entry.formula.degrees.map((degree, index) => ({
        degree,
        role: deriveChordToneRole(entry, degree) as ChordReadingRole,
        pitchClass: normalizePitchClass(rootPitchClass + entry.formula.intervals[index]),
        isRequired: requiredDegrees.has(degree),
    }));

    const missingRequired = formulaTones.some((tone) => tone.isRequired && !playedPitchClasses.includes(tone.pitchClass));
    if (missingRequired) return null;

    const formulaPitchClasses = formulaTones.map((tone) => tone.pitchClass);
    const matched = playedPitchClasses.filter((pc) => formulaPitchClasses.includes(pc));
    if (matched.length === 0) return null;

    const extraPitchClasses = playedPitchClasses.filter((pc) => !formulaPitchClasses.includes(pc));
    if (extraPitchClasses.length > 1) return null;

    const omitted = formulaTones
        .filter((tone) => !tone.isRequired && !playedPitchClasses.includes(tone.pitchClass))
        .map((tone) => tone.degree);
    const tier: ChordReadingTier = extraPitchClasses.length > 0 ? 'added-tone' : omitted.length > 0 ? 'incomplete' : 'direct';

    const bassTone = formulaTones.find((tone) => tone.pitchClass === bassPitchClass) ?? null;
    const relation: ChordReadingBassRelation =
        bassPitchClass === rootPitchClass ? 'root' : bassTone ? 'chord-tone' : 'outside';

    return {
        key: `${entry.id}@${rootPitchClass}`,
        chordId: entry.id,
        rootPitchClass,
        bassPitchClass,
        tier,
        bass: {
            relation,
            degree: bassTone?.degree ?? null,
            inversion: relation === 'chord-tone' ? bassInversion(bassTone!.role) : null,
        },
        tones: formulaTones.map((tone) => ({
            degree: tone.degree,
            role: tone.role,
            pitchClass: tone.pitchClass,
            sounding: playedPitchClasses.includes(tone.pitchClass),
        })),
        omitted,
        added: extraPitchClasses[0] ?? null,
        sameNotesAs: [],
    };
}

const REGISTRY_INDEX = new Map(CHORD_REGISTRY_LIST.map((entry, index) => [entry.id, index]));
const TIER_ORDER: Record<ChordReadingTier, number> = { direct: 0, incomplete: 1, 'added-tone': 2 };
const BASS_RELATION_ORDER: Record<ChordReadingBassRelation, number> = { root: 0, 'chord-tone': 1, outside: 2 };

/**
 * Explainable lexicographic order — every step is a stated musical reason, not a blended numeric
 * score: (1) how much of the chord is explained by formal registry evidence, (2) whether the bass
 * is the root, another chord tone, or outside the formula, (3) fewer omissions, (4) the simpler
 * name when completeness ties, (5) a fully deterministic final tie-break.
 */
function compareReadings(a: ChordReading, b: ChordReading, bassPitchClass: PitchClass): number {
    if (TIER_ORDER[a.tier] !== TIER_ORDER[b.tier]) return TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
    if (BASS_RELATION_ORDER[a.bass.relation] !== BASS_RELATION_ORDER[b.bass.relation]) {
        return BASS_RELATION_ORDER[a.bass.relation] - BASS_RELATION_ORDER[b.bass.relation];
    }
    if (a.omitted.length !== b.omitted.length) return a.omitted.length - b.omitted.length;
    if (a.tones.length !== b.tones.length) return a.tones.length - b.tones.length;
    const registryDelta = REGISTRY_INDEX.get(a.chordId)! - REGISTRY_INDEX.get(b.chordId)!;
    if (registryDelta !== 0) return registryDelta;
    const distanceA = normalizePitchClass(a.rootPitchClass - bassPitchClass);
    const distanceB = normalizePitchClass(b.rootPitchClass - bassPitchClass);
    return distanceA - distanceB;
}

function soundingSetKey(reading: ChordReading): string {
    return Array.from(new Set(reading.tones.filter((tone) => tone.sounding).map((tone) => tone.pitchClass)))
        .sort((a, b) => a - b)
        .join(',');
}

function tiesWithFirst(reading: ChordReading, first: ChordReading): boolean {
    return (
        reading.tier === first.tier &&
        reading.bass.relation === first.bass.relation &&
        reading.omitted.length === first.omitted.length &&
        reading.tones.length === first.tones.length
    );
}

export function inferChordReadings(shape: EnteredShape): ReverseInference {
    if (shape.notes.length === 0) return { status: 'empty', shape };
    if (shape.pitchClasses.length < 2) return { status: 'too-few-notes', shape };

    const bassPitchClass = shape.bass!.pitchClass;
    const playedPitchClasses = shape.pitchClasses;

    const raw: ChordReading[] = [];
    for (let root = 0; root < 12; root++) {
        for (const entry of CHORD_REGISTRY_LIST) {
            const reading = buildReading(entry, root, playedPitchClasses, bassPitchClass);
            if (reading) raw.push(reading);
        }
    }
    if (raw.length === 0) return { status: 'no-clear-name', shape };

    // Same-root suppression: a formal registry reading with fewer added notes always beats a
    // synthetic "plus an added tone" description of the same root (e.g. Cadd9 over "C + added D").
    const fewestExtrasByRoot = new Map<PitchClass, number>();
    for (const reading of raw) {
        const extras = reading.added === null ? 0 : 1;
        const current = fewestExtrasByRoot.get(reading.rootPitchClass);
        if (current === undefined || extras < current) fewestExtrasByRoot.set(reading.rootPitchClass, extras);
    }
    const survivors = raw.filter((reading) => {
        const extras = reading.added === null ? 0 : 1;
        return extras === fewestExtrasByRoot.get(reading.rootPitchClass);
    });

    // Link (never collapse) every reading that explains the identical set of sounding pitch classes.
    const bySoundingSet = new Map<string, ChordReading[]>();
    for (const reading of survivors) {
        const setKey = soundingSetKey(reading);
        const group = bySoundingSet.get(setKey) ?? [];
        group.push(reading);
        bySoundingSet.set(setKey, group);
    }
    const linked = survivors.map((reading) => ({
        ...reading,
        sameNotesAs: bySoundingSet
            .get(soundingSetKey(reading))!
            .filter((other) => other.key !== reading.key)
            .map((other) => other.key),
    }));

    linked.sort((a, b) => compareReadings(a, b, bassPitchClass));
    const first = linked[0];
    const best = linked.filter((reading) => tiesWithFirst(reading, first));
    const rest = linked.filter((reading) => !tiesWithFirst(reading, first));
    const other = rest.filter((reading) => reading.tier !== 'added-tone');
    const looser = rest.filter((reading) => reading.tier === 'added-tone');

    return { status: 'named', shape, best, other, looser };
}
