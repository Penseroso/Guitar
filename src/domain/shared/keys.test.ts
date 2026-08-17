import { describe, expect, it } from 'vitest';

import { ENHARMONIC_TIE_PITCH_CLASSES, getKeyName, getMinorKeyName, getRelativeMinor } from './keys';

describe('getKeyName (major/tonic spelling)', () => {
    it('matches the standard circle-of-fifths key spelling at every pitch class', () => {
        const expected: Record<number, string> = {
            0: 'C', 1: 'Db', 2: 'D', 3: 'Eb', 4: 'E', 5: 'F',
            6: 'F#', 7: 'G', 8: 'Ab', 9: 'A', 10: 'Bb', 11: 'B',
        };
        for (const [pitchClass, name] of Object.entries(expected)) {
            expect(getKeyName(Number(pitchClass))).toBe(name);
        }
    });

    it('normalizes out-of-range pitch classes the same as an in-range one', () => {
        expect(getKeyName(13)).toBe(getKeyName(1));
        expect(getKeyName(-1)).toBe(getKeyName(11));
    });
});

describe('getMinorKeyName (minor-tonic spelling — a different problem from getKeyName)', () => {
    it('matches the standard minor-key spelling at every pitch class', () => {
        const expected: Record<number, string> = {
            0: 'C', 1: 'C#', 2: 'D', 3: 'D#', 4: 'E', 5: 'F',
            6: 'F#', 7: 'G', 8: 'G#', 9: 'A', 10: 'Bb', 11: 'B',
        };
        for (const [pitchClass, name] of Object.entries(expected)) {
            expect(getMinorKeyName(Number(pitchClass))).toBe(name);
        }
    });

    it('diverges from getKeyName exactly at the two pitch classes where minor-key convention picks the opposite accidental', () => {
        // G# minor (relative of B major, 5 sharps) — not Ab minor (7 flats, essentially unused).
        expect(getMinorKeyName(8)).toBe('G#');
        expect(getKeyName(8)).toBe('Ab');

        // C# minor (relative of E major, 4 sharps) — not Db minor (8 flats, essentially unused).
        expect(getMinorKeyName(1)).toBe('C#');
        expect(getKeyName(1)).toBe('Db');
    });

    it('a real relative-major/relative-minor pair resolves to matching key-signature spellings', () => {
        // B major's relative minor is G# minor (both 5 sharps) — verified via getRelativeMinor,
        // the same function the Circle of Fifths component uses to find this pairing.
        const bMajor = 11;
        const relativeMinorPitchClass = getRelativeMinor(bMajor);
        expect(relativeMinorPitchClass).toBe(8);
        expect(getMinorKeyName(relativeMinorPitchClass)).toBe('G#');
    });
});

describe('ENHARMONIC_TIE_PITCH_CLASSES', () => {
    it('flags F#/Gb as a genuine major-key tie, at the major pitch class', () => {
        expect(ENHARMONIC_TIE_PITCH_CLASSES[6]?.major).toBe('Gb');
    });

    it('flags D#/Eb as a genuine minor-key tie, at the (different) minor pitch class', () => {
        expect(ENHARMONIC_TIE_PITCH_CLASSES[3]?.minor).toBe('eb');
    });

    it('does not flag the merely-rare enharmonic alternates (Db/C#, Ab/G#) as ties', () => {
        expect(ENHARMONIC_TIE_PITCH_CLASSES[1]).toBeUndefined();
        expect(ENHARMONIC_TIE_PITCH_CLASSES[8]).toBeUndefined();
    });
});
