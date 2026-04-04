import type { ProgressionDocument } from '../../utils/guitar/types';
import { buildMeasuresFromDegrees, type ProgressionDraftApplyMode } from '../../utils/guitar/progression';
import type { ProgressionHandoffPayload } from '../../utils/guitar/chords';

export interface HarmonicWorkspaceTonalContext {
    selectedKey: number;
    tonicPitchClass?: number;
    scaleGroup: string;
    scaleName: string;
}

export interface HarmonicWorkspaceProgressionDraft {
    source: 'preset' | 'hint';
    title: string;
    summary: string;
    degrees: string[];
    progressionId?: string;
    document: ProgressionDocument;
    applied: boolean;
    applyMode: ProgressionDraftApplyMode;
    lastAppliedMode?: ProgressionDraftApplyMode;
}

export interface HarmonicWorkspaceState {
    scopeKey: string;
    selectedCandidateId: string | null;
    selectedScaleId: string | null;
    preparedHandoff: ProgressionHandoffPayload | null;
    stagedProgression: HarmonicWorkspaceProgressionDraft | null;
    tonalContext: HarmonicWorkspaceTonalContext;
}

export type HarmonicWorkspaceAction =
    | { type: 'sync-scope'; scopeKey: string; tonalContext: HarmonicWorkspaceTonalContext }
    | { type: 'select-candidate'; scopeKey: string; candidateId: string | null }
    | { type: 'select-scale'; scopeKey: string; scaleId: string | null }
    | { type: 'prepare-handoff'; scopeKey: string; tonalContext: HarmonicWorkspaceTonalContext; payload: ProgressionHandoffPayload }
    | { type: 'set-draft-apply-mode'; scopeKey: string; applyMode: ProgressionDraftApplyMode }
    | { type: 'clear-handoff'; scopeKey: string; tonalContext: HarmonicWorkspaceTonalContext }
    | { type: 'mark-handoff-applied'; scopeKey: string; tonalContext: HarmonicWorkspaceTonalContext; applyMode: ProgressionDraftApplyMode };

export function createHarmonicWorkspaceState(
    scopeKey: string,
    tonalContext: HarmonicWorkspaceTonalContext
): HarmonicWorkspaceState {
    return {
        scopeKey,
        selectedCandidateId: null,
        selectedScaleId: null,
        preparedHandoff: null,
        stagedProgression: null,
        tonalContext,
    };
}

export function buildProgressionDraftFromHandoff(
    payload: ProgressionHandoffPayload,
    applyMode: ProgressionDraftApplyMode = 'replace'
): HarmonicWorkspaceProgressionDraft {
    return {
        source: payload.progressionId ? 'preset' : 'hint',
        title: payload.title,
        summary: payload.summary,
        degrees: payload.degrees,
        progressionId: payload.progressionId,
        document: {
            measures: buildMeasuresFromDegrees(payload.degrees),
        },
        applied: false,
        applyMode,
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

        case 'select-scale':
            return {
                ...state,
                scopeKey: action.scopeKey,
                selectedScaleId: action.scaleId,
            };

        case 'prepare-handoff':
            return {
                ...state,
                scopeKey: action.scopeKey,
                tonalContext: action.tonalContext,
                preparedHandoff: action.payload,
                stagedProgression: buildProgressionDraftFromHandoff(
                    action.payload,
                    state.stagedProgression?.applyMode ?? 'replace'
                ),
            };

        case 'set-draft-apply-mode':
            return {
                ...state,
                scopeKey: action.scopeKey,
                stagedProgression: state.stagedProgression
                    ? {
                        ...state.stagedProgression,
                        applyMode: action.applyMode,
                    }
                    : null,
            };

        case 'clear-handoff':
            return {
                ...state,
                scopeKey: action.scopeKey,
                tonalContext: action.tonalContext,
                preparedHandoff: null,
                stagedProgression: null,
            };

        case 'mark-handoff-applied':
            return {
                ...state,
                scopeKey: action.scopeKey,
                tonalContext: action.tonalContext,
                stagedProgression: state.stagedProgression
                    ? {
                        ...state.stagedProgression,
                        applied: true,
                        lastAppliedMode: action.applyMode,
                    }
                    : null,
            };

        default:
            return state;
    }
}
