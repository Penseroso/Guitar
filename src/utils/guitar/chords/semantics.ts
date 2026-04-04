import type { ChordRegistryEntry } from './registry';
import type { ChordTone } from './types';

const REQUIRED_DEGREES_BY_ID: Partial<Record<ChordRegistryEntry['id'], string[]>> = {
    major: ['1', '3'],
    minor: ['1', 'b3'],
    'power-5': ['1', '5'],
    'major-7': ['1', '3', '7'],
    'minor-7': ['1', 'b3', 'b7'],
    'dominant-7': ['1', '3', 'b7'],
    'half-diminished-7': ['1', 'b3', 'b5', 'b7'],
    'diminished-7': ['1', 'b3', 'b5', '6'],
    'major-9': ['1', '3', '7', '9'],
    'minor-9': ['1', 'b3', 'b7', '9'],
    'dominant-9': ['1', '3', 'b7', '9'],
    // For 13 chords we keep the root important in P1, while 3/b7/13 define the function most strongly.
    'dominant-13': ['1', '3', 'b7', '13'],
    'hendrix-7-sharp-9': ['1', '3', 'b7', '#9'],
    'dominant-7-flat-9': ['1', '3', 'b7', 'b9'],
    sus4: ['1', '4'],
    sus2: ['1', '2'],
};

export function deriveChordToneRole(entry: ChordRegistryEntry, degree: string): ChordTone['role'] {
    if (degree === '1') return 'root';

    if ((entry.id === 'sus2' || entry.id === 'sus4') && (degree === '2' || degree === '4')) {
        return 'suspension';
    }

    if (degree === 'b3' || degree === '3') return 'third';
    if (degree === 'b5' || degree === '5' || degree === '#5') return 'fifth';
    if (degree === '6' || degree === 'b7' || degree === '7') return 'seventh';
    if (degree === '9' || degree === '11' || degree === '13' || degree === '2' || degree === '4') {
        return 'extension';
    }

    return 'alteration';
}

export function isRequiredChordDegree(entry: ChordRegistryEntry, degree: string): boolean {
    return REQUIRED_DEGREES_BY_ID[entry.id]?.includes(degree) ?? false;
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
