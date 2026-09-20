import { describe, expect, it } from 'vitest';

import { SCALES } from '@/domain/scale';
import { CHORD_REGISTRY_LIST } from './registry';
import { getScaleCompatibleChords } from './chord-scale-compatibility';
import { getRelatedScaleSuggestionsForChord } from './related-scales';

const ids = (group: string, name: string, tonic = 0) => getScaleCompatibleChords(group, name, tonic).map((item) => item.chordId);
const canonicalIds = (group: string, name: string, tonic = 0) =>
    getScaleCompatibleChords(group, name, tonic).filter((item) => item.canonical).map((item) => item.chordId);

describe('scale-compatible chords ("Play this scale over")', () => {
    it('admits major-family chords over Ionian and rejects the dominant seventh', () => {
        const admitted = ids('Diatonic Modes', 'Ionian');
        expect(admitted).toEqual(expect.arrayContaining(['major', 'major-7', 'major-9', 'major-6', 'add9', 'six-nine', 'sus2', 'sus4']));
        expect(admitted).not.toContain('dominant-7');
        expect(canonicalIds('Diatonic Modes', 'Ionian')).toEqual(['major', 'major-7', 'major-9']);
    });

    it('admits the characteristic minor sixth over Dorian and rejects minor-major-7 and dominant chords', () => {
        const admitted = ids('Diatonic Modes', 'Dorian', 2);
        expect(admitted).toEqual(expect.arrayContaining(['minor', 'minor-7', 'minor-6', 'minor-9', 'minor-11']));
        expect(admitted).not.toContain('minor-major-7');
        expect(admitted).not.toContain('dominant-7');
        expect(canonicalIds('Diatonic Modes', 'Dorian', 2)).toEqual(['minor', 'minor-7', 'minor-9']);
    });

    it('admits the dominant family over Mixolydian and rejects maj7', () => {
        const admitted = ids('Diatonic Modes', 'Mixolydian', 7);
        expect(admitted).toEqual(expect.arrayContaining(['dominant-7', 'dominant-9', 'dominant-13']));
        expect(admitted).not.toContain('major-7');
        expect(canonicalIds('Diatonic Modes', 'Mixolydian', 7)).toEqual(['dominant-7', 'dominant-9', 'dominant-13']);
    });

    it('admits half-diminished but not fully diminished over Locrian', () => {
        const admitted = ids('Diatonic Modes', 'Locrian', 11);
        expect(admitted).toContain('half-diminished-7');
        expect(admitted).not.toContain('diminished-7');
        expect(canonicalIds('Diatonic Modes', 'Locrian', 11)).toEqual(['half-diminished-7']);
    });

    it('admits minor-major-7 over Harmonic Minor but not minor-6, with no canonical label available', () => {
        const admitted = ids('Harmonic Minor Modes', 'Harmonic Minor', 9);
        expect(admitted).toContain('minor-major-7');
        expect(admitted).not.toContain('minor-6');
        expect(canonicalIds('Harmonic Minor Modes', 'Harmonic Minor', 9)).not.toContain('minor-major-7');
    });

    it('rejects a plain dominant seventh over Whole Tone because its natural 5th is absent', () => {
        const admitted = ids('Symmetric', 'Whole Tone');
        expect(admitted).not.toContain('dominant-7');
        expect(admitted).toEqual(expect.arrayContaining(['augmented', 'dominant-7-sharp-5', 'dominant-7-flat-5']));
        expect(admitted).not.toContain('major-7');
    });

    it('limits the Altered scale to altered-fifth dominants (no natural 5th exists in it)', () => {
        const admitted = ids('Jazz Minor Modes', 'Altered scale');
        expect(admitted).toEqual(expect.arrayContaining(['dominant-7-sharp-5', 'dominant-7-flat-5']));
        expect(admitted).not.toContain('dominant-7');
        expect(admitted).not.toContain('dominant-7-flat-9');
        expect(admitted).not.toContain('hendrix-7-sharp-9');
    });

    it('treats pentatonics by literal containment (A major: add9 and 6 fit, maj7 does not)', () => {
        const admitted = ids('Pentatonic', 'Major Pentatonic', 9);
        expect(admitted).toEqual(expect.arrayContaining(['major', 'add9', 'major-6']));
        expect(admitted).not.toContain('major-7');
    });

    it('lists canonical pairings first, then structural matches in registry order', () => {
        const items = getScaleCompatibleChords('Diatonic Modes', 'Ionian', 0);
        const firstNonCanonical = items.findIndex((item) => !item.canonical);
        expect(firstNonCanonical).toBeGreaterThan(0);
        expect(items.slice(0, firstNonCanonical).every((item) => item.canonical)).toBe(true);
        expect(items.slice(firstNonCanonical).every((item) => !item.canonical)).toBe(true);
    });

    it('never labels power chords or suspensions as canonical, despite their curated primary entries', () => {
        for (const id of ['power-5', 'sus2', 'sus4']) {
            expect(getRelatedScaleSuggestionsForChord(id).some((suggestion) => suggestion.category === 'primary')).toBe(true);
        }
        const labelled = new Set<string>();
        for (const group of Object.keys(SCALES)) {
            for (const name of Object.keys(SCALES[group])) {
                for (const item of getScaleCompatibleChords(group, name, 0)) {
                    if (item.canonical) labelled.add(item.chordId);
                }
            }
        }
        expect(labelled.has('power-5') || labelled.has('sus2') || labelled.has('sus4')).toBe(false);
    });

    it('lists a chord if and only if every formula tone is in the scale, for every scale', () => {
        for (const group of Object.keys(SCALES)) {
            for (const name of Object.keys(SCALES[group])) {
                for (const tonic of [0, 3, 8]) {
                    const scale = new Set(SCALES[group][name].map((interval) => (tonic + interval) % 12));
                    const admitted = new Set<string>();
                    for (const item of getScaleCompatibleChords(group, name, tonic)) {
                        admitted.add(item.chordId);
                        expect(item.rootPitchClass).toBe(tonic);
                        expect(item.formulaPitchClasses.every((pc) => scale.has(pc)), `${group}/${name} ${item.chordId}`).toBe(true);
                    }
                    for (const entry of CHORD_REGISTRY_LIST) {
                        const fits = entry.formula.intervals.every((interval) => scale.has((tonic + interval) % 12));
                        expect(admitted.has(entry.id), `${group}/${name} ${entry.id}`).toBe(fits);
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
