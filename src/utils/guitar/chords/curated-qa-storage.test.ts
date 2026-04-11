import { describe, expect, it } from 'vitest';

import { buildCuratedQaReviewSnapshot, normalizeCuratedQaReviewSnapshot } from './curated-qa-storage';
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
                { chordType: 'major', candidateId: 'major-rooted', decision: 'accept', rootPitchClass: 4 },
            ],
        })).toEqual({
            updatedAt: '2026-04-08T00:00:00.000Z',
            reviews: [
                { chordType: 'major', candidateId: 'major-rooted', decision: 'accept', rootPitchClass: 4 },
            ],
        });
    });

    it('serializes review state into a stable JSON snapshot', () => {
        let reviews: CuratedQaReviewState = {};
        reviews = recordCuratedQaDecision(reviews, {
            chordType: 'minor-7',
            candidateId: 'b',
            decision: 'borderline',
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
                { chordType: 'minor-7', candidateId: 'b', decision: 'borderline' },
            ],
        });
    });
});
