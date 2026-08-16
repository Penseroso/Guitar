// Guitar-interpretation layer: maps a legacy CHORD_SHAPES offset template onto a tuning to
// produce actual string/fret fingerings. Legacy — only consumed by
// components/guitar/_deprecated/chord-gallery today; kept intact during the truth/interpretation
// file split rather than deleted.

import { ChordShape, Fingering } from './types';

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
