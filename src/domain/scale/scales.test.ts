import { describe, expect, it } from 'vitest';

import { getScaleHarmonization } from '@/domain/chord/scale-harmonization';
import { generateModeData, getModalSiblings, SCALES, SCALE_DISPLAY_FORMULAS } from './scales';

describe('generateModeData roman-numeral spelling', () => {
    it('spells the tritone degree as ♯iv° when the scale itself labels it #4 (Lydian family)', () => {
        expect(generateModeData('Diatonic Modes', 'Lydian')[6].role).toBe('♯iv°');
        expect(generateModeData('Harmonic Minor Modes', 'Dorian #4')[6].role).toBe('♯iv°');
        expect(generateModeData('Harmonic Minor Modes', 'Lydian #2')[6].role).toBe('♯iv°');
        expect(generateModeData('Jazz Minor Modes', 'Lydian Augmented')[6].role).toBe('♯iv°');
        expect(generateModeData('Jazz Minor Modes', 'Lydian Dominant')[6].role).toBe('♯iv°');
        expect(generateModeData('Symmetric', 'Whole Tone')[6].role).toBe('♯IV+');
    });

    it('keeps ♭V for scales that label the tritone degree b5 (Locrian family)', () => {
        expect(generateModeData('Diatonic Modes', 'Locrian')[6].role).toBe('♭V');
        expect(generateModeData('Harmonic Minor Modes', 'Locrian #6')[6].role).toBe('♭V');
        expect(generateModeData('Jazz Minor Modes', 'Locrian ♮2')[6].role).toBe('♭V+');
    });

    it('keeps ♭V for the Altered scale even though its display formula uses #11 (not #4)', () => {
        expect(SCALE_DISPLAY_FORMULAS['Jazz Minor Modes']['Altered scale'][6]).toBe('#11');
        expect(generateModeData('Jazz Minor Modes', 'Altered scale')[6].role).toBe('♭V');
    });

    describe('adversarial scale degree spelling fixtures', () => {
        it('spells Lydian #2 interval 3 as ♯ii°, not ♭iii°', () => {
            expect(generateModeData('Harmonic Minor Modes', 'Lydian #2')[3].role).toBe('♯ii°');
        });

        it('spells Ionian #5 interval 8 as ♯v° (diminished triad above raised fifth), not ♭VI', () => {
            expect(generateModeData('Harmonic Minor Modes', 'Ionian #5')[8].role).toBe('♯v°');
            expect(generateModeData('Harmonic Minor Modes', 'Ionian #5')[0].role).toBe('I+');
        });

        it('spells Ultralocrian interval 4 as ♭IV+ and interval 9 as ♭♭VII', () => {
            const data = generateModeData('Harmonic Minor Modes', 'Ultralocrian');
            expect(data[4].role).toBe('♭IV+');
            expect(data[9].role).toBe('♭♭VII');
        });

        it('spells Altered scale interval 4 as ♭IV+, not III+', () => {
            expect(generateModeData('Jazz Minor Modes', 'Altered scale')[4].role).toBe('♭IV+');
        });
    });

    it('produces identical Roman numerals to scale-harmonization for all 7-note scales', () => {
        for (const [group, modes] of Object.entries(SCALES)) {
            for (const [name, intervals] of Object.entries(modes)) {
                if (new Set(intervals).size !== 7) continue;
                const modeData = generateModeData(group, name);
                const harmonization = getScaleHarmonization(group, name, 0);
                expect(harmonization.defined, `${group}/${name} not harmonizable`).toBe(true);
                if (!harmonization.defined) continue;

                intervals.forEach((interval, index) => {
                    const fromModeData = modeData[interval]?.role;
                    const fromHarmonization = harmonization.triads[index]?.romanNumeral;
                    expect(fromModeData, `${group}/${name} degree ${index} (interval ${interval})`).toBe(fromHarmonization);
                });
            }
        }
    });
});

describe('getModalSiblings', () => {
    it('finds all 6 other rotations of the same parent scale for Ionian, with correct tonic offsets', () => {
        const siblings = getModalSiblings('Diatonic Modes', 'Ionian');
        const offsetsByName = Object.fromEntries(siblings.map((s) => [s.name, s.tonicOffset]));

        expect(siblings).toHaveLength(6);
        expect(offsetsByName).toEqual({
            Dorian: 2,
            Phrygian: 4,
            Lydian: 5,
            Mixolydian: 7,
            Aeolian: 9,
            Locrian: 11,
        });
    });

    it('is symmetric — Dorian lists Ionian back among its siblings, at the complementary offset', () => {
        const fromIonian = getModalSiblings('Diatonic Modes', 'Ionian').find((s) => s.name === 'Dorian');
        const fromDorian = getModalSiblings('Diatonic Modes', 'Dorian').find((s) => s.name === 'Ionian');

        expect(fromIonian?.tonicOffset).toBe(2);
        expect(fromDorian?.tonicOffset).toBe(10); // 12 - 2
    });

    it('never includes the scale itself', () => {
        const siblings = getModalSiblings('Diatonic Modes', 'Ionian');
        expect(siblings.some((s) => s.group === 'Diatonic Modes' && s.name === 'Ionian')).toBe(false);
    });

    it('excludes subset (pentatonic) scales on both sides', () => {
        // Major Pentatonic shares Ionian's parent but is a 5-note subset, not a full rotation.
        expect(getModalSiblings('Diatonic Modes', 'Ionian').some((s) => s.name === 'Major Pentatonic')).toBe(false);
        expect(getModalSiblings('Pentatonic', 'Major Pentatonic')).toEqual([]);
    });
});
