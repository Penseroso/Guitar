export interface ChordShape {
    name: string;
    baseRootString: number; // 0-5 (Index in TUNING array)
    offsets: (number | null)[]; // Fret offsets for strings 0-5 (High E -> Low E), null means Mute
}

export type Mode = 'scale' | 'chord' | 'progression';

export interface FretboardProps {
    tuning?: number[];
    activeNotes: number[];
    rootNote: number;
    chordTones: number[];
    modifierNotes: number[];
    showChordTones: boolean;
    showIntervals?: boolean;
    fingering?: Fingering[];
}

export interface Fingering {
    string: number;
    fret: number;
    noteIdx: number;
    label?: string;
}
