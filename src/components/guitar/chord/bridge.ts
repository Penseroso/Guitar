import type { VoicingCandidate } from '@/domain/chord';

export type BridgeSelectionSource = 'requested' | 'first-available' | 'none';

export interface BridgeSelectionResolution<Candidate extends VoicingCandidate = VoicingCandidate> {
    activeCandidate: Candidate | null;
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

export function resolveBridgeSelection<Candidate extends VoicingCandidate>(
    candidates: Candidate[],
    requestedCandidateId?: string | null
): BridgeSelectionResolution<Candidate> {
    // The bridge does not impose ranking or browsing policy. It trusts the caller's
    // full candidate pool; display limits and filters do not replace selection.
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

    const resolvedCandidate = candidates[0];

    return {
        activeCandidate: resolvedCandidate,
        activeCandidateId: resolvedCandidate.voicing.id,
        activeIndex: 0,
        hasPlayableCandidates: candidates.some((candidate) => candidate.voicing.playable),
        selectionSource: 'first-available',
    };
}

export function getReasonPreview(reasons: string[], limit = 3): string[] {
    return Array.from(new Set(reasons.map((reason) => reason.trim()).filter(Boolean))).slice(0, limit);
}
