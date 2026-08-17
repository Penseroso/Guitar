import { describe, expect, it } from 'vitest';

import { getVoicingTechniqueTag } from './deductiveRanking';
import { getDeductiveChordSurfaceVoicingsForChord } from './rankedVoicingSearch';

describe('getDeductiveChordSurfaceVoicingsForChord', () => {
    it('returns at most maxCandidates results, ranked best-first', () => {
        const candidates = getDeductiveChordSurfaceVoicingsForChord('major', 0, { maxCandidates: 12 });

        expect(candidates.length).toBeGreaterThan(0);
        expect(candidates.length).toBeLessThanOrEqual(12);
        for (let i = 1; i < candidates.length; i++) {
            expect(candidates[i - 1].score).toBeGreaterThanOrEqual(candidates[i].score);
        }
    });

    it('never returns the same physical shape twice even though multiple styles are searched', () => {
        const candidates = getDeductiveChordSurfaceVoicingsForChord('dominant-7', 0, { maxCandidates: 100 });

        const signatures = candidates.map((candidate) =>
            candidate.voicing.notes
                .filter((note) => !note.isMuted)
                .map((note) => `${note.string}:${note.fret}`)
                .sort()
                .join('|')
        );
        expect(new Set(signatures).size).toBe(signatures.length);
    });

    it('works for the newly-added augmented and diminished triads', () => {
        const augmented = getDeductiveChordSurfaceVoicingsForChord('augmented', 0, { maxCandidates: 12 });
        const diminished = getDeductiveChordSurfaceVoicingsForChord('diminished', 0, { maxCandidates: 12 });

        expect(augmented.length).toBeGreaterThan(0);
        expect(diminished.length).toBeGreaterThan(0);
    });

    it('accepts a chord registry entry directly, not just a string id (matches the old API shape)', () => {
        // Mirrors how voicings.ts's getChordSurfaceVoicingsForChord accepts string | ChordRegistryEntry.
        const byString = getDeductiveChordSurfaceVoicingsForChord('minor-7', 2, { maxCandidates: 5 });
        expect(byString.length).toBeGreaterThan(0);
    });

    it('never lets one dominant technique crowd every other technique out of a tight cap', () => {
        // Regression: a plain global-rank-then-slice would return only the single best-scoring
        // technique at a tight maxCandidates for several chords (verified: dominant-7's naive
        // top-4 was 100% Open, dropping Barre/Shell/Standard entirely even though good voicings
        // of each exist). Every technique present in the full pool must survive a tight cap.
        for (const chordId of ['dominant-7', 'major-7', 'minor-7']) {
            const full = getDeductiveChordSurfaceVoicingsForChord(chordId, 0, { maxCandidates: 200 });
            const fullTechniques = new Set(full.map((c) => getVoicingTechniqueTag(c.voicing)));

            const capped = getDeductiveChordSurfaceVoicingsForChord(chordId, 0, { maxCandidates: 4 });
            const cappedTechniques = new Set(capped.map((c) => getVoicingTechniqueTag(c.voicing)));

            expect(cappedTechniques).toEqual(fullTechniques);
        }
    });

    it('respects a custom maxFret bound across all styles', () => {
        const candidates = getDeductiveChordSurfaceVoicingsForChord('major-7', 0, { maxFret: 4, maxCandidates: 50 });

        for (const candidate of candidates) {
            for (const note of candidate.voicing.notes.filter((n) => !n.isMuted)) {
                expect(note.fret).toBeLessThanOrEqual(4);
            }
        }
    });
});
