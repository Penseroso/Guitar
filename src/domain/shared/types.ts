import type { PlayableDoubleStop } from '../scale/types';

export type Mode = 'scale' | 'chord' | 'harmony';

export interface Fingering {
    string: number;
    fret: number;
    noteIdx: number;
    label?: string;
}

export interface FretboardProps {
    /** Optional semantic annotations supplied by Scale analysis; no pitch-class role guessing. */
    noteAnnotations?: Partial<Record<number, FretboardNoteAnnotation>>;
    focusedPitchClass?: number | null;
    fretRange?: [number, number];
    visibleStrings?: number[];
    noteLabelsByPosition?: Partial<Record<string, string>>;
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
    /** Optional: makes every string/fret cell (including the nut) clickable/focusable, for
     *  direct-manipulation input surfaces (e.g. reverse chord-shape entry). Purely additive —
     *  omitting it leaves the fretboard exactly as display-only as before. */
    onCellClick?: (string: number, fret: number) => void;
}

export interface FretboardNoteAnnotation {
    noteName: string;
    intervalLabel: string;
    role: 'root' | 'third' | 'fifth' | 'seventh' | 'chord-tone' | 'scale';
    characteristic?: boolean;
}
