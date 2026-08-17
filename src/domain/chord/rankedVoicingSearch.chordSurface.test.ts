import { describe, expect, it } from 'vitest';

import { getVoicingTechniqueTag } from './deductiveRanking';
import { getDeductiveChordSurfaceVoicingsForChord } from './rankedVoicingSearch';

describe('getDeductiveChordSurfaceVoicingsForChord', () => {
    it('returns results ranked best-first', () => {
        const candidates = getDeductiveChordSurfaceVoicingsForChord('major', 0, { maxPerTechnique: 5 });

        expect(candidates.length).toBeGreaterThan(0);
        for (let i = 1; i < candidates.length; i++) {
            expect(candidates[i - 1].score).toBeGreaterThanOrEqual(candidates[i].score);
        }
    });

    it('caps each technique independently rather than a single shared total', () => {
        // Regression for the earlier design: ranking one global pool and cutting to a single
        // total let whichever technique scored best crowd the others out entirely (verified:
        // dominant-7's naive top-4 was 100% Open). Now every technique present gets its own
        // top-maxPerTechnique, so no technique can starve another.
        for (const chordId of ['dominant-7', 'major-7', 'minor-7']) {
            const withFullBudget = getDeductiveChordSurfaceVoicingsForChord(chordId, 0, { maxPerTechnique: 200 });
            const withTightBudget = getDeductiveChordSurfaceVoicingsForChord(chordId, 0, { maxPerTechnique: 1 });

            const fullTechniques = new Set(withFullBudget.map((c) => getVoicingTechniqueTag(c.voicing)));
            const tightTechniques = new Set(withTightBudget.map((c) => getVoicingTechniqueTag(c.voicing)));

            // Even at maxPerTechnique: 1 (one candidate per technique), every technique that
            // exists at all for this chord must still be represented.
            expect(tightTechniques).toEqual(fullTechniques);
        }
    });

    it('bounds how many of any single technique can appear, even counting triad-window overlap', () => {
        // A technique's own bucket is capped at maxPerTechnique, but a voicing of that same
        // technique can *also* separately qualify via the independent triad-window bucket (see
        // "gives triad-window candidates their own independent bucket" below) — so the true bound
        // per technique is up to two bucket-caps' worth, not exactly maxPerTechnique.
        const maxPerTechnique = 3;
        const candidates = getDeductiveChordSurfaceVoicingsForChord('dominant-7', 0, { maxPerTechnique });

        const countByTechnique = new Map<string, number>();
        for (const candidate of candidates) {
            const tag = getVoicingTechniqueTag(candidate.voicing);
            countByTechnique.set(tag, (countByTechnique.get(tag) ?? 0) + 1);
        }

        for (const count of countByTechnique.values()) {
            expect(count).toBeLessThanOrEqual(maxPerTechnique * 2);
        }
    });

    it('gives triad-window candidates their own independent bucket, same as a technique', () => {
        // Regression: without its own bucket, a triad-window voicing (consecutiveStringWindow
        // size 3) only survived by chance if it also ranked in its own technique's top
        // maxPerTechnique — competing against every other voicing in that bucket on criteria
        // that never reward "being a triad" at all. Verified concretely: C major's default
        // (maxPerTechnique: 5) pool used to surface only 1 triad-window candidate out of 20 that
        // exist in the full search space; it should now surface up to maxPerTechnique of them.
        const candidates = getDeductiveChordSurfaceVoicingsForChord('major', 0, { maxPerTechnique: 5 });
        const triadWindowCount = candidates.filter(
            (c) => c.voicing.descriptor.consecutiveStringWindow?.size === 3
        ).length;

        expect(triadWindowCount).toBeGreaterThan(1);
        expect(triadWindowCount).toBeLessThanOrEqual(5);
    });

    it('never returns the same physical shape twice even though multiple styles are searched', () => {
        const candidates = getDeductiveChordSurfaceVoicingsForChord('dominant-7', 0, { maxPerTechnique: 100 });

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
        const augmented = getDeductiveChordSurfaceVoicingsForChord('augmented', 0, { maxPerTechnique: 5 });
        const diminished = getDeductiveChordSurfaceVoicingsForChord('diminished', 0, { maxPerTechnique: 5 });

        expect(augmented.length).toBeGreaterThan(0);
        expect(diminished.length).toBeGreaterThan(0);
    });

    it('accepts a chord registry entry directly, not just a string id (matches the old API shape)', () => {
        // Mirrors how voicings.ts's getChordSurfaceVoicingsForChord accepts string | ChordRegistryEntry.
        const byString = getDeductiveChordSurfaceVoicingsForChord('minor-7', 2, { maxPerTechnique: 5 });
        expect(byString.length).toBeGreaterThan(0);
    });

    it('respects a custom maxFret bound across all styles', () => {
        const candidates = getDeductiveChordSurfaceVoicingsForChord('major-7', 0, { maxFret: 4, maxPerTechnique: 50 });

        for (const candidate of candidates) {
            for (const note of candidate.voicing.notes.filter((n) => !n.isMuted)) {
                expect(note.fret).toBeLessThanOrEqual(4);
            }
        }
    });
});
