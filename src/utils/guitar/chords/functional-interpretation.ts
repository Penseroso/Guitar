import { getNoteName } from '../logic';
import { resolveChordRegistryEntry } from './helpers';
import type { ChordRegistryEntry } from './registry';
import type { HarmonicTonalContext } from './related-scales';

export type HarmonicFunctionFit = 'functional' | 'color';
export type FunctionalHarmonyKind =
    | 'tonic'
    | 'predominant'
    | 'dominant'
    | 'borrowed'
    | 'modal-center'
    | 'suspension'
    | 'open';

export interface HarmonicFunctionInterpretation {
    chordRootPitchClass: number;
    tonicPitchClass: number;
    tonicNoteName: string;
    chordRootNoteName: string;
    relativeInterval: number;
    relativeDegree: string;
    harmonyKind: FunctionalHarmonyKind;
    roleLabel: string;
    fit: HarmonicFunctionFit;
    summary: string;
}

const INTERVAL_TO_DEGREE: Record<number, string> = {
    0: 'I',
    1: 'bII',
    2: 'II',
    3: 'bIII',
    4: 'III',
    5: 'IV',
    6: 'bV',
    7: 'V',
    8: 'bVI',
    9: 'VI',
    10: 'bVII',
    11: 'VII',
};

function getTonicPitchClass(tonalContext: HarmonicTonalContext, fallbackPitchClass: number) {
    return tonalContext.tonicPitchClass ?? tonalContext.selectedKey ?? fallbackPitchClass;
}

