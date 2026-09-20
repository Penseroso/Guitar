import { getKeyName } from '@/domain/shared/keys';
import { getCuratedChordsForScale } from './canonical-chord-scales';
import { canonicalTone } from './engine/catalog';
import { spellChordToneName } from './engine/presentation';
import { getChordTypeSuffix } from './helpers';
import { CHORD_REGISTRY_LIST, type ChordRegistryEntry } from './registry';
import { SCALES } from '@/domain/scale';
import type { PitchClass } from './types';

/**
 * "Play this scale over": which chords, rooted on the scale's own tonic, this scale can be played
 * over. Kept apart into three explicit layers:
 *
 *  - `primary` — curated practice: this scale is the primary, standard choice over that chord
 *    (e.g. Dorian over m7, Mixolydian over 7, Altered over 7#9/7b9).
 *  - `characteristic` — curated practice: this scale is an established modal or tension colour
 *    pairing (e.g. Phrygian over m7 with b2, Lydian Dominant over 7 with #11, Locrian ♮2 over m7b5).
 *  - `containment` — deductive fact: every note of the chord is in the scale. A literal claim
 *    about notes, not an idiom claim.
 */

export type ChordScaleFitBasis = 'primary' | 'characteristic' | 'containment';

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
    const curated = getCuratedChordsForScale(scaleGroup, scaleName);
    const primaryIds = new Set(curated.primary ?? []);
    const characteristicIds = new Set(curated.characteristic ?? []);

    const primary: ScaleCompatibleChord[] = [];
    const characteristic: ScaleCompatibleChord[] = [];
    const containment: ScaleCompatibleChord[] = [];

    for (const entry of CHORD_REGISTRY_LIST) {
        const isPrimary = primaryIds.has(entry.id);
        const isCharacteristic = characteristicIds.has(entry.id);
        const isCurated = isPrimary || isCharacteristic;

        const outside = entry.formula.intervals
            .map((interval, index) => ({ index, pitchClass: normalizePitchClass(root + interval) }))
            .filter(({ pitchClass }) => !scalePitchClasses.has(pitchClass));

        if (!isCurated && outside.length > 0) continue;

        const toneNames = spellTones(entry, root);
        const basis: ChordScaleFitBasis = isPrimary
            ? 'primary'
            : isCharacteristic
                ? 'characteristic'
                : 'containment';

        const chord: ScaleCompatibleChord = {
            chordId: entry.id,
            chordSuffix: getChordTypeSuffix(entry),
            rootPitchClass: root,
            rootNoteName,
            basis,
            toneNames,
            tonesOutsideScale: outside.map(({ index }) => toneNames[index]),
        };

        if (isPrimary) primary.push(chord);
        else if (isCharacteristic) characteristic.push(chord);
        else containment.push(chord);
    }

    return [...primary, ...characteristic, ...containment];
}
