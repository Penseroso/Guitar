import type { Six, StringState } from './types';
import { EngineError } from './errors';
import { integer } from './validation';

export function sixIntegers(value: unknown, low: number, high: number, field: string): Six<number> {
    if (!Array.isArray(value) || value.length !== 6) throw new EngineError('invalid-request', `${field} requires six values.`, field);
    return value.map((v, i) => integer(v, low, high, `${field}[${i}]`)) as unknown as Six<number>;
}
export function allocationId(tuning: Six<number>, states: Six<StringState>): string {
    sixIntegers(tuning, 0, 127, 'tuning'); sixIntegers(states, -1, 36, 'states');
    if (states.some((f, s) => f >= 0 && tuning[s] + f > 127)) throw new EngineError('invalid-request', 'Sounding MIDI exceeds 127.');
    return `shape-v1:${tuning.join(',')}:${states.join(',')}`;
}
export function parseAllocationId(id: string): { tuning: Six<number>; states: Six<StringState> } {
    if (typeof id !== 'string') throw new EngineError('invalid-request', 'Allocation ID must be a string.');
    const match = /^shape-v1:([\d,]+):([-\d,]+)$/.exec(id);
    if (!match) throw new EngineError('invalid-request', 'Invalid allocation ID.');
    const tuning = sixIntegers(match[1].split(',').map(Number), 0, 127, 'tuning');
    const states = sixIntegers(match[2].split(',').map(Number), -1, 36, 'states');
    if (allocationId(tuning, states) !== id) throw new EngineError('invalid-request', 'Noncanonical allocation ID.');
    return { tuning, states };
}
