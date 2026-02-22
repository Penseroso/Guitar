import { NOTES, NOTES_FLAT } from './theory';
import { ChordShape, Fingering } from './types';

export function getNoteName(index: number, useFlats: boolean = false): string {
    return useFlats ? NOTES_FLAT[index % 12] : NOTES[index % 12];
}

export function getNoteIndex(noteName: string): number {
    return NOTES.indexOf(noteName);
}

export function getChordFromDegree(degree: string): { interval: number; type: string } {
    switch (degree) {
        case 'I': return { interval: 0, type: 'Major' };
        case 'i': return { interval: 0, type: 'Minor' };

        case 'bII': return { interval: 1, type: 'Major' };
        case 'ii': return { interval: 2, type: 'Minor' };
        case 'II': return { interval: 2, type: 'Major' };

        case 'bIII': return { interval: 3, type: 'Major' };
        case 'iii': return { interval: 4, type: 'Minor' };
        case 'III': return { interval: 4, type: 'Major' };

        case 'IV': return { interval: 5, type: 'Major' };
        case 'iv': return { interval: 5, type: 'Minor' };

        case 'bV': return { interval: 6, type: 'Major' };
        case 'V': return { interval: 7, type: 'Major' };
        case 'v': return { interval: 7, type: 'Minor' };

        case 'bVI': return { interval: 8, type: 'Major' };
        case 'vi': return { interval: 9, type: 'Minor' };
        case 'VI': return { interval: 9, type: 'Major' };

        case 'bVII': return { interval: 10, type: 'Major' };
        case 'VII': return { interval: 11, type: 'Major' };
        case 'vii': return { interval: 11, type: 'Minor' };

        default: return { interval: 0, type: 'Major' };
    }
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
            let label = "•";
            const diff = (noteIdx - rootKey + 12) % 12;
            if (diff === 0) label = "R";
            else if (diff === 7) label = "5";
            else if (diff === 4) label = "3"; // Major 3rd
            else if (diff === 3) label = "b3"; // Minor 3rd
            else if (diff === 10) label = "b7"; // Minor 7th
            else if (diff === 11) label = "7"; // Major 7th
            else if (diff === 2) label = "9";   // Major 2nd / 9th
            else if (diff === 5) label = "11";  // Perfect 4th / 11th
            else if (diff === 9) label = "13";  // Major 6th / 13th
            else if (diff === 6) label = "b5";  // Diminished 5th / #11
            else if (diff === 1) label = "b9";  // Minor 2nd / b9
            else if (diff === 8) label = "#5";  // Augmented 5th / b13

            fingerings.push({
                string: s,
                fret: computedFret,
                noteIdx: noteIdx,
                label: label
            });
        } else {
            fingerings.push({
                string: s,
                fret: 0,
                noteIdx: -1,
                label: "X"
            });
        }
    }
    return fingerings;
}
