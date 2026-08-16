import { describe, expect, it } from 'vitest';

import { interpretChordAgainstTonalCenter } from './functional-interpretation';

describe('functional harmonic interpretation', () => {
    it('distinguishes a true cadential dominant from a modal dominant center', () => {
        const cadential = interpretChordAgainstTonalCenter('dominant-7', 7, {
            selectedKey: 0,
            tonicPitchClass: 0,
            scaleGroup: 'Diatonic Modes',
            scaleName: 'Ionian',
        });
        const modal = interpretChordAgainstTonalCenter('dominant-7', 0, {
            selectedKey: 0,
            tonicPitchClass: 0,
            scaleGroup: 'Diatonic Modes',
            scaleName: 'Mixolydian',
        });

        expect(cadential.roleLabel).toBe('Cadential Dominant');
        expect(cadential.relativeDegree).toBe('V');
        expect(modal.roleLabel).toBe('Mixolydian Center');
        expect(modal.relativeDegree).toBe('I');
    });

    it('reads ii minor as pre-dominant relative to tonic rather than tonic center', () => {
        const interpretation = interpretChordAgainstTonalCenter('minor-7', 2, {
            selectedKey: 0,
            tonicPitchClass: 0,
            scaleGroup: 'Diatonic Modes',
            scaleName: 'Ionian',
        });

        expect(interpretation.relativeDegree).toBe('II');
        expect(interpretation.harmonyKind).toBe('predominant');
    });

    it('keeps suspended chords functionally open when tonic context does not stabilize them', () => {
        const interpretation = interpretChordAgainstTonalCenter('sus4', 7, {
            selectedKey: 0,
            tonicPitchClass: 0,
            scaleGroup: 'Diatonic Modes',
            scaleName: 'Ionian',
        });

        expect(interpretation.harmonyKind).toBe('suspension');
        expect(interpretation.fit).toBe('color');
    });

    it('spells the tritone degree as #IV when the active scale itself labels it #4 (Lydian family)', () => {
        const interpretation = interpretChordAgainstTonalCenter('major-7', 6, {
            selectedKey: 0,
            tonicPitchClass: 0,
            scaleGroup: 'Diatonic Modes',
            scaleName: 'Lydian',
        });

        expect(interpretation.relativeDegree).toBe('#IV');
    });

    it('keeps bV for scales that label the tritone degree b5 (Locrian family)', () => {
        const interpretation = interpretChordAgainstTonalCenter('half-diminished-7', 6, {
            selectedKey: 0,
            tonicPitchClass: 0,
            scaleGroup: 'Diatonic Modes',
            scaleName: 'Locrian',
        });

        expect(interpretation.relativeDegree).toBe('bV');
    });
});
