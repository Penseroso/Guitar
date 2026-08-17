import { useCallback, useState } from 'react';
import type { HarmonicInterval } from '@/domain/scale/types';

export const useScaleMode = () => {
    const [scaleGroup, setScaleGroup] = useState('Diatonic Modes');
    const [scaleName, setScaleName] = useState('Ionian');
    const [showChordTones, setShowChordTones] = useState(false); // In scale mode, shows Triad of root
    const [blueNote, setBlueNote] = useState(false);
    const [sixthNote, setSixthNote] = useState(false);
    const [secondNote, setSecondNote] = useState(false);
    const [isDoubleStopActive, setIsDoubleStopActive] = useState(false);
    const [doubleStopInterval, setDoubleStopInterval] = useState<HarmonicInterval>(3);
    const [doubleStopStrings, setDoubleStopStrings] = useState<[number, number]>([1, 2]);

    const commitScaleSelection = useCallback((group: string, name: string) => {
        setScaleGroup(group);
        setScaleName(name);
        setBlueNote(false);
        setSixthNote(false);
        setSecondNote(false);
    }, []);

    const onToggleChordTones = useCallback(() => setShowChordTones((prev) => !prev), []);
    const onToggleBlueNote = useCallback(() => setBlueNote((prev) => !prev), []);
    const onToggleSixthNote = useCallback(() => setSixthNote((prev) => !prev), []);
    const onToggleSecondNote = useCallback(() => setSecondNote((prev) => !prev), []);
    const onToggleDoubleStop = useCallback(() => setIsDoubleStopActive((prev) => !prev), []);

    return {
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
