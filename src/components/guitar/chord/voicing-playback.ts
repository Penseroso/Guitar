import { getExplorationPlaybackNotes, type ExplorationCandidate } from '@/domain/chord/exploration';

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
    return {
        cancel() { request += 1; },
        async play(candidate: ExplorationCandidate) {
            const token = ++request;
            onState({ error: null, loadingCandidateId: candidate.voicing.id });
            let error: string | null = null;
            try {
                const engine = await loadEngine();
                if (token !== request) return;
                await engine.start();
                if (token === request) engine.playChord(getExplorationPlaybackNotes(candidate));
            } catch {
                error = 'Audio could not start. Select Play voicing to try again.';
            } finally {
                if (token === request) onState({ error, loadingCandidateId: null });
            }
        },
    };
}
