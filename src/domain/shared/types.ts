import type { PlayableDoubleStop } from '../scale/types';

export type Mode = 'scale' | 'chord' | 'progression';

export interface Fingering {
    string: number;
    fret: number;
    noteIdx: number;
    label?: string;
}

export interface FretboardProps {
    tuning?: number[];
    activeNotes: number[];
    rootNote: number;
    chordTones: number[];
    modifierNotes: number[];
    showChordTones: boolean;
    showIntervals?: boolean;
    scaleIntervalLabels?: Partial<Record<number, string>>;
    fingering?: Fingering[];
    doubleStops?: PlayableDoubleStop[];
}
