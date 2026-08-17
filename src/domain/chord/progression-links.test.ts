import { describe, expect, it } from 'vitest';

import { getProgressionLinksForChord } from './progression-links';

describe('chord progression links', () => {
    it('gives dominant chords a resolution-oriented context and a ii-V-I handoff', () => {
        const context = getProgressionLinksForChord('dominant-7', 7);

        expect(context.role).toBe('Dominant Tension');
        expect(context.hints.map((hint) => hint.degrees)).toContainEqual(['V', 'I']);
        expect(context.hints.some((hint) => hint.progressionId === 'classic-251')).toBe(true);
    });

    it('gives minor-seven chords pre-dominant setup links', () => {
        const context = getProgressionLinksForChord('minor-7', 2);

        expect(context.role).toBe('Pre-Dominant Motion');
        expect(context.hints.some((hint) => hint.progressionId === 'classic-251')).toBe(true);
    });

    it('keeps suspended chords in a suspended-color context instead of forcing tonic labeling', () => {
        const context = getProgressionLinksForChord('sus4', 0);

        expect(context.role).toBe('Suspended Color');
        expect(context.hints[0]?.degrees).toEqual(['sus', '7', 'I']);
    });

    it('relabels dominant harmony as a modal center inside a mixolydian tonal frame', () => {
        const context = getProgressionLinksForChord('dominant-7', 0, {
            selectedKey: 0,
            scaleGroup: 'Diatonic Modes',
            scaleName: 'Mixolydian',
        });

        expect(context.role).toBe('Modal Center');
        expect(context.summary).toContain('Mixolydian');
    });
});
