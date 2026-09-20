/**
 * CURATED PRODUCT POLICY — not derivable fact.
 *
 * "Which chords is this scale the standard choice over?" That is a claim about common practice
 * in chord-scale playing, so it is authored here, explicitly, per scale, rather than inferred
 * from note containment (which is a different and strictly literal claim — see
 * chord-scale-compatibility.ts) or reverse-engineered from Chord mode's chord->scale table
 * (which mixes canonical pairings with color and altered options for a different feature).
 *
 * Rules this table follows, enforced by canonical-chord-scales.test.ts:
 *  - Every scale is listed, even when the answer is "none". A scale added without a decision
 *    fails the test instead of silently showing nothing.
 *  - Every chord id in the registry is either claimed by some scale or listed in
 *    CHORDS_WITHOUT_CANONICAL_SCALE with a reason. A chord added to the registry fails the test
 *    instead of silently dropping out of Scale mode.
 *  - Entries stay conservative: the headline pairing a player would be taught, not every scale
 *    that could colour the chord. Anything merely compatible already appears in the deductive
 *    "every note fits" list, so nothing is lost by leaving it out here.
 */

export type ScaleCanonicalChords = Record<string, Record<string, readonly string[]>>;

export const CANONICAL_CHORDS_BY_SCALE: ScaleCanonicalChords = {
    'Diatonic Modes': {
        // Major-tonic harmony. 6/9, add9 and the suspensions are colours of these, not separate
        // canonical pairings, so they are left to the containment list.
        'Ionian': ['major', 'major-7', 'major-9', 'major-6'],
        // The modal minor; the natural 6th over a minor 7th is the Dorian sound.
        'Dorian': ['minor-7', 'minor-9', 'minor-11', 'minor-6'],
        // Minor with a b2 — the flamenco/modal minor colour.
        'Phrygian': ['minor-7'],
        // The standard scale for a non-functional major 7th (the #11 is its signature).
        'Lydian': ['major-7', 'major-9'],
        'Mixolydian': ['dominant-7', 'dominant-9', 'dominant-13', 'dominant-7-sus4'],
        // Natural minor.
        'Aeolian': ['minor', 'minor-7'],
        'Locrian': ['half-diminished-7'],
    },
    'Harmonic Minor Modes': {
        // Its own tonic chord: a minor triad with a raised 7th.
        'Harmonic Minor': ['minor-major-7'],
        'Locrian #6': ['half-diminished-7'],
        'Ionian #5': ['major-7-sharp-5'],
        'Dorian #4': ['minor-7'],
        // The V of a minor key: a dominant with a b9 and b13.
        'Phrygian Dominant': ['dominant-7-flat-9'],
        // No settled canonical chord: used as a colour over maj7 shapes, which Lydian already
        // covers as the headline pairing.
        'Lydian #2': [],
        // An altered-diminished colour over dim7 rather than the standard choice (Diminished is).
        'Ultralocrian': [],
    },
    'Jazz Minor Modes': {
        'Jazz Minor': ['minor-major-7'],
        'Dorian b2 (Assyrian)': [],
        'Lydian Augmented': ['major-7-sharp-5'],
        // The standard scale for a non-functional dominant (7#11).
        'Lydian Dominant': ['dominant-7'],
        // A dominant heading to a minor chord (b13).
        'Mixolydian b6': ['dominant-7'],
        'Locrian ♮2': ['half-diminished-7'],
        // The altered dominant family. These chords' natural 5th is absent from the scale by
        // design — it is replaced by #5/b5 — which is exactly why this pairing cannot be derived
        // from note containment and has to be stated here.
        'Altered scale': ['hendrix-7-sharp-9', 'dominant-7-flat-9', 'dominant-7-sharp-5', 'dominant-7-flat-5'],
    },
    'Symmetric': {
        'Diminished': ['diminished-7'],
        'Whole Tone': ['dominant-7-sharp-5', 'augmented'],
    },
    'Pentatonic': {
        'Major Pentatonic': ['major', 'major-6'],
        'Minor Pentatonic': ['minor', 'minor-7'],
    },
};

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

/** Chord ids this scale is the standard choice over. Empty for most scales, by design. */
export function getCanonicalChordsForScale(scaleGroup: string, scaleName: string): readonly string[] {
    return CANONICAL_CHORDS_BY_SCALE[scaleGroup]?.[scaleName] ?? [];
}

export function isChordDeclaredWithoutCanonicalScale(chordId: string): boolean {
    return UNCLAIMED.has(chordId);
}
