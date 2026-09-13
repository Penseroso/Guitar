import type { Six } from './types';

/** A flat-contact hypothesis only: open/lower stopped targets block an interval.
 * Unplayed strings and higher stops do not prove achieved damping or fingering. */
export function flatContactCompatible(states: Six<number>, fret: number, left: number, right: number): boolean {
    for (let string = left; string <= right; string++) if (states[string] >= 0 && states[string] < fret) return false;
    return true;
}

/** partial-cover-v1: exact minimum cover among the pinned interval hypotheses
 * and singles. This is a model group estimate, never an anatomical finger count. */
export function partialCoverGroups(states: Six<number>): number {
    let total = 0;
    for (let first = 0; first < 6; first++) {
        const fret = states[first];
        if (fret <= 0 || states.slice(0, first).includes(fret)) continue;
        const strings = states.flatMap((f, s) => f === fret ? [s] : []);
        const full = (1 << strings.length) - 1;
        const hypotheses = strings.map((_, i) => 1 << i);
        for (let left = 0; left < strings.length; left++) for (let right = left + 1; right < strings.length; right++) {
            if (flatContactCompatible(states, fret, strings[left], strings[right])) hypotheses.push(((1 << (right - left + 1)) - 1) << left);
        }
        const costs = new Uint8Array(full + 1).fill(7); costs[0] = 0;
        for (let mask = 0; mask <= full; mask++) for (const hypothesis of hypotheses) {
            costs[mask | hypothesis] = Math.min(costs[mask | hypothesis], costs[mask] + 1);
        }
        total += costs[full];
    }
    return total;
}
