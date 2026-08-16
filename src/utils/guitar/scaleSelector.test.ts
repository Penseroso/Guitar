import { describe, expect, it } from 'vitest';

import { isMinorKeyScale } from './scaleSelector';

describe('isMinorKeyScale', () => {
    it('classifies diatonic minor-family modes as minor', () => {
        expect(isMinorKeyScale('Aeolian')).toBe(true);
        expect(isMinorKeyScale('Dorian')).toBe(true);
        expect(isMinorKeyScale('Phrygian')).toBe(true);
        expect(isMinorKeyScale('Locrian')).toBe(true);
    });

    it('classifies major-family diatonic modes as not minor', () => {
        expect(isMinorKeyScale('Ionian')).toBe(false);
        expect(isMinorKeyScale('Lydian')).toBe(false);
        expect(isMinorKeyScale('Mixolydian')).toBe(false);
    });

    it('classifies named minor scales as minor', () => {
        expect(isMinorKeyScale('Harmonic Minor')).toBe(true);
        expect(isMinorKeyScale('Jazz Minor')).toBe(true);
        expect(isMinorKeyScale('Minor Pentatonic')).toBe(true);
        expect(isMinorKeyScale('Major Pentatonic')).toBe(false);
    });

    it('preserves the legacy substring quirk carried over from ClientApp', () => {
        // "Phrygian Dominant" has a major third but matches via "Phrygian" — kept
        // as-is, this is a structural move, not a correctness fix (see scaleSelector.ts).
        expect(isMinorKeyScale('Phrygian Dominant')).toBe(true);
    });
});
