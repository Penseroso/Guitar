import { describe, expect, it } from 'vitest';

import {
    CURATED_QA_REVIEW_CHORD_IDS,
    getCuratedQaCandidates,
    getCuratedQaDecisionForCandidate,
    groupCuratedQaCandidates,
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

    it('surfaces a stratified chord-by-chord QA slice instead of an exhaustive review census', () => {
        const candidates = getCuratedQaCandidates(0);
        const majorCandidates = candidates.filter((candidate) => candidate.chordType === 'major');
        const groupedCandidates = groupCuratedQaCandidates(candidates);

        expect(CURATED_QA_REVIEW_CHORD_IDS).toEqual([
            'major',
            'major-6',
            'major-7',
            'major-9',
            'minor',
            'minor-7',
            'dominant-7',
            'dominant-9',
            'sus2',
            'sus4',
        ]);
        expect(candidates).toHaveLength(31);
        expect(new Set(candidates.map((candidate) => candidate.chordType))).toEqual(new Set(CURATED_QA_REVIEW_CHORD_IDS));
        expect(candidates.every((candidate) => candidate.voicing.playable)).toBe(true);
        expect(groupedCandidates.map((group) => group.chordType)).toEqual(CURATED_QA_REVIEW_CHORD_IDS);
        expect(Object.fromEntries(groupedCandidates.map((group) => [group.chordType, group.candidates.length]))).toEqual({
            major: 5,
            'major-6': 2,
            'major-7': 3,
            'major-9': 3,
            minor: 3,
            'minor-7': 3,
            'dominant-7': 4,
            'dominant-9': 3,
            sus2: 2,
            sus4: 3,
        });
        expect(candidates.filter((candidate) => candidate.chordType.startsWith('major')).map((candidate) => candidate.chordType)).toEqual([
            'major',
            'major',
            'major',
            'major',
            'major',
            'major-6',
            'major-6',
            'major-7',
            'major-7',
            'major-7',
            'major-9',
            'major-9',
            'major-9',
        ]);
        expect(majorCandidates).toHaveLength(5);
        expect(majorCandidates.map((candidate) => candidate.candidateId)).toEqual([
            'major:0:major:curated:root-5-reviewed-caged:3',
            'major:0:major:curated:root-4-reviewed-upper:10',
            'major:0:major:0:root-6-e-shape:8',
            'major:0:major:3:root-6-g-shape:8',
            'major:0:major:4:root-5-c-shape:3',
        ]);
        expect(majorCandidates.map((candidate) => candidate.sourceLabel)).toEqual([
            'Curated',
            'Curated',
            'Legacy import',
            'Legacy import',
            'Legacy import',
        ]);
        expect(groupedCandidates.every((group) => new Set(
            group.candidates.map((candidate) => candidate.voicing.notes.map((note) => `${note.string}:${note.isMuted ? 'x' : note.fret}`).join('|'))
        ).size === group.candidates.length)).toBe(true);
    });

    it('records accept borderline and reject decisions in a simple keyed in-memory state object', () => {
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
            decision: 'borderline',
        });
        expect(getCuratedQaDecisionForCandidate(reviews, candidate)).toBe('borderline');

        reviews = recordCuratedQaDecision(reviews, {
            chordType: candidate.chordType,
            candidateId: candidate.candidateId,
            decision: 'reject',
        });
        expect(getCuratedQaDecisionForCandidate(reviews, candidate)).toBe('reject');
        expect(Object.keys(reviews)).toHaveLength(1);
    });
});
