import { describe, expect, it } from 'vitest';

import { SCALES } from '@/domain/scale';
import { getKeyName } from '@/domain/shared/keys';
import { getScaleHarmonization, HARMONIZABLE_PITCH_CLASS_COUNT, type HarmonizedChord } from './scale-harmonization';

function rows(group: string, name: string, tonic = 0) {
    const result = getScaleHarmonization(group, name, tonic);
    if (!result.defined) throw new Error(`${group}/${name} is not harmonizable`);
    const label = (chord: HarmonizedChord | null) => (chord ? `${getKeyName(chord.rootPitchClass)}${chord.chordSuffix}` : null);
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
        expect(ionian.triads.slice(0, 6)).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am']);
        expect(ionian.sevenths).toEqual(['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5']);
        expect(ionian.seventhNumerals).toEqual(['IM7', 'ii7', 'iii7', 'IVM7', 'V7', 'vi7', 'viiø7']);
    });

    it('transposes with the tonic without any per-key table', () => {
        expect(rows('Diatonic Modes', 'Ionian', 7).sevenths).toEqual(['Gmaj7', 'Am7', 'Bm7', 'Cmaj7', 'D7', 'Em7', 'F#m7b5']);
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
        expect(locrian.sevenths[0]).toBe('Bm7b5');
    });

    it('spells the tritone degree #IV in Lydian-family scales, matching the scale\'s own labels', () => {
        expect(rows('Diatonic Modes', 'Lydian').triadNumerals[3]).toBe('♯iv°');
    });

    it('derives the harmonic-minor V7 and vii°7 (and the augmented/minor-major colors) deductively', () => {
        const harmonicMinor = rows('Harmonic Minor Modes', 'Harmonic Minor', 9);
        expect(harmonicMinor.triads).toEqual(['Am', 'B°', 'C+', 'Dm', 'E', 'F', 'Ab°']);
        expect(harmonicMinor.sevenths).toEqual(['AmM7', 'Bm7b5', 'Cmaj7#5', 'Dm7', 'E7', 'Fmaj7', 'Abdim7']);
        expect(harmonicMinor.seventhNumerals).toEqual(['iM7', 'iiø7', '♭III+M7', 'iv7', 'V7', '♭VIM7', 'vii°7']);
    });

    it('fully harmonizes every seven-note scale, at every tonic, with no gaps', () => {
        let checked = 0;
        for (const group of Object.keys(SCALES)) {
            for (const name of Object.keys(SCALES[group])) {
                if (new Set(SCALES[group][name]).size !== HARMONIZABLE_PITCH_CLASS_COUNT) continue;
                for (const tonic of [0, 5, 6, 11]) {
                    const result = getScaleHarmonization(group, name, tonic);
                    expect(result.defined, `${group}/${name}`).toBe(true);
                    if (!result.defined) continue;
                    expect(result.triads.every(Boolean), `${group}/${name} triads @${tonic}`).toBe(true);
                    expect(result.sevenths.every(Boolean), `${group}/${name} sevenths @${tonic}`).toBe(true);
                    for (const chord of [...result.triads, ...result.sevenths]) {
                        // The chord is rooted on the scale degree it was stacked on.
                        expect(chord!.rootPitchClass).toBe((tonic + SCALES[group][name][chord!.degreeIndex]) % 12);
                    }
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
