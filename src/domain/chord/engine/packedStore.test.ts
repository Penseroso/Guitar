import { expect, it } from 'vitest';
import { PackedStore } from './packedStore';
import { EngineSession } from './session';
import type { Six } from './types';

it('decodes independent signed six-string snapshots across every chunk boundary', () => {
    const store = new PackedStore();
    const screen = new EngineSession({ schema: 'intent-v1', chordId: 'major', rootPitchClass: 0 }).screen.metrics([0, 1, 0, 2, 3, -1]);
    const expected = [];
    for (let index = 0; index < 8200; index++) {
        const states = Array.from({ length: 6 }, (_, string) => (index + string * 7) % 38 - 1) as unknown as Six<number>;
        const status = index % 2 ? 'PASS' as const : 'UNCERTAIN' as const;
        const scoreNumerator = (index % 2 ? -1 : 1) * index * 110000;
        expected.push({ states, status, scoreNumerator });
        expect(store.append(states, { ...screen, status }, scoreNumerator)).toBe(true);
    }
    store.complete = true;
    for (let index = 0; index < expected.length; index++) expect(store.read(index)).toEqual(expected[index]);
    const retained = store.read(4095);
    store.read(4096);
    expect(retained).toEqual(expected[4095]);
    (retained.states as unknown as number[])[0] = 36;
    expect(store.read(4095)).toEqual(expected[4095]);
});
