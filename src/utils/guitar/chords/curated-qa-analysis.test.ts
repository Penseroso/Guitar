import { describe, expect, it } from 'vitest';

import curatedQaReviews from './curated-qa-reviews.json';
import { buildCuratedQaAnalysisSummary, getAcceptedSourceKinds } from './curated-qa-analysis';
import type { CuratedQaReviewSnapshot } from './curated-qa-storage';

describe('curated QA analysis', () => {
    it('builds stable structured review aggregates from the persisted snapshot', () => {
        const summary = buildCuratedQaAnalysisSummary(curatedQaReviews as CuratedQaReviewSnapshot);

        expect(summary.totalReviews).toBe(curatedQaReviews.reviews.length);
        expect(summary.activeReviewCount).toBe(18);
        expect(summary.staleReviewCount).toBe(5);
        expect(summary.byDecision).toEqual({
            accept: 18,
            borderline: 3,
            reject: 2,
        });
        expect(summary.byStatus).toEqual([
            {
                key: 'active',
                total: 18,
                decisions: {
                    accept: 15,
                    borderline: 2,
                    reject: 1,
                },
            },
            {
                key: 'stale',
                total: 5,
                decisions: {
                    accept: 3,
                    borderline: 1,
                    reject: 1,
                },
            },
        ]);
        expect(summary.byChordType.some((entry) => entry.chordType === 'major')).toBe(true);
        expect(summary.byChordType.every((entry) => entry.candidateCount >= entry.reviewedCount)).toBe(true);
        expect(summary.byProvenance.some((bucket) => bucket.key === 'curated')).toBe(true);
        expect(summary.byProvenance.some((bucket) => bucket.key === 'stale')).toBe(true);
        expect(summary.byChordFamily.some((bucket) => bucket.key === 'triad')).toBe(true);
        expect(summary.byChordFamily.some((bucket) => bucket.key === 'seventh')).toBe(true);
        expect(summary.byRootString.some((bucket) => bucket.key === 'root-4')).toBe(true);
        expect(summary.byRootString.some((bucket) => bucket.key === 'stale')).toBe(true);
        expect(summary.byRegisterBand.some((bucket) => bucket.key === 'upper')).toBe(true);
        expect(summary.byInversion.some((bucket) => bucket.key === 'root-position')).toBe(true);
        expect(summary.byInversion.some((bucket) => bucket.key === 'stale')).toBe(true);
        expect(summary.byNoteCount.some((bucket) => bucket.key === '4')).toBe(true);
        expect(summary.byMissingRequiredDegrees.some((bucket) => bucket.key === 'complete')).toBe(true);
        expect(summary.byOutOfFormula.some((bucket) => bucket.key === 'formula-closed')).toBe(true);
        expect(summary.byPlayability).toEqual([
            {
                key: 'playable',
                total: 18,
                decisions: {
                    accept: 15,
                    borderline: 2,
                    reject: 1,
                },
            },
            {
                key: 'stale',
                total: 5,
                decisions: {
                    accept: 3,
                    borderline: 1,
                    reject: 1,
                },
            },
        ]);
        expect(summary.staleReviewReferences).toHaveLength(5);
        expect(summary.weakCoverageChordTypes.length).toBeGreaterThan(0);
        expect(summary.weakCoverageChordTypes.some((entry) => entry.staleReviewedCount > 0)).toBe(true);
    });

    it('exposes accepted provenance kinds for later engine-building consumers', () => {
        const summary = buildCuratedQaAnalysisSummary(curatedQaReviews as CuratedQaReviewSnapshot);

        expect(getAcceptedSourceKinds(summary)).toContain('curated');
    });
});
