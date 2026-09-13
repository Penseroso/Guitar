export type EngineErrorCode = 'invalid-request' | 'conflicting-constraints' | 'unsupported-request'
    | 'invalid-view' | 'stale-cursor' | 'contract-error' | 'resource-exhausted'
    | 'worker-unavailable' | 'worker-failed' | 'transport-error';

export class EngineError extends Error {
    constructor(public readonly code: EngineErrorCode, message: string, public readonly field?: string) {
        super(message);
        this.name = 'EngineError';
    }
}

export interface EngineDiagnostic { code: EngineErrorCode; message: string; field?: string }
export function diagnostic(error: unknown): EngineDiagnostic {
    return error instanceof EngineError
        ? { code: error.code, message: error.message, field: error.field }
        : { code: 'contract-error', message: error instanceof Error ? error.message : 'Engine contract failed.' };
}
