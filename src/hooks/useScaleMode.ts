import { useCallback, useState } from 'react';
import type { HarmonicInterval } from '../utils/guitar/types';

export const useScaleMode = () => {
    const [scaleGroup, setScaleGroup] = useState('Diatonic Modes');
    const [scaleName, setScaleName] = useState('Ionian');
    const [previewScaleGroup, setPreviewScaleGroup] = useState<string | null>(null);
    const [previewScaleName, setPreviewScaleName] = useState<string | null>(null);
    const [showChordTones, setShowChordTones] = useState(false); // In scale mode, shows Triad of root
    const [blueNote, setBlueNote] = useState(false);
    const [sixthNote, setSixthNote] = useState(false);
    const [secondNote, setSecondNote] = useState(false);
    const [isDoubleStopActive, setIsDoubleStopActive] = useState(false);
    const [doubleStopInterval, setDoubleStopInterval] = useState<HarmonicInterval>(3);
    const [doubleStopStrings, setDoubleStopStrings] = useState<[number, number]>([1, 2]);

    const hasPreview = previewScaleGroup !== null && previewScaleName !== null;
    const effectiveScaleGroup = previewScaleGroup ?? scaleGroup;
    const effectiveScaleName = previewScaleName ?? scaleName;

    const isPreviewingScale = useCallback(
        (group: string, name: string) => previewScaleGroup === group && previewScaleName === name,
        [previewScaleGroup, previewScaleName]
    );

    const handleClearPreview = useCallback(() => {
        setPreviewScaleGroup(null);
        setPreviewScaleName(null);
    }, []);

    const commitScaleSelection = useCallback((group: string, name: string) => {
        setScaleGroup(group);
        setScaleName(name);
        setBlueNote(false);
        setSixthNote(false);
        setSecondNote(false);
        handleClearPreview();
    }, [handleClearPreview]);

    const handleRelatedPreviewToggle = useCallback((group: string, name: string) => {
        if (isPreviewingScale(group, name)) {
            handleClearPreview();
            return;
        }

        setPreviewScaleGroup(group);
        setPreviewScaleName(name);
    }, [isPreviewingScale, handleClearPreview]);

    const handleApplyPreview = useCallback(() => {
        if (!previewScaleGroup || !previewScaleName) return;
        commitScaleSelection(previewScaleGroup, previewScaleName);
    }, [commitScaleSelection, previewScaleGroup, previewScaleName]);

    const onToggleChordTones = useCallback(() => setShowChordTones((prev) => !prev), []);
    const onToggleBlueNote = useCallback(() => setBlueNote((prev) => !prev), []);
    const onToggleSixthNote = useCallback(() => setSixthNote((prev) => !prev), []);
    const onToggleSecondNote = useCallback(() => setSecondNote((prev) => !prev), []);
    const onToggleDoubleStop = useCallback(() => setIsDoubleStopActive((prev) => !prev), []);

    return {
        scaleGroup,
        scaleName,
        previewScaleGroup,
        previewScaleName,
        effectiveScaleGroup,
        effectiveScaleName,
        hasPreview,
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
        handleRelatedPreviewToggle,
        handleApplyPreview,
        handleClearPreview,
        onToggleChordTones,
        onToggleBlueNote,
        onToggleSixthNote,
        onToggleSecondNote,
        onToggleDoubleStop,
    };
};
