import { describe, expect, it } from 'vitest';
import guitarChordsDb from '@tombatossals/chords-db/lib/guitar.json';

import { CHORD_REGISTRY_LIST } from './registry';
import { searchDeductiveVoicings } from './voicingSearch';
import type { GuitarStringIndex } from './types';

/**
 * @tombatossals/chords-db is a devDependency test fixture ONLY — the deductive engine never
 * imports it at runtime. It's used here to check our fret-math, playability model, and (now
 * that duplication is allowed) full strummed-chord reproduction against real, commonly-played
 * chord shapes — not the other way around.
 *
 * The fixture's string order is low-to-high (index 0 = 6th/low E .. index 5 = 1st/high E) —
 * the reverse of this codebase's GuitarStringIndex (0 = high E .. 5 = low E) — so every lookup
 * converts with `5 - fixtureIndex`.
 */

const major = CHORD_REGISTRY_LIST.find((entry) => entry.id === 'major')!;
const minor = CHORD_REGISTRY_LIST.find((entry) => entry.id === 'minor')!;

function toEngineStringIndex(fixtureStringIndex: number): GuitarStringIndex {
    return (5 - fixtureStringIndex) as GuitarStringIndex;
}

const chordsByKey = guitarChordsDb.chords as Record<string, Array<{ suffix: string; positions: Array<{ frets: number[] }> }>>;

function getFixtureFirstPosition(key: string, suffix: string) {
    const chordGroup = chordsByKey[key].find((entry) => entry.suffix === suffix)!;
    return chordGroup.positions[0];
}

/** True if some search result reproduces the fixture's exact play/mute pattern on every string. */
function engineReproducesFixtureShape(
    results: ReturnType<typeof searchDeductiveVoicings>,
    fixtureFrets: number[]
): boolean {
    const expectedByString = new Map<GuitarStringIndex, number>();
    fixtureFrets.forEach((fret, fixtureIndex) => {
        if (fret >= 0) {
            expectedByString.set(toEngineStringIndex(fixtureIndex), fret);
        }
    });

    return results.some((voicing) => {
        const played = voicing.notes.filter((note) => !note.isMuted);
        if (played.length !== expectedByString.size) {
            return false;
        }
        return [...expectedByString.entries()].every(
            ([string, fret]) => played.find((note) => note.string === string)?.fret === fret
        );
    });
}

describe('searchDeductiveVoicings vs. @tombatossals/chords-db reference shapes', () => {
    it('reproduces the full real open C major fingering (x-3-2-0-1-0, doubled root and 3rd)', () => {
        const fixture = getFixtureFirstPosition('C', 'major');
        const results = searchDeductiveVoicings(major, 0, { position: 'close' });

        expect(engineReproducesFixtureShape(results, fixture.frets)).toBe(true);
    });

    it('reproduces the full real open G major fingering (3-2-0-0-0-3, doubled root)', () => {
        const fixture = getFixtureFirstPosition('G', 'major');
        const results = searchDeductiveVoicings(major, 7, { position: 'close' }); // G = pitch class 7

        expect(engineReproducesFixtureShape(results, fixture.frets)).toBe(true);
    });

    it('reproduces the full real open E major fingering (0-2-2-1-0-0, doubled root and 5th)', () => {
        const fixture = getFixtureFirstPosition('E', 'major');
        const results = searchDeductiveVoicings(major, 4, { position: 'close' }); // E = pitch class 4

        expect(engineReproducesFixtureShape(results, fixture.frets)).toBe(true);
    });

    it('reproduces the full real open A minor fingering (x-0-2-2-1-0, doubled root and 5th)', () => {
        const fixture = getFixtureFirstPosition('A', 'minor');
        const results = searchDeductiveVoicings(minor, 9, { position: 'close' }); // A = pitch class 9

        expect(engineReproducesFixtureShape(results, fixture.frets)).toBe(true);
    });
});
