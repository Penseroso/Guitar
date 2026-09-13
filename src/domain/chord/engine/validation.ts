import { EngineError, type EngineErrorCode } from './errors';

export function record(value: unknown, fields: readonly string[], path: string, code: EngineErrorCode = 'invalid-request'): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new EngineError(code, `${path} must be an object.`, path);
    for (const key of Object.keys(value)) if (!fields.includes(key)) throw new EngineError(code, `Unknown field ${path}.${key}.`, `${path}.${key}`);
    return value as Record<string, unknown>;
}
export function integer(value: unknown, low: number, high: number, path: string, code: EngineErrorCode = 'invalid-request'): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < low || value > high) throw new EngineError(code, `${path} must be an integer in ${low}–${high}.`, path);
    return value;
}
export function choice<T extends string>(value: unknown, choices: readonly T[], path: string, code: EngineErrorCode = 'invalid-request'): T {
    if (typeof value !== 'string' || !choices.includes(value as T)) throw new EngineError(code, `Unsupported ${path}.`, path);
    return value as T;
}
export function boolean(value: unknown, path: string): boolean {
    if (typeof value !== 'boolean') throw new EngineError('invalid-request', `${path} must be boolean.`, path);
    return value;
}
/** Full canonical serialization is the key: cache correctness never depends on hash collisions. */
export function canonical(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
    return JSON.stringify(value);
}
export function freeze<T>(value: T): T {
    if (value && typeof value === 'object') {
        for (const item of Object.values(value)) freeze(item);
        Object.freeze(value);
    }
    return value;
}
