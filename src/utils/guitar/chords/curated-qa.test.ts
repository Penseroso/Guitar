import { describe, expect, it } from 'vitest';

import {
    CURATED_QA_REVIEW_CHORD_IDS,
    buildCuratedQaReviewState,
    clearCuratedQaDecision,
    getCuratedQaCandidates,
    getCuratedQaCandidatesForChord,
    getCuratedQaMacroCategory,
    getCuratedQaMicroCategory,
    getCuratedQaDecisionForCandidate,
    groupCuratedQaCandidates,
    isDeveloperCuratedQaEnabled,
    mergeCuratedQaReviewStates,
    recordCuratedQaDecision,
    recordCuratedQaSessionDecision,
    selectCuratedQaCandidatesFromResolvedVoicings,
    type CuratedQaReviewState,
} from './curated-qa';
import { resolveChordRegistryEntry } from './helpers';
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
            'major-6': 6,
            'major-7': 6,
            'major-9': 6,
            minor: 8,
            'minor-7': 6,
            'dominant-7': 8,
            'dominant-9': 6,
            sus2: 6,
            sus4: 6,
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
            dedupeResolvedCandidates: false,
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

    it('keeps QA category coverage stable even when the raw exploratory pool order is reversed', () => {
        const entry = resolveChordRegistryEntry('major');
        const rawExploratoryCandidates = getExploratoryVoicingsForChord('major', 0, {
            maxRootFret: 15,
            includeNonPlayableCandidates: false,
            dedupeResolvedCandidates: false,
        });
        const forwardSelection = selectCuratedQaCandidatesFromResolvedVoicings(entry, 0, rawExploratoryCandidates, {
            maxCandidates: 12,
        });
        const reverseSelection = selectCuratedQaCandidatesFromResolvedVoicings(entry, 0, [...rawExploratoryCandidates].reverse(), {
            maxCandidates: 12,
        });

        expect(forwardSelection.map((candidate) => candidate.candidateId)).toEqual(
            reverseSelection.map((candidate) => candidate.candidateId)
        );
        expect(new Set(forwardSelection.map((candidate) => JSON.stringify(getCuratedQaMacroCategory(candidate))))).toEqual(
            new Set(reverseSelection.map((candidate) => JSON.stringify(getCuratedQaMacroCategory(candidate))))
        );
    });

    it('does not let exact-signature duplicate ordering change the chosen QA representative', () => {
        const entry = resolveChordRegistryEntry('major');
        const [referenceCandidate] = getExploratoryVoicingsForChord('major', 0, {
            maxRootFret: 15,
            includeNonPlayableCandidates: false,
            dedupeResolvedCandidates: false,
        });
        const duplicateCandidateA = {
            ...referenceCandidate,
            id: `${referenceCandidate.id}::b`,
            descriptor: {
                ...referenceCandidate.descriptor,
                provenance: {
                    ...referenceCandidate.descriptor.provenance,
                    seedId: `${referenceCandidate.descriptor.provenance.seedId ?? referenceCandidate.id}::b`,
                },
            },
        };
        const duplicateCandidateB = {
            ...referenceCandidate,
            id: `${referenceCandidate.id}::a`,
            descriptor: {
                ...referenceCandidate.descriptor,
                provenance: {
                    ...referenceCandidate.descriptor.provenance,
                    seedId: `${referenceCandidate.descriptor.provenance.seedId ?? referenceCandidate.id}::a`,
                },
            },
        };

        const forwardSelection = selectCuratedQaCandidatesFromResolvedVoicings(entry, 0, [
            duplicateCandidateA,
            duplicateCandidateB,
        ], {
            maxCandidates: 1,
        });
        const reverseSelection = selectCuratedQaCandidatesFromResolvedVoicings(entry, 0, [
            duplicateCandidateB,
            duplicateCandidateA,
        ], {
            maxCandidates: 1,
        });

        expect(forwardSelection[0]?.candidateId).toBe(duplicateCandidateB.id);
        expect(reverseSelection[0]?.candidateId).toBe(duplicateCandidateB.id);
    });

    it('covers multiple macro categories instead of collapsing the QA slice into one structural cluster', () => {
        const qaCandidates = getCuratedQaCandidates(0);
        const macroCategories = qaCandidates.map((candidate) => getCuratedQaMacroCategory(candidate));

        expect(new Set(macroCategories.map((category) => category.inversionClass)).size).toBeGreaterThan(1);
        expect(new Set(macroCategories.map((category) => category.registerTopologyClass)).size).toBeGreaterThan(1);
        expect(new Set(macroCategories.map((category) => category.fullnessClass)).size).toBeGreaterThan(1);
        expect(new Set(macroCategories.map((category) => category.topologyClass)).size).toBeGreaterThan(1);
    });

    it('keeps micro diversity inside the QA slice when generated candidates expose open strings, root duplication, and color variation', () => {
        const qaCandidates = getCuratedQaCandidatesForChord('major', 0);
        const microCategories = qaCandidates.map((candidate) => getCuratedQaMicroCategory(candidate));

        expect(new Set(microCategories.map((category) => category.openStringUsageClass)).size).toBeGreaterThan(1);
        expect(new Set(microCategories.map((category) => category.rootDistributionClass)).size).toBeGreaterThan(1);
        expect(new Set(microCategories.map((category) => category.optionalColorRetentionClass)).size).toBeGreaterThan(1);
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

    it('tracks session edits separately from persisted reviews and clears no-op edits against the saved snapshot', () => {
        const [candidate] = getCuratedQaCandidates(0);
        const persistedReviews = buildCuratedQaReviewState([
            {
                chordType: candidate.chordType,
                candidateId: candidate.candidateId,
                decision: 'accept',
                rootPitchClass: candidate.rootPitchClass,
            },
        ]);

        let sessionReviews: CuratedQaReviewState = {};
        sessionReviews = recordCuratedQaSessionDecision(persistedReviews, sessionReviews, {
            chordType: candidate.chordType,
            candidateId: candidate.candidateId,
            decision: 'borderline',
            rootPitchClass: candidate.rootPitchClass,
        });

        expect(getCuratedQaDecisionForCandidate(sessionReviews, candidate)).toBe('borderline');
        expect(getCuratedQaDecisionForCandidate(
            mergeCuratedQaReviewStates(persistedReviews, sessionReviews),
            candidate
        )).toBe('borderline');

        sessionReviews = recordCuratedQaSessionDecision(persistedReviews, sessionReviews, {
            chordType: candidate.chordType,
            candidateId: candidate.candidateId,
            decision: 'accept',
            rootPitchClass: candidate.rootPitchClass,
        });

        expect(getCuratedQaDecisionForCandidate(sessionReviews, candidate)).toBeNull();
        expect(getCuratedQaDecisionForCandidate(
            mergeCuratedQaReviewStates(persistedReviews, sessionReviews),
            candidate
        )).toBe('accept');
    });

    it('can clear a queued review decision without mutating the saved state', () => {
        const [candidate] = getCuratedQaCandidates(0);
        const reviews = buildCuratedQaReviewState([
            {
                chordType: candidate.chordType,
                candidateId: candidate.candidateId,
                decision: 'reject',
                rootPitchClass: candidate.rootPitchClass,
            },
        ]);

        expect(clearCuratedQaDecision(reviews, candidate)).toEqual({});
        expect(getCuratedQaDecisionForCandidate(reviews, candidate)).toBe('reject');
    });
});
