import { describe, expect, it } from 'vitest';

import curatedQaReviews from './curated-qa-reviews.json';
import { buildCuratedQaAnalysisSummary, getAcceptedSourceKinds } from './curated-qa-analysis';
import type { CuratedQaReviewSnapshot } from './curated-qa-storage';

describe('curated QA analysis', () => {
    it('builds stable structured review aggregates from the persisted snapshot', () => {
        const summary = buildCuratedQaAnalysisSummary(curatedQaReviews as CuratedQaReviewSnapshot);

        expect(summary.totalReviews).toBe(curatedQaReviews.reviews.length);
        expect(summary.activeReviewCount).toBe(0);
        expect(summary.staleReviewCount).toBe(0);
        expect(summary.byDecision).toEqual({
            accept: 0,
            borderline: 0,
            reject: 0,
        });
        expect(summary.byStatus).toEqual([]);
        expect(summary.byChordType).toEqual([]);
        expect(summary.byProvenance).toEqual([]);
        expect(summary.byChordFamily).toEqual([]);
        expect(summary.byRootString).toEqual([]);
        expect(summary.byRegisterBand).toEqual([]);
        expect(summary.byInversion).toEqual([]);
        expect(summary.byNoteCount).toEqual([]);
        expect(summary.byMissingRequiredDegrees).toEqual([]);
        expect(summary.byOutOfFormula).toEqual([]);
        expect(summary.byPlayability).toEqual([]);
        expect(summary.staleReviewReferences).toHaveLength(0);
        expect(summary.weakCoverageChordTypes).toEqual([]);
    });

    it('exposes accepted provenance kinds for later engine-building consumers', () => {
        const summary = buildCuratedQaAnalysisSummary(curatedQaReviews as CuratedQaReviewSnapshot);

        expect(getAcceptedSourceKinds(summary)).toEqual([]);
    });
});
