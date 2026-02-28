import { NOTES, NOTES_FLAT, STRING_MIDI_PITCHES } from './theory';
import { ChordShape, Fingering, DoubleStopPair, PlayableDoubleStop } from './types';

export function getNoteName(index: number, useFlats: boolean = false): string {
    return useFlats ? NOTES_FLAT[index % 12] : NOTES[index % 12];
}

export function getNoteIndex(noteName: string): number {
    return NOTES.indexOf(noteName);
}

const ROMAN_NUMERAL_CHORDS: Record<string, { interval: number; type: string }> = {
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
    'VII': { interval: 11, type: 'Major' },
    'vii': { interval: 11, type: 'Minor' }
};

const INTERVAL_LABELS: Record<number, string> = {
    0: "R",
    1: "b9",
    2: "9",
    3: "b3",
    4: "3", // Major 3rd
    5: "11", // Perfect 4th / 11th
    6: "b5", // Diminished 5th / #11
    7: "5",
    8: "#5", // Augmented 5th / b13
    9: "13", // Major 6th / 13th
    10: "b7", // Minor 7th
    11: "7" // Major 7th
};

export function getChordFromDegree(degree: string): { interval: number; type: string } {
    return ROMAN_NUMERAL_CHORDS[degree] || { interval: 0, type: 'Major' };
}

export function getChordTones(chordType: string, root: number): number[] {
    const chordIntervals: Record<string, number[]> = {
        "Major": [0, 4, 7],
        "Minor": [0, 3, 7],
        "Major 7": [0, 4, 7, 11],
        "Dominant 7": [0, 4, 7, 10],
        "Minor 7": [0, 3, 7, 10],
        "7": [0, 4, 7, 10]
    };

    const intervals = chordIntervals[chordType] || [0, 4, 7];
    return intervals.map(i => (root + i) % 12);
}

export function getChordFingering(shape: ChordShape, rootKey: number, tuning: number[]): Fingering[] {
    const { baseRootString, offsets } = shape;
    const openNote = tuning[baseRootString];

    // Calculate base fret (barre position)
    let baseFret = (rootKey - openNote + 12) % 12;

    const validOffsets = offsets.filter(o => o !== null) as number[];
    const minOffset = validOffsets.length > 0 ? Math.min(...validOffsets) : 0;

    if (baseFret + minOffset < 0) {
        baseFret += 12;
    }

    const fingerings: Fingering[] = [];

    for (let s = 0; s < 6; s++) {
        const offset = offsets[s];
        if (offset !== null) {
            const computedFret = baseFret + offset;
            const noteIdx = (tuning[s] + computedFret) % 12;

            // Label logic
            const diff = (noteIdx - rootKey + 12) % 12;
            const label = INTERVAL_LABELS[diff] || "•";

            fingerings.push({
                string: s,
                fret: computedFret,
                noteIdx: noteIdx,
                label: label
            });
        } else {
            fingerings.push({
                string: s,
                fret: -1,
                noteIdx: -1,
                label: "X"
            });
        }
    }
    return fingerings;
}

export function getSortedVoicings(voicings: ChordShape[], rootKey: number, tuning: number[]): ChordShape[] {
    if (!voicings || voicings.length === 0) return [];

    return [...voicings].sort((a, b) => {
        // 1순위: baseRootString 내림차순 정렬 (두꺼운 줄 -> 얇은 줄)
        if (a.baseRootString !== b.baseRootString) {
            return b.baseRootString - a.baseRootString;
        }

        // 2순위: baseRootString이 같을 경우, 실제 렌더링되는 최소 프렛(minFret) 오름차순 정렬
        const getMinFret = (shape: ChordShape) => {
            const { baseRootString, offsets } = shape;
            const openNote = tuning[baseRootString];

            let baseFret = (rootKey - openNote + 12) % 12;

            const validOffsets = offsets.filter(o => o !== null) as number[];
            const minOffset = validOffsets.length > 0 ? Math.min(...validOffsets) : 0;

            if (baseFret + minOffset < 0) {
                baseFret += 12;
            }

            return baseFret + minOffset;
        };

        return getMinFret(a) - getMinFret(b);
    });
}

