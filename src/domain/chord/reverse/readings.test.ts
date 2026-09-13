import { describe, expect, it } from 'vitest';
import type { EnteredShape } from './enteredShape';
import { inferChordReadings } from './readings';

// Small, hand-built fixtures — readings.ts only reads shape.notes.length, shape.pitchClasses and
// shape.bass, so tests construct EnteredShape directly rather than deriving real fret positions.
function fixture(bassPitchClass: number | null, pitchClasses: number[]): EnteredShape {
    return {
        states: [-1, -1, -1, -1, -1, -1],
        notes: pitchClasses.map((pitchClass, index) => ({ string: 0, fret: 0, midi: index, pitchClass })),
        bass: bassPitchClass === null ? null : { midi: 0, pitchClass: bassPitchClass },
        pitchClasses,
        doubled: [],
    };
}

describe('inferChordReadings', () => {
    it('reports empty and too-few-notes before any registry lookup', () => {
        expect(inferChordReadings(fixture(null, []))).toEqual({ status: 'empty', shape: fixture(null, []) });
        expect(inferChordReadings(fixture(0, [0])).status).toBe('too-few-notes');
    });

    it('names a plain root-position C major triad directly, with no omissions', () => {
        const inference = inferChordReadings(fixture(0, [0, 4, 7])); // C E G
        expect(inference.status).toBe('named');
        if (inference.status !== 'named') return;
        expect(inference.best).toHaveLength(1);
        expect(inference.best[0]).toMatchObject({ chordId: 'major', rootPitchClass: 0, tier: 'direct', omitted: [] });
        expect(inference.best[0].bass).toMatchObject({ relation: 'root', inversion: null });
    });

    it('spells Cmaj7/E as a first-inversion chord-tone bass, not a synthetic reading', () => {
        const inference = inferChordReadings(fixture(4, [0, 4, 7, 11])); // bass E, notes C E G B
        expect(inference.status).toBe('named');
        if (inference.status !== 'named') return;
        const cmaj7 = inference.best.find((reading) => reading.chordId === 'major-7' && reading.rootPitchClass === 0);
        expect(cmaj7).toBeDefined();
        expect(cmaj7).toMatchObject({ tier: 'direct', bass: { relation: 'chord-tone', degree: '3', inversion: 'first' } });
    });

    it('leads with Am7 (bass is its root) but still surfaces and links the C6 reading of the same notes', () => {
        const inference = inferChordReadings(fixture(9, [9, 0, 4, 7])); // bass A: A C E G
        expect(inference.status).toBe('named');
        if (inference.status !== 'named') return;
        const aMinor7 = inference.best.find((reading) => reading.chordId === 'minor-7' && reading.rootPitchClass === 9);
        const cSix = inference.other.find((reading) => reading.chordId === 'major-6' && reading.rootPitchClass === 0);
        expect(aMinor7).toMatchObject({ tier: 'direct', bass: { relation: 'root' } });
        expect(cSix).toMatchObject({ tier: 'direct', bass: { relation: 'chord-tone', degree: '6', inversion: null } });
        expect(aMinor7!.sameNotesAs).toContain(cSix!.key);
        expect(cSix!.sameNotesAs).toContain(aMinor7!.key);
    });

    it('leads with the root-position diminished-7 reading but links all four rotations as the same notes', () => {
        const inference = inferChordReadings(fixture(0, [0, 3, 6, 9])); // C Eb Gb A(Bbb)
        expect(inference.status).toBe('named');
        if (inference.status !== 'named') return;
        expect(inference.best).toHaveLength(1);
        expect(inference.best[0]).toMatchObject({ chordId: 'diminished-7', rootPitchClass: 0, bass: { relation: 'root' } });
        const allDim7 = [...inference.best, ...inference.other].filter((reading) => reading.chordId === 'diminished-7');
        expect(new Set(allDim7.map((reading) => reading.rootPitchClass))).toEqual(new Set([0, 3, 6, 9]));
        for (const reading of allDim7) expect(reading.sameNotesAs).toHaveLength(3);
    });

    it('reads a bare third as an incomplete triad (no 5th) rather than rejecting it', () => {
        const inference = inferChordReadings(fixture(0, [0, 4])); // C E
        expect(inference.status).toBe('named');
        if (inference.status !== 'named') return;
        const cMajorNo5 = inference.best.find((reading) => reading.chordId === 'major' && reading.rootPitchClass === 0);
        expect(cMajorNo5).toMatchObject({ tier: 'incomplete', omitted: ['5'] });
    });

    it('prefers a complete triad plus a suspended reading over a bare power chord for C+G', () => {
        const inference = inferChordReadings(fixture(0, [0, 7])); // C G
        expect(inference.status).toBe('named');
        if (inference.status !== 'named') return;
        expect(inference.best[0]).toMatchObject({ chordId: 'power-5', rootPitchClass: 0, tier: 'direct' });
    });

    it('resolves an add9 registry reading directly, suppressing the synthetic "plus added D"', () => {
        const inference = inferChordReadings(fixture(0, [0, 4, 7, 2])); // C E G D
        expect(inference.status).toBe('named');
        if (inference.status !== 'named') return;
        const add9 = [...inference.best, ...inference.other].find((reading) => reading.chordId === 'add9' && reading.rootPitchClass === 0);
        expect(add9).toMatchObject({ tier: 'direct' });
        const suppressedMajor = [...inference.best, ...inference.other, ...inference.looser]
            .find((reading) => reading.chordId === 'major' && reading.rootPitchClass === 0);
        expect(suppressedMajor).toBeUndefined();
    });

    it('names Cm6 directly and links Am7b5/C as its first-inversion equivalent', () => {
        const inference = inferChordReadings(fixture(0, [0, 3, 7, 9])); // bass C: C Eb G A
        expect(inference.status).toBe('named');
        if (inference.status !== 'named') return;
        const cm6 = inference.best.find((reading) => reading.chordId === 'minor-6' && reading.rootPitchClass === 0);
        expect(cm6).toMatchObject({ tier: 'direct', bass: { relation: 'root' } });
        const aHalfDim = [...inference.best, ...inference.other]
            .find((reading) => reading.chordId === 'half-diminished-7' && reading.rootPitchClass === 9);
        expect(aHalfDim).toMatchObject({ tier: 'direct', bass: { relation: 'chord-tone', inversion: 'first' } });
        expect(cm6!.sameNotesAs).toContain(aHalfDim!.key);
    });

    it('names CmM7 directly', () => {
        const inference = inferChordReadings(fixture(0, [0, 3, 7, 11])); // C Eb G B
        expect(inference.status).toBe('named');
        if (inference.status !== 'named') return;
        const cmM7 = inference.best.find((reading) => reading.chordId === 'minor-major-7' && reading.rootPitchClass === 0);
        expect(cmM7).toMatchObject({ tier: 'direct' });
    });

    it('names C7sus4 directly as the unique explanation of C F G Bb', () => {
        const inference = inferChordReadings(fixture(0, [0, 5, 7, 10])); // C F G Bb
        expect(inference.status).toBe('named');
        if (inference.status !== 'named') return;
        expect(inference.best).toHaveLength(1);
        expect(inference.best[0]).toMatchObject({ chordId: 'dominant-7-sus4', rootPitchClass: 0, tier: 'direct' });
    });

    it('keeps C7#5 as its own identity and suppresses the incomplete augmented-triad reading of the same root', () => {
        const inference = inferChordReadings(fixture(0, [0, 4, 8, 10])); // C E G# Bb
        expect(inference.status).toBe('named');
        if (inference.status !== 'named') return;
        expect(inference.best[0]).toMatchObject({ chordId: 'dominant-7-sharp-5', rootPitchClass: 0, tier: 'direct' });
        const suppressedAug = [...inference.best, ...inference.other, ...inference.looser]
            .find((reading) => reading.chordId === 'augmented' && reading.rootPitchClass === 0);
        expect(suppressedAug).toBeUndefined();
    });

    it('reads C7b5 and its tritone-symmetric Gb7b5/C as linked, distinct readings (no #11 aliasing)', () => {
        const inference = inferChordReadings(fixture(0, [0, 4, 6, 10])); // C E Gb Bb
        expect(inference.status).toBe('named');
        if (inference.status !== 'named') return;
        const c7b5 = inference.best.find((reading) => reading.chordId === 'dominant-7-flat-5' && reading.rootPitchClass === 0);
        expect(c7b5).toMatchObject({ tier: 'direct', bass: { relation: 'root' } });
        const gb7b5 = [...inference.best, ...inference.other]
            .find((reading) => reading.chordId === 'dominant-7-flat-5' && reading.rootPitchClass === 6);
        expect(gb7b5).toMatchObject({ tier: 'direct', bass: { relation: 'chord-tone', inversion: 'second' } });
        expect(c7b5!.sameNotesAs).toContain(gb7b5!.key);
    });

    it('never assigns an inversion ordinal to a 6th-in-the-bass reading (extension role, not seventh)', () => {
        const inference = inferChordReadings(fixture(9, [0, 3, 7, 9])); // bass A: C Eb G A (Cm6/A)
        expect(inference.status).toBe('named');
        if (inference.status !== 'named') return;
        const cm6OverA = [...inference.best, ...inference.other]
            .find((reading) => reading.chordId === 'minor-6' && reading.rootPitchClass === 0);
        expect(cm6OverA).toBeDefined();
        expect(cm6OverA!.bass).toMatchObject({ relation: 'chord-tone', degree: '6', inversion: null });
    });

    it('reports no-clear-name when every pitch class sounds (no formula can leave at most one extra)', () => {
        const inference = inferChordReadings(fixture(0, Array.from({ length: 12 }, (_, index) => index)));
        expect(inference.status).toBe('no-clear-name');
    });

    it('produces identical readings regardless of the input pitch-class order', () => {
        const readingsOnly = (inference: ReturnType<typeof inferChordReadings>) =>
            inference.status === 'named'
                ? { best: inference.best, other: inference.other, looser: inference.looser }
                : inference.status;
        const a = inferChordReadings(fixture(4, [4, 0, 7, 11]));
        const b = inferChordReadings(fixture(4, [0, 11, 7, 4]));
        expect(readingsOnly(a)).toEqual(readingsOnly(b));
    });

    it('resolves every reading back to a real registry entry via engineEntry', async () => {
        const { engineEntry } = await import('../engine/catalog');
        const inference = inferChordReadings(fixture(0, [0, 4, 7, 11]));
        expect(inference.status).toBe('named');
        if (inference.status !== 'named') return;
        for (const reading of [...inference.best, ...inference.other, ...inference.looser]) {
            expect(() => engineEntry(reading.chordId)).not.toThrow();
        }
    });
});
