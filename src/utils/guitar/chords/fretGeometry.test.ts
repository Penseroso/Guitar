import { describe, expect, it } from 'vitest';

import { evaluateHandPlayability, getFretDistanceMm } from './fretGeometry';

describe('getFretDistanceMm', () => {
    it('shrinks the same fret-count gap as position moves up the neck (25.5" scale)', () => {
        const lowPosition = getFretDistanceMm(1, 5);
        const highPosition = getFretDistanceMm(9, 13);

        expect(lowPosition).toBeGreaterThan(highPosition);
        expect(lowPosition).toBeCloseTo(126, 0);
        expect(highPosition).toBeCloseTo(79, 0);
    });

    it('returns 0 for the same fret', () => {
        expect(getFretDistanceMm(5, 5)).toBe(0);
    });
});

describe('evaluateHandPlayability', () => {
    it('allows an empty shape', () => {
        expect(evaluateHandPlayability([])).toEqual({ playable: true, usesThumb: false, fingerGroupCount: 0 });
    });

    it('treats strings sharing a fret as a single barre group', () => {
        const result = evaluateHandPlayability([
            { string: 5, fret: 3 },
            { string: 4, fret: 3 },
            { string: 3, fret: 3 },
            { string: 2, fret: 4 },
            { string: 1, fret: 5 },
        ]);

        // 3 barred + 2 solo frets = 3 distinct fret groups, well within the 4-finger budget.
        expect(result.fingerGroupCount).toBe(3);
        expect(result.playable).toBe(true);
    });

    it('rejects a shape needing more than 4 fingers when the thumb is not allowed', () => {
        const result = evaluateHandPlayability([
            { string: 5, fret: 1 },
            { string: 4, fret: 2 },
            { string: 3, fret: 3 },
            { string: 2, fret: 4 },
            { string: 1, fret: 5 },
        ]);

        expect(result.playable).toBe(false);
        expect(result.reason).toBe('too-many-fingers');
    });

    it('rescues a 5-finger shape with the thumb when the low E is close to the rest of the hand', () => {
        // Strings 4/3/2/1 alone need exactly 4 distinct frets (at the budget); fretting the low
        // E with a finger too would push it to 5, but the thumb is only 2 frets away and can take it.
        const result = evaluateHandPlayability(
            [
                { string: 5, fret: 1 },
                { string: 4, fret: 3 },
                { string: 3, fret: 4 },
                { string: 2, fret: 5 },
                { string: 1, fret: 6 },
            ],
            { allowThumbOnLowE: true }
        );

        expect(result.usesThumb).toBe(true);
        expect(result.playable).toBe(true);
    });

    it('does not rescue with the thumb when the low E is too far from the rest of the hand', () => {
        const result = evaluateHandPlayability(
            [
                { string: 5, fret: 10 },
                { string: 4, fret: 3 },
                { string: 3, fret: 4 },
                { string: 2, fret: 5 },
                { string: 1, fret: 6 },
            ],
            { allowThumbOnLowE: true }
        );

        expect(result.usesThumb).toBe(false);
        expect(result.playable).toBe(false);
        expect(result.reason).toBe('too-many-fingers');
    });

    it('rejects a shape whose fret span exceeds the hand-span limit', () => {
        const result = evaluateHandPlayability([
            { string: 5, fret: 1 },
            { string: 1, fret: 10 },
        ]);

        expect(result.playable).toBe(false);
        expect(result.reason).toBe('exceeds-hand-span');
    });

    it('rejects two non-adjacent strings sharing a fret when a string between them needs a lower fret (cannot reach behind a barre)', () => {
        // string5@8 and string1@8 look like a "barre" by fret-value alone, but string4 in
        // between needs fret 7 — behind the barre, physically unreachable by another finger.
        const result = evaluateHandPlayability([
            { string: 5, fret: 8 },
            { string: 4, fret: 7 },
            { string: 3, fret: 10 },
            { string: 2, fret: 9 },
            { string: 1, fret: 8 },
        ]);

        // The failed "barre" splits into 2 solo fingers (string5, string1) + 3 solo fingers
        // (string4, string3, string2) = 5, over budget.
        expect(result.playable).toBe(false);
        expect(result.reason).toBe('too-many-fingers');
    });

    it('allows a barre with another finger arching over it in front (higher fret) on an inner string — classic F-shape technique', () => {
        const result = evaluateHandPlayability([
            { string: 5, fret: 1 },
            { string: 4, fret: 1 },
            { string: 3, fret: 3 },
            { string: 2, fret: 2 },
            { string: 1, fret: 1 },
        ]);

        // Barre at fret 1 across strings 5/4/1 (touches string3/2 too), string3@3 and string2@2
        // are both in front of (>=) the barre — valid. 1 barre + 2 solo fingers = 3.
        expect(result.fingerGroupCount).toBe(3);
        expect(result.playable).toBe(true);
    });

    it('blocks a barre across a string meant to ring open', () => {
        const result = evaluateHandPlayability(
            [
                { string: 5, fret: 3 },
                { string: 3, fret: 3 },
            ],
            { openStrings: [4] }
        );

        // string5@3 and string3@3 can't barre across the open string4 in between — 2 solo fingers.
        expect(result.fingerGroupCount).toBe(2);
    });
});
