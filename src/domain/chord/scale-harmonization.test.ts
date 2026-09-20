import { describe, expect, it } from 'vitest';

import { SCALES } from '@/domain/scale';
import { getScaleHarmonization, HARMONIZABLE_PITCH_CLASS_COUNT, type HarmonizedChord } from './scale-harmonization';

function rows(group: string, name: string, tonic = 0) {
    const result = getScaleHarmonization(group, name, tonic);
    if (!result.defined) throw new Error(`${group}/${name} is not harmonizable`);
    const label = (chord: HarmonizedChord | null) => (chord ? `${chord.rootNoteName}${chord.chordSuffix}` : null);
    return {
        triads: result.triads.map(label),
        sevenths: result.sevenths.map(label),
        triadNumerals: result.triads.map((chord) => chord?.romanNumeral),
        seventhNumerals: result.sevenths.map((chord) => chord?.romanNumeral),
    };
}

describe('scale harmonization ("Chords built from this scale")', () => {
    it('harmonizes C Ionian into the textbook triads and sevenths', () => {
        const ionian = rows('Diatonic Modes', 'Ionian');
        expect(ionian.triadNumerals).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
        expect(ionian.triads).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'B°']);
        expect(ionian.sevenths).toEqual(['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5']);
        expect(ionian.seventhNumerals).toEqual(['IM7', 'ii7', 'iii7', 'IVM7', 'V7', 'vi7', 'viiø7']);
    });

    it("surfaces Dorian's characteristic dominant IV", () => {
        const dorian = rows('Diatonic Modes', 'Dorian', 2);
        expect(dorian.sevenths).toEqual(['Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5', 'Cmaj7']);
        expect(dorian.seventhNumerals[3]).toBe('IV7');
    });

    it('uses tonic-relative accidentals and case-by-quality for Locrian', () => {
        const locrian = rows('Diatonic Modes', 'Locrian', 11);
        expect(locrian.triads).toEqual(['B°', 'C', 'Dm', 'Em', 'F', 'G', 'Am']);
        expect(locrian.triadNumerals).toEqual(['i°', '♭II', '♭iii', 'iv', '♭V', '♭VI', '♭vii']);
    });

    it('derives the harmonic-minor V7 and vii°7 with correct spelling', () => {
        const harmonicMinor = rows('Harmonic Minor Modes', 'Harmonic Minor', 9);
        expect(harmonicMinor.triads).toEqual(['Am', 'B°', 'C+', 'Dm', 'E', 'F', 'G#°']);
        expect(harmonicMinor.sevenths).toEqual(['AmM7', 'Bm7b5', 'Cmaj7#5', 'Dm7', 'E7', 'Fmaj7', 'G#dim7']);
        expect(harmonicMinor.seventhNumerals).toEqual(['iM7', 'iiø7', '♭III+M7', 'iv7', 'V7', '♭VIM7', 'vii°7']);
    });

    describe('spelling follows the scale, not the pitch class', () => {
        it('keeps sharp keys sharp and flat keys flat', () => {
            expect(rows('Diatonic Modes', 'Ionian', 2).triads[6]).toBe('C#°');
            expect(rows('Diatonic Modes', 'Ionian', 6).triads).toEqual(['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m', 'E#°']);
            expect(rows('Diatonic Modes', 'Ionian', 1).triads[3]).toBe('Gb');
        });

        it('spells a raised second as ♯ii, not ♭iii', () => {
            const lydianSharp2 = rows('Harmonic Minor Modes', 'Lydian #2');
            expect(lydianSharp2.triads[1]).toBe('D#°');
            expect(lydianSharp2.triadNumerals[1]).toBe('♯ii°');
            expect(lydianSharp2.triadNumerals[3]).toBe('♯iv°');
        });

        it('spells a double-flattened seventh as ♭♭VII', () => {
            const ultralocrian = rows('Harmonic Minor Modes', 'Ultralocrian');
            expect(ultralocrian.triads[6]).toBe('Bbb');
            expect(ultralocrian.triadNumerals[6]).toBe('♭♭VII');
        });

        it('spells the altered scale as the melodic-minor mode it is', () => {
            expect(rows('Jazz Minor Modes', 'Altered scale').triadNumerals)
                .toEqual(['i°', '♭ii', '♭iii', '♭IV+', '♭V', '♭VI', '♭vii°']);
        });
    });

    it('fully harmonizes every seven-note scale, at every tonic, with no gaps', () => {
        let checked = 0;
        for (const group of Object.keys(SCALES)) {
            for (const name of Object.keys(SCALES[group])) {
                if (new Set(SCALES[group][name]).size !== HARMONIZABLE_PITCH_CLASS_COUNT) continue;
                for (let tonic = 0; tonic < 12; tonic += 1) {
                    const result = getScaleHarmonization(group, name, tonic);
                    expect(result.defined, `${group}/${name}`).toBe(true);
                    if (!result.defined) continue;
                    expect(result.triads.every(Boolean), `${group}/${name} triads @${tonic}`).toBe(true);
                    expect(result.sevenths.every(Boolean), `${group}/${name} sevenths @${tonic}`).toBe(true);
                    for (const chord of [...result.triads, ...result.sevenths]) {
                        // Rooted on the degree it was stacked on, and spelled as that degree.
                        expect(chord!.rootPitchClass).toBe((tonic + SCALES[group][name][chord!.degreeIndex]) % 12);
                        expect(chord!.rootNoteName).toMatch(/^[A-G](#|##|b|bb)?$/);
                    }
                    // One letter per degree, for the whole harmonization.
                    const letters = result.triads.map((chord) => chord!.rootNoteName[0]);
                    expect(new Set(letters).size, `${group}/${name}@${tonic}`).toBe(7);
                }
                checked += 1;
            }
        }
        expect(checked).toBe(21);
    });

    it.each([
        ['Pentatonic', 'Minor Pentatonic', 5],
        ['Pentatonic', 'Major Pentatonic', 5],
        ['Symmetric', 'Whole Tone', 6],
        ['Symmetric', 'Diminished', 8],
    ])('reports %s / %s as not harmonizable instead of fabricating chords', (group, name, count) => {
        expect(getScaleHarmonization(group, name, 0)).toEqual({ defined: false, pitchClassCount: count });
    });

    it('reports unknown scales as not harmonizable', () => {
        expect(getScaleHarmonization('Nope', 'Nope', 0)).toEqual({ defined: false, pitchClassCount: 0 });
    });
});
