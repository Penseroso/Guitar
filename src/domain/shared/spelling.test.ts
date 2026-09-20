import { describe, expect, it } from 'vitest';

import {
    degreeToLetterStep,
    parseDegreeLabel,
    parseNoteName,
    romanNumeralForDegree,
    spellDegree,
} from './spelling';

const from = (tonic: string, degreeNumber: number, pitchClass: number) =>
    spellDegree(parseNoteName(tonic)!, degreeNumber, pitchClass)?.name;

describe('note and degree parsing', () => {
    it('parses letters with single and double accidentals, ASCII or Unicode', () => {
        expect(parseNoteName('C')).toMatchObject({ letterIndex: 0, alteration: 0, pitchClass: 0 });
        expect(parseNoteName('F#')).toMatchObject({ letterIndex: 3, alteration: 1, pitchClass: 6 });
        expect(parseNoteName('Bbb')).toMatchObject({ letterIndex: 6, alteration: -2, pitchClass: 9 });
        expect(parseNoteName('E♭')).toMatchObject({ letterIndex: 2, alteration: -1, pitchClass: 3 });
        expect(parseNoteName('H')).toBeNull();
    });

    it('parses formula degrees including double flats and compound degrees', () => {
        expect(parseDegreeLabel('1')).toEqual({ number: 1, alteration: 0 });
        expect(parseDegreeLabel('b3')).toEqual({ number: 3, alteration: -1 });
        expect(parseDegreeLabel('#4')).toEqual({ number: 4, alteration: 1 });
        expect(parseDegreeLabel('bb7')).toEqual({ number: 7, alteration: -2 });
        expect(parseDegreeLabel('b13')).toEqual({ number: 13, alteration: -1 });
        expect(parseDegreeLabel('x')).toBeNull();
    });

    it('folds compound degrees onto the seven-letter cycle', () => {
        expect([9, 11, 13].map(degreeToLetterStep)).toEqual([2, 4, 6]);
    });
});

describe('letter-cycle spelling', () => {
    it('picks the letter from the degree and the accidental from the pitch', () => {
        // The same pitch class, spelled by which degree it is functioning as.
        expect(from('C', 2, 3)).toBe('D#');
        expect(from('C', 3, 3)).toBe('Eb');
        expect(from('C', 4, 6)).toBe('F#');
        expect(from('C', 5, 6)).toBe('Gb');
        expect(from('C', 7, 9)).toBe('Bbb');
        expect(from('C', 6, 9)).toBe('A');
    });

    it('keeps sharp keys sharp and flat keys flat', () => {
        expect(from('F#', 7, 5)).toBe('E#');
        expect(from('F#', 2, 8)).toBe('G#');
        expect(from('Db', 4, 6)).toBe('Gb');
        expect(from('D', 7, 1)).toBe('C#');
    });

    it('spells compound degrees from their folded letter', () => {
        expect(from('C', 9, 3)).toBe('D#');
        expect(from('C', 13, 9)).toBe('A');
    });

    it('refuses rather than inventing a triple accidental', () => {
        expect(spellDegree(parseNoteName('C')!, 1, 6)).toBeNull();
    });
});

describe('roman numerals', () => {
    it('carries the degree accidental, including double flats', () => {
        expect(romanNumeralForDegree({ number: 3, alteration: -1 })).toBe('♭III');
        expect(romanNumeralForDegree({ number: 2, alteration: 1 })).toBe('♯II');
        expect(romanNumeralForDegree({ number: 7, alteration: -2 })).toBe('♭♭VII');
        expect(romanNumeralForDegree({ number: 1, alteration: 0 })).toBe('I');
    });
});
