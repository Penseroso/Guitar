"use client";

import { useEffect, useState } from 'react';
import type { ChordPlayingContext } from '@/domain/chord/exploration';
import type { ExplorationWorkerResponse } from './chord-exploration.worker';

export function useChordExploration(enabled: boolean, chordId: string, rootPitchClass: number, context: ChordPlayingContext) {
    const [attempt, setAttempt] = useState(0);
    const key = JSON.stringify([chordId, rootPitchClass, context, attempt]);
    const [result, setResult] = useState<{ key: string; response: ExplorationWorkerResponse } | null>(null);

    useEffect(() => {
        if (!enabled) return;
        let active = true;
        let worker: Worker | undefined;
        const fail = () => {
            if (active) setResult({ key, response: { status: 'error', message: 'Voicing search could not start. Try again.' } });
        };
        try {
            worker = new Worker(new URL('./chord-exploration.worker.ts', import.meta.url));
            worker.onmessage = ({ data }: MessageEvent<ExplorationWorkerResponse>) => {
                if (active) setResult({ key, response: data });
            };
            worker.onerror = fail;
            worker.onmessageerror = fail;
            worker.postMessage({ chordId, rootPitchClass, context });
        } catch {
            // Same asynchronous state transition as a worker error.
            queueMicrotask(fail);
        }
        return () => { active = false; worker?.terminate(); };
    }, [enabled, chordId, rootPitchClass, context, key]);

    return {
        response: enabled && result?.key === key ? result.response : null,
        retry: () => setAttempt((value) => value + 1),
    };
}
