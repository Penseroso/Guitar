import { describe, expect, it } from 'vitest';

import { getModalSiblingChordsForScale } from './scale-chord-context';

describe('getModalSiblingChordsForScale', () => {
    it('finds valid chords rooted at other degrees of C Ionian (modal siblings, not the tonic)', () => {
        const suggestions = getModalSiblingChordsForScale('Diatonic Modes', 'Ionian', 0); // C = pitch class 0
        const byRoot = new Map(suggestions.map((s) => [s.rootPitchClass, s]));

        // D (pitch class 2) — Dorian's degree — the scale's notes form a complete minor chord there.
        expect(byRoot.get(2)?.chordId).toMatch(/^minor/);
        expect(byRoot.get(2)?.siblingScaleName).toBe('Dorian');

        // G (pitch class 7) — Mixolydian's degree — a complete dominant-family chord.
        expect(byRoot.get(7)?.chordId).toMatch(/^dominant/);
        expect(byRoot.get(7)?.siblingScaleName).toBe('Mixolydian');

        // B (pitch class 11) — Locrian's degree — a complete half-diminished chord.
        expect(byRoot.get(11)?.chordId).toBe('half-diminished-7');
        expect(byRoot.get(11)?.siblingScaleName).toBe('Locrian');

        // Never re-lists the scale's own tonic (C, pitch class 0) as an "other tonic".
        expect(byRoot.has(0)).toBe(false);
    });

    it('returns nothing for a pentatonic scale (subset scales have no complete sibling concept yet)', () => {
        expect(getModalSiblingChordsForScale('Pentatonic', 'Major Pentatonic', 0)).toEqual([]);
    });

    it('returns nothing for a scale with no other named rotation of its parent (e.g. Whole Tone)', () => {
        expect(getModalSiblingChordsForScale('Symmetric', 'Whole Tone', 0)).toEqual([]);
    });

    it('returns an empty array for an unknown scale', () => {
        expect(getModalSiblingChordsForScale('Not A Group', 'Not A Scale', 0)).toEqual([]);
    });
});
