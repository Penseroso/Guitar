import { describe, expect, it } from 'vitest';

import { CHORD_REGISTRY_LIST } from './registry';
import { buildTargetVoicingNotes } from './voicingStyles';

const dominant7 = CHORD_REGISTRY_LIST.find((entry) => entry.id === 'dominant-7')!;

function degreesInOrder(entry: typeof dominant7, position: 'close' | 'drop-2' | 'drop-3' | 'shell') {
    return buildTargetVoicingNotes(entry, { position }).map((note) => note.degree);
}

describe('buildTargetVoicingNotes', () => {
    it('stacks a close-position dominant 7 in plain ascending order', () => {
        expect(degreesInOrder(dominant7, 'close')).toEqual(['1', '3', '5', 'b7']);
    });

    it('drops the 2nd-from-top voice (the 5th) below the root for drop-2', () => {
        // Textbook drop-2 dominant-7 structure: 5th in the bass, then root/3rd/7th stacked above.
        expect(degreesInOrder(dominant7, 'drop-2')).toEqual(['5', '1', '3', 'b7']);
    });

    it('drops the 3rd-from-top voice (the 3rd) below the root for drop-3', () => {
        expect(degreesInOrder(dominant7, 'drop-3')).toEqual(['3', '1', '5', 'b7']);
    });

    it('keeps only required degrees for shell voicings (root/3rd/7th, 5th omitted)', () => {
        expect(degreesInOrder(dominant7, 'shell')).toEqual(['1', '3', 'b7']);
    });

    it('respects an explicit omitDegrees list even in close position', () => {
        const notes = buildTargetVoicingNotes(dominant7, { position: 'close', omitDegrees: ['5'] });
        expect(notes.map((note) => note.degree)).toEqual(['1', '3', 'b7']);
    });

    it('produces strictly ascending voice order for every style', () => {
        for (const position of ['close', 'drop-2', 'drop-3', 'shell'] as const) {
            const notes = buildTargetVoicingNotes(dominant7, { position });
            for (let i = 1; i < notes.length; i++) {
                expect(notes[i].order).toBeGreaterThan(notes[i - 1].order);
            }
        }
    });
});
