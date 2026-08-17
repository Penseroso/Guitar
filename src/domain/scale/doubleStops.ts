// Guitar-interpretation layer: which scale-degree pairs form playable double stops, and
// where they fall on the fretboard. Shared across scale/chord/progression modes.

import { STRING_MIDI_PITCHES } from '@/domain/shared/tuning';
import { DoubleStopPair, HarmonicInterval, PlayableDoubleStop } from './types';

/** Harmonic intervals double-stops are offered for, in the order the UI should present them. */
export const DOUBLE_STOP_HARMONIC_INTERVALS: HarmonicInterval[] = [3, 4, 6];

/**
 * Which string pairs are offered for a given harmonic interval, and in what order. A 6th needs a
 * 2-string gap to stay within a comfortable fret stretch (an adjacent-string 6th reaches further
 * than a 3rd/4th does) — every other interval uses directly adjacent strings. The first entry is
 * the sensible default to fall back to when the interval changes.
 */
export function getDoubleStopStringPairOptions(interval: HarmonicInterval): [number, number][] {
    return interval === 6
        ? [[0, 2], [1, 3], [2, 4], [3, 5]]
        : [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]];
}

function getGenericDegree(label: string): number | null {
    const degreeText = label.replace(/^[b#]+/, '');
    const parsedDegree = Number(degreeText);

    if (!Number.isFinite(parsedDegree) || parsedDegree < 1) {
        return null;
    }

    return ((parsedDegree - 1) % 7) + 1;
}

function getTargetGenericDegree(rootDegree: number, harmonicInterval: HarmonicInterval): number {
    return ((rootDegree + harmonicInterval - 2) % 7) + 1;
}

export function getHarmonicDoubleStops(
    scaleNotes: number[],
    scaleIntervalLabels: Partial<Record<number, string>>,
    harmonicInterval: HarmonicInterval
): DoubleStopPair[] {
    if (scaleNotes.length === 0) return [];

    const tonic = scaleNotes[0];
    const degreeToNote = new Map<number, number>();
    const noteToDegree = new Map<number, number>();

    for (const noteIdx of scaleNotes) {
        const relativeInterval = (noteIdx - tonic + 12) % 12;
        const label = scaleIntervalLabels[relativeInterval];
        if (!label) continue;

        const genericDegree = getGenericDegree(label);
        if (genericDegree === null) continue;

        degreeToNote.set(genericDegree, noteIdx);
        noteToDegree.set(noteIdx, genericDegree);
    }

    return scaleNotes.flatMap((rootNoteIdx) => {
        const rootDegree = noteToDegree.get(rootNoteIdx);
        if (!rootDegree) return [];

        const targetDegree = getTargetGenericDegree(rootDegree, harmonicInterval);
        const targetNoteIdx = degreeToNote.get(targetDegree);
        if (targetNoteIdx === undefined) return [];

        return [{
            rootNoteIdx,
            targetNoteIdx,
            interval: harmonicInterval
        }];
    });
}

/**
 * Filters and maps DoubleStopPairs to actual playable string/fret combinations on the guitar.
 * Validates the physical constraints (maximum 4 frets stretch) unless one of the notes is an open string.
 *
 * @param pairs The diatonic double-stop pairs to be mapped.
 * @param rootKey The root key of the scale or context (used contextually if needed).
 * @param tuning Array of open string note indices (e.g., for Standard Tuning).
 * @param targetStrings Tuple of two string indices (0-5) to play the double stops on (e.g., [1, 2] for B and G strings).
 * @returns An array of playable double-stops with specific strings and fret numbers.
 */
export function getPlayableDoubleStopsOnStrings(
    pairs: DoubleStopPair[],
    rootKey: number,
    tuning: number[],
    targetStrings: [number, number]
): PlayableDoubleStop[] {
    const playable: PlayableDoubleStop[] = [];
    const [str1, str2] = targetStrings;

    // Assign strings based on physics (larger index = lower pitch = root)
    const strRoot = Math.max(str1, str2);
    const strTarget = Math.min(str1, str2);
    const openNoteRoot = tuning[strRoot];
    const openNoteTarget = tuning[strTarget];

    for (const pair of pairs) {
        const { rootNoteIdx, targetNoteIdx } = pair;

        // Find all possible frets (0-24)
        const fretsRoot: number[] = [];
        const fretsTarget: number[] = [];

        for (let fret = 0; fret <= 24; fret++) {
            if ((openNoteRoot + fret) % 12 === rootNoteIdx) fretsRoot.push(fret);
            if ((openNoteTarget + fret) % 12 === targetNoteIdx) fretsTarget.push(fret);
        }

        for (const fRoot of fretsRoot) {
            for (const fTarget of fretsTarget) {
                // Strict max 4 fret stretch (no exception for open strings)
                const stretch = Math.abs(fRoot - fTarget);
                const isValidStretch = stretch <= 4;

                // Prevent interval inversion
                const rootPitch = STRING_MIDI_PITCHES[strRoot] + fRoot;
                const targetPitch = STRING_MIDI_PITCHES[strTarget] + fTarget;

                if (isValidStretch && targetPitch >= rootPitch) {
                    playable.push({
                        string1: str1,
                        fret1: str1 === strRoot ? fRoot : fTarget,
                        string2: str2,
                        fret2: str2 === strRoot ? fRoot : fTarget,
                        pair: pair
                    });
                }
            }
        }
    }

    return playable;
}
