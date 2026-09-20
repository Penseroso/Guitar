import { getKeyName } from '@/domain/shared/keys';
import {
    parseDegreeLabel,
    parseNoteName,
    romanNumeralForDegree,
    spellDegree,
    type SpelledNote,
} from '@/domain/shared/spelling';
import { SCALES, getScaleEngineIntervalLabels } from './scales';

/**
 * Spells a scale's degrees from the scale's own formula.
 *
 * The formula is the source of truth, not the pitch class: Lydian #2's third note is a raised
 * second, so in C it is D# and its chord is a ♯ii — spelling it Eb/♭iii (which a pitch-class
 * table does) contradicts the scale's own fretboard labels for the same note. Because every
 * supported seven-note scale numbers its degrees 1-7 exactly once, the letter follows from the
 * degree number and the accidental follows from the pitch, with no per-scale special cases.
 *
 * The ENGINE formula is used rather than the DISPLAY one: they agree everywhere except the
 * Altered scale, which DISPLAY spells chord-relatively (b9 #9 3 #11 b13 — how a player reads it
 * over a dominant) and ENGINE spells as the melodic-minor mode it is (b2 b3 b4 b5 b6 b7), one
 * letter per degree. Only the latter can drive letter-cycle spelling.
 */
export interface SpelledScaleDegree {
    /** Index into the scale's own interval array. */
    degreeIndex: number;
    /** Semitones above the tonic. */
    interval: number;
    pitchClass: number;
    /** As written in the scale's formula, e.g. "#2", "bb7". */
    degreeLabel: string;
    /** Note name, e.g. "D#". */
    noteName: string;
    /** Uppercase roman numeral with accidental, e.g. "♯II". Quality casing is the caller's job. */
    romanNumeral: string;
}

function normalizePitchClass(value: number): number {
    return ((value % 12) + 12) % 12;
}

/**
 * Spelled degrees for a scale, or null when the scale cannot be spelled degree-by-degree —
 * which today means a collection that does not number its notes 1-7 exactly once (the 8-note
 * Diminished scale) or an unknown scale. Callers must handle null rather than fall back to a
 * pitch-class name, which would silently reintroduce the wrong spelling.
 */
export function getSpelledScaleDegrees(
    scaleGroup: string,
    scaleName: string,
    tonicPitchClass: number
): SpelledScaleDegree[] | null {
    const intervals = SCALES[scaleGroup]?.[scaleName];
    if (!intervals || intervals.length === 0) return null;

    // The tonic is named by the app's key-naming convention (the same one the root navigator and
    // fretboard show); every other degree is then forced relative to it.
    const tonic: SpelledNote | null = parseNoteName(getKeyName(tonicPitchClass));
    if (!tonic) return null;

    const labels = getScaleEngineIntervalLabels(scaleGroup, scaleName);
    const degrees: SpelledScaleDegree[] = [];
    const seenDegreeNumbers = new Set<number>();

    for (const [degreeIndex, interval] of intervals.entries()) {
        const degreeLabel = labels[interval];
        const parsed = degreeLabel ? parseDegreeLabel(degreeLabel) : null;
        if (!parsed || seenDegreeNumbers.has(parsed.number)) return null;
        seenDegreeNumbers.add(parsed.number);

        const pitchClass = normalizePitchClass(tonicPitchClass + interval);
        const spelled = spellDegree(tonic, parsed.number, pitchClass);
        if (!spelled) return null;

        degrees.push({
            degreeIndex,
            interval,
            pitchClass,
            degreeLabel: degreeLabel!,
            noteName: spelled.name,
            romanNumeral: romanNumeralForDegree(parsed),
        });
    }

    return degrees;
}