export function interpretChordAgainstTonalCenter(
    entryInput: string | ChordRegistryEntry,
    chordRootPitchClass: number,
    tonalContext: HarmonicTonalContext
): HarmonicFunctionInterpretation {
    const entry = resolveChordRegistryEntry(entryInput);
    const tonicPitchClass = getTonicPitchClass(tonalContext, chordRootPitchClass);
    const relativeInterval = (chordRootPitchClass - tonicPitchClass + 12) % 12;
    const relativeDegree = INTERVAL_TO_DEGREE[relativeInterval] ?? '?';
    const tonicNoteName = getNoteName(tonicPitchClass);
    const chordRootNoteName = getNoteName(chordRootPitchClass);
    const scaleName = tonalContext.scaleName ?? '';
    const scaleFamily = tonalContext.scaleGroup ?? '';
    const isDominantQuality = entry.tags?.includes('dominant') ?? false;
    const quality = entry.definition.quality ?? '';
    const isMinorQuality = quality.includes('minor') || entry.id === 'minor';
    const isSuspended = entry.tags?.includes('suspended') ?? false;
    const isPowerChord = entry.id === 'power-5';
    const isBorrowedDegree = [3, 8, 10].includes(relativeInterval);
    const isModalFrame = ['Lydian', 'Mixolydian', 'Dorian', 'Aeolian', 'Minor Pentatonic', 'Major Pentatonic', 'Jazz Minor', 'Harmonic Minor'].includes(scaleName);

    if (isPowerChord) {
        return {
            chordRootPitchClass,
            tonicPitchClass,
            tonicNoteName,
            chordRootNoteName,
            relativeInterval,
            relativeDegree,
            harmonyKind: relativeInterval === 0 && isModalFrame ? 'modal-center' : 'open',
            roleLabel: relativeInterval === 0 && isModalFrame ? 'Modal Open Center' : 'Open Function',
            fit: 'color',
            summary: relativeInterval === 0 && isModalFrame
                ? `${chordRootNoteName}5 works as an open modal center against ${tonicNoteName} ${scaleName}.`
                : `${chordRootNoteName}5 keeps the third undefined, so its function stays open until the tonic frame or surrounding motion clarifies it.`,
        };
    }

    if (isSuspended) {
        return {
            chordRootPitchClass,
            tonicPitchClass,
            tonicNoteName,
            chordRootNoteName,
            relativeInterval,
            relativeDegree,
            harmonyKind: relativeInterval === 0 && isModalFrame ? 'modal-center' : 'suspension',
            roleLabel: relativeInterval === 0 && isModalFrame ? 'Modal Suspended Center' : 'Suspended Color',
            fit: relativeInterval === 0 ? 'functional' : 'color',
            summary: relativeInterval === 0 && isModalFrame
                ? `${chordRootNoteName}${entry.symbol} behaves like a stable suspended center inside ${tonicNoteName} ${scaleName}.`
                : `${chordRootNoteName}${entry.symbol} holds its function open, delaying a clear major/minor reading against tonic ${tonicNoteName}.`,
        };
    }

    if (isDominantQuality) {
        if (relativeInterval === 7 && scaleName !== 'Mixolydian') {
            return {
                chordRootPitchClass,
                tonicPitchClass,
                tonicNoteName,
                chordRootNoteName,
                relativeInterval,
                relativeDegree,
                harmonyKind: 'dominant',
                roleLabel: 'Cadential Dominant',
                fit: 'functional',
                summary: `${chordRootNoteName}${entry.symbol} is a true V-type dominant relative to tonic ${tonicNoteName}, so cadential pull should outrank color-first readings.`,
            };
        }

        if (relativeInterval === 0 && scaleName === 'Mixolydian') {
            return {
                chordRootPitchClass,
                tonicPitchClass,
                tonicNoteName,
                chordRootNoteName,
                relativeInterval,
                relativeDegree,
                harmonyKind: 'modal-center',
                roleLabel: 'Mixolydian Center',
                fit: 'functional',
                summary: `${chordRootNoteName}${entry.symbol} is functioning as the modal center, not merely as a cadential dominant, because the tonal frame itself is Mixolydian.`,
            };
        }
    }

    if (relativeInterval === 0) {
        const isModalCenter = isModalFrame && scaleName !== 'Ionian';
        return {
            chordRootPitchClass,
            tonicPitchClass,
            tonicNoteName,
            chordRootNoteName,
            relativeInterval,
            relativeDegree,
            harmonyKind: isModalCenter ? 'modal-center' : 'tonic',
            roleLabel: isModalCenter ? 'Modal Center' : 'Tonic Center',
            fit: 'functional',
            summary: isModalCenter
                ? `${chordRootNoteName}${entry.symbol} is heard as the center of the current ${scaleName} frame rather than as a borrowed detour.`
                : `${chordRootNoteName}${entry.symbol} aligns directly with tonic ${tonicNoteName}, so it reads as a true point of rest.`,
        };
    }

    if ((relativeInterval === 2 && isMinorQuality) || relativeInterval === 5 || entry.id === 'half-diminished-7') {
        return {
            chordRootPitchClass,
            tonicPitchClass,
            tonicNoteName,
            chordRootNoteName,
            relativeInterval,
            relativeDegree,
            harmonyKind: 'predominant',
            roleLabel: 'Pre-Dominant Function',
            fit: 'functional',
            summary: `${chordRootNoteName}${entry.symbol} leans away from tonic ${tonicNoteName} and wants to set up a dominant arrival rather than resolve directly.`,
        };
    }

    if (isBorrowedDegree || scaleFamily.includes('Minor')) {
        return {
            chordRootPitchClass,
            tonicPitchClass,
            tonicNoteName,
            chordRootNoteName,
            relativeInterval,
            relativeDegree,
            harmonyKind: 'borrowed',
            roleLabel: 'Borrowed Color',
            fit: 'color',
            summary: `${chordRootNoteName}${entry.symbol} sits outside the plain tonic collection, so it reads more as borrowed/modal color relative to ${tonicNoteName} than as a default diatonic function.`,
        };
    }

    return {
        chordRootPitchClass,
        tonicPitchClass,
        tonicNoteName,
        chordRootNoteName,
        relativeInterval,
        relativeDegree,
        harmonyKind: isMinorQuality ? 'predominant' : 'tonic',
        roleLabel: isMinorQuality ? 'Functional Color' : 'Tonic-Adjacent Color',
        fit: isMinorQuality ? 'functional' : 'color',
        summary: `${chordRootNoteName}${entry.symbol} is being interpreted relative to tonic ${tonicNoteName} as ${relativeDegree}, with function shaped mainly by the current tonal frame.`,
    };
}

