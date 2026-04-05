export interface HarmonicWorkspaceTonalContext {
    selectedKey: number;
    tonicPitchClass?: number;
    scaleGroup: string;
    scaleName: string;
}

export interface HarmonicWorkspaceState {
    scopeKey: string;
    selectedCandidateId: string | null;
    tonalContext: HarmonicWorkspaceTonalContext;
}

export type HarmonicWorkspaceAction =
    | { type: 'sync-scope'; scopeKey: string; tonalContext: HarmonicWorkspaceTonalContext }
    | { type: 'select-candidate'; scopeKey: string; candidateId: string | null };

export function createHarmonicWorkspaceState(
    scopeKey: string,
    tonalContext: HarmonicWorkspaceTonalContext
): HarmonicWorkspaceState {
    return {
        scopeKey,
        selectedCandidateId: null,
        tonalContext,
    };
}

export function reduceHarmonicWorkspaceState(
    state: HarmonicWorkspaceState,
    action: HarmonicWorkspaceAction
): HarmonicWorkspaceState {
    switch (action.type) {
        case 'sync-scope':
            if (action.scopeKey === state.scopeKey) {
                return {
                    ...state,
                    tonalContext: action.tonalContext,
                };
            }

            return {
                ...createHarmonicWorkspaceState(action.scopeKey, action.tonalContext),
            };

        case 'select-candidate':
            return {
                ...state,
                scopeKey: action.scopeKey,
                selectedCandidateId: action.candidateId,
            };

        default:
            return state;
    }
}
