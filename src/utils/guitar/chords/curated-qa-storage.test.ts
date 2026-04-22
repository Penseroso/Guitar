import { describe, expect, it } from 'vitest';

import {
    applyCuratedQaReviewUpdates,
    buildCuratedQaReviewSnapshot,
    normalizeCuratedQaReviewRecords,
    normalizeCuratedQaReviewSnapshot,
} from './curated-qa-storage';
import { recordCuratedQaDecision, type CuratedQaReviewState } from './curated-qa';

describe('curated QA storage', () => {
    it('normalizes unknown payloads into an empty snapshot', () => {
        expect(normalizeCuratedQaReviewSnapshot(null)).toEqual({
            updatedAt: null,
            reviews: [],
        });
        expect(normalizeCuratedQaReviewSnapshot({ updatedAt: 12, reviews: ['bad'] })).toEqual({
            updatedAt: null,
            reviews: [],
        });
    });

    it('keeps older accept-only review records usable without migration', () => {
        expect(normalizeCuratedQaReviewSnapshot({
            updatedAt: '2026-04-08T00:00:00.000Z',
            reviews: [
                { chordType: 'major', candidateId: 'legacy-major', decision: 'accept' },
            ],
        })).toEqual({
            updatedAt: '2026-04-08T00:00:00.000Z',
            reviews: [
                { chordType: 'major', candidateId: 'legacy-major', decision: 'accept' },
            ],
        });
    });

    it('keeps optional rootPitchClass review metadata when present', () => {
        expect(normalizeCuratedQaReviewSnapshot({
            updatedAt: '2026-04-08T00:00:00.000Z',
            reviews: [
                { chordType: 'major', candidateId: 'major-rooted', decision: 'borderline', rootPitchClass: 4, reason: 'awkward spread' },
            ],
        })).toEqual({
            updatedAt: '2026-04-08T00:00:00.000Z',
            reviews: [
                { chordType: 'major', candidateId: 'major-rooted', decision: 'borderline', rootPitchClass: 4, reason: 'awkward spread' },
            ],
        });
    });

    it('normalizes submitted review records without treating arbitrary payloads as valid submissions', () => {
        expect(normalizeCuratedQaReviewRecords(null)).toEqual([]);
        expect(normalizeCuratedQaReviewRecords([
            { chordType: 'major', candidateId: 'major-a', decision: 'accept' },
            { chordType: 'major', candidateId: 12, decision: 'accept' },
            { chordType: 'major', candidateId: 'major-b', decision: 'reject', reason: ' too muddy ' },
        ])).toEqual([
            { chordType: 'major', candidateId: 'major-a', decision: 'accept' },
            { chordType: 'major', candidateId: 'major-b', decision: 'reject', reason: ' too muddy ' },
        ]);
    });

    it('serializes review state into a stable JSON snapshot', () => {
        let reviews: CuratedQaReviewState = {};
        reviews = recordCuratedQaDecision(reviews, {
            chordType: 'minor-7',
            candidateId: 'b',
            decision: 'borderline',
            reason: 'usable shell, weak color',
        });
        reviews = recordCuratedQaDecision(reviews, {
            chordType: 'major',
            candidateId: 'a',
            decision: 'accept',
        });

        expect(buildCuratedQaReviewSnapshot(reviews, '2026-04-08T00:00:00.000Z')).toEqual({
            updatedAt: '2026-04-08T00:00:00.000Z',
            reviews: [
                { chordType: 'major', candidateId: 'a', decision: 'accept' },
                { chordType: 'minor-7', candidateId: 'b', decision: 'borderline', reason: 'usable shell, weak color' },
            ],
        });
    });

    it('applies only submitted review updates on top of the persisted snapshot', () => {
        const snapshot = {
            updatedAt: '2026-04-08T00:00:00.000Z',
            reviews: [
                { chordType: 'major', candidateId: 'major-a', decision: 'accept' as const },
                { chordType: 'minor', candidateId: 'minor-a', decision: 'borderline' as const, reason: 'old note' },
            ],
        };

        expect(applyCuratedQaReviewUpdates(snapshot, [
            { chordType: 'major', candidateId: 'major-a', decision: 'reject', reason: 'no tonal center' },
        ], '2026-04-12T00:00:00.000Z')).toEqual({
            updatedAt: '2026-04-12T00:00:00.000Z',
            reviews: [
                { chordType: 'major', candidateId: 'major-a', decision: 'reject', reason: 'no tonal center' },
                { chordType: 'minor', candidateId: 'minor-a', decision: 'borderline', reason: 'old note' },
            ],
        });
    });
});
