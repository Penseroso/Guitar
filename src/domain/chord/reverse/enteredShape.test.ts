import { describe, expect, it } from 'vitest';
import { deriveEnteredShape, type ShapeStates } from './enteredShape';

describe('deriveEnteredShape', () => {
    it('treats muted strings as absent and open strings as sounding', () => {
        const shape = deriveEnteredShape([-1, -1, -1, -1, -1, 0]); // low E open only
        expect(shape.notes).toHaveLength(1);
        expect(shape.notes[0]).toMatchObject({ string: 5, fret: 0, midi: 40, pitchClass: 4 });
        expect(shape.bass).toEqual({ midi: 40, pitchClass: 4 });
    });

    it('finds the bass as the lowest sounding MIDI note, not string order', () => {
        // x32010: A open(A2=45,pc9), D2/fret2(pc9? no)... use a concrete open C shape.
        const shape = deriveEnteredShape([0, 1, 0, 2, 3, -1]); // open C shape, low E muted
        expect(shape.bass?.pitchClass).toBe(0); // C is the lowest sounding note (C on the A string)
        expect(shape.notes.map((note) => note.midi)).toEqual([...shape.notes.map((note) => note.midi)].sort((a, b) => a - b));
    });

    it('counts doubled pitch classes without merging them out of the note list', () => {
        const shape = deriveEnteredShape([0, 0, 0, 2, 3, -1]); // two open E strings (E4, E2) plus fretted C/G/D2->A? doesn't matter, just check doubling of E
        const doubledPitchClasses = shape.doubled.map((entry) => entry.pitchClass);
        expect(doubledPitchClasses).toContain(4); // E
        expect(shape.notes.filter((note) => note.pitchClass === 4)).toHaveLength(2);
    });

    it('is stable across the six-string order regardless of which strings are muted', () => {
        const allMuted: ShapeStates = [-1, -1, -1, -1, -1, -1];
        const shape = deriveEnteredShape(allMuted);
        expect(shape.notes).toEqual([]);
        expect(shape.bass).toBeNull();
        expect(shape.pitchClasses).toEqual([]);
    });

    it('lists unique pitch classes starting from the bass', () => {
        const shape = deriveEnteredShape([0, 1, 0, 2, 3, -1]); // open C shape: bass C, then E, G, C(oct), E(oct)
        expect(shape.pitchClasses[0]).toBe(shape.bass?.pitchClass);
        expect(new Set(shape.pitchClasses).size).toBe(shape.pitchClasses.length);
    });
});
