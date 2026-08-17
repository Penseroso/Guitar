import { describe, expect, it } from 'vitest';

import { generateModeData, getModalSiblings, SCALE_DISPLAY_FORMULAS } from './scales';

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
        // A pentatonic scale itself has no complete sibling concept yet.
        expect(getModalSiblings('Pentatonic', 'Major Pentatonic')).toEqual([]);
    });

    it('returns an empty array for a scale with no other named rotation of its parent (Whole Tone)', () => {
        expect(getModalSiblings('Symmetric', 'Whole Tone')).toEqual([]);
    });

    it('returns an empty array for an unknown scale', () => {
        expect(getModalSiblings('Not A Group', 'Not A Scale')).toEqual([]);
    });
});
