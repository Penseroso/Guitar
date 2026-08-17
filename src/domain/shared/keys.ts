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
