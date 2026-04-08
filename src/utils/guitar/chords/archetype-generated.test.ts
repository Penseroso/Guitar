import { describe, expect, it } from 'vitest';

import curatedQaReviews from './curated-qa-reviews.json';
import {
    ARCHETYPE_GENERATED_CHORD_IDS,
    getArchetypePlanForChord,
    getArchetypeGeneratedVoicingTemplatesForChord,
} from './archetype-generated';
import {
    collectVoicingTemplateSourcesForChord,
    getArchetypeGeneratedVoicingsForChord,
    getRankedVoicingsForChord,
} from './voicings';
import type { CuratedQaReviewSnapshot } from './curated-qa-storage';

const ACCEPTED_CURATED_BASELINE = (curatedQaReviews as CuratedQaReviewSnapshot).reviews
    .filter((review) => review.decision === 'accept');

function getVoicingSignature(candidate: { voicing: { notes: Array<{ string: number; fret: number; isMuted?: boolean }> } }): string {
    return candidate.voicing.notes
        .map((note) => `${note.string}:${note.isMuted ? 'x' : note.fret}`)
        .join('|');
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

    it('makes chord-to-archetype grammar explicit through narrow plans instead of raw per-chord seed lists', () => {
        expect(getArchetypePlanForChord('major')).toEqual({
            chordClass: 'triad',
            families: ['representative-mid', 'upper-companion'],
        });
        expect(getArchetypePlanForChord('major-7')).toEqual({
            chordClass: 'seventh',
            families: ['compact-seventh', 'upper-companion'],
        });
        expect(getArchetypePlanForChord('major-9')).toEqual({
            chordClass: 'ninth',
            families: ['controlled-ninth', 'upper-companion'],
        });
        expect(getArchetypePlanForChord('sus4')).toEqual({
            chordClass: 'suspension',
            families: ['suspension-open', 'upper-companion'],
        });
        expect(getArchetypePlanForChord('dominant-13')).toBeNull();
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

    it('emits playable structurally coherent archetype-generated candidates for the supported scope', () => {
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
        }
    });

    it('stays structurally close to the accepted curated reviewed baseline for the current QA set', () => {
        for (const review of ACCEPTED_CURATED_BASELINE) {
            const curatedCandidates = getRankedVoicingsForChord(review.chordType, 0, {
                includeLegacyCandidates: false,
                includeGeneratedCandidates: false,
                includeArchetypeGeneratedCandidates: false,
                includeCuratedCandidates: true,
                includeNonPlayableCandidates: true,
                maxCandidates: 20,
            });
            const candidates = getArchetypeGeneratedVoicingsForChord(review.chordType, 0, {
                includeNonPlayableCandidates: true,
                maxCandidates: 20,
            });
            const curatedCandidate = curatedCandidates.find((candidate) => candidate.voicing.id === review.candidateId);

            expect(curatedCandidate).toBeDefined();
            expect(candidates.some((candidate) => (
                candidate.voicing.descriptor.rootString === curatedCandidate!.voicing.descriptor.rootString
                && candidate.voicing.missingRequiredDegrees?.length === 0
                && (candidate.voicing.outOfFormulaPitchClasses?.length ?? 0) === 0
                && Math.abs(candidate.voicing.descriptor.noteCount - curatedCandidate!.voicing.descriptor.noteCount) <= 1
            ) || getVoicingSignature(candidate) === getVoicingSignature(curatedCandidate!))).toBe(true);
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
