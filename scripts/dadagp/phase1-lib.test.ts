import { describe, expect, it } from 'vitest';

import {
    parseGuitarOnsets,
    referenceFretsToEngineOrder,
    relativeShapeSignature,
} from './phase1-lib';

describe('Phase 1 DadaGP evidence normalization', () => {
    it('converts chords-db relative frets and low-to-high order into engine order', () => {
        expect(referenceFretsToEngineOrder([-1, 1, 3, 3, 3, 1], 5)).toEqual([5, 7, 7, 7, 5, null]);
    });

    it('normalizes translated closed shapes but keeps open shapes absolute', () => {
        expect(relativeShapeSignature([null, 7, 7, 7, 5, null])).toBe('closed:x,2,2,2,0,x');
        expect(relativeShapeSignature([null, 9, 9, 9, 7, null])).toBe('closed:x,2,2,2,0,x');
        expect(relativeShapeSignature([0, 1, 0, 2, 3, null])).toBe('open:0,1,0,2,3,x');
    });

    it('groups by instrument, removes tied notes, and flags duplicate strings', () => {
        const onsets = parseGuitarOnsets([
            'clean0:note:s1:f3',
            'nfx:tie',
            'clean0:note:s2:f5',
            'clean0:note:s2:f7',
            'distorted0:note:s6:f3',
            'wait:240',
        ]);
        expect(onsets).toEqual([
            { instrument: 'clean0', frets: [null, 7, null, null, null, null], attackCount: 2, hasDuplicateString: true },
            { instrument: 'distorted0', frets: [null, null, null, null, null, 3], attackCount: 1, hasDuplicateString: false },
        ]);
    });
});
