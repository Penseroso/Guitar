import type { GuitarStringIndex } from './types';

// Pure fretboard physics — no chord/harmony knowledge. Standard 25.5" scale by default;
// fret n sits scaleLength * (1 - 2^(-n/12)) from the nut (12-tone-equal-temperament fret rule).
export const DEFAULT_SCALE_LENGTH_MM = 647.7; // 25.5"
export const DEFAULT_MAX_HAND_SPAN_MM = 95;
export const DEFAULT_THUMB_MAX_REACH_FRETS = 3;
export const MAX_FRETTING_FINGERS = 4;
export const THUMB_ELIGIBLE_STRING: GuitarStringIndex = 5; // low E — thumb-over technique

export function getFretDistanceMm(fretA: number, fretB: number, scaleLengthMm: number = DEFAULT_SCALE_LENGTH_MM): number {
    const low = Math.min(fretA, fretB);
    const high = Math.max(fretA, fretB);
    return scaleLengthMm * (Math.pow(2, -low / 12) - Math.pow(2, -high / 12));
}

export interface FingeringPoint {
    string: GuitarStringIndex;
    fret: number; // > 0 — open strings (fret 0) never occupy a finger and should be excluded before calling
}

export interface HandPlayabilityOptions {
    scaleLengthMm?: number;
    maxHandSpanMm?: number;
    allowThumbOnLowE?: boolean;
    thumbMaxReachFrets?: number;
}

export interface HandPlayabilityResult {
    playable: boolean;
    reason?: 'too-many-fingers' | 'exceeds-hand-span';
    usesThumb: boolean;
    fingerGroupCount: number;
}

/**
 * Deductive hand-playability check — no captured hand-measurement data, just two fixed
 * physical facts: a fretting hand has 4 fingers, and multiple strings sharing one fret can be
 * barred by a single finger. The thumb can optionally reach around to fret the low E string
 * (string index 5) only, and only within a short distance of where the rest of the hand sits —
 * it doesn't consume one of the 4 fingers when used.
 */
export function evaluateHandPlayability(
    points: FingeringPoint[],
    options: HandPlayabilityOptions = {}
): HandPlayabilityResult {
    const {
        scaleLengthMm = DEFAULT_SCALE_LENGTH_MM,
        maxHandSpanMm = DEFAULT_MAX_HAND_SPAN_MM,
        allowThumbOnLowE = false,
        thumbMaxReachFrets = DEFAULT_THUMB_MAX_REACH_FRETS,
    } = options;

    if (points.length === 0) {
        return { playable: true, usesThumb: false, fingerGroupCount: 0 };
    }

    const allFrets = Array.from(new Set(points.map((point) => point.fret))).sort((a, b) => a - b);
    const lowEPoint = allowThumbOnLowE
        ? points.find((point) => point.string === THUMB_ELIGIBLE_STRING)
        : undefined;

    // Only "spend" the thumb when fretting the low E as a normal finger would push the shape
    // over the 4-finger budget, taking it off the low E actually brings that back down, and the
    // thumb can physically reach that fret from wherever the rest of the hand is sitting.
    let usesThumb = false;
    let nonThumbFrets = allFrets;
    if (lowEPoint && allFrets.length > MAX_FRETTING_FINGERS) {
        const withoutLowE = Array.from(
            new Set(points.filter((point) => point !== lowEPoint).map((point) => point.fret))
        ).sort((a, b) => a - b);

        if (withoutLowE.length <= MAX_FRETTING_FINGERS) {
            const nearestFret = withoutLowE.length > 0
                ? withoutLowE.reduce(
                    (closest, fret) => Math.abs(fret - lowEPoint.fret) < Math.abs(closest - lowEPoint.fret) ? fret : closest,
                    withoutLowE[0]
                )
                : lowEPoint.fret;
            if (Math.abs(lowEPoint.fret - nearestFret) <= thumbMaxReachFrets) {
                usesThumb = true;
                nonThumbFrets = withoutLowE;
            }
        }
    }

    const fingerFrets = usesThumb ? nonThumbFrets : allFrets;

    if (fingerFrets.length > MAX_FRETTING_FINGERS) {
        return { playable: false, reason: 'too-many-fingers', usesThumb, fingerGroupCount: fingerFrets.length };
    }

    if (fingerFrets.length > 1) {
        const span = getFretDistanceMm(fingerFrets[0], fingerFrets[fingerFrets.length - 1], scaleLengthMm);
        if (span > maxHandSpanMm) {
            return { playable: false, reason: 'exceeds-hand-span', usesThumb, fingerGroupCount: fingerFrets.length };
        }
    }

    return { playable: true, usesThumb, fingerGroupCount: fingerFrets.length };
}
