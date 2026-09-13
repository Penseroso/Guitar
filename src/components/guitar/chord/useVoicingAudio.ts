"use client";

import { useCallback,useEffect, useState } from 'react';
import { createVoicingPlayback, type VoicingPlaybackState } from './voicing-playback';

export function useVoicingAudio() {
    const [state, setState] = useState<VoicingPlaybackState>({ error: null, loadingCandidateId: null });
    const [playback] = useState(() => createVoicingPlayback(
        async () => (await import('@/utils/audio/audioEngine')).audioEngine,
        setState,
    ));
    useEffect(() => () => playback.cancel(), [playback]);
    const cancel=useCallback(()=>{
        playback.cancel();setState({error:null,loadingCandidateId:null});
    },[playback]);
    return { play: playback.play, playMidi: playback.playMidi, cancel, ...state };
}
