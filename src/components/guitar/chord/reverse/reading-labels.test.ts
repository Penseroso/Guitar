import { describe, expect, it } from 'vitest';
import { inferChordReadings } from '@/domain/chord/reverse/readings';
import type { EnteredShape } from '@/domain/chord/reverse/enteredShape';
import { badgeFor, describeDyad, playedTone, titleFor } from './reading-labels';

function fixture(bassPitchClass: number, pitchClasses: number[]): EnteredShape {
    return {
        states: [-1, -1, -1, -1, -1, -1],
        notes: pitchClasses.map((pitchClass, index) => ({ string: 0, fret: 0, midi: index, pitchClass })),
        bass: { midi: 0, pitchClass: bassPitchClass },
        pitchClasses,
        doubled: [],
    };
}

describe('reading-labels', () => {
    it('spells a root-position title with no slash', () => {
        const inference = inferChordReadings(fixture(0, [0, 4, 7]));
        if (inference.status !== 'named') throw new Error('expected named');
        expect(titleFor(inference.best[0])).toBe('C');
    });

    it('keeps the played bass in an inversion title', () => {
        const inference = inferChordReadings(fixture(4, [0, 4, 7, 11]));
        if (inference.status !== 'named') throw new Error('expected named');
        const cmaj7 = inference.best.find((reading) => reading.chordId === 'major-7')!;
        expect(titleFor(cmaj7)).toBe('Cmaj7/E');
    });

    it('keeps literal altered degrees and the actual octave in the note strip', () => {
        const inference = inferChordReadings(fixture(0, [0, 4, 8, 10]));
        if (inference.status !== 'named') throw new Error('expected named');
        const c7sharp5 = inference.best.find((reading) => reading.chordId === 'dominant-7-sharp-5')!;
        expect(playedTone({ string: 0, fret: 4, midi: 68, pitchClass: 8 }, c7sharp5))
            .toEqual({ name: 'G♯4', degree: '♯5' });
    });

    it('shows an incomplete-formula omission as a short badge', () => {
        // A doubled root (C, E, C) keeps this at 3 sounding notes so it goes through chord
        // inference rather than the two-note dyad path — root+3rd present, 5th omitted.
        const shape: EnteredShape = {
            states: [-1, -1, -1, -1, -1, -1],
            notes: [
                { string: 0, fret: 0, midi: 0, pitchClass: 0 },
                { string: 1, fret: 0, midi: 1, pitchClass: 4 },
                { string: 2, fret: 0, midi: 2, pitchClass: 0 },
            ],
            bass: { midi: 0, pitchClass: 0 },
            pitchClasses: [0, 4],
            doubled: [{ pitchClass: 0, count: 2 }],
        };
        const inference = inferChordReadings(shape);
        if (inference.status !== 'named') throw new Error('expected named');
        expect(badgeFor(inference.best[0])).toBe('Omits 5');
    });

    it('shows an added tone as a short badge', () => {
        const inference = inferChordReadings(fixture(0, [0, 4, 7, 6])); // C major plus an added F#
        if (inference.status !== 'named') throw new Error('expected named');
        const added = inference.best.find((reading) => reading.chordId === 'major' && reading.rootPitchClass === 0)!;
        expect(added).toMatchObject({ tier: 'added-tone', added: 6 });
        expect(badgeFor(added)).toBe('Added F♯');
        expect(playedTone({ string: 0, fret: 2, midi: 66, pitchClass: 6 }, added)).toEqual({ name: 'F♯4', degree: 'Added' });
    });

    it('describes a dyad bidirectionally, using the same complementary pair for the reverse direction', () => {
        const inference = inferChordReadings(fixture(0, [0, 4])); // C, E — bass C
        expect(inference.status).toBe('dyad');
        if (inference.status !== 'dyad') return;
        const description = describeDyad(inference.dyad);
        expect(description.bassToOtherLine).toBe('C → E: M3');
        expect(description.otherToBassLine).toBe('E → C: m6');
    });

    it('describes an octave dyad distinctly from a true unison', () => {
        const octave = describeDyad({ bass: { pitchClass: 0, midi: 40 }, other: { pitchClass: 0, midi: 52 }, bassToOther: 'octave', otherToBass: 'octave' });
        expect(octave.bassToOtherLine).toBe('C → C: Octave');
        const unison = describeDyad({ bass: { pitchClass: 0, midi: 40 }, other: { pitchClass: 0, midi: 40 }, bassToOther: 'unison', otherToBass: 'unison' });
        expect(unison.bassToOtherLine).toBe('C → C: Unison');
    });
});
