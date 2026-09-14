import { describe, expect, it } from 'vitest';
import { inferChordReadings } from '@/domain/chord/reverse/readings';
import type { EnteredShape } from '@/domain/chord/reverse/enteredShape';
import { badgeFor, bassNoteLetter, buildTitleIndex, describeDyad, explainReading, soundingIntervalLabels, soundingNoteLetters, titleFor } from './reading-labels';

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

    it('spells an inversion title as root/bass and lists sounding tones in formula order', () => {
        const inference = inferChordReadings(fixture(4, [0, 4, 7, 11]));
        if (inference.status !== 'named') throw new Error('expected named');
        const cmaj7 = inference.best.find((reading) => reading.chordId === 'major-7')!;
        expect(titleFor(cmaj7)).toBe('Cmaj7/E');
        expect(soundingNoteLetters(cmaj7)).toEqual(['C', 'E', 'G', 'B']);
        expect(bassNoteLetter(cmaj7)).toBe('E');
    });

    it('gives the future-compatible bass-inversion line for Cmaj7/E', () => {
        const inference = inferChordReadings(fixture(4, [0, 4, 7, 11]));
        if (inference.status !== 'named') throw new Error('expected named');
        const cmaj7 = inference.best.find((reading) => reading.chordId === 'major-7')!;
        const explanation = explainReading(cmaj7, buildTitleIndex(inference.best));
        expect(explanation.bassLine).toBe('E in bass → first inversion');
    });

    it('shows the literal formula degree, not a role word that would hide an alteration', () => {
        // C7#5: G# is the formula 5th, but "5th" alone would silently drop the sharp.
        const inference = inferChordReadings(fixture(0, [0, 4, 8, 10]));
        if (inference.status !== 'named') throw new Error('expected named');
        const c7sharp5 = inference.best.find((reading) => reading.chordId === 'dominant-7-sharp-5')!;
        expect(soundingIntervalLabels(c7sharp5)).toEqual(['Root', '3', '♯5', '♭7']);
        expect(soundingIntervalLabels(c7sharp5)).not.toContain('5th');
        expect(soundingIntervalLabels(c7sharp5)).not.toContain('7th');
    });

    it('gives no ordinal claim for a 6th-in-the-bass reading', () => {
        const inference = inferChordReadings(fixture(9, [0, 3, 7, 9]));
        if (inference.status !== 'named') throw new Error('expected named');
        const cm6OverA = [...inference.best, ...inference.other].find((reading) => reading.chordId === 'minor-6')!;
        const explanation = explainReading(cm6OverA, new Map());
        expect(explanation.bassLine).toBe('A in bass');
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
        expect(badgeFor(added)).toBe('Added F#');
    });

    it('names cross-linked same-notes readings by title, not by internal key', () => {
        const inference = inferChordReadings(fixture(9, [9, 0, 4, 7]));
        if (inference.status !== 'named') throw new Error('expected named');
        const aMinor7 = inference.best.find((reading) => reading.chordId === 'minor-7')!;
        const titleByKey = buildTitleIndex([...inference.best, ...inference.other]);
        const explanation = explainReading(aMinor7, titleByKey);
        // Bass is A here, not C, so the linked reading is heard as C6 with its 6th in the bass.
        expect(explanation.sameNotesLine).toBe('Same notes also named: C6/A');
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
