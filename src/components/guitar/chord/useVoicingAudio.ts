"use client";

import { useEffect, useState } from 'react';
import { createVoicingPlayback, type VoicingPlaybackState } from './voicing-playback';

export function useVoicingAudio() {
    const [state, setState] = useState<VoicingPlaybackState>({ error: null, loadingCandidateId: null });
    const [playback] = useState(() => createVoicingPlayback(
        async () => (await import('@/utils/audio/audioEngine')).audioEngine,
        setState,
    ));
    useEffect(() => () => playback.cancel(), [playback]);
    return { play: playback.play, ...state };
}
