// Barrel: this file used to hold pure note/progression theory alongside CHORD_SHAPES.
// Pure theory now lives in notes.ts/progressions.ts (re-exported below, unchanged public
// names). CHORD_SHAPES stays here — chords/templates.ts documents it as an intentional
// legacy voicing-shape source layer.
import { ChordShape } from './types';

export type { ProgressionData } from './progressions';
export { PROGRESSION_LIBRARY } from './progressions';
export { NOTES, NOTES_FLAT } from './notes';

import { SCALES } from './scales';

export { SCALES };
export {
    STANDARD_GUITAR_TUNING_PITCH_CLASSES,
    STANDARD_GUITAR_STRING_MIDI_PITCHES,
    TUNING,
    STRING_MIDI_PITCHES,
    INLAYS,
    DOUBLE_INLAYS,
} from './tuning';
export {
    GENERIC_SCALE_INTERVAL_LABELS,
    generateModeData,
    getScaleIntervalLabels,
    getScaleEngineIntervalLabels,
    isDoubleStopSupported,
    SCALE_DISPLAY_FORMULAS,
    SCALE_ENGINE_FORMULAS
} from './scales';

export const CHORD_SHAPES: Record<string, ChordShape[]> = {
    // Offsets are defined from High E (String 1) to Low E (String 6) index 0-5
    // baseRootString is the index of the string (0-5) that holds the Root note
    // === 1. Triads (기본 3화음) ===
    "Major": [
        { name: "Root 6 (E Shape)", baseRootString: 5, offsets: [0, 0, 1, 2, 2, 0] },
        { name: "Root 5 (A Shape)", baseRootString: 4, offsets: [0, 2, 2, 2, 0, null] },
        { name: "Root 4 (D Shape)", baseRootString: 3, offsets: [2, 3, 2, 0, null, null] },
        { name: "Root 6 (G Shape)", baseRootString: 5, offsets: [0, -3, -3, -3, -1, 0] },
        { name: "Root 5 (C Shape)", baseRootString: 4, offsets: [-3, -2, -3, -1, 0, null] }
    ],
    "Minor": [
        { name: "Root 6 (Em Shape)", baseRootString: 5, offsets: [0, 0, 0, 2, 2, 0] },
        { name: "Root 5 (Am Shape)", baseRootString: 4, offsets: [0, 1, 2, 2, 0, null] },
        { name: "Root 4 (Dm Shape)", baseRootString: 3, offsets: [1, 3, 2, 0, null, null] },
        { name: "Root 5 (Cm Shape)", baseRootString: 4, offsets: [-3, -2, -3, -2, 0, null] }
    ],

    // === 2. 7th Chords (7화음) ===
    "Major 7": [
        { name: "Root 6 (Drop 3)", baseRootString: 5, offsets: [null, 0, 1, 1, null, 0] }, // (x-x-1-1-0-0)
        { name: "Root 5 (Drop 2)", baseRootString: 4, offsets: [0, 2, 1, 2, 0, null] },    // (x-0-2-1-2-0)
        { name: "Root 4 (Drop 2)", baseRootString: 3, offsets: [2, 2, 2, 0, null, null] }  // (x-x-0-2-2-2)
    ],
    "Minor 7": [
        { name: "Root 6 (Drop 3)", baseRootString: 5, offsets: [null, 0, 0, 0, null, 0] }, // (x-x-0-0-0-0)
        { name: "Root 5 (Drop 2)", baseRootString: 4, offsets: [0, 1, 0, 2, 0, null] },    // (x-0-2-0-1-0)
        { name: "Root 4 (Drop 2)", baseRootString: 3, offsets: [1, 1, 2, 0, null, null] }  // (x-x-0-2-1-1)
    ],
    "Dominant 7": [
        { name: "Root 6 (Drop 3)", baseRootString: 5, offsets: [null, 0, 1, 0, null, 0] }, // (x-x-0-1-0-0)
        { name: "Root 5 (Drop 2)", baseRootString: 4, offsets: [null, 2, 0, 2, 0, null] }, // (x-0-2-0-2-x)
        { name: "Root 4 (Drop 2)", baseRootString: 3, offsets: [2, 1, 2, 0, null, null] }, // (x-x-0-2-1-2)
        { name: "Root 5 (C7 Shape)", baseRootString: 4, offsets: [-3, -2, 0, -1, 0, null] }         // (x-3-2-3-1-0)
    ],
    "m7b5 (Half Dim)": [
        { name: "Root 6 (Drop 3)", baseRootString: 5, offsets: [null, -1, 0, 0, null, 0] },// (x-x-0-0--1-0)
        { name: "Root 5 (Drop 2)", baseRootString: 4, offsets: [null, 1, 0, 1, 0, null] }, // (x-0-1-0-1-x)
        { name: "Root 4 (Drop 2)", baseRootString: 3, offsets: [1, 1, 1, 0, null, null] }  // (x-x-0-1-1-1)
    ],
    "Diminished 7": [
        { name: "Root 6 (Drop 3)", baseRootString: 5, offsets: [null, -1, 0, -1, null, 0] },// (x-x--1-0--1-0)
        { name: "Root 5 (Drop 2)", baseRootString: 4, offsets: [null, 1, -1, 1, 0, null] }, // (x-0-1--1-1-x)
        { name: "Root 4 (Drop 2)", baseRootString: 3, offsets: [1, 0, 1, 0, null, null] }   // (x-x-0-1-0-1)
    ],

    // === 3. Extended / Tension Chords (확장 텐션 코드) ===
    "Major 9": [
        { name: "Root 6 (Drop 3)", baseRootString: 5, offsets: [null, 0, -1, 1, null, 0] }, // (0-x-1--1-0-x)
        { name: "Root 5 (Drop 2)", baseRootString: 4, offsets: [null, 0, 1, -1, 0, null] }  // (x-0--1-1-0-x)
    ],
    "Minor 9": [
        { name: "Root 6", baseRootString: 5, offsets: [2, 0, 0, 0, null, 0] },              // (0-x-0-0-0-2)
        { name: "Root 5", baseRootString: 4, offsets: [null, 0, 0, -2, 0, null] }           // (x-0--2-0-0-x) 
    ],
    "Dominant 9": [
        { name: "Root 6", baseRootString: 5, offsets: [null, -3, -1, 0, null, 0] },         // (0-x-0--1--3-x) 
        { name: "Root 5", baseRootString: 4, offsets: [null, 0, 0, -1, 0, null] }           // 펑크/제임스브라운 (x-0--1-0-0-x)
    ],
    "13": [
        { name: "Root 6", baseRootString: 5, offsets: [null, 2, 1, 0, null, 0] },           // 재즈 13th 정석 (0-x-0-1-2-x)
        { name: "Root 5", baseRootString: 4, offsets: [2, null, 0, -1, 0, null] }           // (x-0--1-0-x-2)
    ],

    // === 4. Altered / Special Chords (특수 코드) ===
    "7#9 (Hendrix)": [
        { name: "Root 5", baseRootString: 4, offsets: [null, 1, 0, -1, 0, null] }           // 지미 헨드릭스 폼 (x-0--1-0-1-x)
    ],
    "7b9": [
        { name: "Root 5", baseRootString: 4, offsets: [null, -1, 0, -1, 0, null] },         // (x-0--1-0--1-x)
        { name: "Root 6", baseRootString: 5, offsets: [null, -3, -1, -1, null, 0] }         // (0-x--1--1--3-x)
    ],
    "sus4": [
        { name: "Root 6 (E Shape)", baseRootString: 5, offsets: [0, 0, 2, 2, 2, 0] },
        { name: "Root 5 (A Shape)", baseRootString: 4, offsets: [0, 3, 2, 2, 0, null] },
        { name: "Root 4 (D Shape)", baseRootString: 3, offsets: [3, 3, 2, 0, null, null] }
    ],
    "sus2": [
        { name: "Root 5 (A Shape)", baseRootString: 4, offsets: [0, 0, 2, 2, 0, null] },
        { name: "Root 4 (D Shape)", baseRootString: 3, offsets: [0, 3, 2, 0, null, null] }
    ],
    "Power (5)": [
        { name: "Root 6 (Standard)", baseRootString: 5, offsets: [null, null, null, 2, 2, 0] },
        { name: "Root 5 (Standard)", baseRootString: 4, offsets: [null, null, 2, 2, 0, null] }
    ]
};
