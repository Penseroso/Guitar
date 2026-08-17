// Pure key-relationship theory (circle of fifths, relative minor, diatonic neighbors) —
// instrument-agnostic.

/**
 * Returns the chromatic note indices (0-11) sorted in the order of the Circle of Fifths.
 * Formula: (i * 7) % 12
 *
 * Result: [0(C), 7(G), 2(D), 9(A), 4(E), 11(B), 6(F#), 1(Db), 8(Ab), 3(Eb), 10(Bb), 5(F)]
 */
export function getCircleOfFifthsOrder(): number[] {
    const order: number[] = [];
    for (let i = 0; i < 12; i++) {
        order.push((i * 7) % 12);
    }
    return order;
}

/**
 * Returns the relative minor key index for a given major key index.
 * Formula: (majorKey + 9) % 12  (which equals majorKey - 3 semitones)
 */
export function getRelativeMinor(majorKey: number): number {
    return (majorKey + 9) % 12;
}

/**
 * The one conventional name for each pitch class *as a key/tonic* — not a generic note-naming
 * default. This is the same fixed spelling the circle of fifths itself is built from (see
 * getCircleOfFifthsOrder's own [0(C), 7(G), ..., 6(F#), 1(Db), ...] comment): sharp keys accumulate
 * clockwise from C, flat keys accumulate the other way, each landing on the spelling every
 * published circle-of-fifths diagram uses (Db not C#, Ab not G#, Eb not D#, Bb not A#, F# at the
 * enharmonic seam to match the existing circle-of-fifths ordering's own choice). A key name is a
 * different problem from spelling an arbitrary scale degree or chord tone correctly within a
 * given key (which depends on that key's own signature, not just the pitch class) — this table is
 * only for naming a tonic/key itself.
 */
const KEY_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export function getKeyName(pitchClass: number): string {
    return KEY_NAMES[((pitchClass % 12) + 12) % 12];
}

/**
 * The conventional name for each pitch class *as a minor tonic* — not simply getKeyName's answer
 * for the same pitch class. A minor key's spelling is conventionally chosen to share its relative
 * major's key signature (same accidental count), and relative-minor is a fixed -3 semitone shift
 * — which lands the minor-key "cheapest spelling" seam at a different rotational point than the
 * major-key one. Concretely this table only disagrees with KEY_NAMES at two spots: C#/Db (index 1)
 * and G#/Ab (index 8) — e.g. G major's key signature (1 sharp: F#) is shared by its relative minor,
 * spelled "E minor" not "Fb minor"; going the other direction, B major (5 sharps) pairs with
 * "G# minor" (5 sharps), not "Ab minor" (7 flats, essentially unused) — even though Ab is
 * KEY_NAMES's answer for that same pitch class as a *major* tonic.
 */
const MINOR_KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

export function getMinorKeyName(pitchClass: number): string {
    return MINOR_KEY_NAMES[((pitchClass % 12) + 12) % 12];
}

/**
 * True enharmonic ties — pitch classes where two spellings are both genuinely common in real
 * usage (unlike e.g. Db/C# major, where Db dominates and C# is rare), so a single wheel label is
 * misleading either way. F#/Gb major is the classic case; its relative minor (D#/Eb minor) sits
 * at a *different* pitch class (relative-minor is a fixed -3 semitone shift) but is the same
 * rotational seam and inherits the same tie. KEY_NAMES/MINOR_KEY_NAMES above already commit to
 * one side (F#, D#) as the primary spelling — this only flags where a dual "X/Y" label belongs
 * alongside it, keyed separately per ring since the major and minor ties land on different pitch
 * classes (6 and 3 respectively).
 */
export const ENHARMONIC_TIE_PITCH_CLASSES: Record<number, { major?: string; minor?: string }> = {
    6: { major: 'Gb' },
    3: { minor: 'eb' },
};

/**
 * Returns the chromatic indices of the 6 diatonic keys in a given key's cluster.
 * The cluster consists of the I, IV, and V chords and their relative minors.
 * These are the immediately adjacent keys on the Circle of Fifths.
 */
export function getDiatonicCluster(rootKey: number): number[] {
    const fifthsOrder = getCircleOfFifthsOrder();
    const rootIdx = fifthsOrder.indexOf(rootKey % 12);

    // The IV is one step counter-clockwise, V is one step clockwise
    const ivIdx = (rootIdx - 1 + 12) % 12;
    const vIdx = (rootIdx + 1) % 12;

    const majorKeys = [
        fifthsOrder[ivIdx],
        fifthsOrder[rootIdx],
        fifthsOrder[vIdx]
    ];

    const minorKeys = majorKeys.map(k => getRelativeMinor(k));

    return [...majorKeys, ...minorKeys];
}
