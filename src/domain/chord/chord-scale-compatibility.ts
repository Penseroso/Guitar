import { getKeyName } from '@/domain/shared/keys';
import { getCanonicalChordsForScale } from './canonical-chord-scales';
import { canonicalTone } from './engine/catalog';
import { spellChordToneName } from './engine/presentation';
import { getChordTypeSuffix } from './helpers';
import { CHORD_REGISTRY_LIST, type ChordRegistryEntry } from './registry';
import { SCALES } from '@/domain/scale';
import type { PitchClass } from './types';

/**
 * "Play this scale over": which chords, rooted on the scale's own tonic, this scale can be played
 * over. Two layers with two different kinds of claim, kept apart because they are not the same
 * statement and one cannot be derived from the other:
 *
 *  - `canonical` — curated practice: this scale is the standard choice over that chord
 *    (canonical-chord-scales.ts). Admitted whether or not every chord tone is in the scale: the
 *    altered scale is *the* scale for a 7#9 precisely because it replaces the chord's natural 5th.
 *    `tonesOutsideScale` names what it replaces, so the card never overstates.
 *  - `containment` — deductive fact: every note of the chord is in the scale. A literal claim
 *    about notes, not a recommendation. It can admit a chord the scale merely spells
 *    enharmonically (a minor triad over Lydian #2, whose #2 is also a b3) — true as stated, which
 *    is why the UI states it exactly rather than implying the chord sounds idiomatic.
 *
 * Deliberately excluded from v1: stylistic/colour options (the "you could also try" layer).
 */

export type ChordScaleFitBasis = 'canonical' | 'containment';

export interface ScaleCompatibleChord {
    chordId: string;
    /** Registry suffix, e.g. "m7" ("" for a plain major triad). */
    chordSuffix: string;
    rootPitchClass: PitchClass;
    /** Root spelled as the scale's tonic, e.g. "F#". */
    rootNoteName: string;
    basis: ChordScaleFitBasis;
    /** Chord tones spelled in the chord's own frame, e.g. ["C", "E", "G", "Bb"]. */
    toneNames: string[];
    /** Chord tones the scale does not contain — always empty for `containment`. */
    tonesOutsideScale: string[];
}

function normalizePitchClass(value: number): PitchClass {
    return ((value % 12) + 12) % 12;
}

function spellTones(entry: ChordRegistryEntry, rootPitchClass: PitchClass): string[] {
    return entry.formula.degrees.map((degree, index) =>
        // canonicalTone is the registry's own rule for the fully diminished 7th, whose top note
        // is stored as '6' but functions (and must be spelled) as a bb7.
        spellChordToneName(rootPitchClass, canonicalTone(entry.id, degree), entry.formula.intervals[index]));
}

export function getScaleCompatibleChords(
    scaleGroup: string,
    scaleName: string,
    tonicPitchClass: PitchClass
): ScaleCompatibleChord[] {
    const intervals = SCALES[scaleGroup]?.[scaleName];
    if (!intervals || intervals.length === 0) return [];

    const root = normalizePitchClass(tonicPitchClass);
    const rootNoteName = getKeyName(root);
    const scalePitchClasses = new Set(intervals.map((interval) => normalizePitchClass(root + interval)));
    const canonicalIds = new Set(getCanonicalChordsForScale(scaleGroup, scaleName));

    const canonical: ScaleCompatibleChord[] = [];
    const containment: ScaleCompatibleChord[] = [];

    for (const entry of CHORD_REGISTRY_LIST) {
        const isCanonical = canonicalIds.has(entry.id);
        const outside = entry.formula.intervals
            .map((interval, index) => ({ index, pitchClass: normalizePitchClass(root + interval) }))
            .filter(({ pitchClass }) => !scalePitchClasses.has(pitchClass));

        if (!isCanonical && outside.length > 0) continue;

        const toneNames = spellTones(entry, root);
        const chord: ScaleCompatibleChord = {
            chordId: entry.id,
            chordSuffix: getChordTypeSuffix(entry),
            rootPitchClass: root,
            rootNoteName,
            basis: isCanonical ? 'canonical' : 'containment',
            toneNames,
            tonesOutsideScale: outside.map(({ index }) => toneNames[index]),
        };
        (isCanonical ? canonical : containment).push(chord);
    }

    // Canonical pairings first: the practice claim is the headline, literal note-fit follows.
    return [...canonical, ...containment];
}
