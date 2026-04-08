import { describe, expect, it } from 'vitest';

import { getGeneratedVoicingTemplatesForChord } from './generated';
import { collectVoicingTemplateSourcesForChord, getRankedVoicingsForChord } from './voicings';

describe('generated voicing candidates', () => {
    it('produces generated shell candidates for seventh-family chords', () => {
        const templates = getGeneratedVoicingTemplatesForChord('dominant-7');

        expect(templates.some((template) => template.source === 'generated')).toBe(true);
        expect(templates.some((template) => template.id.includes(':generated:shell:'))).toBe(true);
    });

    it('generated dominant thirteenth candidates retain required tones even when span rules invalidate them', () => {
        const candidates = getRankedVoicingsForChord('dominant-13', 0, {
            includeLegacyCandidates: false,
            includeNonPlayableCandidates: true,
            maxCandidates: 12,
        });
        const generatedCandidate = candidates[0];

        expect(generatedCandidate).toBeDefined();
        expect(generatedCandidate?.voicing.missingRequiredDegrees).toEqual([]);
        expect(generatedCandidate?.voicing.notes.some((note) => note.degree === '13')).toBe(true);
    });

    it('supports dominant eleventh through the generated engine path', () => {
        const templates = getGeneratedVoicingTemplatesForChord('dominant-11');
        const candidates = getRankedVoicingsForChord('dominant-11', 0, {
            includeLegacyCandidates: false,
            includeNonPlayableCandidates: false,
            maxCandidates: 12,
        });

        expect(templates.length).toBeGreaterThan(0);
        expect(candidates.length).toBeGreaterThan(0);
        expect(candidates.some((candidate) => candidate.voicing.notes.some((note) => note.degree === '11'))).toBe(true);
    });

    it('surfaces playable major sixth candidates through the generated engine path', () => {
        const templates = getGeneratedVoicingTemplatesForChord('major-6');
        const candidates = getRankedVoicingsForChord('major-6', 0, {
            includeLegacyCandidates: false,
            includeNonPlayableCandidates: false,
            maxCandidates: 12,
        });

        expect(templates.length).toBeGreaterThan(0);
        expect(candidates.length).toBeGreaterThan(0);
        expect(candidates[0].voicing.playable).toBe(true);
        expect(candidates.some((candidate) => candidate.voicing.notes.some((note) => note.degree === '6'))).toBe(true);
        expect(candidates.every((candidate) => candidate.missingRequiredDegrees.includes('6'))).toBe(false);
    });

    it('mixes generated candidates with legacy templates in the ranked result set', () => {
        const candidates = getRankedVoicingsForChord('major-7', 0, {
            maxCandidates: 12,
            includeNonPlayableCandidates: false,
        });

        expect(candidates.some((candidate) => candidate.voicing.descriptor.provenance.sourceKind === 'legacy-import')).toBe(true);
        expect(candidates.some((candidate) => candidate.voicing.descriptor.provenance.sourceKind === 'generated')).toBe(true);
        expect(candidates[0].voicing.playable).toBe(true);
    });

    it('keeps the older generated path available in parallel with the new archetype path', () => {
        const sources = collectVoicingTemplateSourcesForChord('major-7', {
            includeCuratedCandidates: false,
            includeArchetypeGeneratedCandidates: true,
        });

        expect(sources.generatedTemplates.length).toBeGreaterThan(0);
        expect(sources.archetypeGeneratedTemplates.length).toBeGreaterThan(0);
    });

    it('allows fuller generated minor-seventh grips including the 3x3333 shape', () => {
        const templates = getGeneratedVoicingTemplatesForChord('minor-7');
        const candidates = getRankedVoicingsForChord('minor-7', 7, {
            includeLegacyCandidates: false,
            includeCuratedCandidates: false,
            includeArchetypeGeneratedCandidates: false,
            includeNonPlayableCandidates: true,
            maxRootFret: 15,
        });

        expect(templates.some((template) => template.id.includes(':generated:full:root-6'))).toBe(true);
        expect(candidates.some((candidate) => candidate.voicing.playable && candidate.voicing.notes.map((note) => (
            note.isMuted ? 'x' : String(note.fret)
        )).join('') === '3333x3')).toBe(true);
    });
});
