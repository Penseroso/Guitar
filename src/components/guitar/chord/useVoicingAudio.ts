"use client";

import { useEffect, useRef, useState } from 'react';
import { getExplorationPlaybackNotes, type ExplorationCandidate } from '@/domain/chord/exploration';

export function useVoicingAudio() {
    const request = useRef(0);
    const [error, setError] = useState<string | null>(null);
    const [loadingCandidateId, setLoadingCandidateId] = useState<string | null>(null);
    useEffect(() => () => { request.current += 1; }, []);

    async function play(candidate: ExplorationCandidate) {
        const token = ++request.current;
        setLoadingCandidateId(candidate.voicing.id);
        setError(null);
        try {
            const { audioEngine } = await import('@/utils/audio/audioEngine');
            await audioEngine.start();
            if (token === request.current) audioEngine.playChord(getExplorationPlaybackNotes(candidate));
        } catch {
            if (token === request.current) setError('Audio could not start. Select Play voicing to try again.');
        } finally {
            if (token === request.current) setLoadingCandidateId(null);
        }
    }
    return { play, error, loadingCandidateId };
}
