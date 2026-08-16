import { describe, expect, it } from 'vitest';

import { getScaleDerivedData, type ScaleDerivedDataToggles } from './getScaleDerivedData';

const NO_TOGGLES: ScaleDerivedDataToggles = {
    showChordTones: false,
    blueNote: false,
    sixthNote: false,
    secondNote: false,
    isDoubleStopActive: false,
    doubleStopInterval: 3,
    doubleStopStrings: [1, 2],
};

describe('getScaleDerivedData', () => {
    it('computes scale notes and classification for C Ionian', () => {
        const result = getScaleDerivedData('Diatonic Modes', 'Ionian', 0, NO_TOGGLES);

        expect(result.scaleNotes).toEqual([0, 2, 4, 5, 7, 9, 11]);
        expect(result.isPentatonic).toBe(false);
        expect(result.isMinorMode).toBe(false);
        expect(result.isDoubleStopAvailable).toBe(true);
        expect(result.isDoubleStopVisible).toBe(false);
        expect(result.modifierNotes).toEqual([]);
        expect(result.scaleChordTones).toEqual([]);
    });

    it('highlights root/3rd/5th/7th chord tones when the toggle is on', () => {
        const result = getScaleDerivedData('Diatonic Modes', 'Ionian', 0, {
            ...NO_TOGGLES,
            showChordTones: true,
        });

        expect(result.scaleChordTones).toEqual([0, 4, 7, 11]);
    });

    it('applies pentatonic modifier notes relative to the selected key', () => {
        const result = getScaleDerivedData('Pentatonic', 'Minor Pentatonic', 0, {
            ...NO_TOGGLES,
            blueNote: true,
            sixthNote: true,
            secondNote: true,
        });

        expect(result.isPentatonic).toBe(true);
        expect(result.isMinorMode).toBe(true);
        expect(result.modifierNotes).toEqual([6, 9, 2]);
    });

    it('does not add the 6th/2nd modifier notes for Major Pentatonic', () => {
        const result = getScaleDerivedData('Pentatonic', 'Major Pentatonic', 0, {
            ...NO_TOGGLES,
            blueNote: true,
            sixthNote: true,
            secondNote: true,
        });

        expect(result.modifierNotes).toEqual([6]);
    });

    it('exposes double-stop pairs only when the scale supports them and the toggle is active', () => {
        const supported = getScaleDerivedData('Diatonic Modes', 'Dorian', 0, {
            ...NO_TOGGLES,
            isDoubleStopActive: true,
            doubleStopInterval: 3,
        });
        expect(supported.isDoubleStopVisible).toBe(true);
        expect(supported.playableDoubleStops.length).toBeGreaterThan(0);
        expect(Object.keys(supported.harmonicDoubleStopPairsByInterval)).toEqual(
            expect.arrayContaining(['3', '4', '6'])
        );

        const unsupported = getScaleDerivedData('Symmetric', 'Whole Tone', 0, {
            ...NO_TOGGLES,
            isDoubleStopActive: true,
        });
        expect(unsupported.isDoubleStopAvailable).toBe(false);
        expect(unsupported.isDoubleStopVisible).toBe(false);
        expect(unsupported.playableDoubleStops).toEqual([]);
    });
});
