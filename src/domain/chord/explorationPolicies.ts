import type { ExplorationCandidate } from './exploration';

/** Comparison policies for offline evaluation only. The UI uses the unchanged baseline order. */
export type ExplorationSurfacePolicy =
    | { kind: 'baseline' }
    | { kind: 'near-position'; targetFret: number }
    | { kind: 'diverse' };

function difference(a: ExplorationCandidate, b: ExplorationCandidate): number {
    const left = a.facts;
    const right = b.facts;
    return (
        Math.min(1, Math.abs(left.bassMidi - right.bassMidi) / 12)
        + Math.min(1, Math.abs(left.topMidi - right.topMidi) / 12)
        + Number(left.bassDegree !== right.bassDegree)
        + Number(left.topDegree !== right.topDegree)
        + Math.abs(left.playedStrings.length - right.playedStrings.length) / 4
        + Number(left.omittedDegrees.join(',') !== right.omittedDegrees.join(','))
    ) / 6;
}

export function selectExplorationSurface(ranked: ExplorationCandidate[], budget: number, policy: ExplorationSurfacePolicy): ExplorationCandidate[] {
    const limit = Number.isFinite(budget) ? Math.max(0, Math.floor(budget)) : 0;
    if (limit === 0) return [];
    if (policy.kind === 'baseline') return ranked.slice(0, limit);
    if (policy.kind === 'near-position') {
        if (!Number.isFinite(policy.targetFret)) throw new Error('Position requires a finite target fret.');
        const distance = (candidate: ExplorationCandidate) => Math.abs(
            (candidate.facts.minStoppedFret + candidate.facts.maxStoppedFret) / 2 - policy.targetFret);
        return [...ranked].sort((a, b) => distance(a) - distance(b)).slice(0, limit);
    }
    // A bounded comparison policy: retain the first choice and diversify only within the
    // best 2K candidates. This quality bound may limit high-register coverage; measure it.
    const pool = ranked.slice(0, limit * 2);
    const selected: ExplorationCandidate[] = [];
    while (pool.length && selected.length < limit) {
        let best = 0;
        let bestDistance = -1;
        for (let index = 0; index < pool.length; index++) {
            const novelty = selected.length ? Math.min(...selected.map((item) => difference(pool[index], item))) : 0;
            if (novelty > bestDistance) { best = index; bestDistance = novelty; }
        }
        selected.push(...pool.splice(best, 1));
    }
    return selected;
}
