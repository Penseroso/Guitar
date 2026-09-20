/**
 * CURATED PRODUCT POLICY & CHORD-SCALE RELATIONSHIPS.
 *
 * "Which chords is this scale played over?"
 *
 * We distinguish two levels of curated chord-scale relationship:
 *  - `primary`: The standard, default textbook pairing (e.g. Dorian for m7, Mixolydian for 7,
 *    Locrian for m7b5, Altered for 7#9/7b9).
 *  - `characteristic`: An established modal or tension colour choice (e.g. Phrygian for m7 with
 *    b2 colour, Lydian Dominant for 7 with #11 colour, Locrian ♮2 for m7b5 with natural 9).
 *
 * Neither claim is identical to strict note containment (`containment` in chord-scale-compatibility.ts),
 * which is a literal note-set subset claim.
 *
 * Rules this table follows, enforced by canonical-chord-scales.test.ts:
 *  - Every scale is listed, even when the answer is empty. A scale added without a decision
 *    fails the test instead of silently showing nothing.
 *  - Every chord id in the registry is either claimed by some scale (primary or characteristic)
 *    or listed in CHORDS_WITHOUT_CANONICAL_SCALE with a reason.
 *  - Entries stay conservative: headline and characteristic pairings a player is taught,
 *    not every possible scale permutation.
 */

export interface ScaleCuratedChords {
    /** Primary, textbook default chord pairings for this scale. */
    primary?: readonly string[];
    /** Characteristic modal or tension color pairings for this scale. */
    characteristic?: readonly string[];
}

export type ScaleCuratedChordsTable = Record<string, Record<string, ScaleCuratedChords>>;

export const CURATED_CHORDS_BY_SCALE: ScaleCuratedChordsTable = {
    'Diatonic Modes': {
        // Major-tonic harmony.
        'Ionian': {
            primary: ['major', 'major-7', 'major-9', 'major-6'],
        },
        // The modal minor; the natural 6th over a minor 7th is the Dorian sound.
        'Dorian': {
            primary: ['minor-7', 'minor-9', 'minor-11', 'minor-6'],
        },
        // Minor with a b2 — characteristic flamenco/modal minor colour over m7.
        'Phrygian': {
            characteristic: ['minor-7'],
        },
        // Characteristic scale for major 7th when #11 colour is desired.
        'Lydian': {
            characteristic: ['major-7', 'major-9'],
        },
        // Standard dominant family.
        'Mixolydian': {
            primary: ['dominant-7', 'dominant-9', 'dominant-13', 'dominant-7-sus4'],
        },
        // Natural minor: primary for minor triad, characteristic tonic-area minor 7th.
        'Aeolian': {
            primary: ['minor'],
            characteristic: ['minor-7'],
        },
        // Standard half-diminished scale.
        'Locrian': {
            primary: ['half-diminished-7'],
        },
    },
    'Harmonic Minor Modes': {
        // Minor triad with a raised 7th.
        'Harmonic Minor': {
            primary: ['minor-major-7'],
        },
        // Half-diminished variation with natural 13 from harmonic minor.
        'Locrian #6': {
            characteristic: ['half-diminished-7'],
        },
        // Major 7th with #5 tension.
        'Ionian #5': {
            characteristic: ['major-7-sharp-5'],
        },
        // Minor 7th with #11/raised-4th colour.
        'Dorian #4': {
            characteristic: ['minor-7'],
        },
        // The V of a minor key: dominant with b9 and b13.
        'Phrygian Dominant': {
            characteristic: ['dominant-7-flat-9'],
        },
        'Lydian #2': {},
        'Ultralocrian': {},
    },
    'Jazz Minor Modes': {
        'Jazz Minor': {
            primary: ['minor-major-7'],
        },
        'Dorian b2 (Assyrian)': {},
        'Lydian Augmented': {
            characteristic: ['major-7-sharp-5'],
        },
        // Characteristic dominant with #11 colour for non-resolving dominants.
        'Lydian Dominant': {
            characteristic: ['dominant-7'],
        },
        // Characteristic dominant with b13 heading to minor resolution.
        'Mixolydian b6': {
            characteristic: ['dominant-7'],
        },
        // Standard modern jazz half-diminished variation with natural 9.
        'Locrian ♮2': {
            characteristic: ['half-diminished-7'],
        },
        // The altered dominant family.
        'Altered scale': {
            primary: ['hendrix-7-sharp-9', 'dominant-7-flat-9', 'dominant-7-sharp-5', 'dominant-7-flat-5'],
        },
    },
    'Symmetric': {
        'Diminished': {
            primary: ['diminished-7'],
        },
        'Whole Tone': {
            primary: ['dominant-7-sharp-5', 'augmented'],
        },
    },
    'Pentatonic': {
        'Major Pentatonic': {
            primary: ['major', 'major-6'],
        },
        'Minor Pentatonic': {
            primary: ['minor', 'minor-7'],
        },
    },
};

export const CANONICAL_CHORDS_BY_SCALE: Record<string, Record<string, readonly string[]>> = Object.fromEntries(
    Object.entries(CURATED_CHORDS_BY_SCALE).map(([group, scales]) => [
        group,
        Object.fromEntries(
            Object.entries(scales).map(([name, curated]) => [
                name,
                [...(curated.primary ?? []), ...(curated.characteristic ?? [])],
            ])
        ),
    ])
);

/**
 * Chords with no canonical scale in this inventory, and why. Listed explicitly so that adding a
 * chord to the registry forces a decision here rather than quietly producing a chord that no
 * scale is ever "the" scale for.
 */
export const CHORDS_WITHOUT_CANONICAL_SCALE: Readonly<Record<string, string>> = {
    // No third, so no scale is implied — deliberately ambiguous chords.
    'power-5': 'No third: the chord does not imply a major or minor scale.',
    'sus2': 'No third: equally at home in several scales.',
    'sus4': 'No third: equally at home in several scales.',
    // Passing/context chords rather than chords a scale is chosen for.
    'diminished': 'A passing triad; its scale depends on context, unlike the fully diminished 7th.',
    // Colours of chords already covered above, sharing their parent chord's scale.
    'add9': 'A colour of the major triad; Ionian and Major Pentatonic already cover it.',
    'minor-add9': 'A colour of the minor triad; the minor scales already cover it.',
    'six-nine': 'A colour of the major sixth; Ionian and Major Pentatonic already cover it.',
    'dominant-11': 'A voicing of the dominant family; Mixolydian already covers it.',
    'minor-13': 'A colour of the minor 7th family; Dorian already covers it.',
};

const UNCLAIMED = new Set(Object.keys(CHORDS_WITHOUT_CANONICAL_SCALE));

/** Curated chord categories for this scale. */
export function getCuratedChordsForScale(scaleGroup: string, scaleName: string): ScaleCuratedChords {
    return CURATED_CHORDS_BY_SCALE[scaleGroup]?.[scaleName] ?? {};
}

/** Chord ids this scale is a curated choice over (both primary and characteristic). */
export function getCanonicalChordsForScale(scaleGroup: string, scaleName: string): readonly string[] {
    const curated = getCuratedChordsForScale(scaleGroup, scaleName);
    return [...(curated.primary ?? []), ...(curated.characteristic ?? [])];
}

export function isChordDeclaredWithoutCanonicalScale(chordId: string): boolean {
    return UNCLAIMED.has(chordId);
}
