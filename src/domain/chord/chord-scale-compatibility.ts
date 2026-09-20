import { buildScaleId, SCALES } from '@/domain/scale';
import { getChordTypeSuffix } from './helpers';
import { CHORD_REGISTRY_LIST } from './registry';
import { getRelatedScaleSuggestionsForChord } from './related-scales';
import type { PitchClass } from './types';

/**
 * "Play this scale over": which chords, rooted on the scale's own tonic, can sit under this
 * scale. Two layers, deliberately kept apart:
 *
 * 1. Structural fit (decides membership). A chord is listed iff EVERY pitch class of its full
 *    declared formula is a member of the scale. Not the "required degrees" subset: that rule
 *    describes which tones a voicing may omit, not whether the scale can stand in for the chord.
 *    (C7 over C Whole Tone fails because the natural 5th G is absent, even though the 5th is
 *    "optional" in a voicing.)
 * 2. Canonical label (sort order and wording only, never membership). A chord that already passed
 *    layer 1 is marked when this scale is its textbook chord-scale pairing.
 *
 * Idiomatic/stylistic pairings (blues and pentatonic practice, riff-oriented power chords) are
 * intentionally out of scope for v1.
 */

/**
 * Chords whose `primary` entry in related-scales.ts is a stylistic or ambiguous convention rather
 * than a standard chord-scale pairing, so it must not be presented as canonical: power chords have
 * no third to define a scale, and suspended chords are equally at home over several scales.
 */
const NON_CANONICAL_CHORD_IDS: ReadonlySet<string> = new Set(['power-5', 'sus2', 'sus4']);

/** `${chordId}|${scaleId}` for every audited canonical pairing, derived from the curated table. */
const CANONICAL_PAIRINGS: ReadonlySet<string> = (() => {
    const pairs = new Set<string>();
    for (const entry of CHORD_REGISTRY_LIST) {
        if (NON_CANONICAL_CHORD_IDS.has(entry.id)) continue;
        for (const suggestion of getRelatedScaleSuggestionsForChord(entry.id)) {
            if (suggestion.category === 'primary') {
                pairs.add(`${entry.id}|${buildScaleId(suggestion.group, suggestion.name)}`);
            }
        }
    }
    return pairs;
})();

export interface ScaleCompatibleChord {
    chordId: string;
    /** Registry suffix, e.g. "m7", "maj7" ("" for a plain major triad). */
    chordSuffix: string;
    rootPitchClass: PitchClass;
    /** The full formula pitch classes, every one of which is in the scale. */
    formulaPitchClasses: PitchClass[];
    /** True when this scale is the textbook chord-scale pairing for the chord. */
    canonical: boolean;
}

function normalizePitchClass(value: number): PitchClass {
    return ((value % 12) + 12) % 12;
}

export function getScaleCompatibleChords(
    scaleGroup: string,
    scaleName: string,
    tonicPitchClass: PitchClass
): ScaleCompatibleChord[] {
    const intervals = SCALES[scaleGroup]?.[scaleName];
    if (!intervals || intervals.length === 0) {
        return [];
    }

    const scalePitchClasses = new Set(intervals.map((interval) => normalizePitchClass(tonicPitchClass + interval)));
    const scaleId = buildScaleId(scaleGroup, scaleName);
    const results: ScaleCompatibleChord[] = [];

    for (const entry of CHORD_REGISTRY_LIST) {
        const formulaPitchClasses = entry.formula.intervals.map((interval) => normalizePitchClass(tonicPitchClass + interval));
        if (!formulaPitchClasses.every((pitchClass) => scalePitchClasses.has(pitchClass))) {
            continue;
        }

        results.push({
            chordId: entry.id,
            chordSuffix: getChordTypeSuffix(entry),
            rootPitchClass: normalizePitchClass(tonicPitchClass),
            formulaPitchClasses,
            canonical: CANONICAL_PAIRINGS.has(`${entry.id}|${scaleId}`),
        });
    }

    // Stable sort: canonical pairings first, registry order otherwise.
    return results
        .map((item, index) => ({ item, index }))
        .sort((a, b) => Number(b.item.canonical) - Number(a.item.canonical) || a.index - b.index)
        .map(({ item }) => item);
}
