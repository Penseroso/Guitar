import { describe, expect, it } from 'vitest';

import {
    buildChordDefinitionFromRegistryEntry,
    buildChordTonesFromRegistryEntry,
    resolveChordRegistryEntry,
} from './helpers';
import { buildVoicingCandidate, rankVoicingCandidates } from './ranking';
import {
    getCandidateRootFretsForTemplate,
    resolveVoicingTemplate,
    resolveVoicingTemplateAcrossPositions,
} from './resolver';
import { getVoicingTemplatesForChord } from './templates';
import { getRankedVoicingsForChord } from './voicings';

describe('voicing template adaptation', () => {
    it('adapts legacy major shapes into future-facing templates', () => {
        const templates = getVoicingTemplatesForChord('major');
        const firstTemplate = templates[0];

        expect(templates).toHaveLength(5);
        expect(firstTemplate).toMatchObject({
            source: 'legacy-shape',
            rootString: 5,
            label: 'Root 6 (E Shape)',
        });
        expect(firstTemplate.strings).toHaveLength(6);
        expect(firstTemplate.strings[0]).toMatchObject({ string: 0, fretOffset: 0, toneDegree: '1' });
        expect(firstTemplate.strings[4]).toMatchObject({ string: 4, fretOffset: 2, toneDegree: '5' });
    });
});

describe('voicing resolution', () => {
    it('resolves a barred C major shape into concrete fretboard notes', () => {
        const entry = resolveChordRegistryEntry('major');
        const template = getVoicingTemplatesForChord(entry)[0];
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);
        const resolved = resolveVoicingTemplate(chord, tones, template);

        expect(resolved.playable).toBe(true);
        expect(resolved.notes.filter((note) => !note.isMuted).map((note) => note.fret)).toEqual([8, 8, 9, 10, 10, 8]);
        expect(resolved.minFret).toBe(8);
        expect(resolved.maxFret).toBe(10);
        expect(resolved.span).toBe(2);
        expect(resolved.missingRequiredDegrees).toEqual([]);
        expect(resolved.omittedOptionalDegrees).toEqual([]);
        expect(resolved.omittedDegrees).toEqual([]);
    });

    it('marks invalid negative-fret resolutions as non-playable instead of hiding them', () => {
        const entry = resolveChordRegistryEntry('major');
        const template = getVoicingTemplatesForChord(entry)[4];
        const chord = buildChordDefinitionFromRegistryEntry(entry, 9);
        const tones = buildChordTonesFromRegistryEntry(entry, 9);
        const resolved = resolveVoicingTemplate(chord, tones, template);

        expect(resolved.playable).toBe(false);
        expect(resolved.notes.filter((note) => !note.isMuted).some((note) => note.fret < 0)).toBe(true);
    });

    it('generates multiple neck positions for the same template in bounded ascending order', () => {
        const entry = resolveChordRegistryEntry('major');
        const template = getVoicingTemplatesForChord(entry)[0];
        const chord = buildChordDefinitionFromRegistryEntry(entry, 7);
        const tones = buildChordTonesFromRegistryEntry(entry, 7);
        const rootFrets = getCandidateRootFretsForTemplate(chord, template, { maxRootFret: 15 });
        const resolved = resolveVoicingTemplateAcrossPositions(chord, tones, template, { maxRootFret: 15 });

        expect(rootFrets).toEqual([3, 15]);
        expect(resolved.map((voicing) => voicing.rootFret)).toEqual([3, 15]);
        expect(resolved.every((voicing) => voicing.playable)).toBe(true);
    });

    it('keeps invalid lower positions explicit without outranking valid higher positions', () => {
        const entry = resolveChordRegistryEntry('major');
        const template = getVoicingTemplatesForChord(entry)[4];
        const chord = buildChordDefinitionFromRegistryEntry(entry, 9);
        const tones = buildChordTonesFromRegistryEntry(entry, 9);
        const resolved = resolveVoicingTemplateAcrossPositions(chord, tones, template, { maxRootFret: 12 });
        const ranked = rankVoicingCandidates(resolved, entry, tones);

        expect(ranked).toHaveLength(2);
        expect(ranked[0].voicing.playable).toBe(true);
        expect(ranked[0].voicing.rootFret).toBe(12);
        expect(ranked[1].voicing.playable).toBe(false);
        expect(ranked[1].voicing.rootFret).toBe(0);
    });
});

describe('voicing ranking orchestration', () => {
    it('pushes playable major shapes above invalid legacy variants', () => {
        const candidates = getRankedVoicingsForChord('major', 9);

        expect(candidates[0].voicing.playable).toBe(true);
        expect(candidates.at(-1)?.voicing.playable).toBe(false);
        expect(candidates[0].score).toBeGreaterThan(candidates.at(-1)?.score ?? 0);
    });

    it('does not treat optional ninths as missing required degrees', () => {
        const candidates = getRankedVoicingsForChord('major-9', 0);
        const topPlayable = candidates.find((candidate) => candidate.voicing.playable);

        expect(topPlayable).toBeDefined();
        expect(topPlayable?.missingRequiredDegrees).not.toContain('9');
        expect(topPlayable?.matchedRequiredDegrees).toContain('1');
        expect(topPlayable?.voicing.missingRequiredDegrees).not.toContain('9');
    });

    it('separates omitted optional tones from missing required tones for extended chords', () => {
        const candidates = getRankedVoicingsForChord('dominant-13', 0);
        const candidateWithOptionalOmissions = candidates.find(
            (candidate) => candidate.voicing.playable && (candidate.voicing.omittedOptionalDegrees?.length ?? 0) > 0
        );

        expect(candidateWithOptionalOmissions).toBeDefined();
        expect(candidateWithOptionalOmissions?.voicing.missingRequiredDegrees).toEqual([]);
        expect(candidateWithOptionalOmissions?.voicing.omittedOptionalDegrees?.length).toBeGreaterThan(0);
    });

    it('keeps suspended identity tones treated as required through ranked voicings', () => {
        const topCandidate = getRankedVoicingsForChord('sus4', 0, { includeNonPlayableCandidates: false })[0];

        expect(topCandidate.missingRequiredDegrees).not.toContain('4');
        expect(topCandidate.voicing.notes.some((note) => note.degree === '4')).toBe(true);
    });

    it('returns human-readable scoring reasons', () => {
        const candidate = buildVoicingCandidate(getRankedVoicingsForChord('power-5', 7)[0].voicing, 'power-5');

        expect(candidate.reasons.length).toBeGreaterThan(0);
        expect(candidate.reasons.some((reason) => reason.includes('Playable'))).toBe(true);
    });
});
