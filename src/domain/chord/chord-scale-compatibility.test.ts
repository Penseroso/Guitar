import { describe, expect, it } from 'vitest';

import { SCALES } from '@/domain/scale';
import { getCanonicalChordsForScale } from './canonical-chord-scales';
import { getScaleCompatibleChords, type ChordScaleFitBasis } from './chord-scale-compatibility';
import { CHORD_REGISTRY_LIST } from './registry';
import { getRelatedScaleSuggestionsForChord } from './related-scales';

const ids = (group: string, name: string, tonic = 0) =>
    getScaleCompatibleChords(group, name, tonic).map((chord) => chord.chordId);
const byBasis = (group: string, name: string, basis: ChordScaleFitBasis, tonic = 0) =>
    getScaleCompatibleChords(group, name, tonic).filter((chord) => chord.basis === basis).map((chord) => chord.chordId);
const find = (group: string, name: string, chordId: string, tonic = 0) =>
    getScaleCompatibleChords(group, name, tonic).find((chord) => chord.chordId === chordId);

describe('"Play this scale over" — curated practice layer (primary vs characteristic)', () => {
    it('leads with the standard pairing for the scale', () => {
        expect(byBasis('Diatonic Modes', 'Ionian', 'primary')).toEqual(['major', 'major-7', 'major-6', 'major-9']);
        expect(byBasis('Diatonic Modes', 'Mixolydian', 'primary', 7))
            .toEqual(['dominant-7', 'dominant-9', 'dominant-13', 'dominant-7-sus4']);
        expect(byBasis('Diatonic Modes', 'Locrian', 'primary', 11)).toEqual(['half-diminished-7']);
        expect(byBasis('Harmonic Minor Modes', 'Harmonic Minor', 'primary', 9)).toEqual(['minor-major-7']);
    });

    it('distinguishes primary vs characteristic modal/color pairings across key attack cases', () => {
        // m7: Dorian is primary; Phrygian and Dorian #4 are characteristic modal colors
        expect(byBasis('Diatonic Modes', 'Dorian', 'primary')).toContain('minor-7');
        expect(byBasis('Diatonic Modes', 'Phrygian', 'characteristic')).toEqual(['minor-7']);
        expect(byBasis('Diatonic Modes', 'Phrygian', 'primary')).toEqual([]);
        expect(byBasis('Harmonic Minor Modes', 'Dorian #4', 'characteristic')).toEqual(['minor-7']);
        expect(byBasis('Harmonic Minor Modes', 'Dorian #4', 'primary')).toEqual([]);

        // 7: Mixolydian is primary; Lydian Dominant and Mixolydian b6 are characteristic colors
        expect(byBasis('Diatonic Modes', 'Mixolydian', 'primary')).toContain('dominant-7');
        expect(byBasis('Jazz Minor Modes', 'Lydian Dominant', 'characteristic')).toEqual(['dominant-7']);
        expect(byBasis('Jazz Minor Modes', 'Lydian Dominant', 'primary')).toEqual([]);
        expect(byBasis('Jazz Minor Modes', 'Mixolydian b6', 'characteristic')).toEqual(['dominant-7']);
        expect(byBasis('Jazz Minor Modes', 'Mixolydian b6', 'primary')).toEqual([]);

        // m7b5: Locrian is primary; Locrian ♮2 and Locrian #6 are characteristic variations
        expect(byBasis('Diatonic Modes', 'Locrian', 'primary')).toEqual(['half-diminished-7']);
        expect(byBasis('Jazz Minor Modes', 'Locrian ♮2', 'characteristic')).toEqual(['half-diminished-7']);
        expect(byBasis('Jazz Minor Modes', 'Locrian ♮2', 'primary')).toEqual([]);
        expect(byBasis('Harmonic Minor Modes', 'Locrian #6', 'characteristic')).toEqual(['half-diminished-7']);
        expect(byBasis('Harmonic Minor Modes', 'Locrian #6', 'primary')).toEqual([]);
    });

    it('sorts curated pairings ahead of merely-fitting chords', () => {
        const chords = getScaleCompatibleChords('Diatonic Modes', 'Ionian', 0);
        const firstContainment = chords.findIndex((chord) => chord.basis === 'containment');
        expect(firstContainment).toBeGreaterThan(0);
        expect(chords.slice(0, firstContainment).every((chord) => chord.basis === 'primary' || chord.basis === 'characteristic')).toBe(true);
        expect(chords.slice(firstContainment).every((chord) => chord.basis === 'containment')).toBe(true);
    });

    // The case strict containment gets wrong: the altered scale IS the scale for an altered
    // dominant precisely because it replaces the chord's natural 5th.
    it('admits the altered dominant family over the Altered scale, naming the replaced tone', () => {
        expect(byBasis('Jazz Minor Modes', 'Altered scale', 'primary'))
            .toEqual(['hendrix-7-sharp-9', 'dominant-7-flat-9', 'dominant-7-sharp-5', 'dominant-7-flat-5']);

        const hendrix = find('Jazz Minor Modes', 'Altered scale', 'hendrix-7-sharp-9')!;
        expect(hendrix.toneNames).toEqual(['C', 'E', 'G', 'Bb', 'D#']);
        expect(hendrix.tonesOutsideScale).toEqual(['G']);

        // A pairing the scale fully contains claims nothing extra.
        expect(find('Jazz Minor Modes', 'Altered scale', 'dominant-7-sharp-5')!.tonesOutsideScale).toEqual([]);
    });

    it('still refuses a plain dominant 7th over the Altered and Whole Tone scales', () => {
        expect(ids('Jazz Minor Modes', 'Altered scale')).not.toContain('dominant-7');
        expect(ids('Symmetric', 'Whole Tone')).not.toContain('dominant-7');
        expect(byBasis('Symmetric', 'Whole Tone', 'primary')).toEqual(['augmented', 'dominant-7-sharp-5']);
    });
});

