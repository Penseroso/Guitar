import { ChordShape } from './types';

export interface ProgressionData {
    id: string;
    title: string;
    genre: string;
    degrees: string[];
    description: string;
}

export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
export const TUNING = [4, 11, 7, 2, 9, 4]; // E2, B3, G3, D3, A2, E2 (High to Low strings 1-6)
export const STRING_MIDI_PITCHES = [64, 59, 55, 50, 45, 40]; // Absolute MIDI pitches for standard tuning (High E to Low E)

export const SCALES: Record<string, Record<string, number[]>> = {
    "Diatonic": {
        "Ionian": [0, 2, 4, 5, 7, 9, 11],
        "Dorian": [0, 2, 3, 5, 7, 9, 10],
        "Phrygian": [0, 1, 3, 5, 7, 8, 10],
        "Lydian": [0, 2, 4, 6, 7, 9, 11],
        "Mixolydian": [0, 2, 4, 5, 7, 9, 10],
        "Aeolian": [0, 2, 3, 5, 7, 8, 10],
        "Locrian": [0, 1, 3, 5, 6, 8, 10]
    },
    "Pentatonic": {
        "Major Pentatonic": [0, 2, 4, 7, 9],
        "Minor Pentatonic": [0, 3, 5, 7, 10]
    },
    "Harmonic/Melodic": {
        "Harmonic Minor": [0, 2, 3, 5, 7, 8, 11],
        "Melodic Minor": [0, 2, 3, 5, 7, 9, 11],
        "Phrygian Dom": [0, 1, 4, 5, 7, 8, 10],
        "Altered": [0, 1, 3, 4, 6, 8, 10]
    }
};

export const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];
export const DOUBLE_INLAYS = [12];

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

export const COMMON_PROGRESSIONS: Record<string, string[]> = {
    "Classic 2-5-1 (Major)": ["ii", "V", "I"],
    "Doo-Wop (1-6-4-5)": ["I", "vi", "IV", "V"],
    "Pop Punk (1-5-6-4)": ["I", "V", "vi", "IV"],
    "Minor 2-5-1": ["ii", "V", "i"],
    "Andalusian (Minor)": ["i", "bVII", "bVI", "V"],
};

export const PROGRESSION_LIBRARY: ProgressionData[] = [
    // === Pop & Rock ===
    {
        id: 'pop-punk',
        title: "The 4 Chords (Pop Punk)",
        genre: "Pop / Rock",
        degrees: ["I", "V", "vi", "IV"],
        description: "수많은 히트곡을 만들어낸 현대 팝과 펑크 록의 무적의 마법 공식."
    },
    {
        id: 'pop-ballad',
        title: "Sentimental Ballad",
        genre: "Pop / Indie",
        degrees: ["vi", "IV", "I", "V"],
        description: "마이너 코드로 시작하여 서정적이고 감성적인 무드를 자아내는 현대 발라드 진행."
    },
    {
        id: 'doo-wop',
        title: "Doo-Wop (50s Retro)",
        genre: "Retro / Soul",
        degrees: ["I", "vi", "IV", "V"],
        description: "1950~60년대 소울과 팝에서 유행한 따뜻하고 향수 어린 진행."
    },
    {
        id: 'creep',
        title: "Secondary Dominant (Creep)",
        genre: "Alt Rock",
        degrees: ["I", "III", "IV", "iv"],
        description: "메이저 III도와 마이너 iv도를 사용하여 기묘하고 몽환적인 슬픔을 표현하는 진행."
    },

    // === Jazz & R&B ===
    {
        id: 'classic-251',
        title: "Classic 2-5-1",
        genre: "Jazz / Bossa",
        degrees: ["ii", "V", "I"],
        description: "도미넌트 모션의 강한 해결감을 보여주는 재즈 화성학의 척추."
    },
    {
        id: 'jazz-turnaround',
        title: "Jazz Turnaround (3-6-2-5)",
        genre: "Jazz",
        degrees: ["iii", "VI", "ii", "V"],
        description: "메이저 VI도를 세컨더리 도미넌트로 사용하여 다음 마디의 ii도로 강하게 빨려 들어가는 턴어라운드."
    },
    {
        id: 'neo-soul',
        title: "Neo-Soul & R&B",
        genre: "R&B / Soul",
        degrees: ["IV", "V", "iii", "vi"],
        description: "세련되고 그루비한 느낌을 주며, 로파이(Lo-Fi)나 네오 소울에서 끝없이 반복되는 진행."
    },

    // === J-Pop & Anime ===
    {
        id: 'royal-road',
        title: "Royal Road (왕도 진행)",
        genre: "J-Pop",
        degrees: ["IV", "V", "iii", "vi"],
        description: "애절하면서도 희망찬 느낌을 주어 일본 팝과 애니메이션 OST에서 가장 사랑받는 진행."
    },
    {
        id: 'komuro',
        title: "Komuro Progression",
        genre: "J-Pop / EDM",
        degrees: ["vi", "IV", "V", "I"],
        description: "코무로 테츠야가 유행시킨 댄서블하고 드라마틱한 마이너 기반 진행."
    },

    // === Blues & Latin ===
    {
        id: 'andalusian',
        title: "Andalusian Cadence",
        genre: "Flamenco",
        degrees: ["i", "bVII", "bVI", "V"],
        description: "스페인 플라멩코에서 유래한, 계단을 내려가듯 비장하고 긴장감 넘치는 하행 진행."
    }
];
