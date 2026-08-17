import {
    getHarmonicDoubleStops,
    getPlayableDoubleStopsOnStrings,
} from './doubleStops';
import {
    SCALES,
    generateModeData,
    getScaleIntervalLabels,
    getScaleEngineIntervalLabels,
    isDoubleStopSupported,
} from './scales';
import { getVisibleScaleFamily, isMinorKeyScale } from './scaleSelector';
import type { DoubleStopPair, HarmonicInterval, PlayableDoubleStop } from './types';
import { TUNING } from '@/domain/shared/tuning';

export interface ScaleDerivedDataToggles {
    showChordTones: boolean;
    blueNote: boolean;
    sixthNote: boolean;
    secondNote: boolean;
    isDoubleStopActive: boolean;
    doubleStopInterval: HarmonicInterval;
    doubleStopStrings: [number, number];
}

export interface ScaleDiatonicChord {
    degree: string;
    color: string;
    interval: number;
}

export interface ScaleDerivedData {
    activeScaleIntervals: number[];
    diatonicChords: ScaleDiatonicChord[];
    scaleNotes: number[];
    scaleIntervalLabels: Partial<Record<number, string>>;
    scaleEngineIntervalLabels: Partial<Record<number, string>>;
    isDoubleStopAvailable: boolean;
    isDoubleStopVisible: boolean;
    isPentatonic: boolean;
    isMinorMode: boolean;
    modifierNotes: number[];
    scaleChordTones: number[];
    harmonicDoubleStopPairsByInterval: Record<HarmonicInterval, DoubleStopPair[]>;
    playableDoubleStops: PlayableDoubleStop[];
}

// Root, 3rds, 5th, 7ths — the degrees highlighted when "Chord Tones" is toggled on in scale mode.
const SCALE_CHORD_TONE_TARGET_INTERVALS = [0, 3, 4, 7, 10, 11];
const HARMONIC_INTERVALS: HarmonicInterval[] = [3, 4, 6];

/**
 * Pure scale-theory pipeline: (scale selection, key, UI toggles) -> everything the
 * scale-mode fretboard/panels need to render. No React, no browser APIs — mirrors
 * domain/progression/getProgressionPlaybackData.ts.
 */
export function getScaleDerivedData(
    scaleGroup: string,
    scaleName: string,
    selectedKey: number,
    toggles: ScaleDerivedDataToggles
): ScaleDerivedData {
    const activeScaleIntervals = SCALES[scaleGroup]?.[scaleName] || SCALES['Diatonic Modes']['Ionian'];

    const diatonicChords = Object.entries(generateModeData(scaleGroup, scaleName))
        .map(([interval, data]) => ({
            degree: data.role,
            color: data.color,
            interval: parseInt(interval, 10),
        }))
        .sort((a, b) => a.interval - b.interval);

    const scaleNotes = activeScaleIntervals.map((interval) => (selectedKey + interval) % 12);
    const scaleIntervalLabels = getScaleIntervalLabels(scaleGroup, scaleName);
    const scaleEngineIntervalLabels = getScaleEngineIntervalLabels(scaleGroup, scaleName);

    const isDoubleStopAvailable = isDoubleStopSupported(scaleGroup, scaleName);
    const isDoubleStopVisible = isDoubleStopAvailable && toggles.isDoubleStopActive;

    const isPentatonic = getVisibleScaleFamily(scaleGroup) === 'Pentatonic';
    const isMinorMode = isMinorKeyScale(scaleName);

    const modifierNotes: number[] = [];
    if (toggles.blueNote && isPentatonic) {
        modifierNotes.push((selectedKey + 6) % 12);
    }
    if (toggles.sixthNote && scaleName === 'Minor Pentatonic') {
        modifierNotes.push((selectedKey + 9) % 12);
    }
    if (toggles.secondNote && scaleName === 'Minor Pentatonic') {
        modifierNotes.push((selectedKey + 2) % 12);
    }

    const scaleChordTones = toggles.showChordTones
        ? activeScaleIntervals
            .filter((interval) => SCALE_CHORD_TONE_TARGET_INTERVALS.includes(interval))
            .map((interval) => (selectedKey + interval) % 12)
        : [];

    const harmonicDoubleStopPairsByInterval = HARMONIC_INTERVALS.reduce<Record<HarmonicInterval, DoubleStopPair[]>>(
        (acc, interval) => {
            acc[interval] = getHarmonicDoubleStops(scaleNotes, scaleEngineIntervalLabels, interval);
            return acc;
        },
        { 3: [], 4: [], 6: [] }
    );

    const playableDoubleStops = isDoubleStopVisible
        ? getPlayableDoubleStopsOnStrings(
            harmonicDoubleStopPairsByInterval[toggles.doubleStopInterval],
            selectedKey,
            TUNING,
            toggles.doubleStopStrings
        )
        : [];

    return {
        activeScaleIntervals,
        diatonicChords,
        scaleNotes,
        scaleIntervalLabels,
        scaleEngineIntervalLabels,
        isDoubleStopAvailable,
        isDoubleStopVisible,
        isPentatonic,
        isMinorMode,
        modifierNotes,
        scaleChordTones,
        harmonicDoubleStopPairsByInterval,
        playableDoubleStops,
    };
}
