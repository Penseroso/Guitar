import { describe, expect, it } from 'vitest';

import { getSpelledScaleDegrees } from './scale-spelling';
import { SCALES } from './scales';

const notes = (group: string, name: string, tonic: number) =>
    getSpelledScaleDegrees(group, name, tonic)?.map((degree) => degree.noteName);
const numerals = (group: string, name: string, tonic: number) =>
    getSpelledScaleDegrees(group, name, tonic)?.map((degree) => degree.romanNumeral);

describe('scale degree spelling', () => {
    it('spells a major scale with one letter per degree, in sharp and flat keys', () => {
        expect(notes('Diatonic Modes', 'Ionian', 0)).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
        expect(notes('Diatonic Modes', 'Ionian', 2)).toEqual(['D', 'E', 'F#', 'G', 'A', 'B', 'C#']);
        expect(notes('Diatonic Modes', 'Ionian', 6)).toEqual(['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#']);
        expect(notes('Diatonic Modes', 'Ionian', 1)).toEqual(['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C']);
    });

    it('never repeats or skips a letter, in any supported scale at any tonic', () => {
        for (const group of Object.keys(SCALES)) {
            for (const name of Object.keys(SCALES[group])) {
                for (let tonic = 0; tonic < 12; tonic += 1) {
                    const degrees = getSpelledScaleDegrees(group, name, tonic);
                    if (!degrees) continue;
                    const letters = degrees.map((degree) => degree.noteName[0]);
                    expect(new Set(letters).size, `${group}/${name}@${tonic}`).toBe(letters.length);
                }
            }
        }
    });

    it('spells every seven-note scale at every tonic (no silent gaps)', () => {
        let spelled = 0;
        for (const group of Object.keys(SCALES)) {
            for (const name of Object.keys(SCALES[group])) {
                if (SCALES[group][name].length !== 7) continue;
                for (let tonic = 0; tonic < 12; tonic += 1) {
                    const degrees = getSpelledScaleDegrees(group, name, tonic);
                    expect(degrees, `${group}/${name}@${tonic}`).not.toBeNull();
                    expect(degrees).toHaveLength(7);

                    // 7 distinct letters
                    const letters = degrees!.map((d) => d.noteName[0]);
                    expect(new Set(letters).size, `${group}/${name}@${tonic} letter cycle`).toBe(7);

                    // pitch classes match (tonic + interval) % 12
                    degrees!.forEach((d, idx) => {
                        const expectedPitchClass = (tonic + SCALES[group][name][idx]) % 12;
                        expect(d.pitchClass, `${group}/${name}@${tonic} degree ${idx} pitch class`).toBe(expectedPitchClass);
                    });
                }
                spelled += 1;
            }
        }
        expect(spelled).toBe(21);
    });

    describe('enharmonic pairs are spelled by degree, never by pitch class', () => {
        it('#IV vs bV', () => {
            expect(notes('Diatonic Modes', 'Lydian', 0)?.[3]).toBe('F#');
            expect(numerals('Diatonic Modes', 'Lydian', 0)?.[3]).toBe('♯IV');
            expect(notes('Diatonic Modes', 'Locrian', 0)?.[4]).toBe('Gb');
            expect(numerals('Diatonic Modes', 'Locrian', 0)?.[4]).toBe('♭V');
        });

        it('#II vs bIII', () => {
            expect(notes('Harmonic Minor Modes', 'Lydian #2', 0)?.[1]).toBe('D#');
            expect(numerals('Harmonic Minor Modes', 'Lydian #2', 0)?.[1]).toBe('♯II');
            expect(notes('Diatonic Modes', 'Aeolian', 0)?.[2]).toBe('Eb');
            expect(numerals('Diatonic Modes', 'Aeolian', 0)?.[2]).toBe('♭III');
        });

        it('#V vs bVI', () => {
            expect(notes('Harmonic Minor Modes', 'Ionian #5', 0)?.[4]).toBe('G#');
            expect(numerals('Harmonic Minor Modes', 'Ionian #5', 0)?.[4]).toBe('♯V');
            expect(notes('Diatonic Modes', 'Aeolian', 0)?.[5]).toBe('Ab');
            expect(numerals('Diatonic Modes', 'Aeolian', 0)?.[5]).toBe('♭VI');
        });

        it('bIV vs III', () => {
            expect(notes('Harmonic Minor Modes', 'Ultralocrian', 0)?.[3]).toBe('Fb');
            expect(numerals('Harmonic Minor Modes', 'Ultralocrian', 0)?.[3]).toBe('♭IV');
            expect(notes('Diatonic Modes', 'Ionian', 0)?.[2]).toBe('E');
        });

        it('bbVII vs VI', () => {
            expect(notes('Harmonic Minor Modes', 'Ultralocrian', 0)?.[6]).toBe('Bbb');
            expect(numerals('Harmonic Minor Modes', 'Ultralocrian', 0)?.[6]).toBe('♭♭VII');
            expect(notes('Diatonic Modes', 'Ionian', 0)?.[5]).toBe('A');
        });
    });

    it('spells harmonic and melodic minor altered degrees', () => {
        expect(notes('Harmonic Minor Modes', 'Harmonic Minor', 9)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G#']);
        expect(notes('Jazz Minor Modes', 'Jazz Minor', 9)).toEqual(['A', 'B', 'C', 'D', 'E', 'F#', 'G#']);
        expect(notes('Harmonic Minor Modes', 'Phrygian Dominant', 4)).toEqual(['E', 'F', 'G#', 'A', 'B', 'C', 'D']);
    });

    it('spells the altered scale as the melodic-minor mode it is', () => {
        expect(notes('Jazz Minor Modes', 'Altered scale', 0)).toEqual(['C', 'Db', 'Eb', 'Fb', 'Gb', 'Ab', 'Bb']);
    });

    it('returns null rather than a wrong spelling for collections it cannot number 1-7', () => {
        expect(getSpelledScaleDegrees('Symmetric', 'Diminished', 0)).toBeNull();
        expect(getSpelledScaleDegrees('Nope', 'Nope', 0)).toBeNull();
    });
});
