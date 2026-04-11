import { describe, expect, it } from 'vitest';

import {
    buildDegreeAssignmentsForSeed,
    buildGeneratedChordPolicy,
    buildGeneratedCoverageRecipes,
    buildGeneratedTemplateVariants,
    getGeneratedTemplateCollectionStatsForChord,
    getGeneratedVoicingTemplatesForChord,
    getExploratorySeedsForChord,
    getOffsetCandidatesForDegree,
    getPrimaryGeneratedVoicingTemplatesForChord,
} from './generated';
import { resolveChordRegistryEntry } from './helpers';
import {
    collectVoicingTemplateSourcesForChord,
    getChordSurfaceVoicingsForChord,
    getExploratoryVoicingsForChord,
    getRankedExploratoryVoicingsForChord,
    getRankedVoicingsForChord,
} from './voicings';

describe('generated voicing candidates', () => {
    function getFifthLikeDegree(chordType: string): string | undefined {
        return resolveChordRegistryEntry(chordType).formula.degrees.find((degree) => degree === '5' || degree === 'b5' || degree === '#5');
    }

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
        expect(exploratoryTemplates.some((template) => template.tags?.includes('generated-inversional-bass'))).toBe(true);
        expect(primaryTemplates.some((template) => template.tags?.includes('generated-inversional-bass'))).toBe(false);
    });

    it('locks seventh-bearing baseline recipes to retain the formula fifth-like degree', () => {
        const chordTypes = ['major-7', 'diminished-7', 'hendrix-7-sharp-9', 'dominant-7-flat-9'] as const;

        for (const chordType of chordTypes) {
            const entry = resolveChordRegistryEntry(chordType);
            const recipes = buildGeneratedCoverageRecipes(entry, buildGeneratedChordPolicy(entry).chordClass);
            const baselineRecipe = recipes.find((recipe) => recipe.family === 'baseline');
            const fifthLikeDegree = getFifthLikeDegree(chordType);

            expect(baselineRecipe).toBeDefined();
            expect(fifthLikeDegree).toBeDefined();
            expect(baselineRecipe?.requiredDegrees).toContain(fifthLikeDegree);
        }
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

    it('keeps the older generated path available in parallel with the new archetype path', () => {
        const sources = collectVoicingTemplateSourcesForChord('major-7', {
            includeCuratedCandidates: false,
            includeArchetypeGeneratedCandidates: true,
            generatedTemplateCollectionMode: 'exploration',
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

    it('preserves multiple degree assignments for a single exploratory seed', () => {
        const entry = resolveChordRegistryEntry('major-7');
        const policy = buildGeneratedChordPolicy(entry);
        const seed = getExploratorySeedsForChord(entry)
            .find((candidateSeed) => buildDegreeAssignmentsForSeed(entry, policy, candidateSeed).length > 1);

        expect(seed).toBeDefined();
        expect(buildDegreeAssignmentsForSeed(entry, policy, seed!).length).toBeGreaterThan(1);
    });

    it('preserves multiple template variants for the same seed instead of collapsing to one representative', () => {
        const entry = resolveChordRegistryEntry('major-7');
        const seed = getExploratorySeedsForChord(entry)
            .find((candidateSeed) => buildGeneratedTemplateVariants(entry, candidateSeed).length > 1);

        expect(seed).toBeDefined();
        const templates = buildGeneratedTemplateVariants(entry, seed!);
        expect(templates.length).toBeGreaterThan(1);
    });

    it('limits offset candidates to +-3 and keeps multiple root-anchor placements when available', () => {
        const offsets = getOffsetCandidatesForDegree({
            rootString: 5,
            string: 4,
            interval: 7,
        });
        const entry = resolveChordRegistryEntry('major-7');
        const seed = getExploratorySeedsForChord(entry)
            .find((candidateSeed) => buildGeneratedTemplateVariants(entry, candidateSeed).some((template) => template.id.includes(':a0:')));

        expect(offsets.every((offset) => offset >= -3 && offset <= 3)).toBe(true);
        expect(seed).toBeDefined();
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
        expect(publicCandidates.some((candidate) => candidate.voicing.descriptor.inversion === 'inversion')).toBe(false);
    });

    it('expands QA full generation beyond the default exploratory mode for review collection', () => {
        const explorationStats = getGeneratedTemplateCollectionStatsForChord('major-7', {
            collectionMode: 'exploration',
        });
        const qaFullStats = getGeneratedTemplateCollectionStatsForChord('major-7', {
            collectionMode: 'qa-full',
        });

        expect(qaFullStats.rawTemplateCount).toBeGreaterThanOrEqual(explorationStats.rawTemplateCount);
        expect(qaFullStats.dedupedTemplateCount).toBeGreaterThanOrEqual(explorationStats.dedupedTemplateCount);
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

    it('applies exact-signature dedupe only after generating raw template variants', () => {
        const entry = resolveChordRegistryEntry('major-7');
        const rawTemplates = getExploratorySeedsForChord(entry)
            .flatMap((seed) => buildGeneratedTemplateVariants(entry, seed));
        const dedupedTemplates = getGeneratedVoicingTemplatesForChord('major-7');
        const dedupedSignatures = new Set(dedupedTemplates.map((template) => template.strings
            .map((stringValue) => `${stringValue.string}:${stringValue.fretOffset ?? 'x'}:${stringValue.toneDegree ?? '_'}`)
            .join('|')));

        expect(rawTemplates.length).toBeGreaterThanOrEqual(dedupedTemplates.length);
        expect(dedupedSignatures.size).toBe(dedupedTemplates.length);
    });

    it('keeps the QA exploratory path compatible with generated-only raw candidates', () => {
        const candidates = getExploratoryVoicingsForChord('major-7', 0, {
            includeNonPlayableCandidates: false,
            maxRootFret: 15,
            generatedTemplateCollectionMode: 'qa-full',
        });

        expect(candidates.length).toBeGreaterThan(0);
        expect(candidates.every((candidate) => candidate.descriptor.provenance.sourceKind === 'generated')).toBe(true);
    });

    it('reports raw and deduped template counts for representative QA chord types', () => {
        const chordTypes = ['major-7', 'dominant-7', 'major-9'] as const;

        for (const chordType of chordTypes) {
            const stats = getGeneratedTemplateCollectionStatsForChord(chordType, {
                collectionMode: 'qa-full',
            });

            expect(stats.seedCount).toBeGreaterThan(0);
            expect(stats.rawTemplateCount).toBeGreaterThan(0);
            expect(stats.dedupedTemplateCount).toBeGreaterThan(0);
            expect(stats.rawTemplateCount).toBeGreaterThanOrEqual(stats.dedupedTemplateCount);
        }
    });
});
