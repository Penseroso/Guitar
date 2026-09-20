// Pure Roman-numeral-degree theory — instrument-agnostic (no tuning/string/fret involved).

import { getKeyName } from '@/domain/shared/keys';
import { getChordRegistryEntryByLegacyType } from '@/domain/chord/registry';
import {
    formatAccidentals,
    normalizeAccidentalsToAscii,
    parseNoteName,
    spellDegree,
} from '@/domain/shared/spelling';

const DEGREE_BASE_SEMITONES: Record<string, number> = {
    'i': 0, 'I': 0,
    'ii': 2, 'II': 2,
    'iii': 4, 'III': 4,
    'iv': 5, 'IV': 5,
    'v': 7, 'V': 7,
    'vi': 9, 'VI': 9,
    'vii': 11, 'VII': 11,
};

const ROMAN_DEGREE_NUMBER: Record<string, number> = {
    'i': 1, 'I': 1,
    'ii': 2, 'II': 2,
    'iii': 3, 'III': 3,
    'iv': 4, 'IV': 4,
    'v': 5, 'V': 5,
    'vi': 6, 'VI': 6,
    'vii': 7, 'VII': 7,
};

const ROMAN_REGEX = /^(bb|b|##|#)?(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(°|dim|\+|aug|maj7|M7|m7|min7|7)?$/;

export interface ParsedRomanDegree {
    degreeNumber: number;
    interval: number;
    type: string;
}

/**
 * Parses any Roman numeral chord degree (ASCII or Unicode accidentals) into degree number,
 * semitone interval, and chord quality. Returns null if the string is not a recognized degree formula.
 */
export function parseRomanDegree(degree: string): ParsedRomanDegree | null {
    const ascii = normalizeAccidentalsToAscii(degree.trim());
    const match = ROMAN_REGEX.exec(ascii);
    if (!match) return null;

    const [, accidental, numeral, suffix] = match;

    let alteration = 0;
    if (accidental === 'bb') alteration = -2;
    else if (accidental === 'b') alteration = -1;
    else if (accidental === '##') alteration = 2;
    else if (accidental === '#') alteration = 1;

    const baseSemitone = DEGREE_BASE_SEMITONES[numeral];
    if (baseSemitone === undefined) return null;

    const degreeNumber = ROMAN_DEGREE_NUMBER[numeral];
    const interval = ((baseSemitone + alteration) % 12 + 12) % 12;

    let type = 'Major';
    if (suffix === '°' || suffix === 'dim') {
        type = 'Diminished';
    } else if (suffix === '+' || suffix === 'aug') {
        type = 'Augmented';
    } else if (suffix === 'maj7' || suffix === 'M7') {
        type = 'Major 7';
    } else if (suffix === 'm7' || suffix === 'min7') {
        type = 'Minor 7';
    } else if (suffix === '7') {
        type = numeral === numeral.toUpperCase() ? 'Dominant 7' : 'Minor 7';
    } else if (numeral === numeral.toLowerCase()) {
        type = 'Minor';
    } else {
        type = 'Major';
    }

    return { degreeNumber, interval, type };
}

export const ROMAN_NUMERAL_CHORDS: Record<string, { interval: number; type: string }> = {
    // Diatonic & Altered Major / Minor
    'I': { interval: 0, type: 'Major' },
    'i': { interval: 0, type: 'Minor' },
    'bII': { interval: 1, type: 'Major' },
    'bii': { interval: 1, type: 'Minor' },
    'II': { interval: 2, type: 'Major' },
    'ii': { interval: 2, type: 'Minor' },
    'bIII': { interval: 3, type: 'Major' },
    'biii': { interval: 3, type: 'Minor' },
    'III': { interval: 4, type: 'Major' },
    'iii': { interval: 4, type: 'Minor' },
    'bIV': { interval: 4, type: 'Major' },
    'biv': { interval: 4, type: 'Minor' },
    'IV': { interval: 5, type: 'Major' },
    'iv': { interval: 5, type: 'Minor' },
    'bV': { interval: 6, type: 'Major' },
    'bv': { interval: 6, type: 'Minor' },
    '#IV': { interval: 6, type: 'Major' },
    '#iv': { interval: 6, type: 'Minor' },
    'V': { interval: 7, type: 'Major' },
    'v': { interval: 7, type: 'Minor' },
    'bVI': { interval: 8, type: 'Major' },
    'bvi': { interval: 8, type: 'Minor' },
    '#V': { interval: 8, type: 'Major' },
    '#v': { interval: 8, type: 'Minor' },
    'VI': { interval: 9, type: 'Major' },
    'vi': { interval: 9, type: 'Minor' },
    'bbVII': { interval: 9, type: 'Major' },
    'bVII': { interval: 10, type: 'Major' },
    'bvii': { interval: 10, type: 'Minor' },
    'VII': { interval: 11, type: 'Major' },
    'vii': { interval: 11, type: 'Minor' },

    // Diminished Chords
    'i°': { interval: 0, type: 'Diminished' },
    'bii°': { interval: 1, type: 'Diminished' },
    'ii°': { interval: 2, type: 'Diminished' },
    '#ii°': { interval: 3, type: 'Diminished' },
    'biii°': { interval: 3, type: 'Diminished' },
    'iii°': { interval: 4, type: 'Diminished' },
    'iv°': { interval: 5, type: 'Diminished' },
    '#iv°': { interval: 6, type: 'Diminished' },
    'bv°': { interval: 6, type: 'Diminished' },
    'v°': { interval: 7, type: 'Diminished' },
    '#v°': { interval: 8, type: 'Diminished' },
    'bvi°': { interval: 8, type: 'Diminished' },
    'vi°': { interval: 9, type: 'Diminished' },
    'bbvii°': { interval: 9, type: 'Diminished' },
    'bvii°': { interval: 10, type: 'Diminished' },
    'vii°': { interval: 11, type: 'Diminished' },

    // Augmented Chords
    'I+': { interval: 0, type: 'Augmented' },
    'bII+': { interval: 1, type: 'Augmented' },
    'II+': { interval: 2, type: 'Augmented' },
    'bIII+': { interval: 3, type: 'Augmented' },
    'III+': { interval: 4, type: 'Augmented' },
    'bIV+': { interval: 4, type: 'Augmented' },
    'IV+': { interval: 5, type: 'Augmented' },
    '#IV+': { interval: 6, type: 'Augmented' },
    'bV+': { interval: 6, type: 'Augmented' },
    'V+': { interval: 7, type: 'Augmented' },
    '#V+': { interval: 8, type: 'Augmented' },
    'bVI+': { interval: 8, type: 'Augmented' },
    'VI+': { interval: 9, type: 'Augmented' },
    'bVII+': { interval: 10, type: 'Augmented' },
    'VII+': { interval: 11, type: 'Augmented' },
};

// Mirror all ASCII keys to Unicode variants (e.g. '♭VI', '♯iv°', '♭♭VII', etc.)
for (const [key, value] of Object.entries(ROMAN_NUMERAL_CHORDS)) {
    const unicodeKey = formatAccidentals(key);
    if (unicodeKey !== key) {
        ROMAN_NUMERAL_CHORDS[unicodeKey] = value;
    }
}

export function getChordFromDegree(degree: string): { interval: number; type: string } {
    const ascii = normalizeAccidentalsToAscii(degree.trim());
    return (
        ROMAN_NUMERAL_CHORDS[degree] ||
        ROMAN_NUMERAL_CHORDS[ascii] ||
        parseRomanDegree(ascii) ||
        { interval: 0, type: 'Major' }
    );
}

const CHORD_TYPE_SUFFIX: Record<string, string> = {
    'Major': '',
    'Minor': 'm',
    'Diminished': '°',
    'Augmented': '+',
    'Dominant 7': '7',
    'Major 7': 'maj7',
    'Minor 7': 'm7',
};

/** Converts a displayDegree + coreDegree to a real chord name, e.g. 'Am', 'G7', 'A♭', 'D♯°' */
export function degreeToChordName(displayDegree: string, coreDegree: string, rootKey: number): string {
    const isUnicode = displayDegree.includes('♭') || displayDegree.includes('♯');
    const tonic = parseNoteName(getKeyName(rootKey));

    // Handle V7/x — secondary dominant
    if (displayDegree.startsWith('V7/')) {
        const targetParsed = parseRomanDegree(coreDegree);
        if (targetParsed && tonic) {
            const targetPitch = ((rootKey + targetParsed.interval) % 12 + 12) % 12;
            const targetSpelled = spellDegree(tonic, targetParsed.degreeNumber, targetPitch);
            if (targetSpelled) {
                const domPitch = ((targetPitch + 7) % 12 + 12) % 12;
                const domSpelled = spellDegree(targetSpelled, 5, domPitch);
                if (domSpelled) {
                    const domName = isUnicode ? formatAccidentals(domSpelled.name) : domSpelled.name;
                    return `${domName}7`;
                }
            }
        }
        const { interval } = getChordFromDegree(coreDegree);
        const chordRoot = (rootKey + interval + 7) % 12;
        const noteName = isUnicode ? formatAccidentals(getKeyName(chordRoot)) : getKeyName(chordRoot);
        return `${noteName}7`;
    }

    // Handle subV7/x — tritone substitution (b2 of target)
    if (displayDegree.startsWith('subV7/')) {
        const targetParsed = parseRomanDegree(coreDegree);
        if (targetParsed && tonic) {
            const targetPitch = ((rootKey + targetParsed.interval) % 12 + 12) % 12;
            const targetSpelled = spellDegree(tonic, targetParsed.degreeNumber, targetPitch);
            if (targetSpelled) {
                const subPitch = ((targetPitch + 1) % 12 + 12) % 12;
                const subSpelled = spellDegree(targetSpelled, 2, subPitch);
                if (subSpelled) {
                    const subName = isUnicode ? formatAccidentals(subSpelled.name) : subSpelled.name;
                    return `${subName}7`;
                }
            }
        }
        const { interval } = getChordFromDegree(coreDegree);
        const chordRoot = (rootKey + interval + 1) % 12;
        const noteName = isUnicode ? formatAccidentals(getKeyName(chordRoot)) : getKeyName(chordRoot);
        return `${noteName}7`;
    }

    // Plain diatonic / scale degree
    const parsed = parseRomanDegree(displayDegree);
    if (!parsed) {
        const ascii = normalizeAccidentalsToAscii(displayDegree);
        const dictEntry = ROMAN_NUMERAL_CHORDS[displayDegree] || ROMAN_NUMERAL_CHORDS[ascii];
        if (!dictEntry) return displayDegree;
        const chordRoot = (rootKey + dictEntry.interval) % 12;
        const noteName = isUnicode ? formatAccidentals(getKeyName(chordRoot)) : getKeyName(chordRoot);
        const suffix = CHORD_TYPE_SUFFIX[dictEntry.type] ?? '';
        return `${noteName}${suffix}`;
    }

    const chordRoot = ((rootKey + parsed.interval) % 12 + 12) % 12;
    let noteName: string;

    if (tonic) {
        const spelled = spellDegree(tonic, parsed.degreeNumber, chordRoot);
        if (spelled) {
            noteName = isUnicode ? formatAccidentals(spelled.name) : spelled.name;
        } else {
            noteName = isUnicode ? formatAccidentals(getKeyName(chordRoot)) : getKeyName(chordRoot);
        }
    } else {
        noteName = isUnicode ? formatAccidentals(getKeyName(chordRoot)) : getKeyName(chordRoot);
    }

    const suffix = CHORD_TYPE_SUFFIX[parsed.type] ?? '';
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
