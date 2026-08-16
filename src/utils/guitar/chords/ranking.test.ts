import { describe, expect, it } from 'vitest';

import { buildChordDefinitionFromRegistryEntry, buildChordTonesFromRegistryEntry, resolveChordRegistryEntry } from './helpers';
import { getVoicingShapeMetrics, rankVoicingCandidates } from './ranking';
import { resolveVoicingTemplate } from './resolver';
import type { ResolvedVoicing, ResolvedVoicingNote } from './types';

function voicingFromNotes(notes: ResolvedVoicingNote[]): ResolvedVoicing {
    return { notes } as unknown as ResolvedVoicing;
}

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
                { string: 1, fretOffset: 0, toneDegree: '5', isOptional: true },
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
                { string: 1, fretOffset: 7, toneDegree: '5', isOptional: true },
                { string: 2, fretOffset: 1, toneDegree: '7' },
                { string: 3, fretOffset: 4, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 });

        const ranked = rankVoicingCandidates([wideVoicing, compactVoicing], entry, tones, { mode: 'compact' });

        expect(compactVoicing.descriptor.family).toBe('compact');
        expect(wideVoicing.descriptor.family).toBe('spread');
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

        expect(lowerVoicing.descriptor.family).not.toBe('upper-register');
        expect(upperVoicing.descriptor.family).toBe('upper-register');
        expect(ranked[0].voicing.id).toBe(upperVoicing.id);
    });
});

describe('getVoicingShapeMetrics — barre-aware same-fret grouping', () => {
    function note(string: number, fret: number): ResolvedVoicingNote {
        return { string: string as ResolvedVoicingNote['string'], fret, pitchClass: 0, isMuted: false };
    }
    function muted(string: number): ResolvedVoicingNote {
        return { string: string as ResolvedVoicingNote['string'], fret: -1, pitchClass: -1, isMuted: true };
    }

    it('does not penalize two independent fingers that coincidentally share a fret (open G: low-E and high-E both fret 3, D/G/B open in between)', () => {
        // 3-2-0-0-0-3
        const voicing = voicingFromNotes([
            note(5, 3), note(4, 2), note(3, 0), note(2, 0), note(1, 0), note(0, 3),
        ]);

        const metrics = getVoicingShapeMetrics(voicing);

        expect(metrics.barreNoteCount).toBe(0);
        expect(metrics.overlappingBarreSpan).toBe(0);
    });

    it('does not penalize a single wide barre with inner strings overridden by other fingers (classic F-shape)', () => {
        // 1-1-3-2-1-1: one barre at fret1 spans string5..string0; D/G at fret3/2 arch over it in
        // front. This is the single most common barre chord shape — must score as a normal barre,
        // not as if it were "skipping" the strings other fingers are overriding.
        const voicing = voicingFromNotes([
            note(5, 1), note(4, 1), note(3, 3), note(2, 2), note(1, 1), note(0, 1),
        ]);

        const metrics = getVoicingShapeMetrics(voicing);

        expect(metrics.barreNoteCount).toBe(4); // strings 5,4,1,0 all at fret 1
        expect(metrics.overlappingBarreSpan).toBe(0);
    });

    it('treats a mute next to a fretted finger as nearly free, but an isolated mute (no fretted neighbor) as costly and escalating', () => {
        // Adjacent case: x-3-2-0-x-x's D-string mute is not internal here (nothing played above
        // string2), so build one directly: string4 fretted, string3 muted but adjacent to a
        // fretted string4, string2/1/0 fretted — the mute leans on string4's finger, cheap.
        const adjacentMute = voicingFromNotes([
            muted(5), note(4, 3), muted(3), note(2, 2), note(1, 1), note(0, 0),
        ]);
        // Isolated case: same shape, but string4 is now open instead of fretted, so the string3
        // mute has no fretted neighbor on either side (string2 is fretted but not adjacent to
        // string4's other side — string3 itself has no fretted finger next to it at all... to
        // keep it unambiguous, mute string2 as well so string3's only neighbors are both non-fretted).
        const isolatedMute = voicingFromNotes([
            muted(5), note(4, 0), muted(3), muted(2), note(1, 1), note(0, 0),
        ]);

        const adjacentMetrics = getVoicingShapeMetrics(adjacentMute);
        const isolatedMetrics = getVoicingShapeMetrics(isolatedMute);

        expect(adjacentMetrics.internalMutedCount).toBe(1);
        expect(adjacentMetrics.isolatedInternalMuteCount).toBe(0);
        expect(isolatedMetrics.isolatedInternalMuteCount).toBeGreaterThan(0);
    });

    it('penalizes an isolated mute flanked by open strings on both sides worse than one flanked by anything else (nothing damps it at all)', () => {
        // 3-2-0-x-0-x: G major with the G string muted, sandwiched between two OPEN strings
        // (D and B) that are both being played — nothing is physically resting on it to keep
        // it quiet during a strum. Rarely used in practice for exactly this reason.
        const openFlanked = voicingFromNotes([
            note(5, 3), note(4, 2), note(3, 0), muted(2), note(1, 0), note(0, 0),
        ]);
        // Same isolated single-gap position, but the string-2 mute's neighbors are muted rather
        // than open — nothing actively ringing right next to the gap.
        const mutedFlanked = voicingFromNotes([
            note(4, 2), muted(3), muted(2), muted(1), note(0, 0),
        ]);

        const openFlankedMetrics = getVoicingShapeMetrics(openFlanked);
        const mutedFlankedMetrics = getVoicingShapeMetrics(mutedFlanked);

        expect(openFlankedMetrics.isolatedInternalMuteCount).toBe(1);
        expect(openFlankedMetrics.openFlankedIsolatedMuteCount).toBe(1);
        expect(mutedFlankedMetrics.openFlankedIsolatedMuteCount).toBe(0);
    });

    it('penalizes two separate forced barres whose string-ranges overlap (two fingers competing for the same strings at different frets)', () => {
        // x-3-5-x-5-3: fret3 forces a barre across string4..string0 (A..e, since string3/1 need
        // fret5 >= 3, arching in front); fret5 independently forces its own barre across
        // string3..string1 (D..B, skipping a muted G). The two barres' string-ranges overlap
        // (both cover D, G, B) — two different fingers can't both lie flat across that same
        // stretch of strings at once, so this should score worse than a single-barre shape.
        const voicing = voicingFromNotes([
            muted(5), note(4, 3), note(3, 5), muted(2), note(1, 5), note(0, 3),
        ]);

        const metrics = getVoicingShapeMetrics(voicing);

        expect(metrics.barreNoteCount).toBe(2);
        expect(metrics.overlappingBarreSpan).toBeGreaterThan(0);
    });
});
