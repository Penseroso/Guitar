import { describe, expect, it } from 'vitest';

import {
    CURATED_QA_PILOT_CHORD_IDS,
    getCuratedQaCandidates,
    getCuratedQaDecisionForCandidate,
    isDeveloperCuratedQaEnabled,
    recordCuratedQaDecision,
    type CuratedQaReviewState,
} from './curated-qa';

describe('developer curated QA mode', () => {
    it('stays gated unless the dev-only flag is present outside production', () => {
        expect(isDeveloperCuratedQaEnabled({ nodeEnv: 'development', search: '' })).toBe(false);
        expect(isDeveloperCuratedQaEnabled({ nodeEnv: 'production', search: '?dev-curated-qa=1' })).toBe(false);
        expect(isDeveloperCuratedQaEnabled({ nodeEnv: 'test', search: '?dev-curated-qa=1' })).toBe(true);
    });

    it('surfaces only the curated pilot set for QA review', () => {
        const candidates = getCuratedQaCandidates(0);

        expect(candidates).toHaveLength(CURATED_QA_PILOT_CHORD_IDS.length * 2);
        expect(new Set(candidates.map((candidate) => candidate.chordType))).toEqual(new Set(CURATED_QA_PILOT_CHORD_IDS));
        expect(candidates.every((candidate) => candidate.voicing.descriptor.provenance.sourceKind === 'curated')).toBe(true);
        expect(candidates.every((candidate) => candidate.voicing.playable)).toBe(true);
    });

    it('records accept and reject decisions in a simple keyed in-memory state object', () => {
        const [candidate] = getCuratedQaCandidates(0);
        let reviews: CuratedQaReviewState = {};

        reviews = recordCuratedQaDecision(reviews, {
            chordType: candidate.chordType,
            candidateId: candidate.candidateId,
            decision: 'accept',
        });
        expect(getCuratedQaDecisionForCandidate(reviews, candidate)).toBe('accept');

        reviews = recordCuratedQaDecision(reviews, {
            chordType: candidate.chordType,
            candidateId: candidate.candidateId,
            decision: 'reject',
        });
        expect(getCuratedQaDecisionForCandidate(reviews, candidate)).toBe('reject');
        expect(Object.keys(reviews)).toHaveLength(1);
    });
});
