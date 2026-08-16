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
    /** Strings played open (fret 0) in this voicing — a barre finger lying across one of these
     *  would silence it, so it blocks that fret from being treated as a barre across that string. */
    openStrings?: GuitarStringIndex[];
}

export interface HandPlayabilityResult {
    playable: boolean;
    reason?: 'too-many-fingers' | 'exceeds-hand-span';
    usesThumb: boolean;
    fingerGroupCount: number;
}

/**
 * Can one flat finger barre `fret` across every string in `stringsAtFret`? A finger pressed
 * across a run of strings physically touches every string between the outermost two, so this
 * is only possible when every string in that span is either part of the group, muted (absent
 * from both `fretByString` and `openStrings`), or fretted *in front of* the barre (fret >=
 * this one — another finger arching over it, e.g. the classic F-chord shape). A string needing
 * a *lower* fret in that span is behind the barre and physically unreachable, and an open
 * string in the span would simply get muted by the barre finger lying across it.
 */
export function canFormBarre(
    fret: number,
    stringsAtFret: GuitarStringIndex[],
    fretByString: Map<GuitarStringIndex, number>,
    openStringSet: Set<GuitarStringIndex>
): boolean {
    const group = new Set(stringsAtFret);
    const min = Math.min(...stringsAtFret);
    const max = Math.max(...stringsAtFret);

    for (let stringIndex = min; stringIndex <= max; stringIndex++) {
        if (group.has(stringIndex as GuitarStringIndex)) {
            continue;
        }
        if (openStringSet.has(stringIndex as GuitarStringIndex)) {
            return false;
        }
        const otherFret = fretByString.get(stringIndex as GuitarStringIndex);
        if (otherFret !== undefined && otherFret < fret) {
            return false;
        }
    }

    return true;
}

export interface FretGroup {
    fret: number;
    strings: GuitarStringIndex[];
    /** True only when these strings sharing a fret are physically forced to be one flat barre
     *  finger (per `canFormBarre`) — false when they just coincidentally land on the same fret
     *  while being independently fingered (e.g. open G's low-E and high-E strings both at fret
     *  3, with unrelated open strings between them — two ordinary solo fingers, not a barre). */
    isBarre: boolean;
}

/** Groups fretted points by fret and classifies each group as a real barre or not — the single
 *  source of truth both hand-playability and ranking use so they never disagree about what
 *  counts as a barre. */
export function classifyFrettedGroups(points: FingeringPoint[], openStrings: GuitarStringIndex[] = []): FretGroup[] {
    const openStringSet = new Set(openStrings);
    const fretByString = new Map<GuitarStringIndex, number>();
    for (const point of points) {
        fretByString.set(point.string, point.fret);
    }

    const pointsByFret = new Map<number, GuitarStringIndex[]>();
    for (const point of points) {
        const group = pointsByFret.get(point.fret) ?? [];
        group.push(point.string);
        pointsByFret.set(point.fret, group);
    }

    return Array.from(pointsByFret.entries()).map(([fret, strings]) => ({
        fret,
        strings,
        isBarre: strings.length > 1 && canFormBarre(fret, strings, fretByString, openStringSet),
    }));
}

/** Barre-aware finger count for a set of fretting points — strings sharing a fret only collapse
 *  into one virtual finger when `canFormBarre` says that barre is physically reachable. */
function countFingerGroups(points: FingeringPoint[], openStringSet: Set<GuitarStringIndex>): number {
    const groups = classifyFrettedGroups(points, Array.from(openStringSet));
    return groups.reduce((count, group) => count + (group.isBarre ? 1 : group.strings.length), 0);
}

/**
 * Deductive hand-playability check — no captured hand-measurement data, just fixed physical
 * facts: a fretting hand has 4 fingers; several strings sharing one fret can be covered by a
 * single barring finger, but only when that finger's reach across the fretboard doesn't
 * conflict with an open string or a lower fret required behind it (see `canFormBarre`).
 * The thumb can optionally reach around to fret the low E string (string index 5) only, and
 * only within a short distance of where the rest of the hand sits — it doesn't consume one of
 * the 4 fingers when used.
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
        openStrings = [],
    } = options;

    if (points.length === 0) {
        return { playable: true, usesThumb: false, fingerGroupCount: 0 };
    }

    const openStringSet = new Set(openStrings);
    const lowEPoint = allowThumbOnLowE
        ? points.find((point) => point.string === THUMB_ELIGIBLE_STRING)
        : undefined;

    const allGroupCount = countFingerGroups(points, openStringSet);

    // Only "spend" the thumb when fretting the low E as a normal finger pushes the shape over
    // the 4-finger budget, taking it off the low E actually brings that back down, and the
    // thumb can physically reach that fret from wherever the rest of the hand is sitting.
    let usesThumb = false;
    let fingerGroupCount = allGroupCount;
    let spanPoints = points;

    if (lowEPoint && allGroupCount > MAX_FRETTING_FINGERS) {
        const withoutLowE = points.filter((point) => point !== lowEPoint);
        const withoutLowEGroupCount = countFingerGroups(withoutLowE, openStringSet);
        if (withoutLowEGroupCount <= MAX_FRETTING_FINGERS) {
            const nearestFret = withoutLowE.length > 0
                ? withoutLowE.reduce(
                    (closest, point) => Math.abs(point.fret - lowEPoint.fret) < Math.abs(closest - lowEPoint.fret) ? point.fret : closest,
                    withoutLowE[0].fret
                )
                : lowEPoint.fret;
            if (Math.abs(lowEPoint.fret - nearestFret) <= thumbMaxReachFrets) {
                usesThumb = true;
                fingerGroupCount = withoutLowEGroupCount;
                spanPoints = withoutLowE;
            }
        }
    }

    if (fingerGroupCount > MAX_FRETTING_FINGERS) {
        return { playable: false, reason: 'too-many-fingers', usesThumb, fingerGroupCount };
    }

    const spanFrets = Array.from(new Set(spanPoints.map((point) => point.fret))).sort((a, b) => a - b);
    if (spanFrets.length > 1) {
        const span = getFretDistanceMm(spanFrets[0], spanFrets[spanFrets.length - 1], scaleLengthMm);
        if (span > maxHandSpanMm) {
            return { playable: false, reason: 'exceeds-hand-span', usesThumb, fingerGroupCount };
        }
    }

    return { playable: true, usesThumb, fingerGroupCount };
}
