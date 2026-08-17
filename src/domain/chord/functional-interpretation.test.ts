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

    it('reads a plain diminished (not just minor) chord at degree II as pre-dominant', () => {
        // Regression: the old isMinorQuality checked entry.definition.quality.includes('minor'),
        // which 'diminished' and 'diminished-seventh' never match despite both having a minor 3rd
        // (only 'half-diminished-7' was ever special-cased around this gap).
        const diminishedTriad = interpretChordAgainstTonalCenter('diminished', 2, {
            selectedKey: 0,
            tonicPitchClass: 0,
            scaleGroup: 'Diatonic Modes',
            scaleName: 'Ionian',
        });
        const diminishedSeventh = interpretChordAgainstTonalCenter('diminished-7', 2, {
            selectedKey: 0,
            tonicPitchClass: 0,
            scaleGroup: 'Diatonic Modes',
            scaleName: 'Ionian',
        });

        expect(diminishedTriad.harmonyKind).toBe('predominant');
        expect(diminishedSeventh.harmonyKind).toBe('predominant');
    });

    it('reads a non-Ionian diatonic mode tonic (e.g. Phrygian) as a modal center, not a plain tonic', () => {
        // Regression: the old isModalFrame was a curated 8-name allowlist that silently excluded
        // Phrygian and Locrian (among others), so their tonic chords fell through to the same
        // "Tonic Center" labeling as a plain major key.
        const interpretation = interpretChordAgainstTonalCenter('minor', 0, {
            selectedKey: 0,
            tonicPitchClass: 0,
            scaleGroup: 'Diatonic Modes',
            scaleName: 'Phrygian',
        });

        expect(interpretation.harmonyKind).toBe('modal-center');
        expect(interpretation.roleLabel).toBe('Modal Center');
    });

    it('reads a chord in a minor-quality diatonic mode (Dorian) as borrowed color, not default tonic function', () => {
        // Regression: the old fallback checked scaleGroup.includes('Minor'), which only ever
        // matched the 'Harmonic Minor Modes'/'Jazz Minor Modes' group names — a minor-quality mode
        // like Dorian living inside the 'Diatonic Modes' group was invisible to that check.
        const interpretation = interpretChordAgainstTonalCenter('major-7', 9, {
            selectedKey: 0,
            tonicPitchClass: 0,
            scaleGroup: 'Diatonic Modes',
            scaleName: 'Dorian',
        });

        expect(interpretation.harmonyKind).toBe('borrowed');
    });
});
