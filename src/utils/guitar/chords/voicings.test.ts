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
        expect(resolved.descriptor.provenance.seedId).toBe(template.id);
        expect(resolved.descriptor.provenance.debugLabel).toBe(template.label);
        expect(resolved).not.toHaveProperty('template');
        expect(resolved).not.toHaveProperty('provenance');
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

    it('marks span-4-and-wider grips as non-playable', () => {
        const entry = resolveChordRegistryEntry('major-7');
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);
        const resolved = resolveVoicingTemplate(chord, tones, {
            id: 'wide-span',
            label: 'wide span',
            instrument: 'guitar',
            rootString: 4,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: null },
                { string: 1, fretOffset: 4, toneDegree: '5', isOptional: true },
                { string: 2, fretOffset: 1, toneDegree: '7' },
                { string: 3, fretOffset: 3, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 });

        expect(resolved.span).toBe(4);
        expect(resolved.playable).toBe(false);
    });

    it('invalidates major-triad seeds that introduce a non-formula seventh regardless of provenance', () => {
        const entry = resolveChordRegistryEntry('major');
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);
        const pollutedStrings = [
            { string: 0, fretOffset: null },
            { string: 1, fretOffset: -3 },
            { string: 2, fretOffset: -3, toneDegree: '5' },
            { string: 3, fretOffset: -1, toneDegree: '3' },
            { string: 4, fretOffset: 0, toneDegree: '1' },
            { string: 5, fretOffset: null },
        ];

        const legacyImported = resolveVoicingTemplate(chord, tones, {
            id: 'major-polluted-legacy',
            label: 'polluted legacy',
            instrument: 'guitar',
            rootString: 4,
            source: 'legacy-shape',
            strings: pollutedStrings,
        }, { rootFret: 3 });
        const generated = resolveVoicingTemplate(chord, tones, {
            id: 'major-polluted-generated',
            label: 'polluted generated',
            instrument: 'guitar',
            rootString: 4,
            source: 'generated',
            strings: pollutedStrings,
        }, { rootFret: 3 });

        expect(legacyImported.playable).toBe(false);
        expect(generated.playable).toBe(false);
        expect(legacyImported.outOfFormulaPitchClasses).toEqual([11]);
        expect(generated.outOfFormulaPitchClasses).toEqual([11]);
    });

    it('invalidates minor and suspended seeds that introduce non-formula tones', () => {
        const minorEntry = resolveChordRegistryEntry('minor');
        const minorChord = buildChordDefinitionFromRegistryEntry(minorEntry, 0);
        const minorTones = buildChordTonesFromRegistryEntry(minorEntry, 0);
        const pollutedMinor = resolveVoicingTemplate(minorChord, minorTones, {
            id: 'minor-polluted',
            label: 'minor polluted',
            instrument: 'guitar',
            rootString: 4,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: null },
                { string: 1, fretOffset: 0 },
                { string: 2, fretOffset: -3, toneDegree: '5' },
                { string: 3, fretOffset: -2, toneDegree: 'b3' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 });
        const susEntry = resolveChordRegistryEntry('sus4');
        const susChord = buildChordDefinitionFromRegistryEntry(susEntry, 0);
        const susTones = buildChordTonesFromRegistryEntry(susEntry, 0);
        const pollutedSus = resolveVoicingTemplate(susChord, susTones, {
            id: 'sus4-polluted',
            label: 'sus polluted',
            instrument: 'guitar',
            rootString: 4,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: null },
                { string: 1, fretOffset: -2, toneDegree: '1' },
                { string: 2, fretOffset: -3, toneDegree: '5' },
                { string: 3, fretOffset: -1, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 });

        expect(pollutedMinor.playable).toBe(false);
        expect(pollutedMinor.outOfFormulaPitchClasses).toEqual([2]);
        expect(pollutedSus.playable).toBe(false);
        expect(pollutedSus.outOfFormulaPitchClasses).toEqual([4]);
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
        const candidates = getRankedVoicingsForChord('major', 9, {
            includeNonPlayableCandidates: true,
        });

        expect(candidates[0].voicing.playable).toBe(true);
        expect(candidates.at(-1)?.voicing.playable).toBe(false);
        expect(candidates[0].score).toBeGreaterThan(candidates.at(-1)?.score ?? 0);
    });

    it('excludes non-playable span-4-and-wider candidates from the default surfaced pool', () => {
        const candidates = getRankedVoicingsForChord('major-7', 0);

        expect(candidates.length).toBeGreaterThan(0);
        expect(candidates.every((candidate) => candidate.voicing.playable)).toBe(true);
        expect(candidates.every((candidate) => candidate.voicing.span < 4)).toBe(true);
    });

    it('keeps surfaced major candidates formula-closed', () => {
        const candidates = getRankedVoicingsForChord('major', 0, {
            includeNonPlayableCandidates: true,
            maxCandidates: 20,
        });

        expect(candidates.length).toBeGreaterThan(0);
        expect(candidates.every((candidate) => (candidate.voicing.outOfFormulaPitchClasses?.length ?? 0) === 0)).toBe(true);
        expect(candidates.every((candidate) => candidate.voicing.notes
            .filter((note) => !note.isMuted)
            .every((note) => [0, 4, 7].includes(note.pitchClass)))).toBe(true);
    });

    it('keeps surfaced sus2 and sus4 candidates free of implicit thirds', () => {
        const sus2Candidates = getRankedVoicingsForChord('sus2', 0, {
            includeNonPlayableCandidates: true,
            maxCandidates: 20,
        });
        const sus4Candidates = getRankedVoicingsForChord('sus4', 0, {
            includeNonPlayableCandidates: true,
            maxCandidates: 20,
        });

        expect(sus2Candidates.every((candidate) => candidate.voicing.notes
            .filter((note) => !note.isMuted)
            .every((note) => [0, 2, 7].includes(note.pitchClass)))).toBe(true);
        expect(sus4Candidates.every((candidate) => candidate.voicing.notes
            .filter((note) => !note.isMuted)
            .every((note) => [0, 5, 7].includes(note.pitchClass)))).toBe(true);
    });

    it('keeps surfaced power chords formula-closed to root and fifth only', () => {
        const powerCandidates = getRankedVoicingsForChord('power-5', 0, {
            includeNonPlayableCandidates: true,
            maxCandidates: 20,
        });

        expect(powerCandidates.length).toBeGreaterThan(0);
        expect(powerCandidates.every((candidate) => candidate.voicing.notes
            .filter((note) => !note.isMuted)
            .every((note) => [0, 7].includes(note.pitchClass)))).toBe(true);
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

    it('preserves extended-family formula tones in surfaced seventh and ninth candidates', () => {
        const major7Candidates = getRankedVoicingsForChord('major-7', 0, {
            includeNonPlayableCandidates: false,
            maxCandidates: 12,
        });
        const dominant11Candidates = getRankedVoicingsForChord('dominant-11', 0, {
            includeNonPlayableCandidates: false,
            maxCandidates: 12,
        });
        const dominant9Candidates = getRankedVoicingsForChord('dominant-9', 0, {
            includeNonPlayableCandidates: false,
            maxCandidates: 12,
        });

        expect(major7Candidates.some((candidate) => candidate.voicing.notes.some((note) => !note.isMuted && note.pitchClass === 11))).toBe(true);
        expect(dominant11Candidates.some((candidate) => candidate.voicing.notes.some((note) => !note.isMuted && note.degree === '11'))).toBe(true);
        expect(dominant9Candidates.some((candidate) => candidate.voicing.notes.some((note) => !note.isMuted && note.degree === '9'))).toBe(true);
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
        expect(matchCandidate.reasons).toContain('Respects specified bass note.');
        expect(missCandidate.reasons).toContain('Does not match specified bass.');
    });

    it('penalizes suspended voicings that introduce a third', () => {
        const entry = resolveChordRegistryEntry('sus4');
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);
        const cleanSuspended = buildVoicingCandidate(resolveVoicingTemplate(chord, tones, {
            id: 'sus4-clean',
            label: 'sus4 clean',
            instrument: 'guitar',
            rootString: 4,
            strings: [
                { string: 0, fretOffset: 0, toneDegree: '5' },
                { string: 1, fretOffset: -2, toneDegree: '1' },
                { string: 2, fretOffset: -3, toneDegree: '5' },
                { string: 3, fretOffset: 0, toneDegree: '4' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 }), entry, tones);
        const pollutedSuspended = buildVoicingCandidate(resolveVoicingTemplate(chord, tones, {
            id: 'sus4-third',
            label: 'sus4 with third',
            instrument: 'guitar',
            rootString: 4,
            strings: [
                { string: 0, fretOffset: 0, toneDegree: '5' },
                { string: 1, fretOffset: -2, toneDegree: '1' },
                { string: 2, fretOffset: -3, toneDegree: '5' },
                { string: 3, fretOffset: -1, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 }), entry, tones);

        expect(cleanSuspended.score).toBeGreaterThan(pollutedSuspended.score);
        expect(pollutedSuspended.reasons).toContain('Introduces a third into a suspended chord.');
    });
});
