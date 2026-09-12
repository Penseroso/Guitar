import { describe, expect, it } from 'vitest';
import { CHORD_REGISTRY_LIST } from '@/domain/chord/registry';
import { formatChordToneLabel, formatDegreeLabel, getChordToneChoices } from './tone-labels';

describe('chord tone presentation', () => {
    it.each([
        [0, 'b7', 10, 'B♭ · ♭7'],
        [0, '9', 14, 'D · 9'],
        [0, '11', 17, 'F · 11'],
        [0, '13', 21, 'A · 13'],
        [6, '7', 11, 'E♯ · 7'],
        [6, '#5', 8, 'C♯♯ · ♯5'],
        [1, 'b3', 3, 'F♭ · ♭3'],
        [3, 'bb7', 9, 'D♭♭ · ♭♭7'],
        [11, '#11', 18, 'E♯ · ♯11'],
    ])('spells root %i degree %s from its letter and sounding interval', (root, degree, interval, expected) => {
        expect(formatChordToneLabel(root, degree, interval)).toBe(expected);
    });

    it('changes accidentals for display without reducing compound degrees', () => {
        expect(['1', 'b3', '#5', 'bb7', '9', '#11', '13'].map(formatDegreeLabel))
            .toEqual(['1', '♭3', '♯5', '♭♭7', '9', '♯11', '13']);
    });

    it.each(CHORD_REGISTRY_LIST)('keeps $id choices faithful to formula and pitch for all twelve roots', entry => {
        const before = JSON.stringify(entry.formula);
        const naturalPitch: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
        const rootLetters = ['C', 'D', 'D', 'E', 'E', 'F', 'F', 'G', 'A', 'A', 'B', 'B'];
        const letters = 'CDEFGAB';
        for (let root = 0; root < 12; root++) {
            const choices = getChordToneChoices(entry, root);
            expect(choices.map(choice => choice.value)).toEqual(entry.formula.degrees);
            for (const [index, choice] of choices.entries()) {
                const [note, displayedDegree] = choice.label.split(' · ');
                const match = /^([A-G])([♯♭]*)$/.exec(note);
                expect(match, choice.label).not.toBeNull();
                const [, letter, accidentals] = match!;
                const accidentalOffset = [...accidentals].reduce((total, sign) => total + (sign === '♯' ? 1 : -1), 0);
                expect((naturalPitch[letter] + accidentalOffset + 12) % 12)
                    .toBe((root + entry.formula.intervals[index]) % 12);
                const degreeNumber = Number(choice.value.replace(/[b#]/g, ''));
                expect(letter).toBe(letters[(letters.indexOf(rootLetters[root]) + degreeNumber - 1) % 7]);
                expect(displayedDegree.replace(/♭/g, 'b').replace(/♯/g, '#')).toBe(choice.value);
            }
        }
        expect(JSON.stringify(entry.formula)).toBe(before);
    });
});
