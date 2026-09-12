import { expect, it } from 'vitest';
import { assignComponents, bootstrap, metrics, partition, PROTOCOL, rng, type Candidate, type Observation, type RankedObservation } from './protocol';
import { fit, METHODS, rankPreference } from './models';

const candidate = (id: string, score: number): Candidate => ({ signature: id, family: id, score, minFret: 3, maxFret: 5,
    bass: '1', top: '5', bassMidi: 48, topMidi: 67, strings: 3, open: 0, omissions: 0, uncertain: false });
it('connects duplicate bodies and artist aliases before selecting any holdout', () => {
    const records = [
        { songGroupId: 'one', artistGroupId: 'a', artistToken: 'artist:a', bodyHash: 'shared' },
        { songGroupId: 'two', artistGroupId: 'b', artistToken: 'artist:b', bodyHash: 'shared' },
        { songGroupId: 'three', artistGroupId: 'b', artistToken: 'artist:alias', bodyHash: 'other' },
    ];
    const graph = assignComponents(records);
    expect(new Set(graph.values()).size).toBe(1);
    for (let fold = 0; fold < 5; fold++) expect(new Set([...graph.values()].map(component => partition(component, fold))).size).toBe(1);
});
it('uses baseline order for unsupported queries and conserves candidates for every method', () => {
    const pool = [candidate('a', 90), candidate('b', 89), candidate('c', 70)];
    const profile = fit([], new Map([['q', pool]]));
    for (const method of METHODS) {
        const ranked = rankPreference(pool, 'q', profile, method, .5);
        expect(new Set(ranked.map(c => c.signature))).toEqual(new Set(pool.map(c => c.signature)));
        if (method !== 'diversity') expect(ranked).toEqual(pool);
    }
    expect(pool.map(c => c.signature)).toEqual(['a', 'b', 'c']);
});
it('keeps residual scores independent of filtering and preserves unknown shapes', () => {
    const pool = [candidate('unseen', 90), candidate('popular', 89), candidate('other', 70)];
    const rows: Observation[] = Array.from({ length: 40 }, (_, i) => ({ query: 'q', chordId: 'major', rootPitchClass: 0,
        signature: 'popular', frets: [3, 3, 3, null, null, null], songGroupId: 's' + i, artistGroupId: 'a' + i,
        artistToken: 'artist:' + i, genreTokens: [] }));
    const profile = fit(rows, new Map([['q', pool]]));
    const full = rankPreference(pool, 'q', profile, 'shape', .5);
    expect(full[0].signature).toBe('popular');
    expect(full.some(c => c.signature === 'unseen')).toBe(true);
    expect(rankPreference(pool.slice(0, 2), 'q', profile, 'shape', .5)).toEqual(full.filter(c => c.signature !== 'other'));
});
it('retains unreachable observations in recall and ideal ranking denominators', () => {
    const base: RankedObservation = { song: 's', artist: 'a', query: 'q', signature: 'hit', rank: 1, baselineRank: 1,
        condition: 'all', high: false, unseen: false, unseenFamily: false, genre: '' };
    const result = metrics([base, { ...base, signature: 'unreachable', rank: Infinity }]);
    expect(result.recall6).toBe(.5);
    expect(result.reachable).toBe(.5);
    expect(result.ndcg6).toBeGreaterThan(0);
    expect(result.ndcg6).toBeLessThan(1);
});
it('matches a direct paired bootstrap including resampled ideal gains', () => {
    const rows: RankedObservation[] = Array.from({ length: 12 }, (_, i) => ({ song: 's' + i, artist: 'a' + i % 3,
        query: 'q' + i % 2, signature: 'shape' + i % 4, rank: i % 4 + 1, baselineRank: i % 4 + 5,
        condition: 'all', high: false, unseen: false, unseenFamily: false, genre: '' }));
    const iterations = 40, random = rng(PROTOCOL.seed + ':bootstrap');
    const recall: number[] = [], ndcg: number[] = [], deeper: number[] = [];
    for (let i = 0; i < iterations; i++) {
        const weights = new Map<string, number>();
        for (let n = 0; n < 3; n++) { const key = 'a' + Math.floor(random() * 3); weights.set(key, (weights.get(key) ?? 0) + 1); }
        const before = metrics(rows, true, weights), after = metrics(rows, false, weights);
        recall.push(after.recall6 - before.recall6); ndcg.push(after.ndcg6 - before.ndcg6); deeper.push(after.recall18 - before.recall18);
    }
    const interval = (values: number[]) => values.sort((a, b) => a - b).filter((_, i) => i === 1 || i === 39);
    const result = bootstrap(rows, iterations)!;
    for (const [actual, expected] of [[result.recall6Delta95, interval(recall)], [result.ndcg6Delta95, interval(ndcg)], [result.recall18Delta95, interval(deeper)]]) {
        expect(actual[0]).toBeCloseTo(expected[0], 12); expect(actual[1]).toBeCloseTo(expected[1], 12);
    }
});
