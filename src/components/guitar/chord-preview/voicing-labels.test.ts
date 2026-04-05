import { describe, expect, it } from 'vitest';

import { buildChordDefinitionFromRegistryEntry, buildChordTonesFromRegistryEntry } from '../../../utils/guitar/chords';
import { resolveVoicingTemplate } from '../../../utils/guitar/chords/resolver';
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
    it('labels a strict top-string major triad in root position as Top-set · Root', () => {
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
            primaryLabel: 'Top-set · Root',
            secondaryLabel: 'top strings',
        });
    });

    it('labels major and minor top-set inversions correctly', () => {
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

        expect(getVoicingPresentationMeta(majorFirstInversion).primaryLabel).toBe('Top-set · 1st inv');
        expect(getVoicingPresentationMeta(minorSecondInversion).primaryLabel).toBe('Top-set · 2nd inv');
    });

    it('does not apply Top-set to seventh, suspended, or power chords on the top strings', () => {
        const majorSeventh = resolveTestVoicing('major-7', 0, {
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

        expect(getVoicingPresentationMeta(majorSeventh).primaryLabel.startsWith('Top-set')).toBe(false);
        expect(getVoicingPresentationMeta(suspended).primaryLabel.startsWith('Top-set')).toBe(false);
        expect(getVoicingPresentationMeta(powerChord).primaryLabel.startsWith('Top-set')).toBe(false);
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
});
