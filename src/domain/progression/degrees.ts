// Pure Roman-numeral-degree theory — instrument-agnostic (no tuning/string/fret involved).

import { getKeyName } from '@/domain/shared/keys';
import { getChordRegistryEntryByLegacyType } from '@/domain/chord/registry';

export const ROMAN_NUMERAL_CHORDS: Record<string, { interval: number; type: string }> = {
    'I': { interval: 0, type: 'Major' },
    'i': { interval: 0, type: 'Minor' },
    'bII': { interval: 1, type: 'Major' },
    'ii': { interval: 2, type: 'Minor' },
    'II': { interval: 2, type: 'Major' },
    'bIII': { interval: 3, type: 'Major' },
    'iii': { interval: 4, type: 'Minor' },
    'III': { interval: 4, type: 'Major' },
    'IV': { interval: 5, type: 'Major' },
    'iv': { interval: 5, type: 'Minor' },
    'bV': { interval: 6, type: 'Major' },
    'V': { interval: 7, type: 'Major' },
    'v': { interval: 7, type: 'Minor' },
    'bVI': { interval: 8, type: 'Major' },
    'vi': { interval: 9, type: 'Minor' },
    'VI': { interval: 9, type: 'Major' },
    'bVII': { interval: 10, type: 'Major' },
    'bvii': { interval: 10, type: 'Minor' },
    'VII': { interval: 11, type: 'Major' },
    'vii': { interval: 11, type: 'Minor' },

    // Diminished & Augmented Chords (Harmonic/Melodic/Altered Scales)
    'i°': { interval: 0, type: 'Diminished' },
    'ii°': { interval: 2, type: 'Diminished' },
    'iii°': { interval: 4, type: 'Diminished' },
    '#iv°': { interval: 6, type: 'Diminished' },
    'v°': { interval: 7, type: 'Diminished' },
    'vi°': { interval: 9, type: 'Diminished' },
    'vii°': { interval: 11, type: 'Diminished' },
    'bvii°': { interval: 10, type: 'Diminished' },

    'bIII+': { interval: 3, type: 'Augmented' },
    'bVI+': { interval: 8, type: 'Augmented' }
};

export function getChordFromDegree(degree: string): { interval: number; type: string } {
    return ROMAN_NUMERAL_CHORDS[degree] || { interval: 0, type: 'Major' };
}

const CHORD_TYPE_SUFFIX: Record<string, string> = {
    'Major': '',
    'Minor': 'm',
    'Diminished': '°',
    'Augmented': '+',
    'Dominant 7': '7',
};

/** Converts a displayDegree + coreDegree to a real chord name, e.g. 'Am', 'G7', 'Ab7' */
export function degreeToChordName(displayDegree: string, coreDegree: string, rootKey: number): string {
    // Handle V7/x — secondary dominant
    if (displayDegree.startsWith('V7/')) {
        const { interval } = getChordFromDegree(coreDegree) || { interval: 0 };
        const chordRoot = (rootKey + interval + 7) % 12; // V of the target = a 5th above target
        const noteName = getKeyName(chordRoot);
        return `${noteName}7`;
    }

    // Handle subV7/x — tritone substitution (b2 of target)
    if (displayDegree.startsWith('subV7/')) {
        const { interval } = getChordFromDegree(coreDegree) || { interval: 0 };
        const chordRoot = (rootKey + interval + 1) % 12; // b2 of target
        const noteName = getKeyName(chordRoot);
        return `${noteName}7`;
    }

    // Plain diatonic degree
    const degreeData = ROMAN_NUMERAL_CHORDS[displayDegree];
    if (!degreeData) return displayDegree;

    const chordRoot = (rootKey + degreeData.interval) % 12;
    const noteName = getKeyName(chordRoot);
    const suffix = CHORD_TYPE_SUFFIX[degreeData.type] ?? '';
    return `${noteName}${suffix}`;
}

/**
 * Reuses the chord registry's own formula (via its legacyType label, e.g. "Minor 7") instead of
 * keeping a second, hand-duplicated interval table here — one source of truth for chord
 * intervals, shared with everything else that resolves a chord by name.
 */
export function getChordTones(chordType: string, root: number): number[] {
    const intervals = getChordRegistryEntryByLegacyType(chordType)?.formula.intervals ?? [0, 4, 7];
    return intervals.map(i => (root + i) % 12);
}

/**
 * Injects Secondary Dominant chords into a Roman numeral progression array.
 * If the target chord is not 'I', 'i', or a diminished chord ('°'),
 * it inserts a "V7 of [Target]" string immediately before it.
 */
export function injectSecondaryDominants(degrees: string[]): string[] {
    const injected: string[] = [];
    for (const target of degrees) {
        if (target !== 'I' && target !== 'i' && !target.includes('°')) {
            injected.push(`V7 of ${target}`);
        }
        injected.push(target);
    }
    return injected;
}
