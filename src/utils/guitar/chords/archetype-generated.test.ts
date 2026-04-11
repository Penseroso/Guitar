import { describe, expect, it } from 'vitest';

import {
    ARCHETYPE_GENERATED_CHORD_IDS,
    getArchetypePlanForChord,
    getArchetypeGeneratedVoicingTemplatesForChord,
} from './archetype-generated';
import {
    getCuratedQaReviewsByDecision,
    matchesRejectedReferencePattern,
    partitionCuratedQaReviews,
} from './curated-qa-comparison';
import { getCuratedQaCandidatesForChord } from './curated-qa';
import {
    collectVoicingTemplateSourcesForChord,
    getArchetypeGeneratedVoicingsForChord,
    getRankedVoicingsForChord,
} from './voicings';
import type { CuratedQaReviewSnapshot } from './curated-qa-storage';
import type { VoicingTemplate } from './types';

const QA_FIXTURE_SNAPSHOT: CuratedQaReviewSnapshot = {
    updatedAt: '2026-04-12T00:00:00.000Z',
    reviews: [
        {
            chordType: 'major',
            candidateId: getCuratedQaCandidatesForChord('major', 0)[1]!.candidateId,
            decision: 'accept',
            rootPitchClass: 0,
        },
        {
            chordType: 'major',
            candidateId: getCuratedQaCandidatesForChord('major', 0)[0]!.candidateId,
            decision: 'borderline',
            rootPitchClass: 0,
        },
        {
            chordType: 'major',
            candidateId: getCuratedQaCandidatesForChord('major', 0)[8]!.candidateId,
            decision: 'reject',
            rootPitchClass: 0,
        },
        {
            chordType: 'major-7',
            candidateId: getCuratedQaCandidatesForChord('major-7', 0)[0]!.candidateId,
            decision: 'accept',
            rootPitchClass: 0,
        },
        {
            chordType: 'dominant-7',
            candidateId: getCuratedQaCandidatesForChord('dominant-7', 0)[0]!.candidateId,
            decision: 'accept',
            rootPitchClass: 0,
        },
        {
            chordType: 'dominant-9',
            candidateId: getCuratedQaCandidatesForChord('dominant-9', 0)[0]!.candidateId,
            decision: 'accept',
            rootPitchClass: 0,
        },
        {
            chordType: 'sus4',
            candidateId: getCuratedQaCandidatesForChord('sus4', 0)[0]!.candidateId,
            decision: 'reject',
            rootPitchClass: 0,
        },
    ],
};

const CURATED_QA_BUCKETS = partitionCuratedQaReviews(QA_FIXTURE_SNAPSHOT);

function getActiveTemplateStrings(template: VoicingTemplate) {
    return template.strings.filter((stringValue) => stringValue.fretOffset !== null);
}

function getTemplateDegrees(template: VoicingTemplate): string[] {
    return getActiveTemplateStrings(template)
        .map((stringValue) => stringValue.toneDegree)
        .filter((degree): degree is string => Boolean(degree));
}

function expectArchetypeAxisCoverage(chordId: typeof ARCHETYPE_GENERATED_CHORD_IDS[number], template: VoicingTemplate) {
    const degrees = new Set(getTemplateDegrees(template));
    const hasRoot = degrees.has('1');
    const hasThirdLike = degrees.has('3') || degrees.has('b3');
    const hasFifth = degrees.has('5');
    const hasSeventhLike = degrees.has('7') || degrees.has('b7');
    const hasExtensionLike = degrees.has('9') || degrees.has('2');
    const hasSuspensionLike = degrees.has('2') || degrees.has('4');

    if (chordId === 'major' || chordId === 'minor') {
        expect(hasRoot).toBe(true);
        expect(hasThirdLike).toBe(true);
        expect(hasFifth).toBe(true);
        return;
    }

    if (chordId === 'major-7' || chordId === 'minor-7' || chordId === 'dominant-7') {
        expect(hasRoot).toBe(true);
        expect(hasThirdLike).toBe(true);
        expect(hasSeventhLike).toBe(true);
        return;
    }

    if (chordId === 'major-9' || chordId === 'dominant-9') {
        expect(hasRoot).toBe(true);
        expect(hasSeventhLike).toBe(true);
        expect(hasExtensionLike).toBe(true);
        return;
    }

    if (chordId === 'sus2' || chordId === 'sus4') {
        expect(hasRoot).toBe(true);
        expect(hasSuspensionLike).toBe(true);
    }
}

