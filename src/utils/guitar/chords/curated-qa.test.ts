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
import { getChordModeVoicingsForChord } from './voicings';
import { getVoicingPresentationMeta } from '../../../components/guitar/chord-preview/voicing-labels';

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
        expect(candidates).toHaveLength(33);
        expect(new Set(candidates.map((candidate) => candidate.chordType))).toEqual(new Set(CURATED_QA_REVIEW_CHORD_IDS));
        expect(candidates.every((candidate) => candidate.voicing.playable)).toBe(true);
        expect(groupedCandidates.map((group) => group.chordType)).toEqual(CURATED_QA_REVIEW_CHORD_IDS);
        expect(Object.fromEntries(groupedCandidates.map((group) => [group.chordType, group.candidates.length]))).toEqual({
            major: 7,
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
        expect(majorCandidates).toHaveLength(7);
        expect(majorCandidates.map((candidate) => candidate.candidateId)).toEqual(
            getChordModeVoicingsForChord('major', 0, {
                maxRootFret: 15,
                maxCandidates: 7,
            }).map((candidate) => candidate.voicing.id)
        );
        expect(groupedCandidates.every((group) => new Set(
            group.candidates.map((candidate) => candidate.voicing.notes.map((note) => `${note.string}:${note.isMuted ? 'x' : note.fret}`).join('|'))
        ).size === group.candidates.length)).toBe(true);
    });

    it('keeps the major QA slice aligned to the app-visible chord-mode candidates', () => {
        const qaCandidates = getCuratedQaCandidatesForChord('major', 0);
        const appCandidates = getChordModeVoicingsForChord('major', 0, {
            maxRootFret: 15,
            maxCandidates: 7,
        });
        const appSpreadCandidate = appCandidates.find((candidate) => {
            const meta = getVoicingPresentationMeta(candidate.voicing);

            return meta.primaryLabel === 'Position voicing'
                && meta.secondaryLabel?.includes('15fr')
                && meta.secondaryLabel?.includes('spread');
        });

        expect(qaCandidates.map((candidate) => candidate.candidateId)).toEqual(
            appCandidates.map((candidate) => candidate.voicing.id)
        );
        expect(appSpreadCandidate).toBeDefined();
        expect(qaCandidates.some((candidate) => candidate.candidateId === appSpreadCandidate?.voicing.id)).toBe(true);
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
