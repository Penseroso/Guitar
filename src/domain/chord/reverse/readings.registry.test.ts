import { describe, expect, it } from 'vitest';
import { CHORD_REGISTRY_LIST } from '../registry';
import { engineEntry } from '../engine/catalog';
import type { EnteredShape } from './enteredShape';
import { inferChordReadings } from './readings';

// Registry-generic contract: reverse recognition must work for EVERY entry in CHORD_REGISTRY_LIST
// without any reverse-side change, so a future registry addition becomes recognizable purely by
// existing there. This test enumerates the live registry rather than a fixed list of ids.
function fixture(bassPitchClass: number, pitchClasses: number[]): EnteredShape {
    return {
        states: [-1, -1, -1, -1, -1, -1],
        notes: pitchClasses.map((pitchClass, index) => ({ string: 0, fret: 0, midi: index, pitchClass })),
        bass: { midi: 0, pitchClass: bassPitchClass },
        pitchClasses,
        doubled: [],
    };
}

function normalizePitchClass(value: number): number {
    return ((value % 12) + 12) % 12;
}

describe('inferChordReadings — registry-generic contract', () => {
    for (const entry of CHORD_REGISTRY_LIST) {
        for (const root of [0, 6]) {
            it(`recognizes every full-formula root-position voicing of ${entry.id} at root ${root}`, () => {
                const pitchClasses = entry.formula.intervals.map((interval) => normalizePitchClass(root + interval));
                const inference = inferChordReadings(fixture(root, pitchClasses));
                expect(inference.status).toBe('named');
                if (inference.status !== 'named') return;
                const direct = inference.best.find((reading) => reading.chordId === entry.id && reading.rootPitchClass === root);
                expect(direct).toBeDefined();
                expect(direct).toMatchObject({ tier: 'direct', omitted: [], added: null, bass: { relation: 'root', inversion: null } });
            });
        }
    }

    it('never returns a chordId that engineEntry cannot resolve, for every entry played as its own full formula', () => {
        for (const entry of CHORD_REGISTRY_LIST) {
            const pitchClasses = entry.formula.intervals.map((interval) => normalizePitchClass(interval));
            const inference = inferChordReadings(fixture(0, pitchClasses));
            expect(inference.status).toBe('named');
            if (inference.status !== 'named') continue;
            for (const reading of [...inference.best, ...inference.other, ...inference.looser]) {
                expect(() => engineEntry(reading.chordId)).not.toThrow();
            }
        }
    });

    it('contains no chord-id literals or per-quality branches (a lightweight source-shape guard)', async () => {
        const source = await import('node:fs/promises').then((fs) => fs.readFile(new URL('./readings.ts', import.meta.url), 'utf8'));
        const registryIds = CHORD_REGISTRY_LIST.map((entry) => entry.id);
        for (const id of registryIds) {
            expect(source.includes(`'${id}'`) || source.includes(`"${id}"`)).toBe(false);
        }
    });
});
