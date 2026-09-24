import { describe, expect, it } from 'vitest';
import { frameChords, parseRoman, resolveChord, resolveRoman, romanLabel } from './roman';
import type { TonalFrame } from './types';

const keys = [
    ['C', 'C D E F G A B', 'C D Eb F G Ab Bb'],
    ['G', 'G A B C D E F#', 'G A Bb C D Eb F'],
    ['D', 'D E F# G A B C#', 'D E F G A Bb C'],
    ['A', 'A B C# D E F# G#', 'A B C D E F G'],
    ['E', 'E F# G# A B C# D#', 'E F# G A B C D'],
    ['B', 'B C# D# E F# G# A#', 'B C# D E F# G A'],
    ['F#', 'F# G# A# B C# D# E#', 'F# G# A B C# D E'],
    ['Db', 'Db Eb F Gb Ab Bb C', 'Db Eb Fb Gb Ab Bbb Cb'],
    ['Ab', 'Ab Bb C Db Eb F G', 'Ab Bb Cb Db Eb Fb Gb'],
    ['Eb', 'Eb F G Ab Bb C D', 'Eb F Gb Ab Bb Cb Db'],
    ['Bb', 'Bb C D Eb F G A', 'Bb C Db Eb F Gb Ab'],
    ['F', 'F G A Bb C D E', 'F G Ab Bb C Db Eb'],
] as const;
const frame: TonalFrame = { tonic: 'C', mode: 'major', lens: 'jazz-pop' };

describe('Harmony structured Roman identity and spelling', () => {
    it.each(['jazz-pop', 'classical'] as const)('keeps minor Roman notation major-referenced under the %s rule lens', lens => {
        const minorFrame: TonalFrame = { ...frame, mode: 'minor', lens };
        for (const [root, label] of [['Eb', '♭III'], ['Ab', '♭VI'], ['Bb', '♭VII']]) {
            const chord = { root, chordId: 'major' };
            expect(romanLabel(chord, minorFrame)).toBe(label);
            expect(resolveRoman(parseRoman(label)!, minorFrame)).toEqual(chord);
        }
    });

    it.each(keys)('preserves written degrees in all twelve tonic classes: %s', (tonic, major, minor) => {
        for (const [mode, expected] of [['major', major], ['minor', minor]] as const) {
            const tonalFrame: TonalFrame = { ...frame, tonic, mode };
            const chords = frameChords(tonalFrame);
            expect(chords.map(chord => chord.root)).toEqual(expected.split(' '));
            for (const chord of chords) {
                const parsed = parseRoman(romanLabel(chord, tonalFrame));
                expect(parsed).not.toBeNull();
                expect(resolveRoman(parsed!, tonalFrame)).toEqual(chord);
                expect(resolveChord(chord).tones).toHaveLength(3);
            }
        }
    });

    it('resolves applied V7/vi as E7 in C while retaining the written destination', () => {
        const applied = parseRoman('V7/vi');
        expect(applied?.appliedTo).toEqual({ degree: 6, alteration: 0, chordId: 'minor' });
        expect(resolveRoman(applied!, frame)).toEqual({ root: 'E', chordId: 'dominant-7' });
        expect(resolveChord(resolveRoman(applied!, frame)).tones.map(tone => tone.name)).toEqual(['E', 'G#', 'B', 'D']);
        expect(romanLabel({ root: 'E', chordId: 'dominant-7' }, frame)).toBe('III7');
    });

    it.each(['', 'garbage', 'VIII', 'V7/garbage', 'V7/V7/vi', '####IV', 'IVoops', 'C7'])('does not silently coerce invalid Roman input %j to tonic', input => {
        expect(parseRoman(input)).toBeNull();
    });

    it('keeps enharmonic chord tones distinct in spelling and equal only in pitch', () => {
        const flat = resolveChord({ root: 'Db', chordId: 'dominant-7' });
        const sharp = resolveChord({ root: 'C#', chordId: 'dominant-7' });
        expect(flat.tones.map(tone => tone.name)).toEqual(['Db', 'F', 'Ab', 'Cb']);
        expect(sharp.tones.map(tone => tone.name)).toEqual(['C#', 'E#', 'G#', 'B']);
        expect(flat.tones.map(tone => tone.pitchClass)).toEqual(sharp.tones.map(tone => tone.pitchClass));
    });

    it('does not erase alterations when labeling extended registry chords', () => {
        expect(romanLabel({ root: 'G', chordId: 'dominant-7-sharp-5' }, frame)).toMatch(/V7.*[#♯]5/);
        expect(romanLabel({ root: 'G', chordId: 'dominant-7-flat-9' }, frame)).toMatch(/V7.*[b♭]9/);
        const minorMajor = { root: 'C', chordId: 'minor-major-7' };
        expect(romanLabel(minorMajor, frame)).toBe('imaj7');
        expect(resolveRoman(parseRoman(romanLabel(minorMajor, frame))!, frame)).toEqual(minorMajor);
    });

    it('uses a supplied chord-tone bass and rejects malformed or non-formula bass', () => {
        expect(resolveChord({ root: 'C', chordId: 'major', bass: 'E' })).toMatchObject({ name: 'C/E', bassPitchClass: 4 });
        expect(() => resolveChord({ root: 'C', chordId: 'major', bass: 'H' })).toThrow();
        expect(() => resolveChord({ root: 'C', chordId: 'major', bass: '' })).toThrow();
        expect(() => resolveChord({ root: 'C', chordId: 'major', bass: 'F#' })).toThrow();
        expect(() => resolveChord({ root: 'C', chordId: 'unknown' })).toThrow();
    });
});
