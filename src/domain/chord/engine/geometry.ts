import { integer } from './validation';
import { WIRE_REMAINDER_Q } from './geometryTable';

/** Per-profile setup only. Inner scans use integer lookup, never powers or BigInt. */
export function createGeometry(scaleLengthUm: number) {
    integer(scaleLengthUm, 1, 2000000, 'scaleLengthUm');
    const spans = new Int32Array(37 * 37);
    for (let lo = 0; lo <= 36; lo++) for (let hi = lo; hi <= 36; hi++) {
        const product = BigInt(scaleLengthUm) * BigInt(WIRE_REMAINDER_Q[lo] - WIRE_REMAINDER_Q[hi]);
        const distance = Number((product + 500000000000n) / 1000000000000n);
        spans[lo * 37 + hi] = spans[hi * 37 + lo] = distance;
    }
    return Object.freeze({
        scaleLengthUm,
        span(low: number, high: number): number {
            integer(low, 0, 36, 'low fret'); integer(high, 0, 36, 'high fret');
            return spans[low * 37 + high];
        },
        stoppedSpan(states: readonly number[]): number {
            let low = 37, high = 0;
            for (const fret of states) if (fret > 0) { low = Math.min(low, fret); high = Math.max(high, fret); }
            return high ? spans[low * 37 + high] : 0;
        },
    });
}
export type Geometry = ReturnType<typeof createGeometry>;
