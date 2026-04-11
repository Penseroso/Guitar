import { describe, expect, it } from 'vitest';

import {
    CURATED_QA_REVIEW_CHORD_IDS,
    getCuratedQaCandidates,
    getCuratedQaCandidatesForChord,
    getCuratedQaDecisionForCandidate,
    groupCuratedQaCandidates,
    isDeveloperCuratedQaEnabled,
    recordCuratedQaDecision,
    type CuratedQaReviewState,
} from './curated-qa';
import { getChordSurfaceVoicingsForChord, getExploratoryVoicingsForChord, getRankedExploratoryVoicingsForChord } from './voicings';

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
        expect(candidates).toHaveLength(groupedCandidates.reduce((total, group) => total + group.candidates.length, 0));
        expect(new Set(candidates.map((candidate) => candidate.chordType))).toEqual(new Set(CURATED_QA_REVIEW_CHORD_IDS));
        expect(candidates.every((candidate) => candidate.voicing.playable)).toBe(true);
        expect(groupedCandidates.map((group) => group.chordType)).toEqual(CURATED_QA_REVIEW_CHORD_IDS);
        expect(Object.fromEntries(groupedCandidates.map((group) => [group.chordType, group.candidates.length]))).toEqual({
            major: 12,
            'major-6': 3,
            'major-7': 6,
            'major-9': 6,
            minor: 8,
            'minor-7': 6,
            'dominant-7': 8,
            'dominant-9': 6,
            sus2: 3,
            sus4: 4,
        });
        expect(majorCandidates).toHaveLength(12);
        expect(candidates.every((candidate) => candidate.voicing.descriptor.provenance.sourceKind === 'generated')).toBe(true);
        expect(majorCandidates.some((candidate) => candidate.voicing.descriptor.inversion === 'inversion')).toBe(true);
        expect(groupedCandidates.every((group) => new Set(
            group.candidates.map((candidate) => candidate.voicing.notes.map((note) => `${note.string}:${note.isMuted ? 'x' : note.fret}`).join('|'))
        ).size === group.candidates.length)).toBe(true);
    });

    it('keeps the major QA slice as a reviewed stratified sample instead of mirroring public chord-mode surfacing', () => {
        const qaCandidates = getCuratedQaCandidatesForChord('major', 0);
        const surfaceCandidates = getChordSurfaceVoicingsForChord('major', 0, {
            maxRootFret: 15,
            maxCandidates: 7,
        });
        const exploratoryCandidates = getExploratoryVoicingsForChord('major', 0, {
            maxRootFret: 15,
        });
        const rankedExploratoryCandidates = getRankedExploratoryVoicingsForChord('major', 0, {
            maxRootFret: 15,
            maxCandidates: 20,
        });

        expect(qaCandidates).toHaveLength(12);
        expect(surfaceCandidates).toHaveLength(7);
        expect(qaCandidates.map((candidate) => candidate.candidateId)).not.toEqual(
            surfaceCandidates.map((candidate) => candidate.voicing.id)
        );
        expect(qaCandidates.every((candidate) =>
            exploratoryCandidates.some((exploratoryCandidate) => exploratoryCandidate.id === candidate.candidateId)
        )).toBe(true);
        expect(qaCandidates.every((candidate) => candidate.voicing.descriptor.provenance.sourceKind === 'generated')).toBe(true);
        expect(qaCandidates.every((candidate) => !candidate.sourceLabel.includes('Curated'))).toBe(true);
        expect(qaCandidates.some((candidate) => candidate.voicing.descriptor.inversion === 'inversion')).toBe(true);
        expect(rankedExploratoryCandidates.length).toBeLessThan(exploratoryCandidates.length);
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
