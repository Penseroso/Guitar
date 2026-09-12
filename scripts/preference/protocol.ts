import { createHash } from 'node:crypto';

export const PROTOCOL = {
    version: 'chord-preference-v1', baseline: '3dc7ef8', seed: 'chord-preference-v1', folds: 5,
    alphas: [0, 0.1, 0.25, 0.5], minShapeSongs: 5, minShapeArtists: 3,
    minQuerySongs: 30, minQueryArtists: 10, practicalRecallGain: 0.03,
    practicalNdcgRelativeGain: 0.05, maxRecallLoss: 0.02, bootstrapIterations: 1000,
    minSliceSongs: 30, minSliceArtists: 10,
    pilotPlayers: 4, evaluationPlayers: 24, targetTimeReduction: 0.15, successNonInferiority: 0.05,
} as const;

export function hash(text: string) { return createHash('sha256').update(text).digest('hex'); }
export function bucket(text: string, modulo: number = PROTOCOL.folds) { return parseInt(hash(text).slice(0, 8), 16) % modulo; }
export type Frets = Array<number | null>;
export const tuning = [64, 59, 55, 50, 45, 40];
export function signature(frets: Frets) { return frets.map(fret => fret === null ? 'x' : fret).join(','); }
export function family(frets: Frets) {
    if (frets.includes(0)) return 'open:' + signature(frets);
    const stopped = frets.filter((fret): fret is number => fret !== null && fret > 0);
    const min = stopped.length ? Math.min(...stopped) : 0;
    return 'closed:' + signature(frets.map(fret => fret === null ? null : fret - min));
}

export interface Observation {
    query: string; chordId: string; rootPitchClass: number; signature: string; frets: Frets;
    songGroupId: string; artistGroupId: string; artistToken: string; genreTokens: string[];
    songSplit?: string; artistSplit?: string;
}
export function knownArtist(value: string) { return value !== 'artist:unknown_artist' && value !== ''; }

/** Connected components prevent a song appearing in another artist's calibration path. */
export function assignComponents(rows: Array<Pick<Observation, 'songGroupId' | 'artistGroupId' | 'artistToken'> & { bodyHash?: string; fileHash?: string }>): Map<string, string> {
    const parent = new Map<string, string>();
    const find = (key: string): string => {
        if (!parent.has(key)) parent.set(key, key);
        let root = key;
        while (parent.get(root) !== root) root = parent.get(root)!;
        while (parent.get(key) !== key) { const next = parent.get(key)!; parent.set(key, root); key = next; }
        return root;
    };
    const join = (left: string, right: string) => {
        const a = find(left), b = find(right);
        if (a !== b) parent.set(a < b ? b : a, a < b ? a : b);
    };
    for (const row of rows) {
        join('song:' + row.songGroupId, 'group:' + row.artistGroupId);
        if (knownArtist(row.artistToken)) join('song:' + row.songGroupId, 'artist:' + row.artistToken);
        if (row.bodyHash) join('song:' + row.songGroupId, 'body:' + row.bodyHash);
        if (row.fileHash) join('song:' + row.songGroupId, 'file:' + row.fileHash);
    }
    return new Map(rows.map(row => [row.songGroupId, hash(find('song:' + row.songGroupId))]));
}

export function partition(component: string, testFold: number) {
    const fold = bucket(PROTOCOL.seed + ':' + component);
    return fold === testFold ? 'test' : fold === (testFold + 1) % PROTOCOL.folds ? 'calibration' : 'fit';
}

export interface Candidate {
    signature: string; family: string; score: number; minFret: number; maxFret: number;
    bass: string; top: string; bassMidi: number; topMidi: number; strings: number; open: number;
    omissions: number; uncertain: boolean;
}
export interface Condition { id: string; accepts: (candidate: Candidate) => boolean }
export const CONDITIONS: Condition[] = [
    { id: 'all', accepts: () => true },
    { id: 'high-11-15', accepts: c => c.minFret >= 11 && c.maxFret <= 15 },
    { id: 'three-strings', accepts: c => c.strings === 3 },
    { id: 'bass-third', accepts: c => c.bass === '3' },
    { id: 'top-flat-seventh', accepts: c => c.top === 'b7' },
    { id: 'no-open', accepts: c => c.open === 0 },
];

export function rng(seed: string) {
    let state = parseInt(hash(seed).slice(0, 8), 16);
    return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}

export interface RankedObservation {
    song: string; artist: string; query: string; signature: string; rank: number; baselineRank: number;
    condition: string; high: boolean; unseen: boolean; unseenFamily: boolean; genre: string;
}

