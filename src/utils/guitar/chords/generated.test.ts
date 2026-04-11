import { describe, expect, it } from 'vitest';

import {
    getGeneratedVoicingTemplatesForChord,
    getPrimaryGeneratedVoicingTemplatesForChord,
} from './generated';
import {
    collectVoicingTemplateSourcesForChord,
    getChordSurfaceVoicingsForChord,
    getExploratoryVoicingsForChord,
    getRankedExploratoryVoicingsForChord,
    getRankedVoicingsForChord,
} from './voicings';

describe('generated voicing candidates', () => {
    it('produces bounded exploratory generated templates for seventh-family chords', () => {
        const templates = getGeneratedVoicingTemplatesForChord('dominant-7');

        expect(templates.some((template) => template.source === 'generated')).toBe(true);
        expect(templates.some((template) => template.id.includes(':generated:b'))).toBe(true);
        expect(templates.some((template) => template.tags?.includes('bass-string-6'))).toBe(true);
        expect(templates.some((template) => template.tags?.includes('generated-layout-contiguous'))).toBe(true);
    });

    it('keeps exploratory generated inventory broader than the primary chord-mode baseline', () => {
        const exploratoryTemplates = getGeneratedVoicingTemplatesForChord('major-7');
        const primaryTemplates = getPrimaryGeneratedVoicingTemplatesForChord('major-7');

        expect(exploratoryTemplates.length).toBeGreaterThan(primaryTemplates.length);
        expect(exploratoryTemplates.some((template) => template.tags?.includes('generated-register-wide'))).toBe(true);
        expect(primaryTemplates.some((template) => template.tags?.includes('generated-register-wide'))).toBe(false);
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
        const candidates = getRankedExploratoryVoicingsForChord('dominant-11', 0, {
            includeNonPlayableCandidates: false,
            maxCandidates: 40,
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

    it('widens exploratory minor-seventh coverage across note-count and layout axes', () => {
        const templates = getGeneratedVoicingTemplatesForChord('minor-7');
        const candidates = getRankedExploratoryVoicingsForChord('minor-7', 7, {
            includeNonPlayableCandidates: true,
            maxRootFret: 15,
            maxCandidates: 120,
        });

        expect(templates.some((template) => template.tags?.includes('generated-note-count-4'))).toBe(true);
        expect(templates.some((template) => template.tags?.includes('generated-note-count-6'))).toBe(true);
        expect(templates.some((template) => template.tags?.includes('generated-layout-skip'))).toBe(true);
        expect(candidates.some((candidate) => candidate.voicing.playable && candidate.voicing.descriptor.noteCount >= 4)).toBe(true);
        expect(new Set(candidates.map((candidate) => candidate.voicing.descriptor.family)).size).toBeGreaterThan(1);
    });

    it('keeps generated exploration broader than public chord-mode surfacing', () => {
        const exploratoryCandidates = getExploratoryVoicingsForChord('major', 0, {
            includeNonPlayableCandidates: true,
            maxRootFret: 15,
        });
        const publicCandidates = getChordSurfaceVoicingsForChord('major', 0, {
            includeLegacyCandidates: false,
            includeCuratedCandidates: false,
            includeNonPlayableCandidates: true,
            maxRootFret: 15,
            maxCandidates: 200,
        });

        expect(exploratoryCandidates.length).toBeGreaterThan(0);
        expect(exploratoryCandidates.length).toBeGreaterThanOrEqual(publicCandidates.length);
        expect(exploratoryCandidates.some((candidate) => candidate.descriptor.inversion === 'inversion')).toBe(true);
        expect(exploratoryCandidates.some((candidate) =>
            candidate.descriptor.provenance.seedId?.includes(':wide:')
        )).toBe(true);
        expect(publicCandidates.some((candidate) => candidate.voicing.descriptor.inversion === 'inversion')).toBe(false);
    });

    it('dedupes exploratory generated templates by effective string signature', () => {
        const templates = getGeneratedVoicingTemplatesForChord('major-7');
        const signatures = templates.map((template) => template.strings
            .map((stringValue) => `${stringValue.string}:${stringValue.fretOffset ?? 'x'}:${stringValue.toneDegree ?? '_'}`)
            .join('|'));

        expect(new Set(signatures).size).toBe(templates.length);
    });

    it('increases exploratory diversity across descriptor axes without breaking minimal sanity', () => {
        const candidates = getExploratoryVoicingsForChord('major', 0, {
            includeNonPlayableCandidates: true,
            maxRootFret: 15,
        });

        expect(candidates.every((candidate) => (candidate.outOfFormulaPitchClasses?.length ?? 0) === 0)).toBe(true);
        expect(candidates.every((candidate) => candidate.notes.some((note) => !note.isMuted && note.degree === '1'))).toBe(true);
        expect(new Set(candidates.map((candidate) => candidate.descriptor.family)).size).toBeGreaterThan(1);
        expect(new Set(candidates.map((candidate) => candidate.descriptor.registerBand)).size).toBeGreaterThan(1);
        expect(new Set(candidates.map((candidate) => candidate.descriptor.rootString)).size).toBeGreaterThan(1);
        expect(new Set(candidates.map((candidate) => candidate.descriptor.noteCount)).has(6)).toBe(true);
        expect(candidates.some((candidate) => candidate.descriptor.inversion === 'inversion')).toBe(true);
    });
});
