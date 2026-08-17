import { describe, expect, it } from 'vitest';

import { degreeToChordName, getChordFromDegree, getChordTones, injectSecondaryDominants } from './degrees';

describe('getChordFromDegree', () => {
    it('resolves diatonic Roman numerals to interval + quality', () => {
        expect(getChordFromDegree('IV')).toEqual({ interval: 5, type: 'Major' });
        expect(getChordFromDegree('vi')).toEqual({ interval: 9, type: 'Minor' });
        expect(getChordFromDegree('vii°')).toEqual({ interval: 11, type: 'Diminished' });
    });

    it('falls back to I major for unknown degrees', () => {
        expect(getChordFromDegree('not-a-degree')).toEqual({ interval: 0, type: 'Major' });
    });
});

describe('degreeToChordName', () => {
    it('names a plain diatonic degree relative to the root key', () => {
        expect(degreeToChordName('vi', 'vi', 0)).toBe('Am');
        expect(degreeToChordName('IV', 'IV', 0)).toBe('F');
    });

    it('names a secondary dominant (V7/x) a fifth above its target', () => {
        // V7/vi in the key of C targets Am (root 9), so V7/vi = E7.
        expect(degreeToChordName('V7/vi', 'vi', 0)).toBe('E7');
    });

    it('names a tritone substitution (subV7/x) a half-step above its target', () => {
        // subV7/V in the key of C targets G (root 7); the b2-of-target formula gives root 8 = Ab7.
        expect(degreeToChordName('subV7/V', 'V', 0)).toBe('Ab7');
    });

    it('uses conventional key-signature spelling regardless of degree/quality, not a sharp-by-default heuristic', () => {
        // Regression: the old implementation only used flats when the degree symbol started with
        // 'b' or the chord was minor, defaulting to sharps otherwise — so "V" in the key of Db
        // (root 1) used to come out "G#" instead of the correct "Ab".
        expect(degreeToChordName('V', 'V', 1)).toBe('Ab');
        // Same failure mode for a major (non-'b', non-minor) degree in the key of Ab (root 8).
        expect(degreeToChordName('IV', 'IV', 8)).toBe('Db');
    });
});

describe('getChordTones', () => {
    it('returns chord tones for a known chord type relative to the root', () => {
        expect(getChordTones('Minor 7', 2)).toEqual([2, 5, 9, 0]);
    });

    it('falls back to a major triad for unknown chord types', () => {
        expect(getChordTones('unknown', 0)).toEqual([0, 4, 7]);
    });
});

describe('injectSecondaryDominants', () => {
    it('inserts a V7-of-target before every non-tonic, non-diminished degree', () => {
        expect(injectSecondaryDominants(['I', 'vi', 'IV', 'V'])).toEqual([
            'I',
            'V7 of vi', 'vi',
            'V7 of IV', 'IV',
            'V7 of V', 'V',
        ]);
    });

    it('does not inject before tonic or diminished degrees', () => {
        expect(injectSecondaryDominants(['i', 'vii°'])).toEqual(['i', 'vii°']);
    });
});