/** Both denominators retain ungenerated targets. NDCG uses all observed target relevances. */
export function metrics(rows: RankedObservation[], baseline = false, weights?: Map<string, number>) {
    const songs = new Map<string, { count: number; hit6: number; hit18: number; weight: number }>();
    const queries = new Map<string, Map<string, { relevance: number; rank: number }>>();
    let reachable = 0, total = 0;
    for (const row of rows) {
        const weight = weights?.get(row.artist) ?? (weights ? 0 : 1);
        if (weight === 0) continue;
        const rank = baseline ? row.baselineRank : row.rank;
        const song = songs.get(row.song) ?? { count: 0, hit6: 0, hit18: 0, weight };
        song.count++; song.hit6 += Number(rank <= 6); song.hit18 += Number(rank <= 18); songs.set(row.song, song);
        const query = queries.get(row.query) ?? new Map();
        const item = query.get(row.signature) ?? { relevance: 0, rank };
        item.relevance += weight; query.set(row.signature, item); queries.set(row.query, query);
        total += weight; reachable += Number(Number.isFinite(rank)) * weight;
    }
    let songWeight = 0, recall6 = 0, recall18 = 0, ndcg6 = 0;
    for (const song of songs.values()) {
        songWeight += song.weight; recall6 += song.weight * song.hit6 / song.count; recall18 += song.weight * song.hit18 / song.count;
    }
    for (const query of queries.values()) {
        const items = [...query.values()];
        const dcg = items.reduce((sum, item) => sum + (item.rank <= 6 ? item.relevance / Math.log2(item.rank + 1) : 0), 0);
        const ideal = items.map(item => item.relevance).sort((a, b) => b - a).slice(0, 6)
            .reduce((sum, value, index) => sum + value / Math.log2(index + 2), 0);
        ndcg6 += ideal ? dcg / ideal : 0;
    }
    return { observations: rows.length, songs: songs.size, artists: new Set(rows.map(r => r.artist)).size,
        queries: queries.size, recall6: recall6 / (songWeight || 1), recall18: recall18 / (songWeight || 1),
        ndcg6: ndcg6 / (queries.size || 1), reachable: reachable / (total || 1) };
}

export function bootstrap(rows: RankedObservation[], iterations: number = PROTOCOL.bootstrapIterations) {
    const artists = [...new Set(rows.map(row => row.artist))].sort();
    const random = rng(PROTOCOL.seed + ':bootstrap');
    const recall: number[] = [], ndcg: number[] = [], deeper: number[] = [];
    if (artists.length < 2) return null;
    const artistIndex = new Map(artists.map((artist, i) => [artist, i]));
    const songs = new Map<string, { artist: number; count: number; recall: number; deeper: number }>();
    const queries = new Map<string, Map<string, { rank: number; baseline: number; counts: Map<number, number> }>>();
    for (const row of rows) {
        const artist = artistIndex.get(row.artist)!;
        const song = songs.get(row.song) ?? { artist, count: 0, recall: 0, deeper: 0 };
        song.count++; song.recall += Number(row.rank <= 6) - Number(row.baselineRank <= 6);
        song.deeper += Number(row.rank <= 18) - Number(row.baselineRank <= 18); songs.set(row.song, song);
        const query = queries.get(row.query) ?? new Map();
        const item = query.get(row.signature) ?? { rank: row.rank, baseline: row.baselineRank, counts: new Map<number, number>() };
        if (item.rank !== row.rank || item.baseline !== row.baselineRank) throw Error('A metric context contains inconsistent rankings');
        item.counts.set(artist, (item.counts.get(artist) ?? 0) + 1); query.set(row.signature, item); queries.set(row.query, query);
    }
    const songItems = [...songs.values()];
    const queryItems = [...queries.values()].map(query => [...query.values()].map(item => ({
        gain: (item.rank <= 6 ? 1 / Math.log2(item.rank + 1) : 0) - (item.baseline <= 6 ? 1 / Math.log2(item.baseline + 1) : 0),
        counts: [...item.counts.entries()],
    })));
    for (let iteration = 0; iteration < iterations; iteration++) {
        const weights = new Float64Array(artists.length);
        for (let n = 0; n < artists.length; n++) weights[Math.floor(random() * artists.length)]++;
        let songWeight = 0, recallDelta = 0, deeperDelta = 0, queryCount = 0, ndcgDelta = 0;
        for (const song of songItems) {
            const weight = weights[song.artist]; songWeight += weight;
            recallDelta += weight * song.recall / song.count; deeperDelta += weight * song.deeper / song.count;
        }
        for (const query of queryItems) {
            let dcgDelta = 0;
            const relevances = query.map(item => {
                let relevance = 0;
                for (const [artist, count] of item.counts) relevance += weights[artist] * count;
                dcgDelta += relevance * item.gain; return relevance;
            }).sort((a, b) => b - a);
            const ideal = relevances.slice(0, 6).reduce((sum, value, i) => sum + value / Math.log2(i + 2), 0);
            if (ideal) { queryCount++; ndcgDelta += dcgDelta / ideal; }
        }
        recall.push(recallDelta / (songWeight || 1)); ndcg.push(ndcgDelta / (queryCount || 1)); deeper.push(deeperDelta / (songWeight || 1));
    }
    const interval = (values: number[]) => { values.sort((a, b) => a - b); return [values[Math.floor(iterations * .025)], values[Math.min(iterations - 1, Math.floor(iterations * .975))]]; };
    const p = (values: number[]) => (1 + values.filter(value => value <= 0).length) / (iterations + 1);
    return { iterations, recall6Delta95: interval(recall), ndcg6Delta95: interval(ndcg), recall18Delta95: interval(deeper),
        recallP: p(recall), ndcgP: p(ndcg) };
}

export function holm(pValues: number[]) {
    const ordered = pValues.map((p, index) => ({ p, index })).sort((a, b) => a.p - b.p);
    const accepted = pValues.map(() => false);
    for (let i = 0; i < ordered.length; i++) {
        if (ordered[i].p > .05 / (ordered.length - i)) break;
        accepted[ordered[i].index] = true;
    }
    return accepted;
}
