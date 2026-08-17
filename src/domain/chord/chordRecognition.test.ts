import { describe, expect, it } from 'vitest';

import { identifyChordsForPitchClasses } from './chordRecognition';

describe('identifyChordsForPitchClasses', () => {
    it('returns nothing for an empty input', () => {
        expect(identifyChordsForPitchClasses([])).toEqual([]);
    });

    it('identifies a plain C major triad with full confidence', () => {
        const candidates = identifyChordsForPitchClasses([0, 4, 7]); // C, E, G

        const cMajor = candidates.find(
            (candidate) => candidate.definition.id === 'major' && candidate.definition.rootPitchClass === 0
        );
        expect(cMajor).toBeDefined();
        expect(cMajor?.confidence).toBe(1);
        expect(cMajor?.missingPitchClasses).toEqual([]);
        expect(cMajor?.extraPitchClasses).toEqual([]);
    });

    it('ties Am7 and C6 at the top confidence, since they are literally the same four notes', () => {
        // A, C, E, G — the classic minor-7th / relative major-6th ambiguity.
        const candidates = identifyChordsForPitchClasses([9, 0, 4, 7]);

        const aMinor7 = candidates.find(
            (candidate) => candidate.definition.id === 'minor-7' && candidate.definition.rootPitchClass === 9
        );
        const cSix = candidates.find(
            (candidate) => candidate.definition.id === 'major-6' && candidate.definition.rootPitchClass === 0
        );

        expect(aMinor7).toBeDefined();
        expect(cSix).toBeDefined();
        expect(aMinor7?.confidence).toBe(1);
        expect(cSix?.confidence).toBe(1);

        // Both should be among the top-scored candidates (no arbitrary tie-break favoring one).
        const topScore = candidates[0].confidence;
        expect(aMinor7?.confidence).toBe(topScore);
        expect(cSix?.confidence).toBe(topScore);
    });

    it('excludes readings that are missing a required degree', () => {
        // Just C and G (no 3rd) can't be read as a C major triad — the 3rd is required.
        const candidates = identifyChordsForPitchClasses([0, 7]);

        const cMajor = candidates.find(
            (candidate) => candidate.definition.id === 'major' && candidate.definition.rootPitchClass === 0
        );
        expect(cMajor).toBeUndefined();
    });

    it('scores a reading with an out-of-formula extra note lower than an exact match', () => {
        const exact = identifyChordsForPitchClasses([0, 4, 7]);
        const withExtraNote = identifyChordsForPitchClasses([0, 4, 7, 1]); // C major plus a stray Db

        const exactMajor = exact.find((c) => c.definition.id === 'major' && c.definition.rootPitchClass === 0)!;
        const noisyMajor = withExtraNote.find((c) => c.definition.id === 'major' && c.definition.rootPitchClass === 0)!;

        expect(noisyMajor.extraPitchClasses).toEqual([1]);
        expect(noisyMajor.confidence!).toBeLessThan(exactMajor.confidence!);
    });

    it('sorts results by descending confidence', () => {
        const candidates = identifyChordsForPitchClasses([0, 4, 7, 10]); // C dominant-7 shape
        for (let i = 1; i < candidates.length; i++) {
            expect(candidates[i - 1].confidence!).toBeGreaterThanOrEqual(candidates[i].confidence!);
        }
    });
});
