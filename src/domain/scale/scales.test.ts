import { describe, expect, it } from 'vitest';

import { generateModeData, SCALE_DISPLAY_FORMULAS } from './scales';

describe('generateModeData tritone roman-numeral spelling', () => {
    it('spells the tritone degree as #IV when the scale itself labels it #4 (Lydian family)', () => {
        expect(generateModeData('Diatonic Modes', 'Lydian')[6].role).toBe('#iv°');
        expect(generateModeData('Harmonic Minor Modes', 'Dorian #4')[6].role).toBe('#iv°');
        expect(generateModeData('Harmonic Minor Modes', 'Lydian #2')[6].role).toBe('#iv°');
        expect(generateModeData('Jazz Minor Modes', 'Lydian Augmented')[6].role).toBe('#iv°');
        expect(generateModeData('Jazz Minor Modes', 'Lydian Dominant')[6].role).toBe('#iv°');
        expect(generateModeData('Symmetric', 'Whole Tone')[6].role).toBe('#IV+');
    });

    it('keeps bV for scales that label the tritone degree b5 (Locrian family)', () => {
        expect(generateModeData('Diatonic Modes', 'Locrian')[6].role).toBe('bV');
        expect(generateModeData('Harmonic Minor Modes', 'Locrian #6')[6].role).toBe('bV');
        expect(generateModeData('Jazz Minor Modes', 'Locrian ♮2')[6].role).toBe('bV+');
    });

    it('keeps bV for the Altered scale even though its display formula uses #11 (not #4)', () => {
        // Sanity-check the premise: Altered scale's own label at the tritone degree is "#11",
        // a jazz-tension spelling, not "#4" — so it must not trigger the Lydian-style flip.
        expect(SCALE_DISPLAY_FORMULAS['Jazz Minor Modes']['Altered scale'][6]).toBe('#11');
        expect(generateModeData('Jazz Minor Modes', 'Altered scale')[6].role).toBe('bV');
    });
});
