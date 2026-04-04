import { describe, expect, it } from 'vitest';

import { getVoicingDisplayName, getVoicingDisplaySubtitle } from './descriptor';
import { buildChordDefinitionFromRegistryEntry, buildChordTonesFromRegistryEntry, resolveChordRegistryEntry } from './helpers';
import { resolveVoicingTemplate } from './resolver';

describe('voicing descriptor derivation', () => {
    it('derives the same family and naming from structurally identical voicings across provenance', () => {
        const entry = resolveChordRegistryEntry('major-7');
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);
        const strings = [
            { string: 0, fretOffset: null },
            { string: 1, fretOffset: 0, toneDegree: '7' },
            { string: 2, fretOffset: 1, toneDegree: '3' },
            { string: 3, fretOffset: 0, toneDegree: '5', isOptional: true },
            { string: 4, fretOffset: 0, toneDegree: '1' },
            { string: 5, fretOffset: null },
        ] as const;

        const legacyImported = resolveVoicingTemplate(chord, tones, {
            id: 'maj7-legacyish',
            label: 'Root 5 (A Shape)',
            instrument: 'guitar',
            rootString: 4,
            source: 'legacy-shape',
            tags: ['caged'],
            strings: [...strings],
        }, { rootFret: 3 });
        const generated = resolveVoicingTemplate(chord, tones, {
            id: 'maj7-generated',
            label: 'Generated Seed',
            instrument: 'guitar',
            rootString: 4,
            source: 'generated',
            strings: [...strings],
        }, { rootFret: 3 });

        expect(legacyImported.descriptor.family).toBe(generated.descriptor.family);
        expect(getVoicingDisplayName(legacyImported.descriptor)).toBe(getVoicingDisplayName(generated.descriptor));
        expect(getVoicingDisplaySubtitle(legacyImported.descriptor)).toBe(getVoicingDisplaySubtitle(generated.descriptor));
        expect(legacyImported.descriptor.provenance.sourceKind).toBe('legacy-import');
        expect(generated.descriptor.provenance.sourceKind).toBe('generated');
    });

    it('classifies upper-register voicings from string concentration', () => {
        const entry = resolveChordRegistryEntry('minor-7');
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);
        const voicing = resolveVoicingTemplate(chord, tones, {
            id: 'upper-m7',
            label: 'anything',
            instrument: 'guitar',
            rootString: 3,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: 1, toneDegree: 'b7' },
                { string: 1, fretOffset: 1, toneDegree: 'b3' },
                { string: 2, fretOffset: 0, toneDegree: '5', isOptional: true },
                { string: 3, fretOffset: 0, toneDegree: '1' },
                { string: 4, fretOffset: null },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 10 });

        expect(voicing.descriptor.family).toBe('upper-register');
        expect(voicing.descriptor.registerBand).toBe('upper');
    });

    it('classifies rootless voicings from structure rather than source metadata', () => {
        const entry = resolveChordRegistryEntry('dominant-7');
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);
        const voicing = resolveVoicingTemplate(chord, tones, {
            id: 'rootless-dom7',
            label: 'Root 5 (Fake Label)',
            instrument: 'guitar',
            rootString: 4,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: null },
                { string: 1, fretOffset: 0, toneDegree: 'b7' },
                { string: 2, fretOffset: -1, toneDegree: '3' },
                { string: 3, fretOffset: 2, toneDegree: '9', isOptional: true },
                { string: 4, fretOffset: null },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 });

        expect(voicing.descriptor.hasRoot).toBe(false);
        expect(voicing.descriptor.family).toBe('rootless');
        expect(getVoicingDisplayName(voicing.descriptor)).toBe('Rootless voicing');
    });
});