/**
 * Calculates a diatonic double-stop pair (e.g., 3rd, 4th, 6th) for each note in a given scale.
 * Both the root and the target notes will belong to the provided scale.
 * 
 * @param scaleNotes An array of note indices representing a scale (e.g. [0, 2, 4, 5, 7, 9, 11] for Major).
 * @param intervalDegree The interval degree to calculate the double stop for (e.g., 3 for a 3rd, 6 for a 6th).
 * @returns An array of DoubleStopPair objects containing the root note, target note, and interval degree.
 */
export function getDiatonicDoubleStops(scaleNotes: number[], intervalDegree: number): DoubleStopPair[] {
    const pairs: DoubleStopPair[] = [];
    const len = scaleNotes.length;

    if (len === 0 || intervalDegree < 1) return pairs;

    for (let i = 0; i < len; i++) {
        const rootNoteIdx = scaleNotes[i];
        // Calculate the target relative index in a circular manner (modulo length)
        const targetRelativeIdx = (i + intervalDegree - 1) % len;
        const targetNoteIdx = scaleNotes[targetRelativeIdx];

        pairs.push({
            rootNoteIdx,
            targetNoteIdx,
            interval: intervalDegree
        });
    }

    return pairs;
}

/**
 * Filters and maps DoubleStopPairs to actual playable string/fret combinations on the guitar.
 * Validates the physical constraints (maximum 4 frets stretch) unless one of the notes is an open string.
 *
 * @param pairs The diatonic double-stop pairs to be mapped.
 * @param rootKey The root key of the scale or context (used contextually if needed).
 * @param tuning Array of open string note indices (e.g., for Standard Tuning).
 * @param targetStrings Tuple of two string indices (0-5) to play the double stops on (e.g., [1, 2] for B and G strings).
 * @returns An array of playable double-stops with specific strings and fret numbers.
 */
export function getPlayableDoubleStopsOnStrings(
    pairs: DoubleStopPair[],
    rootKey: number,
    tuning: number[],
    targetStrings: [number, number]
): PlayableDoubleStop[] {
    const playable: PlayableDoubleStop[] = [];
    const [str1, str2] = targetStrings;

    // Assign strings based on physics (larger index = lower pitch = root)
    const strRoot = Math.max(str1, str2);
    const strTarget = Math.min(str1, str2);
    const openNoteRoot = tuning[strRoot];
    const openNoteTarget = tuning[strTarget];

    for (const pair of pairs) {
        const { rootNoteIdx, targetNoteIdx } = pair;

        // Find all possible frets (0-24)
        const fretsRoot: number[] = [];
        const fretsTarget: number[] = [];

        for (let fret = 0; fret <= 24; fret++) {
            if ((openNoteRoot + fret) % 12 === rootNoteIdx) fretsRoot.push(fret);
            if ((openNoteTarget + fret) % 12 === targetNoteIdx) fretsTarget.push(fret);
        }

        for (const fRoot of fretsRoot) {
            for (const fTarget of fretsTarget) {
                // Strict max 4 fret stretch (no exception for open strings)
                const stretch = Math.abs(fRoot - fTarget);
                const isValidStretch = stretch <= 4;

                // Prevent interval inversion
                const rootPitch = STRING_MIDI_PITCHES[strRoot] + fRoot;
                const targetPitch = STRING_MIDI_PITCHES[strTarget] + fTarget;

                if (isValidStretch && targetPitch >= rootPitch) {
                    playable.push({
                        string1: str1,
                        fret1: str1 === strRoot ? fRoot : fTarget,
                        string2: str2,
                        fret2: str2 === strRoot ? fRoot : fTarget,
                        pair: pair
                    });
                }
            }
        }
    }

    return playable;
}
