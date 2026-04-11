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
});
