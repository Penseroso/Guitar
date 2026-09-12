import { PROTOCOL, family, knownArtist, rng, type Candidate, type Observation } from './protocol';

interface Support { songs: Set<string>; artists: Set<string> }
interface Evidence {
    support: Support; shapes: Map<string, Support>; features: Map<string, Map<string, number>>;
}
export interface Profile { queries: Map<string, Evidence>; genres: Map<string, Evidence>; families: Set<string> }
export type Method = 'shape' | 'conditional-shape' | 'features' | 'genre' | 'shuffled-genre' | 'diversity';
export const METHODS: Method[] = ['shape', 'conditional-shape', 'features', 'genre', 'shuffled-genre', 'diversity'];
const support = (): Support => ({ songs: new Set(), artists: new Set() });
const evidence = (): Evidence => ({ support: support(), shapes: new Map(), features: new Map() });
function addSupport(item: Support, row: Observation) {
    item.songs.add(row.songGroupId);
    if (knownArtist(row.artistToken)) item.artists.add(row.artistGroupId);
}
export function features(c: Candidate) {
    return { position: c.minFret < 6 ? 'low' : c.minFret < 11 ? 'middle' : 'high',
        open: String(Math.min(c.open, 2)), strings: String(c.strings), bass: c.bass, top: c.top,
        register: String(Math.floor(c.topMidi / 12)) };
}

export function shuffledGenres(rows: Observation[]): Map<string, string[]> {
    const groups = new Map<string, Set<string>>();
    for (const row of rows.filter(r => knownArtist(r.artistToken))) {
        const tags = groups.get(row.artistGroupId) ?? new Set<string>();
        row.genreTokens.forEach(tag => tags.add(tag)); groups.set(row.artistGroupId, tags);
    }
    const artists = [...groups].map(([id, tags]) => [id, [...tags].sort()] as const).sort(([a], [b]) => a.localeCompare(b));
    const labels = artists.map(([, tags]) => tags);
    const random = rng(PROTOCOL.seed + ':genre-permutation');
    for (let i = labels.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [labels[i], labels[j]] = [labels[j], labels[i]]; }
    const shuffled = new Map(artists.map(([artist], i) => [artist, labels[i]]));
    return new Map(rows.filter(r => knownArtist(r.artistToken)).map(row => [row.artistToken, shuffled.get(row.artistGroupId)!]));
}

export function fit(rows: Observation[], pools: Map<string, Candidate[]>, genres?: Map<string, string[]>): Profile {
    const result: Profile = { queries: new Map(), genres: new Map(), families: new Set() };
    const candidates = new Map([...pools].map(([q, list]) => [q, new Map(list.map(c => [c.signature, c]))]));
    const add = (map: Map<string, Evidence>, key: string, row: Observation) => {
        const query = map.get(key) ?? evidence(); map.set(key, query); addSupport(query.support, row);
        const shape = query.shapes.get(row.signature) ?? support(); addSupport(shape, row); query.shapes.set(row.signature, shape);
        const candidate = candidates.get(row.query)?.get(row.signature);
        if (candidate) for (const [name, value] of Object.entries(features(candidate))) {
            const histogram = query.features.get(name) ?? new Map();
            histogram.set(value, (histogram.get(value) ?? 0) + 1); query.features.set(name, histogram);
        }
    };
    for (const row of rows) {
        result.families.add(row.chordId + ':' + family(row.frets));
        add(result.queries, row.query, row);
        for (const genre of genres?.get(row.artistToken) ?? row.genreTokens) {
            if (genre !== 'genre:unknown_genre') add(result.genres, row.query + '|' + genre, row);
        }
    }
    return result;
}
function supported(query: Evidence | undefined) {
    return !!query && query.support.songs.size >= PROTOCOL.minQuerySongs && query.support.artists.size >= PROTOCOL.minQueryArtists;
}
export function hasQuerySupport(profile: Profile, query: string, genre?: string) {
    return supported(genre ? profile.genres.get(query + '|' + genre) : profile.queries.get(query));
}
function shapeEvidence(query: Evidence, c: Candidate) {
    const item = query.shapes.get(c.signature);
    if (!item || item.songs.size < PROTOCOL.minShapeSongs || item.artists.size < PROTOCOL.minShapeArtists) return 0;
    return Math.log1p(item.songs.size) / Math.log1p(query.support.songs.size);
}

/** No input is removed. Unknown evidence contributes zero, not negative relevance. */
export function rankPreference(candidates: Candidate[], query: string, profile: Profile, method: Method, alpha: number, genre?: string): Candidate[] {
    if (!alpha || !candidates.length) return candidates.slice();
    if (method === 'diversity') {
        const remaining = candidates.map((candidate, index) => ({ candidate, index })), chosen: Candidate[] = [];
        const similarities = new Float64Array(candidates.length);
        while (remaining.length && chosen.length < 18) {
            let best = 0, value = -Infinity;
            for (let i = 0; i < remaining.length; i++) {
                const item = remaining[i];
                const score = item.candidate.score - alpha * 100 * similarities[item.index];
                if (score > value) { value = score; best = i; }
            }
            const previous = remaining.splice(best, 1)[0].candidate; chosen.push(previous);
            for (const item of remaining) {
                const c = item.candidate;
                const similarity = (Number(c.family === previous.family) + Number(c.strings === previous.strings)
                    + Number(c.bass === previous.bass) + Number(Math.abs(c.minFret - previous.minFret) < 3)) / 4;
                similarities[item.index] = Math.max(similarities[item.index], similarity);
            }
        }
        return [...chosen, ...remaining.map(item => item.candidate)];
    }
    const general = profile.queries.get(query);
    if (!supported(general)) return candidates.slice();
    const specific = genre ? profile.genres.get(query + '|' + genre) : undefined;
    const evidence = (method === 'genre' || method === 'shuffled-genre') && supported(specific) ? specific! : general!;
    return candidates.map((candidate, index) => {
        let residual = shapeEvidence(evidence, candidate);
        if (method === 'features') {
            const terms = Object.entries(features(candidate)).map(([name, value]) => {
                const histogram = evidence.features.get(name);
                if (!histogram?.has(value)) return 0;
                const total = [...histogram.values()].reduce((a, b) => a + b, 0);
                return (histogram.get(value)! + 1) / (total + histogram.size);
            });
            residual = terms.reduce((a, b) => a + b, 0) / terms.length;
        }
        // Fixed score scale: it does not depend on a filter's current candidate count.
        return { candidate, index, value: candidate.score + alpha * 100 * residual };
    }).sort((a, b) => b.value - a.value || a.index - b.index).map(item => item.candidate);
}
