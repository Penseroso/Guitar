import { describe, expect, it } from 'vitest';

import { buildScaleChordRecommendations } from './scale-chord-recommendations';

describe('scale chord recommendations', () => {
    it('builds practical Ionian seventh-chord recommendations', () => {
        const recommendations = buildScaleChordRecommendations(0, 'Diatonic Modes', 'Ionian');

        expect(recommendations.usable.map((item) => item.symbol)).toEqual(
            expect.arrayContaining(['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5'])
        );
        expect(recommendations.characteristic.map((item) => item.symbol)).toEqual(
            expect.arrayContaining(['Cmaj7', 'G7'])
        );
    });

    it('emphasizes modal color chords for Dorian', () => {
        const recommendations = buildScaleChordRecommendations(2, 'Diatonic Modes', 'Dorian');

        expect(recommendations.characteristic.map((item) => item.degree)).toEqual(
            expect.arrayContaining(['i', 'IV'])
        );
        expect(recommendations.characteristic.map((item) => item.symbol)).toEqual(
            expect.arrayContaining(['Dm7', 'G7'])
        );
    });

    it('highlights I7 in Mixolydian', () => {
        const recommendations = buildScaleChordRecommendations(7, 'Diatonic Modes', 'Mixolydian');

        expect(recommendations.characteristic[0]).toMatchObject({
            degree: 'I',
            chordType: 'dominant-7',
            symbol: 'G7',
        });
    });

    it('stays conservative for pentatonic scales while remaining actionable', () => {
        const recommendations = buildScaleChordRecommendations(0, 'Pentatonic', 'Major Pentatonic');

        expect(recommendations.usable.length).toBeGreaterThan(0);
        expect(recommendations.characteristic.map((item) => item.chordType)).toContain('major-6');
    });

    it('uses heptatonic fallback behavior for harmonic minor family modes', () => {
        const recommendations = buildScaleChordRecommendations(0, 'Harmonic Minor Modes', 'Phrygian Dominant');

        expect(recommendations.characteristic.map((item) => item.chordType)).toContain('dominant-7');
        expect(recommendations.characteristic.some((item) => item.rootPitchClass === 0)).toBe(true);
        expect(recommendations.characteristic.some((item) => 'internalPriority' in item)).toBe(false);
    });

    it('keeps public recommendation payloads free of internal ranking metadata', () => {
        const recommendations = buildScaleChordRecommendations(0, 'Diatonic Modes', 'Ionian');

        expect(recommendations.usable[0]).not.toHaveProperty('internalPriority');
        expect(recommendations.characteristic[0]).not.toHaveProperty('internalPriority');
    });
});
