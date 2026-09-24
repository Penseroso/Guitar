"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { createHarmonyPlayback, type HarmonyPlaybackState } from '@/domain/harmony/audition';
import type { RelationExample } from '@/domain/harmony/types';

const IDLE: HarmonyPlaybackState = { playing: false, error: null, step: null };

export function useHarmonyAudio() {
    const [state, setState] = useState<HarmonyPlaybackState>(IDLE);
    const [loading, setLoading] = useState(false);
    const requestRef = useRef(0);
    const [playback] = useState(() => createHarmonyPlayback(
        async () => (await import('@/utils/audio/audioEngine')).audioEngine,
        next => {
            setState(next);
            if (next.step !== null) setLoading(false);
        },
    ));

    const cancel = useCallback(() => {
        requestRef.current += 1;
        playback.cancel();
        setLoading(false);
        setState(IDLE);
    }, [playback]);

    useEffect(() => () => playback.cancel(), [playback]);

    const play = useCallback(async (example: RelationExample, guidesOnly: boolean) => {
        const request = ++requestRef.current;
        setLoading(true);
        try {
            await playback.play(example, guidesOnly);
        } catch (error) {
            if (request === requestRef.current) setState({ playing: false, error: error instanceof Error ? error.message : 'Audio could not start.', step: null });
        } finally {
            if (request === requestRef.current) setLoading(false);
        }
    }, [playback]);

    return { play, cancel, loading, ...state };
}
