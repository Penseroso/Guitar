import { describe, expect, it } from 'vitest';

import { SCALE_REGISTRY } from '@/domain/scale/scales';
import { getChordContextsForScale, getModalSiblingChordsForScale } from './scale-chord-context';

describe('getChordContextsForScale', () => {
    it('returns every registered scale with at least one chord context', () => {
        for (const group in SCALE_REGISTRY) {
            for (const name in SCALE_REGISTRY[group]) {
                expect(getChordContextsForScale(group, name).length, `${group} / ${name}`).toBeGreaterThan(0);
            }
        }
    });

    it('sorts primary contexts before color/altered/modal ones', () => {
        const contexts = getChordContextsForScale('Diatonic Modes', 'Ionian');
        const categories = contexts.map((context) => context.category);
        const firstNonPrimaryIndex = categories.findIndex((category) => category !== 'primary');

        if (firstNonPrimaryIndex !== -1) {
            expect(categories.slice(0, firstNonPrimaryIndex).every((category) => category === 'primary')).toBe(true);
        }
    });

    it('reports minor-family chord qualities for Dorian', () => {
        const chordIds = getChordContextsForScale('Diatonic Modes', 'Dorian').map((context) => context.chordId);
        expect(chordIds).toContain('minor-7');
    });

    it('reports the newly-curated Harmonic/Jazz Minor Modes coverage', () => {
        expect(getChordContextsForScale('Harmonic Minor Modes', 'Ionian #5').map((c) => c.chordId)).toContain('major');
        expect(getChordContextsForScale('Jazz Minor Modes', 'Mixolydian b6').map((c) => c.chordId)).toContain('dominant-7');
    });

    it('returns an empty array for an unknown scale', () => {
        expect(getChordContextsForScale('Not A Group', 'Not A Scale')).toEqual([]);
    });
});

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
