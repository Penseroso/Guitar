import { deriveChordToneRole } from './semantics';
import type { ChordRegistryEntry } from './registry';
import type { ChordTone, ChordTones } from './types';

const THIRD_OR_SUSPENSION_DEGREES = new Set(['3', 'b3', '2', '4']);
const SEVENTH_FUNCTION_DEGREES = new Set(['7', 'b7', '6']);
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

export function isRequiredChordDegreeDeductive(entry: ChordRegistryEntry, degree: string): boolean {
    return deriveRequiredDegrees(entry).includes(degree);
}

function normalizePitchClass(value: number): number {
    return ((value % 12) + 12) % 12;
}

/** Builds a chord's tones at a given root using the deductive required-degree rule above. */
export function buildDeductiveChordTones(entry: ChordRegistryEntry, rootPitchClass: number): ChordTones {
    const requiredDegrees = new Set(deriveRequiredDegrees(entry));
    const tones: ChordTone[] = entry.formula.degrees.map((degree, index) => {
        const interval = entry.formula.intervals[index];
        return {
            degree,
            interval,
            pitchClass: normalizePitchClass(rootPitchClass + interval),
            isRequired: requiredDegrees.has(degree),
            role: deriveChordToneRole(entry, degree),
        };
    });

    return { rootPitchClass, intervals: entry.formula.intervals, tones };
}
