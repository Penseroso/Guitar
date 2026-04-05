import { describe, expect, it } from 'vitest';

import { getVoicingDisplayName, getVoicingDisplaySubtitle } from './descriptor';
import { buildChordDefinitionFromRegistryEntry, buildChordTonesFromRegistryEntry, getChordTypeLabel, getChordTypeSuffix, resolveChordRegistryEntry } from './helpers';
import { resolveVoicingTemplate } from './resolver';

describe('voicing descriptor derivation', () => {
    it('uses natural compact major and minor display language', () => {
        expect(getChordTypeLabel('major')).toBe('maj');
        expect(getChordTypeSuffix('major')).toBe('');
        expect(getChordTypeLabel('minor')).toBe('m');
        expect(getChordTypeSuffix('minor')).toBe('m');
        expect(getChordTypeLabel('major-7')).toBe('maj7');
        expect(getChordTypeLabel('major-6')).toBe('6');
        expect(getChordTypeSuffix('major-6')).toBe('6');
        expect(getChordTypeLabel('dominant-11')).toBe('11');
    });

    it('resolves major-6 from registry ids and aliases', () => {
        expect(resolveChordRegistryEntry('major-6')).toMatchObject({
            id: 'major-6',
            symbol: '6',
            family: 'seventh',
        });
        expect(resolveChordRegistryEntry('maj6').id).toBe('major-6');
        expect(resolveChordRegistryEntry('M6').id).toBe('major-6');
    });

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
        expect(getVoicingDisplayName(legacyImported.descriptor)).toBe('4-note voicing');
        expect(getVoicingDisplaySubtitle(legacyImported.descriptor)).toBe('4-note · 5th-string root · low register');
        expect(legacyImported).not.toHaveProperty('template');
        expect(legacyImported).not.toHaveProperty('provenance');
        expect(legacyImported.descriptor.provenance.sourceKind).toBe('legacy-import');
        expect(generated.descriptor.provenance.sourceKind).toBe('generated');
    });

    it('keeps shell precedence above compact when required coverage is lean and complete', () => {
        const entry = resolveChordRegistryEntry('major-7');
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);
        const voicing = resolveVoicingTemplate(chord, tones, {
            id: 'shell-major-7',
            label: 'shell',
            instrument: 'guitar',
            rootString: 4,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: null },
                { string: 1, fretOffset: null },
                { string: 2, fretOffset: 1, toneDegree: '7' },
                { string: 3, fretOffset: -1, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 });

        expect(voicing.descriptor.family).toBe('shell');
        expect(getVoicingDisplayName(voicing.descriptor)).toBe('3-note voicing');
        expect(getVoicingDisplaySubtitle(voicing.descriptor)).toBe('3-note · 5th-string root · low register');
    });

    it('distinguishes compact from close when the grip widens without becoming spread', () => {
        const entry = resolveChordRegistryEntry('major-7');
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);
        const compact = resolveVoicingTemplate(chord, tones, {
            id: 'compact-boundary',
            label: 'compact',
            instrument: 'guitar',
            rootString: 4,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: null },
                { string: 1, fretOffset: 2, toneDegree: '3' },
                { string: 2, fretOffset: 1, toneDegree: '7' },
                { string: 3, fretOffset: 2, toneDegree: '5', isOptional: true },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 });
        const close = resolveVoicingTemplate(chord, tones, {
            id: 'close-boundary',
            label: 'close',
            instrument: 'guitar',
            rootString: 4,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: null },
                { string: 1, fretOffset: -3, toneDegree: '7' },
                { string: 2, fretOffset: -3, toneDegree: '5', isOptional: true },
                { string: 3, fretOffset: -2, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 });

        expect(compact.descriptor.family).toBe('compact');
        expect(close.descriptor.family).toBe('close');
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
        expect(getVoicingDisplayName(voicing.descriptor)).toBe('Upper-register voicing');
        expect(getVoicingDisplaySubtitle(voicing.descriptor)).toBe('4-note · 4th-string root');
    });

    it('does not label every high-position voicing as upper-register', () => {
        const entry = resolveChordRegistryEntry('major-7');
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);
        const voicing = resolveVoicingTemplate(chord, tones, {
            id: 'high-not-upper',
            label: 'high',
            instrument: 'guitar',
            rootString: 5,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: null },
                { string: 1, fretOffset: null },
                { string: 2, fretOffset: 0, toneDegree: '7' },
                { string: 3, fretOffset: 1, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '5', isOptional: true },
                { string: 5, fretOffset: 0, toneDegree: '1' },
            ],
        }, { rootFret: 10 });

        expect(voicing.descriptor.registerBand).toBe('high');
        expect(voicing.descriptor.family).toBe('compact');
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
        expect(getVoicingDisplaySubtitle(voicing.descriptor)).toBe('3-note · upper register');
    });

    it('names slash-bass voicings independently from template history', () => {
        const entry = resolveChordRegistryEntry('major');
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0, { slashBassPitchClass: 4 });
        const tones = buildChordTonesFromRegistryEntry(entry, 0);
        const voicing = resolveVoicingTemplate(chord, tones, {
            id: 'slash-bass',
            label: 'legacy slash',
            instrument: 'guitar',
            rootString: 4,
            source: 'legacy-shape',
            strings: [
                { string: 0, fretOffset: -3, toneDegree: '3' },
                { string: 1, fretOffset: -2, toneDegree: '1' },
                { string: 2, fretOffset: -3, toneDegree: '5' },
                { string: 3, fretOffset: -1, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: -3, toneDegree: '3' },
            ],
        }, { rootFret: 3 });

        expect(voicing.descriptor.inversion).toBe('slash-bass');
        expect(getVoicingDisplayName(voicing.descriptor)).toBe('Slash-bass voicing');
        expect(getVoicingDisplaySubtitle(voicing.descriptor)).toBe('6-note · 2 roots · low register');
    });

    it('captures root distribution explicitly and normalizes compatibility rootString to the lowest root string', () => {
        const entry = resolveChordRegistryEntry('major');
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);
        const voicing = resolveVoicingTemplate(chord, tones, {
            id: 'root-duplication',
            label: 'spread roots',
            instrument: 'guitar',
            rootString: 5,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: -3, toneDegree: '3' },
                { string: 1, fretOffset: -2, toneDegree: '1' },
                { string: 2, fretOffset: 0, toneDegree: '5' },
                { string: 3, fretOffset: -2, toneDegree: '1' },
                { string: 4, fretOffset: null },
                { string: 5, fretOffset: 0, toneDegree: '1' },
            ],
        }, { rootFret: 3 });

        expect(voicing.descriptor.rootOccurrences).toEqual([1, 3]);
        expect(voicing.descriptor.rootOccurrenceCount).toBe(2);
        expect(voicing.descriptor.lowestRootString).toBe(1);
        expect(voicing.descriptor.highestRootString).toBe(3);
        expect(voicing.descriptor.hasDuplicatedRoot).toBe(true);
        expect(voicing.descriptor.rootString).toBe(1);
        expect(getVoicingDisplayName(voicing.descriptor)).toBe('Duplicated-root voicing');
        expect(getVoicingDisplaySubtitle(voicing.descriptor)).toBe('5-note · 2 roots · low register · inversion');
    });
});
