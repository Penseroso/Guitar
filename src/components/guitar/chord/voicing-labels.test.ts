import { describe, expect, it } from 'vitest';

import { buildChordDefinitionFromRegistryEntry, buildChordTonesFromRegistryEntry } from '@/domain/chord';
import { resolveVoicingTemplate } from '@/domain/chord/resolver';
import { getVoicingPresentationMeta } from './voicing-labels';

function resolveTestVoicing(
    chordId: string,
    rootPitchClass: number,
    options: Parameters<typeof resolveVoicingTemplate>[2],
    resolveOptions?: Parameters<typeof resolveVoicingTemplate>[3]
) {
    const chord = buildChordDefinitionFromRegistryEntry(chordId, rootPitchClass, {
        slashBassPitchClass: resolveOptions?.slashBassPitchClass,
    });
    const tones = buildChordTonesFromRegistryEntry(chordId, rootPitchClass);

    return resolveVoicingTemplate(chord, tones, options, resolveOptions);
}

describe('voicing player-facing labels', () => {
    it('labels a complete triad on 3 consecutive strings, in root position, as Triad · Root', () => {
        const voicing = resolveTestVoicing('major', 0, {
            id: 'top-set-root',
            label: 'top-set root',
            instrument: 'guitar',
            rootString: 2,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: -2, toneDegree: '5' },
                { string: 1, fretOffset: 0, toneDegree: '3' },
                { string: 2, fretOffset: 0, toneDegree: '1' },
                { string: 3, fretOffset: null },
                { string: 4, fretOffset: null },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 5 });

        expect(getVoicingPresentationMeta(voicing)).toMatchObject({
            primaryLabel: 'Triad · Root',
            secondaryLabel: 'top strings',
        });
    });

    it('labels major and minor 3-consecutive-string inversions correctly', () => {
        const majorFirstInversion = resolveTestVoicing('major', 0, {
            id: 'top-set-first-inv',
            label: 'top-set first inversion',
            instrument: 'guitar',
            rootString: 0,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: 0, toneDegree: '1' },
                { string: 1, fretOffset: 0, toneDegree: '5' },
                { string: 2, fretOffset: 1, toneDegree: '3' },
                { string: 3, fretOffset: null },
                { string: 4, fretOffset: null },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 8 });
        const minorSecondInversion = resolveTestVoicing('minor', 9, {
            id: 'top-set-second-inv',
            label: 'top-set second inversion',
            instrument: 'guitar',
            rootString: 1,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: -1, toneDegree: 'b3' },
                { string: 1, fretOffset: 0, toneDegree: '1' },
                { string: 2, fretOffset: -1, toneDegree: '5' },
                { string: 3, fretOffset: null },
                { string: 4, fretOffset: null },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 10 });

        expect(getVoicingPresentationMeta(majorFirstInversion).primaryLabel).toBe('Triad · 1st inv');
        expect(getVoicingPresentationMeta(minorSecondInversion).primaryLabel).toBe('Triad · 2nd inv');
    });

    it('excludes a 7th chord\'s 3-string shell-equivalent subset (redundant with Shell), but recognizes sus4 (a genuine 3-tone chord) as Triad and a complete 4-tone 7th-chord voicing as Quad', () => {
        // Regression/behavior change: a major-7 voicing covering only root/3rd/7th (omitting the
        // optional 5th) used to get a window label under the old "3 strings, nothing required
        // missing" rule — but that's exactly major-7's *required* set, which always coincides
        // with VoicingTechniqueTag's 'shell' classification (see classifyVoicingFamily's
        // shellLike): a redundant window showing nothing "Shell" doesn't already. Excluded now.
        const majorSeventhShellSubset = resolveTestVoicing('major-7', 0, {
            id: 'top-strings-maj7',
            label: 'top strings maj7',
            instrument: 'guitar',
            rootString: 0,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: 0, toneDegree: '1' },
                { string: 1, fretOffset: -1, toneDegree: '7' },
                { string: 2, fretOffset: 0, toneDegree: '3' },
                { string: 3, fretOffset: null },
                { string: 4, fretOffset: null },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 8 });
        // sus4's full formula genuinely has only 3 tones (1, 4, 5 — no separate "3rd" at all), so
        // a 3-string window covering all of them is a real complete-chord window, not a subset.
        const suspended = resolveTestVoicing('sus4', 0, {
            id: 'top-strings-sus4',
            label: 'top strings sus4',
            instrument: 'guitar',
            rootString: 1,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: -1, toneDegree: '4' },
                { string: 1, fretOffset: 0, toneDegree: '1' },
                { string: 2, fretOffset: -1, toneDegree: '5' },
                { string: 3, fretOffset: null },
                { string: 4, fretOffset: null },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 1 });
        // major-7's full 4-tone formula (root/3rd/5th/7th) on 4 consecutive strings — genuinely
        // new: the complete chord, not a shell subset, confined to a compact register.
        const majorSeventhComplete = resolveTestVoicing('major-7', 0, {
            id: 'quad-maj7',
            label: 'complete maj7 quad',
            instrument: 'guitar',
            rootString: 0,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: 0, toneDegree: '1' },
                { string: 1, fretOffset: -1, toneDegree: '7' },
                { string: 2, fretOffset: 0, toneDegree: '3' },
                { string: 3, fretOffset: -1, toneDegree: '5' },
                { string: 4, fretOffset: null },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 8 });
        const powerChord = resolveTestVoicing('power-5', 0, {
            id: 'top-strings-power',
            label: 'top strings power',
            instrument: 'guitar',
            rootString: 1,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: null },
                { string: 1, fretOffset: 0, toneDegree: '1' },
                { string: 2, fretOffset: -1, toneDegree: '5' },
                { string: 3, fretOffset: null },
                { string: 4, fretOffset: null },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 1 });

        expect(getVoicingPresentationMeta(majorSeventhShellSubset).primaryLabel.startsWith('Triad')).toBe(false);
        expect(getVoicingPresentationMeta(majorSeventhShellSubset).primaryLabel.startsWith('Quad')).toBe(false);
        expect(getVoicingPresentationMeta(suspended).primaryLabel.startsWith('Triad')).toBe(true);
        expect(getVoicingPresentationMeta(majorSeventhComplete).primaryLabel.startsWith('Quad')).toBe(true);
        expect(getVoicingPresentationMeta(powerChord).primaryLabel.startsWith('Triad')).toBe(false);
    });

    it('labels rooted shapes by 6th, 5th, and 4th string root buckets', () => {
        const sixthStringRoot = resolveTestVoicing('major-7', 0, {
            id: 'sixth-string-root',
            label: 'sixth string root',
            instrument: 'guitar',
            rootString: 5,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: null },
                { string: 1, fretOffset: null },
                { string: 2, fretOffset: 1, toneDegree: '7' },
                { string: 3, fretOffset: 1, toneDegree: '3' },
                { string: 4, fretOffset: null },
                { string: 5, fretOffset: 0, toneDegree: '1' },
            ],
        }, { rootFret: 8 });
        const fifthStringRoot = resolveTestVoicing('major-7', 0, {
            id: 'fifth-string-root',
            label: 'fifth string root',
            instrument: 'guitar',
            rootString: 4,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: null },
                { string: 1, fretOffset: 0, toneDegree: '7' },
                { string: 2, fretOffset: 1, toneDegree: '3' },
                { string: 3, fretOffset: 0, toneDegree: '5' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 });
        const fourthStringRoot = resolveTestVoicing('major-7', 0, {
            id: 'fourth-string-root',
            label: 'fourth string root',
            instrument: 'guitar',
            rootString: 3,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: null },
                { string: 1, fretOffset: -2, toneDegree: '5' },
                { string: 2, fretOffset: -1, toneDegree: '3' },
                { string: 3, fretOffset: 0, toneDegree: '1' },
                { string: 4, fretOffset: null },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 10 });

        expect(getVoicingPresentationMeta(sixthStringRoot).primaryLabel).toBe('6th-string root');
        expect(getVoicingPresentationMeta(fifthStringRoot).primaryLabel).toBe('5th-string root');
        expect(getVoicingPresentationMeta(fourthStringRoot).primaryLabel).toBe('4th-string root');
    });

    it('keeps slash bass and rootless precedence above other label categories', () => {
        const slashBass = resolveTestVoicing('major', 0, {
            id: 'slash-bass',
            label: 'slash bass',
            instrument: 'guitar',
            rootString: 4,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: -3, toneDegree: '3' },
                { string: 1, fretOffset: -2, toneDegree: '1' },
                { string: 2, fretOffset: -3, toneDegree: '5' },
                { string: 3, fretOffset: -1, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: -3, toneDegree: '3' },
            ],
        }, { rootFret: 3, slashBassPitchClass: 4 });
        const rootless = resolveTestVoicing('dominant-7', 0, {
            id: 'rootless',
            label: 'rootless',
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

        expect(getVoicingPresentationMeta(slashBass)).toMatchObject({
            primaryLabel: 'Slash bass',
        });
        expect(getVoicingPresentationMeta(rootless)).toMatchObject({
            primaryLabel: 'Rootless',
            secondaryLabel: '3fr · root omitted',
        });
    });

    it('exposes an open/shell/barre technique badge for known shapes, and null for the plain/no-voicing case', () => {
        const shell = resolveTestVoicing('minor-7', 0, {
            id: 'upper-shell-m7',
            label: 'upper shell',
            instrument: 'guitar',
            rootString: 3,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: 1, toneDegree: 'b7' },
                { string: 1, fretOffset: 1, toneDegree: 'b3' },
                { string: 2, fretOffset: null },
                { string: 3, fretOffset: 0, toneDegree: '1' },
                { string: 4, fretOffset: null },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 10 });
        const open = resolveTestVoicing('major', 0, {
            id: 'full-open-triad',
            label: 'full open triad',
            instrument: 'guitar',
            rootString: 4,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: 0, toneDegree: '1' },
                { string: 1, fretOffset: 1, toneDegree: '5', isOptional: true },
                { string: 2, fretOffset: 0, toneDegree: '1' },
                { string: 3, fretOffset: 2, toneDegree: '3' },
                { string: 4, fretOffset: 3, toneDegree: '5', isOptional: true },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 0 });
        // Classic F-shape barre: fret1 across strings 5/4/1/0, with strings 3/2 arching in front
        // at frets 3/2 — same forced-barre geometry as the fretGeometry.ts F-chord regression.
        const barre = resolveTestVoicing('major', 0, {
            id: 'f-shape-barre',
            label: 'f-shape barre',
            instrument: 'guitar',
            rootString: 5,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: 0, toneDegree: '1' },
                { string: 1, fretOffset: 0, toneDegree: '5' },
                { string: 2, fretOffset: 1, toneDegree: '1' },
                { string: 3, fretOffset: 2, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '5' },
                { string: 5, fretOffset: 0, toneDegree: '1' },
            ],
        }, { rootFret: 1 });
        const midNeckStandard = resolveTestVoicing('major-7', 0, {
            id: 'fourth-string-root-standard',
            label: 'fourth string root',
            instrument: 'guitar',
            rootString: 3,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: null },
                { string: 1, fretOffset: -2, toneDegree: '5' },
                { string: 2, fretOffset: -1, toneDegree: '3' },
                { string: 3, fretOffset: 0, toneDegree: '1' },
                { string: 4, fretOffset: null },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 10 });

        expect(getVoicingPresentationMeta(shell).techniqueLabel).toBe('Shell');
        expect(getVoicingPresentationMeta(open).techniqueLabel).toBe('Open');
        expect(getVoicingPresentationMeta(barre).techniqueLabel).toBe('Barre');
        expect(getVoicingPresentationMeta(midNeckStandard).techniqueLabel).toBeNull();
        expect(getVoicingPresentationMeta(undefined).techniqueLabel).toBeNull();
    });
});
