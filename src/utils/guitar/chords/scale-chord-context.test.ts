import { describe, expect, it } from 'vitest';

import { SCALE_REGISTRY } from '../scales';
import { getChordContextsForScale } from './scale-chord-context';

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
