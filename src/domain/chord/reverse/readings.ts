import { CHORD_REGISTRY_LIST } from '../registry';
import { identifyChordsForPitchClasses } from '../chordRecognition';
import type { ChordInterpretationCandidate, ChordTone, PitchClass } from '../types';
import type { EnteredShape, EnteredShapeNote } from './enteredShape';

// Reverse chord naming builds on the existing forward-agnostic recognizer
// (identifyChordsForPitchClasses, itself driven purely by CHORD_REGISTRY_LIST + shared semantics)
// for harmonic admissibility — which (root, registry entry) pairs are valid readings of the played
// pitch classes at all. This module adds only what's specific to reverse presentation on top: the
// bass/tier/suppression/ranking policy below. A future registry entry becomes reverse-recognizable
// purely by existing there; nothing here branches on a chord id or maintains a second "recognized
// quality" list. L3 / Physical / Recommended-surface data must never be imported here: whether a
// quality can be *named* is independent of whether the forward engine currently has a playable-shape
// catalog for it.

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

/** Standard simple-interval quality, measured as the ascending distance in semitones from the
 *  first note to the second (mod 12); 'octave' is reserved for the same pitch class at a different
 *  MIDI pitch (a true unison — same pitch class *and* same MIDI — reports as 'unison' instead). */
export type IntervalQuality = 'unison' | 'm2' | 'M2' | 'm3' | 'M3' | 'P4' | 'tritone' | 'P5' | 'm6' | 'M6' | 'm7' | 'M7' | 'octave';

export interface DyadInterval {
    bass: { pitchClass: PitchClass; midi: number };
    other: { pitchClass: PitchClass; midi: number };
    /** The quality going up from the bass note to the other note. */
    bassToOther: IntervalQuality;
    /** The quality going up from the other note back to the bass note (the standard inversion). */
    otherToBass: IntervalQuality;
}

export type ReverseInference =
    | { status: 'empty' | 'too-few-notes' | 'no-clear-name'; shape: EnteredShape }
    | { status: 'dyad'; shape: EnteredShape; dyad: DyadInterval }
    | { status: 'named'; shape: EnteredShape; best: readonly ChordReading[]; other: readonly ChordReading[]; looser: readonly ChordReading[] };

function bassInversion(role: ChordReadingRole): ChordReadingInversion {
    if (role === 'third') return 'first';
    if (role === 'fifth') return 'second';
    if (role === 'seventh') return 'third';
    return null;
}

/**
 * Adapts one recognizer candidate (already proven harmonically admissible — every required degree
 * sounds) into a reverse reading, or null if it fails the reverse-specific "at most one extra note"
 * cap. The base recognizer allows any number of extra notes (useful for its own scale-matching
 * caller); reverse tightens that because a shape with many unexplained notes isn't usefully named
 * by any single reading.
 */
function toReading(candidate: ChordInterpretationCandidate, bassPitchClass: PitchClass, playedPitchClasses: readonly PitchClass[]): ChordReading | null {
    if (candidate.extraPitchClasses.length > 1) return null;

    const rootPitchClass = candidate.definition.rootPitchClass;
    const formulaTones = candidate.tones.tones;
    const omitted = formulaTones.filter((tone) => !tone.isRequired && !playedPitchClasses.includes(tone.pitchClass)).map((tone) => tone.degree);
    const tier: ChordReadingTier = candidate.extraPitchClasses.length > 0 ? 'added-tone' : omitted.length > 0 ? 'incomplete' : 'direct';

    const bassTone = formulaTones.find((tone) => tone.pitchClass === bassPitchClass) ?? null;
    const relation: ChordReadingBassRelation =
        bassPitchClass === rootPitchClass ? 'root' : bassTone ? 'chord-tone' : 'outside';

    return {
        key: `${candidate.definition.id}@${rootPitchClass}`,
        chordId: candidate.definition.id,
        rootPitchClass,
        bassPitchClass,
        tier,
        bass: {
            relation,
            degree: bassTone?.degree ?? null,
            inversion: relation === 'chord-tone' ? bassInversion(bassTone!.role as ChordReadingRole) : null,
        },
        tones: formulaTones.map((tone) => ({
            degree: tone.degree,
            role: tone.role as ChordReadingRole,
            pitchClass: tone.pitchClass,
            sounding: playedPitchClasses.includes(tone.pitchClass),
        })),
        omitted,
        added: candidate.extraPitchClasses[0] ?? null,
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

const INTERVAL_QUALITIES: readonly IntervalQuality[] = ['unison', 'm2', 'M2', 'm3', 'M3', 'P4', 'tritone', 'P5', 'm6', 'M6', 'm7', 'M7'];

/** Exactly two sounding notes get a dyad readout instead of chord-name inference — a two-note
 *  input is genuinely a bare interval, not an underdetermined chord, and naming it as one (e.g. a
 *  bare "power chord") would assert more than the notes actually support. Keyed on the number of
 *  sounding notes rather than distinct pitch classes so two different octaves of the same note
 *  (a true unison shape) still gets a dyad readout instead of falling through as too-few-notes. */
function buildDyad(notes: readonly EnteredShapeNote[]): DyadInterval {
    const [bass, other] = notes; // deriveEnteredShape sorts notes ascending by MIDI
    const sameOctaveOrPitch = bass.pitchClass === other.pitchClass;
    const isTrueUnison = sameOctaveOrPitch && bass.midi === other.midi;
    const bassToOther = isTrueUnison ? 'unison' : sameOctaveOrPitch ? 'octave' : INTERVAL_QUALITIES[normalizePitchClass(other.pitchClass - bass.pitchClass)];
    const otherToBass = isTrueUnison ? 'unison' : sameOctaveOrPitch ? 'octave' : INTERVAL_QUALITIES[normalizePitchClass(bass.pitchClass - other.pitchClass)];
    return {
        bass: { pitchClass: bass.pitchClass, midi: bass.midi },
        other: { pitchClass: other.pitchClass, midi: other.midi },
        bassToOther,
        otherToBass,
    };
}

export function inferChordReadings(shape: EnteredShape): ReverseInference {
    if (shape.notes.length === 0) return { status: 'empty', shape };
    if (shape.notes.length === 2) return { status: 'dyad', shape, dyad: buildDyad(shape.notes) };
    if (shape.pitchClasses.length < 2) return { status: 'too-few-notes', shape };

    const bassPitchClass = shape.bass!.pitchClass;
    const playedPitchClasses = shape.pitchClasses;

    const raw = identifyChordsForPitchClasses([...playedPitchClasses])
        .map((candidate) => toReading(candidate, bassPitchClass, playedPitchClasses))
        .filter((reading): reading is ChordReading => reading !== null);
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
