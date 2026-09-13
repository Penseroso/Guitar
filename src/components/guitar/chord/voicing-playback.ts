import { getPlaybackMidi,midiNoteLabel } from '@/domain/chord/engine/presentation';
import type { PresentationCandidate } from '@/domain/chord/engine/types';

interface VoicingAudioEngine {
    start(): Promise<void>;
    playChord(notes: string[]): void;
}

export interface VoicingPlaybackState {
    error: string | null;
    loadingCandidateId: string | null;
}

export function createVoicingPlayback(
    loadEngine: () => Promise<VoicingAudioEngine>,
    onState: (state: VoicingPlaybackState) => void,
) {
    let request = 0;
    async function playMidi(id: string, midiNotes: number[]) {
        const token = ++request;
        onState({ error: null, loadingCandidateId: id });
        let error: string | null = null;
        try {
            const engine = await loadEngine();
            if (token !== request) return;
            await engine.start();
            if (token === request) engine.playChord(midiNotes.map(midiNoteLabel));
        } catch {
            error = 'Audio could not start. Select Play to try again.';
        } finally {
            if (token === request) onState({ error, loadingCandidateId: null });
        }
    }
    return {
        cancel() { request += 1; },
        playMidi,
        async play(candidate: PresentationCandidate) {
            await playMidi(candidate.candidate.allocationId, getPlaybackMidi(candidate));
        },
    };
}
