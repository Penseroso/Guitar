import { describe, expect, it } from 'vitest';
import { analyzeTabSelection, type TabChordCandidate as BackwardCompatibleCandidate } from './analysis';
import { buildTabChordCandidates, type TabChordCandidate } from './chord-candidates';
import type { TabDocument } from './types';

function oneColumn(midis: number[]): TabDocument {
    return {
        format: 'authored', timing: 'order-only', source: '', tuningMidi: [64, 59, 55, 50, 45, 40], capo: 0, measureCount: 1,
        moments: [{ id: 'm', index: 0, measure: 1, column: 0,
            notes: midis.map((midi, string) => ({ id: `n${string}`, midi, pitchClass: midi % 12, string, fret: 0, source: null })) }],
    };
}

describe('shared TAB chord candidate adapter', () => {
    it('returns no candidates for an empty observation', () => {
        expect(buildTabChordCandidates([])).toEqual([]);
    });

    it('preserves C6 and Am7 as separate complete alternatives in stable order', () => {
        const candidates = buildTabChordCandidates([0, 4, 7, 9]);
        expect(candidates.filter(c => c.match === 'exact')).toEqual([
            { key: '0:major-6', chord: { root: 'C', chordId: 'major-6' }, name: 'C6', omitted: [], added: [], match: 'exact' },
            { key: '9:minor-7', chord: { root: 'A', chordId: 'minor-7' }, name: 'Am7', omitted: [], added: [], match: 'exact' },
        ]);
        expect(candidates.every(c => c.chord.bass === undefined)).toBe(true);
    });

    it('reports an absent optional fifth without adding it to the observed set', () => {
        expect(buildTabChordCandidates([0, 4, 10]).find(c => c.key === '0:dominant-7')).toEqual({
            key: '0:dominant-7', chord: { root: 'C', chordId: 'dominant-7' }, name: 'C7', omitted: ['5'], added: [], match: 'incomplete',
        });
    });

    it('reports full-formula omissions independently of added pitch classes', () => {
        expect(buildTabChordCandidates([0, 4, 10]).find(c => c.key === '0:major')).toMatchObject({ omitted: ['5'], added: [10], match: 'added-tone' });
        expect(buildTabChordCandidates([0, 4, 7, 1]).find(c => c.key === '0:major')).toMatchObject({ omitted: [], added: [1], match: 'added-tone' });
    });

    it('does not invent a missing root or third to force a familiar chord', () => {
        const rootless = buildTabChordCandidates([4, 7, 10]);
        expect(rootless.some(c => c.key === '0:dominant-7')).toBe(false);
        expect(rootless.find(c => c.key === '4:diminished')).toMatchObject({ match: 'exact', name: 'E°' });
        expect(buildTabChordCandidates([0, 7]).some(c => c.key === '0:major')).toBe(false);
    });

    it('retains the existing one-extra-pitch limit and category ordering', () => {
        const candidates = buildTabChordCandidates([0, 4, 7, 9]);
        const priority = { exact: 0, incomplete: 1, 'added-tone': 2 };
        const ranks = candidates.map(c => priority[c.match]);
        expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
        expect(candidates.every(c => c.added.length <= 1)).toBe(true);
        expect(buildTabChordCandidates([0, 4, 7, 1, 6]).some(c => c.key === '0:major')).toBe(false);
    });

    it('matches a two-pitch power formula without imposing the callers occurrence threshold', () => {
        const power = { key: '0:power-5', chord: { root: 'C', chordId: 'power-5' }, name: 'C5', omitted: [], added: [], match: 'exact' };
        expect(buildTabChordCandidates([0, 7]).find(c => c.key === '0:power-5')).toEqual(power);
        expect(buildTabChordCandidates([0, 7, 0]).find(c => c.key === '0:power-5')).toEqual(power);
        const context = { scale: null, chord: null, frame: null };
        const dyad = analyzeTabSelection(oneColumn([60, 67]), { start: 0, end: 0 }, context);
        const doubled = analyzeTabSelection(oneColumn([60, 67, 72]), { start: 0, end: 0 }, context);
        expect(dyad).toMatchObject({ selectionKind: 'dyad', candidates: [] });
        expect(dyad.moments[0].candidates).toEqual([]);
        expect(doubled).toMatchObject({ selectionKind: 'aligned-chord', pitchClasses: [0, 7] });
        expect(doubled.candidates.find(c => c.key === '0:power-5')).toEqual(power);
        expect(doubled.moments[0].candidates).toEqual(doubled.candidates);
    });

    it('preserves the input and returns independent candidate data on each invocation', () => {
        const pcs = Object.freeze([9, 0, 4, 7]) as unknown as number[];
        const before = JSON.stringify(pcs);
        const first = buildTabChordCandidates(pcs);
        const second = buildTabChordCandidates(pcs);
        expect(JSON.stringify(pcs)).toBe(before);
        expect(first).toEqual(second);
        first[0].omitted.push('modified-result');
        first[0].chord.root = 'modified-result';
        expect(second[0].omitted).toEqual([]);
        expect(second[0].chord.root).toBe('C');
        expect(buildTabChordCandidates(pcs)).toEqual(second);
    });

    it('keeps the previous analysis-module candidate type export compatible', () => {
        const candidates: TabChordCandidate[] = buildTabChordCandidates([0, 4, 7]);
        const previousImport: BackwardCompatibleCandidate[] = candidates;
        expect(previousImport.find(c => c.key === '0:major')).toMatchObject({ match: 'exact', name: 'C' });
    });
});
