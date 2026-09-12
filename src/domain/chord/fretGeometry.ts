import type { GuitarStringIndex } from './types';

// Pure fretboard physics — no chord/harmony knowledge. Standard 25.5" scale by default;
// fret n sits scaleLength * (1 - 2^(-n/12)) from the nut (12-tone-equal-temperament fret rule).
export const DEFAULT_SCALE_LENGTH_MM = 647.7; // 25.5"
/** Physical impossibility cutoff. The former 95mm value wrongly rejected many reachable
 *  3-5 fret stretches; 95mm remains the ranking comfort reference below. */
export const DEFAULT_MAX_HAND_SPAN_MM = 180;
export const DEFAULT_COMFORTABLE_HAND_SPAN_MM = 95;
export const DEFAULT_THUMB_MAX_REACH_FRETS = 3;
export const MAX_FRETTING_FINGERS = 4;
/** Geometry alone can over-count a roll or partial barre that the tab format does not annotate.
 * Five inferred groups are therefore uncertain/awkward, not proof of impossibility. */
export const MAX_HARD_FINGER_GROUPS = 5;
export const THUMB_ELIGIBLE_STRING: GuitarStringIndex = 5; // low E — thumb-over technique

/** A group of 2 strings coincidentally sharing a fret is always equally playable as two ordinary
 *  independent fingers, so it carries none of a *real* barre's distinguishing weight/positional
 *  consequences — this is the single shared threshold for "wide enough to actually count as a
 *  barre" that every consumer (technique classification, barre-width scoring, the barre-ordering
 *  playability gate) must agree on, rather than three independently hardcoded "3"s. */
export const MIN_STRINGS_FOR_REAL_BARRE = 3;

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

/** Minimum fingers needed at one fret. A same-fret set is not all-or-nothing: a player can use a
 * mini-barre for one reachable run and a separate finger for another point at that fret. */
function countMinimumFingerGroupsAtFret(
    fret: number,
    stringsAtFret: GuitarStringIndex[],
    fretByString: Map<GuitarStringIndex, number>,
    openStringSet: Set<GuitarStringIndex>
): number {
    const strings = [...stringsAtFret].sort((a, b) => a - b);
    const fullMask = (1 << strings.length) - 1;
    const candidates: number[] = strings.map((_, index) => 1 << index);

    for (let left = 0; left < strings.length; left++) {
        for (let right = left + 1; right < strings.length; right++) {
            const minString = strings[left];
            const maxString = strings[right];
            const covered = strings.filter((string) => string >= minString && string <= maxString);
            if (!canFormBarre(fret, covered, fretByString, openStringSet)) continue;
            let mask = 0;
            for (let index = 0; index < strings.length; index++) {
                if (strings[index] >= minString && strings[index] <= maxString) mask |= 1 << index;
            }
            candidates.push(mask);
        }
    }

    const minimum = Array.from({ length: fullMask + 1 }, () => Number.POSITIVE_INFINITY);
    minimum[0] = 0;
    for (let mask = 0; mask <= fullMask; mask++) {
        if (!Number.isFinite(minimum[mask])) continue;
        for (const candidate of candidates) {
            minimum[mask | candidate] = Math.min(minimum[mask | candidate], minimum[mask] + 1);
        }
    }
    return minimum[fullMask];
}

/** Barre-aware minimum finger count across every fret. */
function countFingerGroups(points: FingeringPoint[], openStringSet: Set<GuitarStringIndex>): number {
    const fretByString = new Map<GuitarStringIndex, number>();
    const pointsByFret = new Map<number, GuitarStringIndex[]>();
    for (const point of points) {
        fretByString.set(point.string, point.fret);
        const strings = pointsByFret.get(point.fret) ?? [];
        strings.push(point.string);
        pointsByFret.set(point.fret, strings);
    }
    return [...pointsByFret.entries()].reduce(
        (count, [fret, strings]) => count + countMinimumFingerGroupsAtFret(fret, strings, fretByString, openStringSet),
        0
    );
}

/**
 * Deductive hand-playability check. Four fingers remain the thumb-allocation threshold, while
 * coordinate-only shapes with five inferred groups remain uncertain because the input cannot
 * expose every roll or partial barre; six groups are still a hard rejection. Several strings
 * sharing a fret can be split across reachable mini-barres instead of being treated all-or-none.
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

    if (fingerGroupCount > MAX_HARD_FINGER_GROUPS) {
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
