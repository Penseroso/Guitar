import { describe, expect, it } from 'vitest';

import { CHORD_REGISTRY_LIST } from './registry';
import { searchAndRankDeductiveVoicings } from './rankedVoicingSearch';

const major = CHORD_REGISTRY_LIST.find((entry) => entry.id === 'major')!;
const augmented = CHORD_REGISTRY_LIST.find((entry) => entry.id === 'augmented')!;

describe('searchAndRankDeductiveVoicings', () => {
    it('ranks results best-score-first and every candidate carries a score/reasons', () => {
        const candidates = searchAndRankDeductiveVoicings(major, 0, { position: 'close' });

        expect(candidates.length).toBeGreaterThan(0);
        for (const candidate of candidates) {
            expect(typeof candidate.score).toBe('number');
            expect(candidate.reasons.length).toBeGreaterThan(0);
        }
        for (let i = 1; i < candidates.length; i++) {
            expect(candidates[i - 1].score).toBeGreaterThanOrEqual(candidates[i].score);
        }
    });

    it('ranks a compact, low-fret shape above a needlessly wide, high-fret one for the same chord', () => {
        const candidates = searchAndRankDeductiveVoicings(major, 0, { position: 'close' }, { maxFret: 12 });

        const compact = candidates.find(
            (c) => c.voicing.span <= 3 && c.voicing.maxFret <= 5 && c.voicing.notes.filter((n) => !n.isMuted).length === 3
        );
        const sprawling = candidates.find(
            (c) => c.voicing.minFret >= 8 && c.voicing.notes.filter((n) => !n.isMuted).length === 3
        );

        expect(compact).toBeDefined();
        expect(sprawling).toBeDefined();
        expect(compact!.score).toBeGreaterThan(sprawling!.score);
    });

    it('correctly reports matched/missing required degrees for the new augmented triad (regression for the old per-id table bug)', () => {
        const candidates = searchAndRankDeductiveVoicings(augmented, 0, { position: 'close' });

        expect(candidates.length).toBeGreaterThan(0);
        for (const candidate of candidates) {
            // All 3 degrees of an augmented triad are required (see degreeRequirements.ts) —
            // ranking.ts must recognize that via the deductive rule, not the old empty per-id entry.
            expect(candidate.matchedRequiredDegrees.sort()).toEqual(['#5', '1', '3'].sort());
            expect(candidate.missingRequiredDegrees).toEqual([]);
        }
    });

    it('accepts physical ranking overrides (scale length / hand span) without throwing and still returns sorted results', () => {
        const candidates = searchAndRankDeductiveVoicings(major, 0, { position: 'close' }, {}, { maxHandSpanMm: 90 });

        expect(candidates.length).toBeGreaterThan(0);
        for (let i = 1; i < candidates.length; i++) {
            expect(candidates[i - 1].score).toBeGreaterThanOrEqual(candidates[i].score);
        }
    });
});
