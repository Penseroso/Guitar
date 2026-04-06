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

const REQUIRED_DEGREES_BY_ID: Partial<Record<ChordRegistryEntry['id'], string[]>> = {
    major: ['1', '3'],
    minor: ['1', 'b3'],
    'power-5': ['1', '5'],
    'major-7': ['1', '3', '7'],
    'major-6': ['1', '3', '6'],
    'minor-7': ['1', 'b3', 'b7'],
    'dominant-7': ['1', '3', 'b7'],
    'half-diminished-7': ['1', 'b3', 'b5', 'b7'],
    'diminished-7': ['1', 'b3', 'b5', '6'],
    'major-9': ['1', '3', '7', '9'],
    'minor-9': ['1', 'b3', 'b7', '9'],
    'dominant-9': ['1', '3', 'b7', '9'],
    'dominant-11': ['1', '3', 'b7', '11'],
    // For 13 chords we keep the root important in P1, while 3/b7/13 define the function most strongly.
    'dominant-13': ['1', '3', 'b7', '13'],
    'hendrix-7-sharp-9': ['1', '3', 'b7', '#9'],
    'dominant-7-flat-9': ['1', '3', 'b7', 'b9'],
    sus4: ['1', '4'],
    sus2: ['1', '2'],
};

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

export function isRequiredChordDegree(entry: ChordRegistryEntry, degree: string): boolean {
    return REQUIRED_DEGREES_BY_ID[entry.id]?.includes(degree) ?? false;
}

export function isFormulaClosedChordFamily(entry: ChordRegistryEntry): boolean {
    return FORMULA_CLOSED_CHORD_IDS.has(entry.id);
}

export function buildNormalizedChordTonesForEntry(entry: ChordRegistryEntry): ChordTone[] {
    return entry.formula.degrees.map((degree, index) => {
        const interval = entry.formula.intervals[index];
        return {
            degree,
            interval,
            pitchClass: (entry.definition.rootPitchClass + interval) % 12,
            isRequired: isRequiredChordDegree(entry, degree),
            role: deriveChordToneRole(entry, degree),
        };
    });
}
