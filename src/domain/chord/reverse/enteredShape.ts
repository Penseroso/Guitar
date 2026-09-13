import type { GuitarStringIndex, PitchClass } from '../types';
import { STANDARD_GUITAR_STRING_MIDI_PITCHES } from '../../shared/tuning';

// -1 = muted/unplayed, 0 = open, >0 = fretted. Same shape/order convention as the forward
// engine's StructuralCandidate.states: string index 0 is the high-E side (see shared/tuning.ts).
export type ShapeStates = readonly [number, number, number, number, number, number];

export const MUTED_STRING = -1;
export const OPEN_STRING = 0;
export const SILENT_SHAPE_STATES: ShapeStates = [-1, -1, -1, -1, -1, -1];

export interface EnteredShapeNote {
    string: GuitarStringIndex;
    fret: number;
    midi: number;
    pitchClass: PitchClass;
}

export interface EnteredShape {
    states: ShapeStates;
    /** Sounding notes, ascending by MIDI pitch. */
    notes: readonly EnteredShapeNote[];
    bass: { midi: number; pitchClass: PitchClass } | null;
    /** Unique pitch classes, starting from the bass pitch class. */
    pitchClasses: readonly PitchClass[];
    doubled: readonly { pitchClass: PitchClass; count: number }[];
}

function normalizePitchClass(value: number): PitchClass {
    return ((value % 12) + 12) % 12;
}

export function deriveEnteredShape(states: ShapeStates): EnteredShape {
    const notes: EnteredShapeNote[] = [];
    states.forEach((fret, string) => {
        if (fret < 0) return;
        const midi = STANDARD_GUITAR_STRING_MIDI_PITCHES[string] + fret;
        notes.push({ string: string as GuitarStringIndex, fret, midi, pitchClass: normalizePitchClass(midi) });
    });
    notes.sort((a, b) => a.midi - b.midi);

    const bass = notes.length > 0 ? { midi: notes[0].midi, pitchClass: notes[0].pitchClass } : null;

    const counts = new Map<PitchClass, number>();
    for (const note of notes) counts.set(note.pitchClass, (counts.get(note.pitchClass) ?? 0) + 1);

    const pitchClasses: PitchClass[] = [];
    if (bass) {
        pitchClasses.push(bass.pitchClass);
        for (const note of notes) if (!pitchClasses.includes(note.pitchClass)) pitchClasses.push(note.pitchClass);
    }

    const doubled = Array.from(counts.entries())
        .filter(([, count]) => count >= 2)
        .map(([pitchClass, count]) => ({ pitchClass, count }));

    return { states, notes, bass, pitchClasses, doubled };
}
