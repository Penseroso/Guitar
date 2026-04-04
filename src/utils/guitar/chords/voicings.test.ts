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

    it('penalizes major ninth voicings that miss the ninth', () => {
        const entry = resolveChordRegistryEntry('major-9');
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);
        const withNinth = buildVoicingCandidate(resolveVoicingTemplate(chord, tones, {
            id: 'maj9-with-9',
            label: 'maj9 with 9',
            instrument: 'guitar',
            rootString: 4,
            strings: [
                { string: 0, fretOffset: 0, toneDegree: '5' },
                { string: 1, fretOffset: 0, toneDegree: '9' },
                { string: 2, fretOffset: 1, toneDegree: '7' },
                { string: 3, fretOffset: -1, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 }), entry, tones);
        const missingNinth = buildVoicingCandidate(resolveVoicingTemplate(chord, tones, {
            id: 'maj9-missing-9',
            label: 'maj9 missing 9',
            instrument: 'guitar',
            rootString: 4,
            strings: [
                { string: 0, fretOffset: 0, toneDegree: '5' },
                { string: 1, fretOffset: -2, toneDegree: '1' },
                { string: 2, fretOffset: 1, toneDegree: '7' },
                { string: 3, fretOffset: -1, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 }), entry, tones);

        expect(withNinth.missingRequiredDegrees).toEqual([]);
        expect(missingNinth.missingRequiredDegrees).toContain('9');
        expect(withNinth.score).toBeGreaterThan(missingNinth.score);
    });

    it('treats dominant ninth structure as core when evaluating candidates', () => {
        const entry = resolveChordRegistryEntry('dominant-9');
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);
        const withNinth = buildVoicingCandidate(resolveVoicingTemplate(chord, tones, {
            id: 'dom9-with-9',
            label: 'dom9 with 9',
            instrument: 'guitar',
            rootString: 4,
            strings: [
                { string: 0, fretOffset: 0, toneDegree: '5' },
                { string: 1, fretOffset: 0, toneDegree: '9' },
                { string: 2, fretOffset: 0, toneDegree: 'b7' },
                { string: 3, fretOffset: -1, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 }), entry, tones);
        const missingNinth = buildVoicingCandidate(resolveVoicingTemplate(chord, tones, {
            id: 'dom9-missing-9',
            label: 'dom9 missing 9',
            instrument: 'guitar',
            rootString: 4,
            strings: [
                { string: 0, fretOffset: 0, toneDegree: '5' },
                { string: 1, fretOffset: -2, toneDegree: '1' },
                { string: 2, fretOffset: 0, toneDegree: 'b7' },
                { string: 3, fretOffset: -1, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 }), entry, tones);

        expect(withNinth.matchedRequiredDegrees).toContain('9');
        expect(missingNinth.voicing.missingRequiredDegrees).toContain('9');
        expect(withNinth.score).toBeGreaterThan(missingNinth.score);
    });

    it('separates omitted optional tones from missing required tones for extended chords', () => {
        const candidates = getRankedVoicingsForChord('dominant-13', 0);
        const candidateWithOptionalOmissions = candidates.find(
            (candidate) => candidate.voicing.playable && (candidate.voicing.omittedOptionalDegrees?.length ?? 0) > 0
        );

        expect(candidateWithOptionalOmissions).toBeDefined();
        expect(candidateWithOptionalOmissions?.voicing.missingRequiredDegrees).toEqual([]);
        expect(candidateWithOptionalOmissions?.voicing.omittedOptionalDegrees?.length).toBeGreaterThan(0);
        expect(candidateWithOptionalOmissions?.voicing.omittedOptionalDegrees).toContain('9');
        expect(candidateWithOptionalOmissions?.voicing.omittedOptionalDegrees).toContain('5');
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

    it('keeps altered dominant identity tones required', () => {
        const entry = resolveChordRegistryEntry('hendrix-7-sharp-9');
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);
        const withAlteration = buildVoicingCandidate(resolveVoicingTemplate(chord, tones, {
            id: '7sharp9-with-alt',
            label: '7#9 with alteration',
            instrument: 'guitar',
            rootString: 4,
            strings: [
                { string: 0, fretOffset: 0, toneDegree: '5' },
                { string: 1, fretOffset: 1, toneDegree: '#9' },
                { string: 2, fretOffset: 0, toneDegree: 'b7' },
                { string: 3, fretOffset: -1, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 }), entry, tones);
        const missingAlteration = buildVoicingCandidate(resolveVoicingTemplate(chord, tones, {
            id: '7sharp9-missing-alt',
            label: '7#9 missing alteration',
            instrument: 'guitar',
            rootString: 4,
            strings: [
                { string: 0, fretOffset: 0, toneDegree: '5' },
                { string: 1, fretOffset: -2, toneDegree: '1' },
                { string: 2, fretOffset: 0, toneDegree: 'b7' },
                { string: 3, fretOffset: -1, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 }), entry, tones);

        expect(withAlteration.missingRequiredDegrees).toEqual([]);
        expect(missingAlteration.missingRequiredDegrees).toContain('#9');
        expect(withAlteration.score).toBeGreaterThan(missingAlteration.score);
    });

    it('rewards voicings that satisfy a requested slash bass', () => {
        const entry = resolveChordRegistryEntry('major');
        const slashChord = buildChordDefinitionFromRegistryEntry(entry, 0, { slashBassPitchClass: 4 });
        const tones = buildChordTonesFromRegistryEntry(entry, 0);
        const bassMatch = resolveVoicingTemplate(slashChord, tones, {
            id: 'c-over-e',
            label: 'C/E',
            instrument: 'guitar',
            rootString: 4,
            strings: [
                { string: 0, fretOffset: -3, toneDegree: '3' },
                { string: 1, fretOffset: -2, toneDegree: '1' },
                { string: 2, fretOffset: -3, toneDegree: '5' },
                { string: 3, fretOffset: -1, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: -3, toneDegree: '3' },
            ],
        }, { rootFret: 3 });
        const bassMiss = resolveVoicingTemplate(slashChord, tones, {
            id: 'c-root-position',
            label: 'C',
            instrument: 'guitar',
            rootString: 4,
            strings: [
                { string: 0, fretOffset: -3, toneDegree: '3' },
                { string: 1, fretOffset: -2, toneDegree: '1' },
                { string: 2, fretOffset: -3, toneDegree: '5' },
                { string: 3, fretOffset: -1, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 });
        const matchCandidate = buildVoicingCandidate(bassMatch, entry, tones);
        const missCandidate = buildVoicingCandidate(bassMiss, entry, tones);

        expect(bassMatch.satisfiesSlashBass).toBe(true);
        expect(bassMiss.satisfiesSlashBass).toBe(false);
        expect(matchCandidate.score).toBeGreaterThan(missCandidate.score);
        expect(matchCandidate.reasons.some((reason) => reason.includes('slash bass'))).toBe(true);
        expect(missCandidate.reasons.some((reason) => reason.includes('slash bass'))).toBe(true);
    });
});
