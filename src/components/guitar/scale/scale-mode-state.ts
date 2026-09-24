import { getScaleCompatibleChords } from '@/domain/chord/chord-scale-compatibility';
import { createScaleRef, resolveScaleRef, sameScaleIdentity, type ScaleRef } from '@/domain/scale/scale-ref';

export interface ScaleModeState {
    scaleRef: ScaleRef;
    selectedChordId: string | null;
    blueNote: boolean;
    secondNote: boolean;
    sixthNote: boolean;
}

export const initialScaleModeState: ScaleModeState = {
    scaleRef: createScaleRef('Diatonic Modes', 'Ionian', 0),
    selectedChordId: null,
    blueNote: false,
    secondNote: false,
    sixthNote: false,
};

export type ScaleModeAction =
    | { type: 'select-scale'; scaleRef: ScaleRef }
    | { type: 'select-chord'; chordId: string | null }
    | { type: 'toggle-modifier'; modifier: 'blueNote' | 'secondNote' | 'sixthNote' };

export function reduceScaleMode(state: ScaleModeState, action: ScaleModeAction): ScaleModeState {
    if (action.type === 'toggle-modifier') return { ...state, [action.modifier]: !state[action.modifier] };
    if (action.type === 'select-scale') {
        const resolved = resolveScaleRef(action.scaleRef);
        if (!resolved) return state;
        const identityChanged = !sameScaleIdentity(state.scaleRef, action.scaleRef);
        const compatible = getScaleCompatibleChords(resolved.group, resolved.name, resolved.tonic);
        const selectedChordId = !identityChanged && compatible.some(chord => chord.chordId === state.selectedChordId)
            ? state.selectedChordId : null;
        return {
            ...state,
            scaleRef: action.scaleRef,
            selectedChordId,
            ...(identityChanged ? { blueNote: false, secondNote: false, sixthNote: false } : {}),
        };
    }
    const resolved = resolveScaleRef(state.scaleRef);
    if (!resolved) return { ...state, selectedChordId: null };
    const valid = action.chordId === null || getScaleCompatibleChords(resolved.group, resolved.name, resolved.tonic)
        .some(chord => chord.chordId === action.chordId);
    return { ...state, selectedChordId: valid ? action.chordId : null };
}
