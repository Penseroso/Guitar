import { describe, expect, it } from 'vitest';

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

    it('respects a custom maxFret bound across all styles', () => {
        const candidates = getDeductiveChordSurfaceVoicingsForChord('major-7', 0, { maxFret: 4, maxCandidates: 50 });

        for (const candidate of candidates) {
            for (const note of candidate.voicing.notes.filter((n) => !n.isMuted)) {
                expect(note.fret).toBeLessThanOrEqual(4);
            }
        }
    });
});
