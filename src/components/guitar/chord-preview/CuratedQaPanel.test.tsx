import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
    buildCuratedQaReviewState,
    getCuratedQaCandidates,
    mergeCuratedQaReviewStates,
} from '../../../utils/guitar/chords/curated-qa';
import { CuratedQaPanel } from './CuratedQaPanel';

describe('CuratedQaPanel', () => {
    it('distinguishes saved reviews from unsaved session edits and disables submit when nothing changed', () => {
        const [candidate] = getCuratedQaCandidates(0);
        const persistedReviews = buildCuratedQaReviewState([
            {
                chordType: candidate.chordType,
                candidateId: candidate.candidateId,
                decision: 'accept',
                rootPitchClass: candidate.rootPitchClass,
            },
        ]);

        const markup = renderToStaticMarkup(
            <CuratedQaPanel
                candidates={[candidate]}
                persistedReviews={persistedReviews}
                sessionReviews={{}}
                effectiveReviews={persistedReviews}
                onReview={() => {}}
                onReasonChange={() => {}}
                onSubmit={() => {}}
                isSubmitting={false}
                hasPendingChanges={false}
                submitStatus={null}
                lastSavedAt="2026-04-12T00:00:00.000Z"
                analysis={null}
            />
        );

        expect(markup).toContain('saved accept');
        expect(markup).toContain('0 unsaved session edits');
        expect(markup).toContain('No Changes To Submit');
        expect(markup).toContain('disabled=""');
    });

    it('shows pending session edits separately from the persisted snapshot before submit', () => {
        const [candidate] = getCuratedQaCandidates(0);
        const persistedReviews = buildCuratedQaReviewState([
            {
                chordType: candidate.chordType,
                candidateId: candidate.candidateId,
                decision: 'accept',
                rootPitchClass: candidate.rootPitchClass,
            },
        ]);
        const sessionReviews = buildCuratedQaReviewState([
            {
                chordType: candidate.chordType,
                candidateId: candidate.candidateId,
                decision: 'reject',
                rootPitchClass: candidate.rootPitchClass,
            },
        ]);

        const markup = renderToStaticMarkup(
            <CuratedQaPanel
                candidates={[candidate]}
                persistedReviews={persistedReviews}
                sessionReviews={sessionReviews}
                effectiveReviews={mergeCuratedQaReviewStates(persistedReviews, sessionReviews)}
                onReview={() => {}}
                onReasonChange={() => {}}
                onSubmit={() => {}}
                isSubmitting={false}
                hasPendingChanges
                submitStatus="Unsaved review changes pending."
                lastSavedAt="2026-04-12T00:00:00.000Z"
                analysis={null}
            />
        );

        expect(markup).toContain('unsaved reject');
        expect(markup).toContain('1 unsaved session edits');
        expect(markup).toContain('1 unsaved review updates pending submit');
        expect(markup).toContain('Submit QA');
    });

    it('shows a free-text reason field for borderline and reject decisions only', () => {
        const [candidate] = getCuratedQaCandidates(0);
        const sessionReviews = buildCuratedQaReviewState([
            {
                chordType: candidate.chordType,
                candidateId: candidate.candidateId,
                decision: 'borderline',
                rootPitchClass: candidate.rootPitchClass,
                reason: 'unclear inner motion',
            },
        ]);

        const borderlineMarkup = renderToStaticMarkup(
            <CuratedQaPanel
                candidates={[candidate]}
                persistedReviews={{}}
                sessionReviews={sessionReviews}
                effectiveReviews={sessionReviews}
                onReview={() => {}}
                onReasonChange={() => {}}
                onSubmit={() => {}}
                isSubmitting={false}
                hasPendingChanges
                submitStatus={null}
                lastSavedAt={null}
                analysis={null}
            />
        );

        const acceptReviews = buildCuratedQaReviewState([
            {
                chordType: candidate.chordType,
                candidateId: candidate.candidateId,
                decision: 'accept',
                rootPitchClass: candidate.rootPitchClass,
            },
        ]);
        const acceptMarkup = renderToStaticMarkup(
            <CuratedQaPanel
                candidates={[candidate]}
                persistedReviews={{}}
                sessionReviews={acceptReviews}
                effectiveReviews={acceptReviews}
                onReview={() => {}}
                onReasonChange={() => {}}
                onSubmit={() => {}}
                isSubmitting={false}
                hasPendingChanges
                submitStatus={null}
                lastSavedAt={null}
                analysis={null}
            />
        );

        expect(borderlineMarkup).toContain('Reason (unsaved)');
        expect(borderlineMarkup).toContain('unclear inner motion');
        expect(acceptMarkup).not.toContain('Reason');
    });
});
