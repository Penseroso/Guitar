import { describe, expect, it } from 'vitest';

import { buildChordDefinitionFromRegistryEntry, buildChordTonesFromRegistryEntry, resolveChordRegistryEntry } from './helpers';
import { rankVoicingCandidates } from './ranking';
import { resolveVoicingTemplate } from './resolver';

describe('voicing ranking modes', () => {
    it('compact mode favors tighter voicings over wider ones', () => {
        const entry = resolveChordRegistryEntry('major-7');
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);
        const compactVoicing = resolveVoicingTemplate(chord, tones, {
            id: 'compact-maj7',
            label: 'Root 5 (Compact)',
            instrument: 'guitar',
            rootString: 4,
            source: 'generated',
            tags: ['generated', 'generated-compact'],
            strings: [
                { string: 0, fretOffset: null },
                { string: 1, fretOffset: 0, toneDegree: '9', isOptional: true },
                { string: 2, fretOffset: 1, toneDegree: '7' },
                { string: 3, fretOffset: -1, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 });
        const wideVoicing = resolveVoicingTemplate(chord, tones, {
            id: 'wide-maj7',
            label: 'Root 5 (Spread)',
            instrument: 'guitar',
            rootString: 4,
            source: 'generated',
            tags: ['generated'],
            strings: [
                { string: 0, fretOffset: null },
                { string: 1, fretOffset: 7, toneDegree: '9', isOptional: true },
                { string: 2, fretOffset: 1, toneDegree: '7' },
                { string: 3, fretOffset: 4, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 });

        const ranked = rankVoicingCandidates([wideVoicing, compactVoicing], entry, tones, { mode: 'compact' });

        expect(ranked[0].voicing.id).toBe(compactVoicing.id);
    });

    it('beginner mode favors easier lower-friction shapes', () => {
        const entry = resolveChordRegistryEntry('dominant-7');
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);
        const easierVoicing = resolveVoicingTemplate(chord, tones, {
            id: 'easy-dom7',
            label: 'Root 5 (Standard)',
            instrument: 'guitar',
            rootString: 4,
            source: 'legacy-shape',
            tags: ['caged'],
            strings: [
                { string: 0, fretOffset: null },
                { string: 1, fretOffset: 0, toneDegree: '9', isOptional: true },
                { string: 2, fretOffset: 0, toneDegree: 'b7' },
                { string: 3, fretOffset: -1, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 });
        const awkwardVoicing = resolveVoicingTemplate(chord, tones, {
            id: 'awkward-dom7',
            label: 'Root 6 (Generated)',
            instrument: 'guitar',
            rootString: 5,
            source: 'generated',
            tags: ['generated'],
            strings: [
                { string: 0, fretOffset: null },
                { string: 1, fretOffset: 6, toneDegree: '9', isOptional: true },
                { string: 2, fretOffset: 0, toneDegree: 'b7' },
                { string: 3, fretOffset: 5, toneDegree: '3' },
                { string: 4, fretOffset: null },
                { string: 5, fretOffset: 0, toneDegree: '1' },
            ],
        }, { rootFret: 3 });

        const ranked = rankVoicingCandidates([awkwardVoicing, easierVoicing], entry, tones, { mode: 'beginner' });

        expect(ranked[0].voicing.id).toBe(easierVoicing.id);
    });

    it('upper-register mode favors top-string comping voicings', () => {
        const entry = resolveChordRegistryEntry('minor-7');
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);
        const lowerVoicing = resolveVoicingTemplate(chord, tones, {
            id: 'lower-m7',
            label: 'Root 6 (Shell)',
            instrument: 'guitar',
            rootString: 5,
            source: 'generated',
            tags: ['generated', 'generated-shell'],
            strings: [
                { string: 0, fretOffset: null },
                { string: 1, fretOffset: null },
                { string: 2, fretOffset: 0, toneDegree: 'b7' },
                { string: 3, fretOffset: -2, toneDegree: 'b3' },
                { string: 4, fretOffset: null },
                { string: 5, fretOffset: 0, toneDegree: '1' },
            ],
        }, { rootFret: 8 });
        const upperVoicing = resolveVoicingTemplate(chord, tones, {
            id: 'upper-m7',
            label: 'Root 4 (Upper Register)',
            instrument: 'guitar',
            rootString: 3,
            source: 'generated',
            tags: ['generated', 'generated-upper-register'],
            strings: [
                { string: 0, fretOffset: 1, toneDegree: 'b7' },
                { string: 1, fretOffset: 1, toneDegree: 'b3' },
                { string: 2, fretOffset: 0, toneDegree: '5', isOptional: true },
                { string: 3, fretOffset: 0, toneDegree: '1' },
                { string: 4, fretOffset: null },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 10 });

        const ranked = rankVoicingCandidates([lowerVoicing, upperVoicing], entry, tones, { mode: 'upper-register' });

        expect(ranked[0].voicing.id).toBe(upperVoicing.id);
    });
});
