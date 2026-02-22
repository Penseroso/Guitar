export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
export const TUNING = [4, 11, 7, 2, 9, 4]; // E2, B3, G3, D3, A2, E2 (High to Low strings 1-6)

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
export const DOUBLE_INLAYS = [12, 24];

export function getNoteName(index: number, useFlats: boolean = false): string {
  return useFlats ? NOTES_FLAT[index % 12] : NOTES[index % 12];
}

export function getNoteIndex(noteName: string): number {
  return NOTES.indexOf(noteName);
}

export interface ChordShape {
  name: string;
  rootString: number; // 0-5 (0 is high E, 5 is low E) -> Wait, TUNING is High to Low. 0 is E4, 5 is E2. 
  // Let's stick to string index 0-5.
  // E shape root is on string 5 (Low E).
  offsets: number[]; // Fret offsets for strings 0-5. -1 means muted.
}

// TUNING: [4, 11, 7, 2, 9, 4] (High E to Low E)
// String indices: 0 (High E), 1 (B), 2 (G), 3 (D), 4 (A), 5 (Low E)

export const CHORD_SHAPES: Record<string, ChordShape[]> = {
  "Major": [
    { name: "E Shape", rootString: 5, offsets: [0, 0, 1, 2, 2, 0] },
    { name: "A Shape", rootString: 4, offsets: [0, 2, 2, 2, 0, -1] }, // -1 for string 5 (Low E) muted/not played usually, but A shape root is on A string (idx 4).
    { name: "D Shape", rootString: 3, offsets: [2, 3, 2, 0, -1, -1] },
    { name: "G Shape", rootString: 5, offsets: [3, 0, 0, 0, 2, 3] }, // Hard comfortably, usually played as 3 x 0 0 x 3
    { name: "C Shape", rootString: 4, offsets: [0, 1, 0, 2, 3, -1] }
  ],
  "Minor": [
    { name: "Em Shape", rootString: 5, offsets: [0, 0, 0, 2, 2, 0] },
    { name: "Am Shape", rootString: 4, offsets: [0, 1, 2, 2, 0, -1] },
    { name: "Dm Shape", rootString: 3, offsets: [1, 3, 2, 0, -1, -1] }
  ],
  "7": [ // Dominant 7
    { name: "E7 Shape", rootString: 5, offsets: [0, 3, 1, 2, 2, 0] }, // or 0 0 1 0 2 0
    { name: "A7 Shape", rootString: 4, offsets: [3, 2, 0, 2, 0, -1] },
    { name: "D7 Shape", rootString: 3, offsets: [2, 1, 2, 0, -1, -1] },
    { name: "C7 Shape", rootString: 4, offsets: [0, 1, 3, 2, 3, -1] }
  ]
};

export const COMMON_PROGRESSIONS: Record<string, string[]> = {
  "Classic 2-5-1 (Major)": ["ii", "V", "I"],
  "Doo-Wop (1-6-4-5)": ["I", "vi", "IV", "V"],
  "Pop Punk (1-5-6-4)": ["I", "V", "vi", "IV"],
  "Minor 2-5-1": ["ii", "V", "i"],
  "Andalusian (Minor)": ["i", "VII", "VI", "V"], // i - bVII - bVI - V7
};

export function getChordFromDegree(degree: string): { interval: number; type: string } {
  switch (degree) {
    case 'I': return { interval: 0, type: 'Major' };
    case 'i': return { interval: 0, type: 'Minor' };

    case 'bII': return { interval: 1, type: 'Major' };
    case 'ii': return { interval: 2, type: 'Minor' };
    case 'II': return { interval: 2, type: 'Major' };

    case 'bIII': return { interval: 3, type: 'Major' };
    case 'iii': return { interval: 4, type: 'Minor' };
    case 'III': return { interval: 4, type: 'Major' }; // Corrected from 3 to 4 (Major 3rd)

    case 'IV': return { interval: 5, type: 'Major' };
    case 'iv': return { interval: 5, type: 'Minor' };

    case 'bV': return { interval: 6, type: 'Major' }; // Tritone sub context
    case 'V': return { interval: 7, type: 'Major' }; // Default Major (Dominant context usually)
    case 'v': return { interval: 7, type: 'Minor' };

    case 'bVI': return { interval: 8, type: 'Major' };
    case 'vi': return { interval: 9, type: 'Minor' };
    case 'VI': return { interval: 9, type: 'Major' }; // Corrected from 8 to 9 (Major 6th)

    case 'bVII': return { interval: 10, type: 'Major' };
    case 'VII': return { interval: 11, type: 'Major' }; // Major 7th interval
    case 'vii': return { interval: 11, type: 'Minor' }; // Dim/Minor

    default: return { interval: 0, type: 'Major' };
  }
}

export function getChordTones(chordType: string, root: number): number[] {
  // Simple map for chord intervals relative to root
  const chordIntervals: Record<string, number[]> = {
    "Major": [0, 4, 7],
    "Minor": [0, 3, 7],
    "Major 7": [0, 4, 7, 11],
    "Dominant 7": [0, 4, 7, 10],
    "Minor 7": [0, 3, 7, 10],
    "7": [0, 4, 7, 10] // Alias for Dominant 7
  };

  const intervals = chordIntervals[chordType] || [0, 4, 7];
  return intervals.map(i => (root + i) % 12);
}
