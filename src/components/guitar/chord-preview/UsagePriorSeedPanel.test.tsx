import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { buildUsagePriorReviewState, mergeUsagePriorReviewStates } from '../../../utils/guitar/chords/usage-prior';
import { buildUsagePriorSurfaceSetSnapshot } from '../../../utils/guitar/chords/usage-prior-surface';
import { UsagePriorSeedPanel } from './UsagePriorSeedPanel';

describe('UsagePriorSeedPanel', () => {
    it('renders two-state seed review controls and pending status', () => {
        const [candidate] = buildUsagePriorSurfaceSetSnapshot({
            rootPitchClasses: [0],
            chordTypes: ['major'],
            maxCandidates: 1,
            snapshotGeneratedAt: '2026-04-22T00:00:00.000Z',
        }).candidates;
        const persistedReviews = buildUsagePriorReviewState([
            {
                chordType: candidate.chordType,
                candidateId: candidate.candidateId,
                decision: 'accept',
                rootPitchClass: candidate.rootPitchClass,
            },
        ]);
        const sessionReviews = buildUsagePriorReviewState([
            {
                chordType: candidate.chordType,
                candidateId: candidate.candidateId,
                decision: 'reject',
                rootPitchClass: candidate.rootPitchClass,
            },
        ]);

        const markup = renderToStaticMarkup(
            <UsagePriorSeedPanel
                candidates={[candidate]}
                persistedReviews={persistedReviews}
                sessionReviews={sessionReviews}
                effectiveReviews={mergeUsagePriorReviewStates(persistedReviews, sessionReviews)}
                onReview={() => {}}
                onSubmit={() => {}}
                isSubmitting={false}
                hasPendingChanges
                submitStatus="Unsaved usage prior reviews pending."
                lastSavedAt="2026-04-22T00:00:00.000Z"
                analysis={null}
            />
        );

        expect(markup).toContain('Usage Prior Seed Review');
        expect(markup).toContain('unsaved reject');
        expect(markup).toContain('Accept');
        expect(markup).toContain('Reject');
        expect(markup).not.toContain('Borderline');
        expect(markup).toContain('Submit Usage Prior Reviews');
    });
});
