/**
 * Progression-only audio hook for inspector chord preview.
 * Keeps browser AudioContext startup lazy and delegates synthesis to the shared engine.
 */

import { useCallback, useRef } from 'react';
import { audioEngine } from '../../../utils/audio/audioEngine';
import { resolveProgressionChordPitches } from '../utils/resolveProgressionChordPitches';

export function useProgressionAudio() {
    const startedRef = useRef(false);

    const playProgressionChord = useCallback(async (root: number, intervals: number[]) => {
        if (!startedRef.current) {
            await audioEngine.start();
            startedRef.current = true;
        }

        // Progression preview always expects the chord root to be present.
        const fullIntervals = intervals.includes(0) ? intervals : [0, ...intervals];
        const pitches = resolveProgressionChordPitches(root, fullIntervals);
        audioEngine.playChord(pitches);
    }, []);

    return { playProgressionChord, isAudioReady: audioEngine.isReady };
}
