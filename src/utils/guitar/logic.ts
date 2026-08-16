// Barrel: this file used to hold pure note/degree/key theory mixed with guitar-specific
// fretboard interpretation (fingering, double-stop placement) in one module. Truth now lives
// in notes.ts/degrees.ts/keys.ts, guitar interpretation in doubleStops.ts/fingering.ts —
// re-exported below under their original names so existing imports keep working.

export { getNoteName, getNoteIndex } from './notes';
export { getChordFromDegree, degreeToChordName, getChordTones, injectSecondaryDominants } from './degrees';
export { getCircleOfFifthsOrder, getRelativeMinor, getDiatonicCluster } from './keys';
export { getHarmonicDoubleStops, getPlayableDoubleStopsOnStrings } from './doubleStops';
export { getChordFingering, getSortedVoicings } from './fingering';
