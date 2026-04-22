import { describe, expect, it } from 'vitest';

import {
    buildUsagePriorSurfaceSetSnapshot,
} from './usage-prior-surface';
import {
    applyUsagePriorReviewUpdates,
    buildUsagePriorAcceptedExport,
    buildUsagePriorReviewSnapshot,
    normalizeUsagePriorReviewRecords,
    normalizeUsagePriorReviewSnapshot,
} from './usage-prior-storage';
import { recordUsagePriorDecision, type UsagePriorReviewState } from './usage-prior';

describe('usage prior storage', () => {
    it('normalizes unknown payloads into an empty review snapshot', () => {
        expect(normalizeUsagePriorReviewSnapshot(null)).toEqual({
            updatedAt: null,
            reviews: [],
        });
        expect(normalizeUsagePriorReviewSnapshot({ updatedAt: 12, reviews: ['bad'] })).toEqual({
            updatedAt: null,
            reviews: [],
        });
    });

    it('accepts only two-state usage prior review records', () => {
        expect(normalizeUsagePriorReviewRecords([
            { chordType: 'major', candidateId: 'major-a', decision: 'accept' },
            { chordType: 'major', candidateId: 'major-b', decision: 'borderline' },
            { chordType: 'major', candidateId: 'major-c', decision: 'reject', reviewedAt: '2026-04-22T00:00:00.000Z' },
        ])).toEqual([
            { chordType: 'major', candidateId: 'major-a', decision: 'accept' },
            { chordType: 'major', candidateId: 'major-c', decision: 'reject', reviewedAt: '2026-04-22T00:00:00.000Z' },
        ]);
    });

    it('serializes review state into a stable ledger snapshot', () => {
        let reviews: UsagePriorReviewState = {};
        reviews = recordUsagePriorDecision(reviews, {
            chordType: 'minor',
            candidateId: 'b',
            decision: 'reject',
        });
        reviews = recordUsagePriorDecision(reviews, {
            chordType: 'major',
            candidateId: 'a',
            decision: 'accept',
        });

        expect(buildUsagePriorReviewSnapshot(reviews, '2026-04-22T00:00:00.000Z')).toEqual({
            updatedAt: '2026-04-22T00:00:00.000Z',
            reviews: [
                { chordType: 'major', candidateId: 'a', decision: 'accept' },
                { chordType: 'minor', candidateId: 'b', decision: 'reject' },
            ],
        });
    });

    it('applies same-key review updates over the persisted ledger', () => {
        const snapshot = {
            updatedAt: '2026-04-21T00:00:00.000Z',
            reviews: [
                { chordType: 'major', candidateId: 'major-a', decision: 'accept' as const },
                { chordType: 'minor', candidateId: 'minor-a', decision: 'reject' as const },
            ],
        };

        expect(applyUsagePriorReviewUpdates(snapshot, [
            { chordType: 'major', candidateId: 'major-a', decision: 'reject' },
        ], '2026-04-22T00:00:00.000Z')).toEqual({
            updatedAt: '2026-04-22T00:00:00.000Z',
            reviews: [
                { chordType: 'major', candidateId: 'major-a', decision: 'reject' },
                { chordType: 'minor', candidateId: 'minor-a', decision: 'reject' },
            ],
        });
    });

    it('materializes only accepted surface candidates into the prior export', () => {
        const surfaceSnapshot = buildUsagePriorSurfaceSetSnapshot({
            rootPitchClasses: [0],
            chordTypes: ['major'],
            maxCandidates: 2,
            snapshotGeneratedAt: '2026-04-22T00:00:00.000Z',
        });
        const [acceptedCandidate, rejectedCandidate] = surfaceSnapshot.candidates;
        const reviewSnapshot = {
            updatedAt: '2026-04-22T01:00:00.000Z',
            reviews: [
                {
                    chordType: acceptedCandidate.chordType,
                    candidateId: acceptedCandidate.candidateId,
                    decision: 'accept' as const,
                    rootPitchClass: acceptedCandidate.rootPitchClass,
                },
                {
                    chordType: rejectedCandidate.chordType,
                    candidateId: rejectedCandidate.candidateId,
                    decision: 'reject' as const,
                    rootPitchClass: rejectedCandidate.rootPitchClass,
                },
            ],
        };

        const acceptedExport = buildUsagePriorAcceptedExport(reviewSnapshot, surfaceSnapshot);

        expect(acceptedExport.source).toBe('surface-set-review');
        expect(acceptedExport.acceptedCandidates).toHaveLength(1);
        expect(acceptedExport.acceptedCandidates[0].candidateId).toBe(acceptedCandidate.candidateId);
        expect(acceptedExport.acceptedCandidates[0].candidateId).not.toBe(rejectedCandidate.candidateId);
    });
});
