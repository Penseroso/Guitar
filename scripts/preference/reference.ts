import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import path from 'node:path';
import type { NotatedBeat } from './frames';

export interface ReferenceResult { ok: boolean; error?: string; beats: NotatedBeat[]; excluded: string[]; roundtrip: NotatedBeat[] | null }
export function openReference(python: string, decoder: string) {
    const child = spawn(path.resolve(python), [path.resolve('scripts/preference/reference_decoder.py'), path.resolve(decoder)], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let pending: { resolve: (value: ReferenceResult) => void; reject: (error: Error) => void } | undefined;
    let failure: Error | undefined;
    child.stderr.on('data', data => process.stderr.write(data));
    const fail = (error: Error) => { failure = error; pending?.reject(error); pending = undefined; };
    child.on('error', fail);
    child.on('exit', code => fail(Error(`Reference process exited: ${code}`)));
    createInterface({ input: child.stdout }).on('line', line => {
        try { const value = JSON.parse(line) as ReferenceResult; pending?.resolve(value); pending = undefined; }
        catch { fail(Error('Reference returned invalid JSON')); }
    });
    return {
        decode(request: { path?: string; text?: string; roundtrip?: boolean }): Promise<ReferenceResult> {
            if (failure) return Promise.reject(failure);
            if (pending) return Promise.reject(Error('Reference requests must be sequential'));
            return new Promise((resolve, reject) => { pending = { resolve, reject }; child.stdin.write(JSON.stringify(request) + '\n'); });
        },
        close() { child.stdin.end(); },
    };
}