describe('archetype-generated voicing path', () => {
    it('supports the narrow reviewed chord-family scope only', () => {
        expect(ARCHETYPE_GENERATED_CHORD_IDS).toEqual([
            'major',
            'minor',
            'major-7',
            'minor-7',
            'dominant-7',
            'sus2',
            'sus4',
            'major-9',
            'dominant-9',
        ]);

        for (const chordId of ARCHETYPE_GENERATED_CHORD_IDS) {
            const templates = getArchetypeGeneratedVoicingTemplatesForChord(chordId);
            const plan = getArchetypePlanForChord(chordId);

            expect(plan).not.toBeNull();
            expect(templates.length).toBeGreaterThan(0);
            expect(templates.every((template) => template.source === 'archetype-generated')).toBe(true);
            expect(templates.every((template) => template.tags?.includes('archetype-generated'))).toBe(true);
        }
    });

    it('keeps curated QA review outcomes partitioned into explicit accept, borderline, and reject comparison buckets', () => {
        expect(CURATED_QA_BUCKETS.accept.length).toBeGreaterThan(0);
        expect(CURATED_QA_BUCKETS.borderline.length).toBeGreaterThan(0);
        expect(CURATED_QA_BUCKETS.reject.length).toBeGreaterThan(0);
        expect(getCuratedQaReviewsByDecision(QA_FIXTURE_SNAPSHOT, 'accept')).toEqual(CURATED_QA_BUCKETS.accept);
        expect(getCuratedQaReviewsByDecision(QA_FIXTURE_SNAPSHOT, 'borderline')).toEqual(CURATED_QA_BUCKETS.borderline);
        expect(getCuratedQaReviewsByDecision(QA_FIXTURE_SNAPSHOT, 'reject')).toEqual(CURATED_QA_BUCKETS.reject);
    });

    it('protects explicit chordClass and family-plan mappings for the supported scope', () => {
        expect(getArchetypePlanForChord('major')).toEqual({
            chordClass: 'triad',
            families: ['representative-mid', 'upper-companion'],
        });
        expect(getArchetypePlanForChord('minor')).toEqual({
            chordClass: 'triad',
            families: ['representative-mid', 'upper-companion'],
        });
        expect(getArchetypePlanForChord('major-7')).toEqual({
            chordClass: 'seventh',
            families: ['compact-seventh', 'upper-companion'],
        });
        expect(getArchetypePlanForChord('minor-7')).toEqual({
            chordClass: 'seventh',
            families: ['compact-seventh', 'upper-companion'],
        });
        expect(getArchetypePlanForChord('dominant-7')).toEqual({
            chordClass: 'seventh',
            families: ['compact-seventh', 'upper-companion'],
        });
        expect(getArchetypePlanForChord('major-9')).toEqual({
            chordClass: 'ninth',
            families: ['controlled-ninth', 'upper-companion'],
        });
        expect(getArchetypePlanForChord('dominant-9')).toEqual({
            chordClass: 'ninth',
            families: ['controlled-ninth', 'upper-companion'],
        });
        expect(getArchetypePlanForChord('sus2')).toEqual({
            chordClass: 'suspension',
            families: ['suspension-open', 'upper-companion'],
        });
        expect(getArchetypePlanForChord('sus4')).toEqual({
            chordClass: 'suspension',
            families: ['suspension-open', 'upper-companion'],
        });
        expect(getArchetypePlanForChord('dominant-13')).toBeNull();
        expect(getArchetypePlanForChord('power-5')).toBeNull();
    });

    it('emits exactly two archetype-generated templates per supported chord with explicit archetype identity', () => {
        for (const chordId of ARCHETYPE_GENERATED_CHORD_IDS) {
            const templates = getArchetypeGeneratedVoicingTemplatesForChord(chordId);

            expect(templates).toHaveLength(2);
            expect(templates.every((template) => template.source === 'archetype-generated')).toBe(true);
            expect(templates.every((template) => template.id.includes(':archetype-generated:'))).toBe(true);
            expect(templates.every((template) => template.tags?.includes('archetype-generated'))).toBe(true);
            expect(templates.every((template) => template.tags?.some((tag) => tag.startsWith('archetype-')))).toBe(true);
            expect(templates.every((template) => template.tags?.some((tag) => tag.startsWith('archetype-class-')))).toBe(true);
            expect(new Set(templates.map((template) => template.id)).size).toBe(2);
            expect(new Set(templates.map((template) => template.rootString)).size).toBe(2);
            expect(new Set(templates.map((template) => template.label)).size).toBe(2);
        }
    });

    it('keeps the two emitted templates structurally distinct enough to represent separate archetypes', () => {
        for (const chordId of ARCHETYPE_GENERATED_CHORD_IDS) {
            const templates = getArchetypeGeneratedVoicingTemplatesForChord(chordId);
            const [firstTemplate, secondTemplate] = templates;

            expect(firstTemplate.rootString).not.toBe(secondTemplate.rootString);
            expect(firstTemplate.label).not.toBe(secondTemplate.label);
            expect(firstTemplate.strings.map((stringValue) => stringValue.fretOffset)).not.toEqual(
                secondTemplate.strings.map((stringValue) => stringValue.fretOffset)
            );
        }
    });

    it('stays out of the default public pipeline unless explicitly enabled', () => {
        const defaultSources = collectVoicingTemplateSourcesForChord('major-7');
        const explicitSources = collectVoicingTemplateSourcesForChord('major-7', {
            includeCuratedCandidates: false,
            includeArchetypeGeneratedCandidates: true,
        });
        const defaultCandidates = getRankedVoicingsForChord('major-7', 0, {
            includeNonPlayableCandidates: false,
            maxCandidates: 12,
        });

        expect(defaultSources.archetypeGeneratedTemplates).toEqual([]);
        expect(explicitSources.archetypeGeneratedTemplates.length).toBeGreaterThan(0);
        expect(defaultCandidates.every((candidate) => candidate.voicing.descriptor.provenance.sourceKind !== 'archetype-generated')).toBe(true);
    });

    it('guards minimum structural coherence for emitted archetype-generated templates before resolution', () => {
        for (const chordId of ARCHETYPE_GENERATED_CHORD_IDS) {
            const templates = getArchetypeGeneratedVoicingTemplatesForChord(chordId);

            for (const template of templates) {
                const activeStrings = getActiveTemplateStrings(template);
                const templateDegrees = getTemplateDegrees(template);

                expect(activeStrings.length).toBeGreaterThanOrEqual(3);
                expect(templateDegrees.length).toBeGreaterThanOrEqual(3);
                expect(activeStrings.every((stringValue) => typeof stringValue.fretOffset === 'number')).toBe(true);
                expect(activeStrings.every((stringValue) => typeof stringValue.toneDegree === 'string')).toBe(true);
                expectArchetypeAxisCoverage(chordId, template);
            }
        }
    });

    it('emits playable structurally coherent archetype-generated candidates for the supported scope after resolution', () => {
        for (const chordId of ARCHETYPE_GENERATED_CHORD_IDS) {
            const candidates = getArchetypeGeneratedVoicingsForChord(chordId, 0, {
                includeNonPlayableCandidates: false,
                maxCandidates: 12,
            });

            expect(candidates.length).toBeGreaterThan(0);
            expect(candidates.every((candidate) => candidate.voicing.playable)).toBe(true);
            expect(candidates.every((candidate) => candidate.voicing.descriptor.provenance.sourceKind === 'archetype-generated')).toBe(true);
            expect(candidates.every((candidate) => candidate.voicing.span < 4)).toBe(true);
            expect(candidates.every((candidate) => candidate.voicing.descriptor.playedStrings.length >= 3)).toBe(true);
            expect(candidates.every((candidate) => (candidate.voicing.outOfFormulaPitchClasses?.length ?? 0) === 0)).toBe(true);
            expect(candidates.every((candidate) => (candidate.voicing.missingRequiredDegrees?.length ?? 0) === 0)).toBe(true);
        }
    });

    it('keeps fixture accept reviews mapped onto active generated QA candidates for comparison consumers', () => {
        const chordTypesWithAccepts = [...new Set(CURATED_QA_BUCKETS.accept.map((review) => review.chordType))];

        for (const chordType of chordTypesWithAccepts) {
            const acceptedReferenceIds = CURATED_QA_BUCKETS.accept
                .filter((review) => review.chordType === chordType)
                .map((review) => review.candidateId);
            const acceptedReferences = getCuratedQaCandidatesForChord(chordType, 0)
                .filter((candidate) => acceptedReferenceIds.includes(candidate.candidateId))
                .map((candidate) => candidate.voicing);

            expect(acceptedReferences.length).toBeGreaterThan(0);
            expect(acceptedReferences.every((reference) => reference.descriptor.provenance.sourceKind === 'generated')).toBe(true);
        }
    });

    it('keeps fixture reject reviews available as separate directional references from accepts', () => {
        const chordTypesWithRejects = [...new Set(CURATED_QA_BUCKETS.reject.map((review) => review.chordType))]
            .filter((chordType) => {
                const qaCandidates = getCuratedQaCandidatesForChord(chordType, 0);

                return qaCandidates.some((candidate) => CURATED_QA_BUCKETS.accept.some((review) => review.candidateId === candidate.candidateId))
                    && qaCandidates.some((candidate) => CURATED_QA_BUCKETS.reject.some((review) => review.candidateId === candidate.candidateId));
            });

        for (const chordType of chordTypesWithRejects) {
            const qaCandidates = getCuratedQaCandidatesForChord(chordType, 0);
            const acceptedReferences = qaCandidates
                .filter((candidate) => CURATED_QA_BUCKETS.accept.some((review) => review.candidateId === candidate.candidateId))
                .map((candidate) => candidate.voicing);
            const rejectedReferences = qaCandidates
                .filter((candidate) => CURATED_QA_BUCKETS.reject.some((review) => review.candidateId === candidate.candidateId))
                .map((candidate) => candidate.voicing);

            expect(acceptedReferences.length).toBeGreaterThan(0);
            expect(rejectedReferences.length).toBeGreaterThan(0);
            expect(acceptedReferences.some((reference) => rejectedReferences.some((rejectedReference) =>
                !matchesRejectedReferencePattern(reference, rejectedReference)
            ))).toBe(true);
        }
    });

    it('keeps borderline reviews visible as holdout comparison references without turning them into pass/fail anchors', () => {
        const activeBorderlineCandidates = CURATED_QA_BUCKETS.borderline
            .map((review) => ({
                review,
                candidate: getCuratedQaCandidatesForChord(review.chordType, 0)
                    .find((candidate) => candidate.voicing.id === review.candidateId),
            }))
            .filter((entry) => entry.candidate);

        expect(activeBorderlineCandidates.length).toBeGreaterThan(0);

        for (const { candidate } of activeBorderlineCandidates) {
            const borderlineCandidate = candidate;

            expect(borderlineCandidate).toBeDefined();
            expect(borderlineCandidate?.voicing.descriptor.provenance.sourceKind).toBe('generated');
        }
    });

    it('falls back cleanly to the existing pipeline for unsupported chord families', () => {
        const sources = collectVoicingTemplateSourcesForChord('dominant-13', {
            includeCuratedCandidates: false,
            includeArchetypeGeneratedCandidates: true,
        });
        const candidates = getRankedVoicingsForChord('dominant-13', 0, {
            includeArchetypeGeneratedCandidates: true,
            includeNonPlayableCandidates: false,
            maxCandidates: 12,
        });

        expect(sources.archetypeGeneratedTemplates).toEqual([]);
        expect(candidates.length).toBeGreaterThan(0);
        expect(candidates.every((candidate) => candidate.voicing.descriptor.provenance.sourceKind !== 'archetype-generated')).toBe(true);
    });
});
