import { describe, expect, it } from 'vitest';
import { compareChords } from './facts';
import { resolveChord } from './roman';

describe('Harmony interval and pitch-class facts', () => {
    it('records descending fifth motion without asserting harmonic function', () => {
        const facts = compareChords(resolveChord({ root: 'G', chordId: 'dominant-7' }), resolveChord({ root: 'C', chordId: 'major' }));
        expect(facts).toEqual({ rootMotion: 5, shared: [7], removed: [11, 2, 5], added: [0, 4] });
    });
    it('recognizes the tritone pair shared by G7 and Db7 despite different spellings', () => {
        const facts = compareChords(resolveChord({ root: 'G', chordId: 'dominant-7' }), resolveChord({ root: 'Db', chordId: 'dominant-7' }));
        expect(facts).toEqual({ rootMotion: 6, shared: [11, 5], removed: [7, 2], added: [1, 8] });
    });
});
