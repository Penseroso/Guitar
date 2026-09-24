import { useCallback, useReducer, useState } from 'react';
import type { HarmonicInterval } from '@/domain/scale/types';
import { createScaleRef, resolveScaleRef, type ScaleRef } from '@/domain/scale/scale-ref';
import { initialScaleModeState, reduceScaleMode } from './scale-mode-state';

export const useScaleMode = () => {
    const [state, dispatch] = useReducer(reduceScaleMode, initialScaleModeState);
    const { scaleRef, selectedChordId, blueNote, secondNote, sixthNote } = state;
    const { group: scaleGroup, name: scaleName } = resolveScaleRef(scaleRef)!;
    const [showIntervals, setShowIntervals] = useState(false);
    const [showChordTones, setShowChordTones] = useState(false);
    const [isDoubleStopActive, setIsDoubleStopActive] = useState(false);
    const [doubleStopInterval, setDoubleStopInterval] = useState<HarmonicInterval>(3);
    const [doubleStopStrings, setDoubleStopStrings] = useState<[number, number]>([1, 2]);

    const commitScaleRef = useCallback((next: ScaleRef) => dispatch({ type: 'select-scale', scaleRef: next }), []);
    const commitScaleSelection = useCallback((group: string, name: string) => {
        commitScaleRef(createScaleRef(group, name, scaleRef.tonic));
    }, [commitScaleRef, scaleRef.tonic]);
    const setTonic = useCallback((tonic: number) => {
        commitScaleRef({ ...scaleRef, tonic: ((tonic % 12) + 12) % 12 });
    }, [commitScaleRef, scaleRef]);
    const selectAnalysisChord = useCallback((chordId: string | null) => dispatch({ type: 'select-chord', chordId }), []);
    const onToggleIntervals = useCallback(() => setShowIntervals(previous => !previous), []);

    const onToggleChordTones = useCallback(() => setShowChordTones((prev) => !prev), []);
    const onToggleBlueNote = useCallback(() => dispatch({ type: 'toggle-modifier', modifier: 'blueNote' }), []);
    const onToggleSixthNote = useCallback(() => dispatch({ type: 'toggle-modifier', modifier: 'sixthNote' }), []);
    const onToggleSecondNote = useCallback(() => dispatch({ type: 'toggle-modifier', modifier: 'secondNote' }), []);
    const onToggleDoubleStop = useCallback(() => setIsDoubleStopActive((prev) => !prev), []);

    return {
        scaleRef, selectedChordId, selectAnalysisChord, commitScaleRef, setTonic,
        showIntervals, onToggleIntervals,
        scaleGroup,
        scaleName,
        showChordTones,
        blueNote,
        sixthNote,
        secondNote,
        isDoubleStopActive,
        doubleStopInterval,
        doubleStopStrings,
        setDoubleStopInterval,
        setDoubleStopStrings,
        commitScaleSelection,
        onToggleChordTones,
        onToggleBlueNote,
        onToggleSixthNote,
        onToggleSecondNote,
        onToggleDoubleStop,
    };
};
