import type { ChordRegistryEntry } from './registry';
import type { ChordTone } from './types';

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
    if (degree === '1') return true;

    if (entry.id === 'power-5') {
        return degree === '5';
    }

    if ((entry.id === 'sus2' || entry.id === 'sus4') && (degree === '2' || degree === '4')) {
        return true;
    }

    if (degree === '3' || degree === 'b3') return true;
    if (degree === '7' || degree === 'b7' || degree === '6') return true;
    if (degree === 'b9' || degree === '#9') return true;

    return false;
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
