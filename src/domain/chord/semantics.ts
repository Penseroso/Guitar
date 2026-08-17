import type { ChordRegistryEntry } from './registry';
import type { ChordTone } from './types';

// Theory / semantic rules only: chord formula closure, required degrees, and tone-role meaning.
const FORMULA_CLOSED_CHORD_IDS = new Set<ChordRegistryEntry['id']>([
    'major',
    'minor',
    'power-5',
    'sus2',
    'sus4',
]);

const THIRD_DEGREES = new Set(['b3', '3']);
const FIFTH_DEGREES = new Set(['b5', '5', '#5']);
const SEVENTH_FUNCTION_DEGREES = new Set(['6', 'b7', '7']);
const EXTENSION_DEGREES = new Set(['9', '11', '13', '2', '4']);

function isSuspensionDegree(entry: ChordRegistryEntry, degree: string): boolean {
    return (entry.id === 'sus2' || entry.id === 'sus4') && (degree === '2' || degree === '4');
}

export function deriveChordToneRole(entry: ChordRegistryEntry, degree: string): ChordTone['role'] {
    if (degree === '1') return 'root';

    if (entry.id === 'major-6' && degree === '6') {
        return 'extension';
    }

    if (isSuspensionDegree(entry, degree)) {
        return 'suspension';
    }

    if (THIRD_DEGREES.has(degree)) return 'third';
    if (FIFTH_DEGREES.has(degree)) return 'fifth';
    if (SEVENTH_FUNCTION_DEGREES.has(degree)) return 'seventh';
    if (EXTENSION_DEGREES.has(degree)) {
        return 'extension';
    }

    return 'alteration';
}

// --- Required-degree derivation ---------------------------------------------------------------
// Formerly a hand-authored per-chord-id table (REQUIRED_DEGREES_BY_ID) that lived here and had no
// entry at all for 'augmented'/'diminished' when those triads were added — silently treating
// every one of their tones as optional. Replaced with the same deductive rule the live
// voicing-search/ranking pipeline already used (previously duplicated in degreeRequirements.ts as
// a second, independently-verified-but-separate implementation): derive required-ness purely from
// a chord's formula degrees, so the two could never again silently diverge and any chord added to
// CHORD_REGISTRY automatically gets a sensible required set with no table entry needed.

const THIRD_OR_SUSPENSION_DEGREES = new Set(['3', 'b3', '2', '4']);
const NATURAL_FIFTH = '5';
const ALTERED_FIFTH_DEGREES = new Set(['b5', '#5']);

// Extension/tension degree -> the "stack number" it represents, regardless of alteration.
const EXTENSION_DEGREE_NUMBERS: Record<string, number> = {
    '9': 9, 'b9': 9, '#9': 9,
    '11': 11, '#11': 11, 'b11': 11,
    '13': 13, 'b13': 13, '#13': 13,
};

function getExtensionDegreeNumber(degree: string): number | null {
    return EXTENSION_DEGREE_NUMBERS[degree] ?? null;
}

/**
 * Derives required chord tones purely from a chord's formula degrees — no per-chord-id
 * table, so any chord added to CHORD_REGISTRY automatically gets a sensible required set.
 *
 * Rules:
 * - Root ('1') is always required when present.
 * - The third-family degree (3/b3) or its suspension substitute (2/4) is required.
 * - A seventh-family degree (7/b7, or '6' when it functions as a diminished 7th) is required.
 * - An altered 5th (b5/#5) always defines the chord's identity and is required.
 * - A natural 5th is required only when nothing else anchors the chord's quality (i.e. no
 *   third/suspension/seventh degree is present at all — power chords are the only case).
 * - Among extension/tension degrees (9/11/13 and their alterations), only the highest one
 *   present is required — the chord's name is defined by its topmost tension; any lower
 *   ones present alongside it were only reached "on the way" and are optional color tones.
 */
export function deriveRequiredDegrees(entry: ChordRegistryEntry): string[] {
    const degrees = entry.formula.degrees;
    const required = new Set<string>();

    if (degrees.includes('1')) {
        required.add('1');
    }

    for (const degree of degrees) {
        if (THIRD_OR_SUSPENSION_DEGREES.has(degree) || SEVENTH_FUNCTION_DEGREES.has(degree)) {
            required.add(degree);
        }
    }

    for (const degree of degrees) {
        if (ALTERED_FIFTH_DEGREES.has(degree)) {
            required.add(degree);
        }
    }

    const hasThirdSuspensionOrSeventh = degrees.some(
        (degree) => THIRD_OR_SUSPENSION_DEGREES.has(degree) || SEVENTH_FUNCTION_DEGREES.has(degree)
    );
    if (degrees.includes(NATURAL_FIFTH) && !hasThirdSuspensionOrSeventh) {
        required.add(NATURAL_FIFTH);
    }

    let highestExtension: { degree: string; number: number } | null = null;
    for (const degree of degrees) {
        const number = getExtensionDegreeNumber(degree);
        if (number !== null && (highestExtension === null || number > highestExtension.number)) {
            highestExtension = { degree, number };
        }
    }
    if (highestExtension) {
        required.add(highestExtension.degree);
    }

    return degrees.filter((degree) => required.has(degree));
}

export function isRequiredChordDegree(entry: ChordRegistryEntry, degree: string): boolean {
    return deriveRequiredDegrees(entry).includes(degree);
}

export function isFormulaClosedChordFamily(entry: ChordRegistryEntry): boolean {
    return FORMULA_CLOSED_CHORD_IDS.has(entry.id);
}

export function buildNormalizedChordTonesForEntry(entry: ChordRegistryEntry): ChordTone[] {
    const requiredDegrees = new Set(deriveRequiredDegrees(entry));
    return entry.formula.degrees.map((degree, index) => {
        const interval = entry.formula.intervals[index];
        return {
            degree,
            interval,
            pitchClass: (entry.definition.rootPitchClass + interval) % 12,
            isRequired: requiredDegrees.has(degree),
            role: deriveChordToneRole(entry, degree),
        };
    });
}
