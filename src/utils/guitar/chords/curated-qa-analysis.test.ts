import { describe, expect, it } from 'vitest';

import curatedQaReviews from './curated-qa-reviews.json';
import { buildCuratedQaAnalysisSummary, getAcceptedSourceKinds } from './curated-qa-analysis';
import type { CuratedQaReviewSnapshot } from './curated-qa-storage';

describe('curated QA analysis', () => {
    it('builds stable structured review aggregates from the persisted snapshot', () => {
        const summary = buildCuratedQaAnalysisSummary(curatedQaReviews as CuratedQaReviewSnapshot);

        expect(summary.totalReviews).toBe(curatedQaReviews.reviews.length);
        expect(summary.activeReviewCount).toBe(0);
        expect(summary.staleReviewCount).toBe(curatedQaReviews.reviews.length);
        expect(summary.byDecision).toEqual({
            accept: 18,
            borderline: 3,
            reject: 2,
        });
        expect(summary.byStatus).toEqual([
            {
                key: 'stale',
                total: 23,
                decisions: {
                    accept: 18,
                    borderline: 3,
                    reject: 2,
                },
            },
        ]);
        expect(summary.byChordType.some((entry) => entry.chordType === 'major')).toBe(true);
        expect(summary.byChordType.every((entry) => entry.candidateCount >= entry.reviewedCount)).toBe(true);
        expect(summary.byProvenance).toEqual([
            {
                key: 'stale',
                total: 23,
                decisions: {
                    accept: 18,
                    borderline: 3,
                    reject: 2,
                },
            },
        ]);
        expect(summary.byChordFamily.some((bucket) => bucket.key === 'triad')).toBe(true);
        expect(summary.byChordFamily.some((bucket) => bucket.key === 'seventh')).toBe(true);
        expect(summary.byRootString).toEqual([
            {
                key: 'stale',
                total: 23,
                decisions: {
                    accept: 18,
                    borderline: 3,
                    reject: 2,
                },
            },
        ]);
        expect(summary.byRegisterBand).toEqual([
            {
                key: 'stale',
                total: 23,
                decisions: {
                    accept: 18,
                    borderline: 3,
                    reject: 2,
                },
            },
        ]);
        expect(summary.byInversion).toEqual([
            {
                key: 'stale',
                total: 23,
                decisions: {
                    accept: 18,
                    borderline: 3,
                    reject: 2,
                },
            },
        ]);
        expect(summary.byNoteCount).toEqual([
            {
                key: 'stale',
                total: 23,
                decisions: {
                    accept: 18,
                    borderline: 3,
                    reject: 2,
                },
            },
        ]);
        expect(summary.byMissingRequiredDegrees).toEqual([
            {
                key: 'stale',
                total: 23,
                decisions: {
                    accept: 18,
                    borderline: 3,
                    reject: 2,
                },
            },
        ]);
        expect(summary.byOutOfFormula).toEqual([
            {
                key: 'stale',
                total: 23,
                decisions: {
                    accept: 18,
                    borderline: 3,
                    reject: 2,
                },
            },
        ]);
        expect(summary.byPlayability).toEqual([
            {
                key: 'stale',
                total: 23,
                decisions: {
                    accept: 18,
                    borderline: 3,
                    reject: 2,
                },
            },
        ]);
        expect(summary.staleReviewReferences).toHaveLength(23);
        expect(summary.weakCoverageChordTypes.length).toBeGreaterThan(0);
        expect(summary.weakCoverageChordTypes.some((entry) => entry.staleReviewedCount > 0)).toBe(true);
        expect(summary.weakCoverageChordTypes.every((entry) => entry.activeReviewedCount === 0)).toBe(true);
    });

    it('exposes accepted provenance kinds for later engine-building consumers', () => {
        const summary = buildCuratedQaAnalysisSummary(curatedQaReviews as CuratedQaReviewSnapshot);

        expect(getAcceptedSourceKinds(summary)).toEqual([]);
    });
});
