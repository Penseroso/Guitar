import { getSpelledScaleDegrees, SCALES, type SpelledScaleDegree } from '@/domain/scale';
import { formatTriadRomanNumeral } from '@/domain/shared/spelling';
import { identifyChordsForPitchClasses } from './chordRecognition';
import { getChordTypeSuffix } from './helpers';
import { getChordRegistryEntry, type ChordRegistryEntry } from './registry';
import type { PitchClass } from './types';

/**
 * "Chords built from this scale": conventional tertian harmonization — stack the scale's own
 * notes in thirds (every other scale degree) on each degree, then name the result through the
 * shared chord registry. No per-key or per-scale tables.
 *
 * Scope is deliberately limited to scales with exactly seven distinct pitch classes. "Skip one
 * scale step" only means "stack a third" for a heptatonic collection; on a 5-, 6- or 8-note
 * collection the same index arithmetic yields something, but not what is meant by harmonizing a
 * scale, so those report `defined: false` instead of a fabricated chord list.
 */
export const HARMONIZABLE_PITCH_CLASS_COUNT = 7;

export interface HarmonizedChord {
    degreeIndex: number;
    rootPitchClass: PitchClass;
    /** Root spelled as the scale spells that degree, e.g. "D#" for Lydian #2's ♯ii. */
    rootNoteName: string;
    chordId: string;
    /** Registry suffix, e.g. "m7", "maj7", "dim" ("" for a plain major triad). */
    chordSuffix: string;
    /** Tonic-relative roman numeral, cased and marked by chord quality, e.g. "♭vii", "iiø7". */
    romanNumeral: string;
}

export type ScaleHarmonization =
    | { defined: false; pitchClassCount: number }
    | { defined: true; triads: (HarmonizedChord | null)[]; sevenths: (HarmonizedChord | null)[] };

function normalizePitchClass(value: number): PitchClass {
    return ((value % 12) + 12) % 12;
}

function hasSeventhDegree(degrees: readonly string[]): boolean {
    if (degrees.includes('7') || degrees.includes('b7')) return true;
    // The diminished seventh is spelled with degree '6' (an enharmonic bb7) in the registry.
    return degrees.includes('6') && degrees.includes('b3') && degrees.includes('b5');
}

function acceptsStack(entry: ChordRegistryEntry, size: 3 | 4): boolean {
    const { degrees } = entry.formula;
    if (!degrees.includes('3') && !degrees.includes('b3')) return false;
    return size === 3 ? entry.family === 'triad' : entry.family === 'seventh' && hasSeventhDegree(degrees);
}

/**
 * Cases and marks the scale degree's own numeral by chord quality: lowercase for a minor third,
 * ° / ø for diminished, + for augmented. The numeral and its accidental come from the scale's
 * formula (so Lydian #2's raised second is ♯II, never ♭III) and are never re-derived here.
 */
function buildRomanNumeral(base: string, entry: ChordRegistryEntry, size: 3 | 4): string {
    const { degrees } = entry.formula;
    if (size === 3) {
        const quality = degrees.includes('b3') && degrees.includes('b5')
            ? 'Diminished'
            : degrees.includes('#5')
                ? 'Augmented'
                : degrees.includes('b3')
                    ? 'Minor'
                    : 'Major';
        return formatTriadRomanNumeral(base, quality);
    }

    const match = /^([♭♯]*)(.*)$/.exec(base)!;
    const [, accidentals, numeral] = match;
    let cased = degrees.includes('b3') ? numeral.toLowerCase() : numeral;
    if (degrees.includes('b3') && degrees.includes('b5')) {
        cased += degrees.includes('b7') ? 'ø' : '°';
    } else if (degrees.includes('#5')) {
        cased += '+';
    }
    const seventh = degrees.includes('7') ? 'M7' : '7';
    return `${accidentals}${cased}${seventh}`;
}

function harmonizeDegree(
    degrees: SpelledScaleDegree[],
    degreeIndex: number,
    size: 3 | 4
): HarmonizedChord | null {
    const count = degrees.length;
    const offsets = size === 3 ? [0, 2, 4] : [0, 2, 4, 6];
    const stack = offsets.map((step) => degrees[(degreeIndex + step) % count].pitchClass);
    const rootDegree = degrees[degreeIndex];
    const rootPitchClass = rootDegree.pitchClass;

    const candidate = identifyChordsForPitchClasses(stack).find((item) => {
        // Exact, root-anchored match only. Symmetric sets (augmented, diminished) have several
        // valid roots for one pitch-class set, so the root must be the degree we stacked on.
        if (item.definition.rootPitchClass !== rootPitchClass) return false;
        if (item.missingPitchClasses.length > 0 || item.extraPitchClasses.length > 0) return false;
        const entry = getChordRegistryEntry(item.definition.id);
        return !!entry && acceptsStack(entry, size);
    });
    const entry = candidate ? getChordRegistryEntry(candidate.definition.id) : undefined;
    if (!candidate || !entry) return null;

    return {
        degreeIndex,
        rootPitchClass,
        rootNoteName: rootDegree.noteName,
        chordId: entry.id,
        chordSuffix: getChordTypeSuffix(entry),
        romanNumeral: buildRomanNumeral(rootDegree.romanNumeral, entry, size),
    };
}

const cache = new Map<string, ScaleHarmonization>();

export function getScaleHarmonization(
    scaleGroup: string,
    scaleName: string,
    tonicPitchClass: PitchClass
): ScaleHarmonization {
    const key = `${scaleGroup}|${scaleName}|${tonicPitchClass}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const intervals = SCALES[scaleGroup]?.[scaleName] ?? [];
    const pitchClassCount = new Set(intervals.map(normalizePitchClass)).size;
    const degrees = pitchClassCount === HARMONIZABLE_PITCH_CLASS_COUNT
        ? getSpelledScaleDegrees(scaleGroup, scaleName, tonicPitchClass)
        : null;

    let result: ScaleHarmonization;
    if (!degrees || degrees.length !== HARMONIZABLE_PITCH_CLASS_COUNT) {
        result = { defined: false, pitchClassCount };
    } else {
        const build = (size: 3 | 4) => degrees.map((_, degreeIndex) => harmonizeDegree(degrees, degreeIndex, size));
        result = { defined: true, triads: build(3), sevenths: build(4) };
    }
    cache.set(key, result);
    return result;
}
