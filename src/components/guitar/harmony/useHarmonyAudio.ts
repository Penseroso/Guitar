"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { createHarmonyPlayback, type HarmonyPlaybackState } from '@/domain/harmony/audition';
import type { RelationExample } from '@/domain/harmony/types';

const IDLE: HarmonyPlaybackState = { playing: false, error: null, step: null };

type HarmonyAudioMode = 'relation' | 'guide' | null;

/** Which control is the active play/stop toggle: the pressed button owns cancel, not a separate Stop control. */
export function useHarmonyAudio() {
    const [state, setState] = useState<HarmonyPlaybackState>(IDLE);
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<HarmonyAudioMode>(null);
    const requestRef = useRef(0);
    const [playback] = useState(() => createHarmonyPlayback(
        async () => (await import('@/utils/audio/audioEngine')).audioEngine,
        next => {
            setState(next);
            if (next.step !== null) setLoading(false);
            if (!next.playing) setMode(null);
        },
    ));

    const cancel = useCallback(() => {
        requestRef.current += 1;
        playback.cancel();
        setLoading(false);
        setMode(null);
        setState(IDLE);
    }, [playback]);

    useEffect(() => () => playback.cancel(), [playback]);

    const play = useCallback(async (example: RelationExample, guidesOnly: boolean) => {
        const request = ++requestRef.current;
        setMode(guidesOnly ? 'guide' : 'relation');
        setLoading(true);
        try {
            await playback.play(example, guidesOnly);
        } catch (error) {
            if (request === requestRef.current) { setState({ playing: false, error: error instanceof Error ? error.message : 'Audio could not start.', step: null }); setMode(null); }
        } finally {
            if (request === requestRef.current) setLoading(false);
        }
    }, [playback]);

    return { play, cancel, loading, mode, ...state };
}
