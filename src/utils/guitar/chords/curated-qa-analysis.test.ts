import { describe, expect, it } from 'vitest';

import curatedQaReviews from './curated-qa-reviews.json';
import { buildCuratedQaAnalysisSummary, getAcceptedSourceKinds } from './curated-qa-analysis';
import type { CuratedQaReviewSnapshot } from './curated-qa-storage';

describe('curated QA analysis', () => {
    it('builds stable structured review aggregates from the persisted snapshot', () => {
        const summary = buildCuratedQaAnalysisSummary(curatedQaReviews as CuratedQaReviewSnapshot);

        expect(summary.totalReviews).toBe(curatedQaReviews.reviews.length);
        expect(summary.activeReviewCount).toBe(curatedQaReviews.reviews.length);
        expect(summary.staleReviewCount).toBe(0);
        expect(summary.byDecision).toEqual({
            accept: 46,
            borderline: 16,
            reject: 0,
        });
        expect(summary.byStatus).toEqual([
            {
                key: 'active',
                total: 62,
                decisions: {
                    accept: 46,
                    borderline: 16,
                    reject: 0,
                },
            },
        ]);
        expect(summary.byChordType.some((entry) => entry.chordType === 'major')).toBe(true);
        expect(summary.byChordType.every((entry) => entry.candidateCount >= entry.reviewedCount)).toBe(true);
        expect(summary.byProvenance).toEqual([
            {
                key: 'generated',
                total: 62,
                decisions: {
                    accept: 46,
                    borderline: 16,
                    reject: 0,
                },
            },
        ]);
        expect(summary.byChordFamily.some((bucket) => bucket.key === 'triad')).toBe(true);
        expect(summary.byChordFamily.some((bucket) => bucket.key === 'seventh')).toBe(true);
        expect(summary.byRootString.some((bucket) => bucket.key !== 'stale')).toBe(true);
        expect(summary.byRegisterBand.some((bucket) => bucket.key === 'high')).toBe(true);
        expect(summary.byInversion.some((bucket) => bucket.key === 'root-position')).toBe(true);
        expect(summary.byInversion.some((bucket) => bucket.key === 'inversion')).toBe(true);
        expect(summary.byNoteCount).toEqual([
            {
                key: '3',
                total: 50,
                decisions: {
                    accept: 34,
                    borderline: 16,
                    reject: 0,
                },
            },
            {
                key: '4',
                total: 12,
                decisions: {
                    accept: 12,
                    borderline: 0,
                    reject: 0,
                },
            },
        ]);
        expect(summary.byMissingRequiredDegrees).toEqual([
            {
                key: 'complete',
                total: 62,
                decisions: {
                    accept: 46,
                    borderline: 16,
                    reject: 0,
                },
            },
        ]);
        expect(summary.byOutOfFormula).toEqual([
            {
                key: 'formula-closed',
                total: 62,
                decisions: {
                    accept: 46,
                    borderline: 16,
                    reject: 0,
                },
            },
        ]);
        expect(summary.byPlayability).toEqual([
            {
                key: 'playable',
                total: 62,
                decisions: {
                    accept: 46,
                    borderline: 16,
                    reject: 0,
                },
            },
        ]);
        expect(summary.staleReviewReferences).toHaveLength(0);
        expect(summary.weakCoverageChordTypes).toEqual([]);
    });

    it('exposes accepted provenance kinds for later engine-building consumers', () => {
        const summary = buildCuratedQaAnalysisSummary(curatedQaReviews as CuratedQaReviewSnapshot);

        expect(getAcceptedSourceKinds(summary)).toEqual(['generated']);
    });
});
