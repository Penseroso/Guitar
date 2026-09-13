import { describe, expect, it } from 'vitest';
import { compileSubset, matchesSubset } from './subsets';
import type { Six, StructuralRequest, Subset } from './types';

const formula = [{ id: '1', interval: 0 }, { id: '3', interval: 4 }, { id: '5', interval: 7 }, { id: '7', interval: 11 }];
function request(rootPitchClass = 0): StructuralRequest {
    const domain = Array.from({ length: 37 }, (_, index) => index);
    return {
        version: 'structural-v1', instrument: { kind: 'six-single-strings-12edo', tuningMidi: [36,36,36,36,36,36], maxModeledFret: 36 },
        fretDomains: [domain,domain,domain,domain,domain,domain], formulaKey: 'test', rootPitchClass,
        allowed: formula.map(tone => tone.id), required: ['1','3','7'], minDistinctPitchClasses: 3, predicates: [],
    };
}
const states = (pitches: number[]) => [...pitches.map(midi => midi - 36), ...Array(6 - pitches.length).fill(-1)] as unknown as Six<number>;
const signature = (pitches: number[]) => [...pitches].sort((a,b) => a-b).join(',');

/** Independent forward source construction, never using the inverse predicate. */
function dropOracle(root: number, kind: 'drop-2' | 'drop-3') {
    const pcs = formula.map(tone => (root + tone.interval) % 12);
    const result = new Set<string>();
    for (let lowest = 36; lowest <= 84; lowest++) {
        if (!pcs.includes(lowest % 12)) continue;
        const close = pcs.map(pc => lowest + (pc - lowest % 12 + 12) % 12).sort((a,b) => a-b);
        if (close[3] > 84) continue;
        close[kind === 'drop-2' ? 2 : 1] -= 12;
        if (close.every(midi => midi >= 36 && midi <= 72)) result.add(signature(close));
    }
    return result;
}

describe('exact structural subsets', () => {
    it('checks close spacing, occurrences and tokens using actual MIDI', () => {
        const r = request();
        const close: Subset = { kind: 'close-position', toneIds: ['1','3','5','7'] };
        expect(matchesSubset(states([48,52,55,59]), r, formula, close)).toBe(true);
        expect(matchesSubset(states([52,55,59,60]), r, formula, close)).toBe(true);
        expect(matchesSubset(states([60,59,55,52]), r, formula, close)).toBe(true);
        expect(matchesSubset(states([48,52,55,71]), r, formula, close)).toBe(false);
        expect(matchesSubset(states([48,52,55,59,60]), r, formula, close)).toBe(false);
        expect(matchesSubset(states([48,52,55]), r, formula, close)).toBe(false);
        expect(matchesSubset(states([48,52,55,58]), r, formula, close)).toBe(false);
    });

    it('matches independently enumerated drop sources exactly over the full small pitch domain', () => {
        for (const root of [0,5,11]) for (const kind of ['drop-2','drop-3'] as const) {
            const expected = dropOracle(root, kind);
            const actual = new Set<string>();
            const accepts = compileSubset(request(root), formula, { kind });
            const pitches = Array.from({ length: 37 }, (_, i) => i + 36).filter(midi => formula.some(tone => (root + tone.interval) % 12 === midi % 12));
            // Enumerate candidate vectors independently of close-source construction.
            for (let a = 0; a < pitches.length; a++) for (let b = a + 1; b < pitches.length; b++)
                for (let c = b + 1; c < pitches.length; c++) for (let d = c + 1; d < pitches.length; d++) {
                    const vector = [pitches[a],pitches[b],pitches[c],pitches[d]];
                    if (accepts(states(vector))) actual.add(signature(vector));
                }
            expect(actual).toEqual(expected);
            expect(new Set([...actual].map(key => Number(key.split(',')[0]) % 12))).toEqual(
                new Set(formula.map(tone => (root + tone.interval) % 12)),
            ); // every possible dropped tone, hence all four source inversions
            expect([...actual].some(key => actual.has(key.split(',').map(midi => Number(midi) + 12).join(',')))).toBe(true);
        }
    });

    it('admits arbitrary string permutations and rejects bass-only false positives', () => {
        const r = request();
        const drop2: Subset = { kind: 'drop-2' };
        for (const vector of [[43,48,52,59],[59,43,52,48],[48,59,43,52]]) {
            expect(matchesSubset(states(vector), r, formula, drop2)).toBe(true);
        }
        expect(matchesSubset(states([43,48,64,71]), r, formula, drop2)).toBe(false);
        expect(matchesSubset(states([43,48,64,71]), r, formula, { kind: 'unrestricted' })).toBe(true);
        expect(matchesSubset(states([43,48,52,59,60]), r, formula, drop2)).toBe(false);
    });

    it('does not impose the old shell density pre-gate on essential tones', () => {
        const r = { ...request(), allowed: ['3','7'], required: ['3','7'], minDistinctPitchClasses: 2 };
        expect(matchesSubset(states([52,59]), r, formula, { kind: 'essential-tones' })).toBe(true);
        expect(matchesSubset(states([52,59]), r, formula, { kind: 'close-position', toneIds: ['3','7'] })).toBe(true);
    });

    it('fails unsupported selections and harmonic conflicts explicitly', () => {
        const r = request();
        for (const toneIds of [[],['1','3','5'],['1','3','7','7']]) {
            expect(() => compileSubset(r, formula, { kind: 'drop-2', toneIds })).toThrow();
        }
        expect(() => compileSubset(r, formula.slice(0,3), { kind: 'drop-2' })).toThrow();
        expect(() => compileSubset(r, formula, { kind: 'close-position', toneIds: ['1','3'] })).toThrow();
        expect(() => compileSubset(r, formula, { kind: 'close-position', toneIds: ['1','3','5','bogus'] })).toThrow();
        expect(() => compileSubset({ ...r, minDistinctPitchClasses: 4 }, formula, { kind: 'close-position', toneIds: ['1','3','7'] })).toThrow();
    });
});
