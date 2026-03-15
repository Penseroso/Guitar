/**
 * useAudio.ts
 * React hook that bridges the UI to the audio engine.
 * Handles browser AudioContext policy by calling Tone.start() on first interaction.
 */

import { useCallback, useRef } from 'react';
import { audioEngine } from '../utils/audio/audioEngine';
import { resolveChordToPitches } from '../utils/audio/pitchResolver';

export function useAudio() {
    const startedRef = useRef(false);

    /**
     * Initializes the AudioContext on the first call (required by browser policy),
     * then resolves the chord to concrete pitches and triggers playback.
     *
     * @param root      Pitch class of the chord root (0 = C … 11 = B).
     * @param intervals Array of semitone intervals from the root (must include 0).
     */
    const triggerChordPlay = useCallback(async (root: number, intervals: number[]) => {
        if (!startedRef.current) {
            await audioEngine.start();
            startedRef.current = true;
        }

        // Ensure root interval (0) is present — guard against sparse tone arrays
        const fullIntervals = intervals.includes(0) ? intervals : [0, ...intervals];

        const pitches = resolveChordToPitches(root, fullIntervals);
        audioEngine.playChord(pitches);
    }, []);

    return { triggerChordPlay, isAudioReady: audioEngine.isReady };
}
