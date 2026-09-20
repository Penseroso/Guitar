import { describe, expect, it } from 'vitest';

import { SCALES } from '@/domain/scale';
import {
    CANONICAL_CHORDS_BY_SCALE,
    CHORDS_WITHOUT_CANONICAL_SCALE,
    getCanonicalChordsForScale,
} from './canonical-chord-scales';
import { CHORD_REGISTRY_LIST } from './registry';

const registryIds = new Set(CHORD_REGISTRY_LIST.map((entry) => entry.id));
const claimed = new Set(Object.values(CANONICAL_CHORDS_BY_SCALE).flatMap((group) => Object.values(group).flat()));

describe('canonical chord-scale pairings (curated policy)', () => {
    it('declares every scale, so a new scale cannot silently show nothing', () => {
        for (const group of Object.keys(SCALES)) {
            for (const name of Object.keys(SCALES[group])) {
                expect(CANONICAL_CHORDS_BY_SCALE[group]?.[name], `${group}/${name} has no declaration`).toBeDefined();
            }
        }
    });

    it('declares no scale that does not exist', () => {
        for (const [group, scales] of Object.entries(CANONICAL_CHORDS_BY_SCALE)) {
            for (const name of Object.keys(scales)) {
                expect(SCALES[group]?.[name], `${group}/${name} is not a real scale`).toBeDefined();
            }
        }
    });

    it('references only real chord ids', () => {
        for (const id of claimed) expect(registryIds.has(id), id).toBe(true);
        for (const id of Object.keys(CHORDS_WITHOUT_CANONICAL_SCALE)) expect(registryIds.has(id), id).toBe(true);
    });

    // The drift detector: adding a chord to the registry forces an explicit decision here.
    it('accounts for every registry chord, either claimed by a scale or explicitly unclaimed', () => {
        const unaccounted = [...registryIds].filter(
            (id) => !claimed.has(id) && !(id in CHORDS_WITHOUT_CANONICAL_SCALE)
        );
        expect(unaccounted, 'add these to a scale or to CHORDS_WITHOUT_CANONICAL_SCALE').toEqual([]);
    });

    it('never both claims and disclaims the same chord', () => {
        for (const id of Object.keys(CHORDS_WITHOUT_CANONICAL_SCALE)) expect(claimed.has(id), id).toBe(false);
    });

    /**
     * Guards the authoring, not the theory: a scale can only be "the scale for" a chord it very
     * nearly contains. The one tone a canonical scale is allowed to be missing is the chord's
     * perfect 5th, which altered dominants replace by design (C altered over C7#9). Anything else
     * missing means the pairing is a mistake.
     */
    it('only pairs a scale with a chord it contains, give or take the chord\'s fifth', () => {
        for (const [group, scales] of Object.entries(CANONICAL_CHORDS_BY_SCALE)) {
            for (const [name, chordIds] of Object.entries(scales)) {
                const scalePitchClasses = new Set(SCALES[group][name].map((interval) => interval % 12));
                for (const chordId of chordIds) {
                    const entry = CHORD_REGISTRY_LIST.find((item) => item.id === chordId)!;
                    const missing = entry.formula.degrees.filter(
                        (_, index) => !scalePitchClasses.has(entry.formula.intervals[index] % 12)
                    );
                    expect(missing.every((degree) => degree === '5'), `${group}/${name} + ${chordId}: ${missing}`).toBe(true);
                }
            }
        }
    });

    it('reads back per scale, and is empty for scales with no settled pairing', () => {
        expect(getCanonicalChordsForScale('Diatonic Modes', 'Locrian')).toEqual(['half-diminished-7']);
        expect(getCanonicalChordsForScale('Harmonic Minor Modes', 'Lydian #2')).toEqual([]);
        expect(getCanonicalChordsForScale('Nope', 'Nope')).toEqual([]);
    });
});
