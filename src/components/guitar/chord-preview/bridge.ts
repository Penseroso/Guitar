import type { VoicingCandidate } from '../../../utils/guitar/chords';

export type BridgeSelectionSource = 'requested' | 'first-playable' | 'first-ranked' | 'none';

export interface BridgeSelectionResolution {
    activeCandidate: VoicingCandidate | null;
    activeCandidateId: string | null;
    activeIndex: number;
    hasPlayableCandidates: boolean;
    selectionSource: BridgeSelectionSource;
}

export interface ActiveVoicingChangePayload extends BridgeSelectionResolution {
    candidateCount: number;
    chordType: string;
    selectedKey: number;
}

export function getBridgeSelectionKey(chordType: string, selectedKey: number): string {
    return `${chordType}::${selectedKey}`;
}

export function resolveBridgeSelection(
    candidates: VoicingCandidate[],
    requestedCandidateId?: string | null
): BridgeSelectionResolution {
    if (candidates.length === 0) {
        return {
            activeCandidate: null,
            activeCandidateId: null,
            activeIndex: -1,
            hasPlayableCandidates: false,
            selectionSource: 'none',
        };
    }

    if (requestedCandidateId) {
        const requestedIndex = candidates.findIndex((candidate) => candidate.voicing.id === requestedCandidateId);

        if (requestedIndex >= 0) {
            const requestedCandidate = candidates[requestedIndex];

            return {
                activeCandidate: requestedCandidate,
                activeCandidateId: requestedCandidate.voicing.id,
                activeIndex: requestedIndex,
                hasPlayableCandidates: candidates.some((candidate) => candidate.voicing.playable),
                selectionSource: 'requested',
            };
        }
    }

    const firstPlayableIndex = candidates.findIndex((candidate) => candidate.voicing.playable);
    const resolvedIndex = firstPlayableIndex >= 0 ? firstPlayableIndex : 0;
    const resolvedCandidate = candidates[resolvedIndex];

    return {
        activeCandidate: resolvedCandidate,
        activeCandidateId: resolvedCandidate.voicing.id,
        activeIndex: resolvedIndex,
        hasPlayableCandidates: firstPlayableIndex >= 0,
        selectionSource: firstPlayableIndex >= 0 ? 'first-playable' : 'first-ranked',
    };
}

export function getReasonPreview(reasons: string[], limit = 3): string[] {
    return Array.from(new Set(reasons.map((reason) => reason.trim()).filter(Boolean))).slice(0, limit);
}