describe('"Play this scale over" — containment layer (literal fact)', () => {
    it('admits a chord only when the scale holds every one of its notes', () => {
        const dorian = ids('Diatonic Modes', 'Dorian', 2);
        expect(dorian).toEqual(expect.arrayContaining(['minor-6', 'minor-11', 'minor-9']));
        expect(dorian).not.toContain('minor-major-7'); // needs a natural 7
        expect(dorian).not.toContain('dominant-7'); // needs a major 3rd

        expect(ids('Diatonic Modes', 'Mixolydian', 7)).not.toContain('major-7');
        expect(ids('Diatonic Modes', 'Locrian', 11)).not.toContain('diminished-7');
        expect(ids('Harmonic Minor Modes', 'Harmonic Minor', 9)).not.toContain('minor-6');
    });

    it('lists a non-curated chord if and only if every formula tone is in the scale', () => {
        for (const group of Object.keys(SCALES)) {
            for (const name of Object.keys(SCALES[group])) {
                const curated = new Set(getCanonicalChordsForScale(group, name));
                for (const tonic of [0, 3, 8]) {
                    const scale = new Set(SCALES[group][name].map((interval) => (tonic + interval) % 12));
                    const admitted = new Set(byBasis(group, name, 'containment', tonic));
                    for (const entry of CHORD_REGISTRY_LIST) {
                        if (curated.has(entry.id)) continue;
                        const fits = entry.formula.intervals.every((interval) => scale.has((tonic + interval) % 12));
                        expect(admitted.has(entry.id), `${group}/${name}@${tonic} ${entry.id}`).toBe(fits);
                    }
                }
            }
        }
    });

    it('admits a chord the scale only spells enharmonically, without calling it primary or characteristic', () => {
        const minor = find('Harmonic Minor Modes', 'Lydian #2', 'minor');
        expect(minor?.basis).toBe('containment');
        expect(byBasis('Harmonic Minor Modes', 'Lydian #2', 'primary')).toEqual([]);
        expect(byBasis('Harmonic Minor Modes', 'Lydian #2', 'characteristic')).toEqual([]);
    });

    it('never reports an out-of-scale tone for a containment match', () => {
        for (const group of Object.keys(SCALES)) {
            for (const name of Object.keys(SCALES[group])) {
                for (const chord of getScaleCompatibleChords(group, name, 0)) {
                    if (chord.basis === 'containment') expect(chord.tonesOutsideScale).toEqual([]);
                }
            }
        }
    });
});

describe('"Play this scale over" — spelling', () => {
    it('spells the root and tones in the chord\'s own frame, including the diminished 7th', () => {
        expect(find('Diatonic Modes', 'Ionian', 'major-7', 6)!.rootNoteName).toBe('F#');
        expect(find('Diatonic Modes', 'Ionian', 'major-7', 6)!.toneNames).toEqual(['F#', 'A#', 'C#', 'E#']);
        expect(find('Symmetric', 'Diminished', 'diminished-7', 0)!.toneNames).toEqual(['C', 'Eb', 'Gb', 'Bbb']);
    });

    it('spells every admitted chord over every scale and tonic without falling back', () => {
        for (const group of Object.keys(SCALES)) {
            for (const name of Object.keys(SCALES[group])) {
                for (let tonic = 0; tonic < 12; tonic += 1) {
                    for (const chord of getScaleCompatibleChords(group, name, tonic)) {
                        expect(chord.toneNames).toHaveLength(chord.toneNames.filter(Boolean).length);
                        expect(chord.toneNames[0], `${group}/${name}@${tonic}`).toBe(chord.rootNoteName);
                    }
                }
            }
        }
    });

    it('returns nothing for an unknown scale', () => {
        expect(getScaleCompatibleChords('Nope', 'Nope', 0)).toEqual([]);
    });
});

describe('related-scales default fallback', () => {
    it('no longer fabricates an Ionian suggestion for a chord with no curated mapping', () => {
        for (const id of ['augmented', 'minor-6', 'minor-major-7', 'dominant-7-sharp-5']) {
            expect(getRelatedScaleSuggestionsForChord(id), id).toEqual([]);
        }
    });
});
