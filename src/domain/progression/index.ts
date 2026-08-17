// Progression domain: Roman-numeral degree theory, the curated preset library, progression
// document editing commands, and the playback-preview pipeline the inspector's play button uses.
export type { HarmonicFunction, ChordNode, Measure, ProgressionDocument } from './types';

export {
    ROMAN_NUMERAL_CHORDS,
    getChordFromDegree,
    degreeToChordName,
    getChordTones,
    injectSecondaryDominants,
} from './degrees';

export type { ProgressionData } from './progressions';
export { PROGRESSION_LIBRARY } from './progressions';

export type { ProgressionDraftApplyMode } from './progression';
export {
    cloneDoc,
    clampIndex,
    createNode,
    insertNodeIntoMeasure,
    parsePresetToMeasures,
    buildMeasuresFromDegrees,
    injectTritoneSubstitution,
    injectSecondaryDominant,
    injectSubdominantMinor,
    togglePicardyThird,
    injectFlatSix,
    injectFlatSeven,
    applyDraftToProgressionDocument,
} from './progression';

export type { ProgressionPlaybackData } from './getProgressionPlaybackData';
export { getProgressionPlaybackData } from './getProgressionPlaybackData';

export { resolveProgressionChordPitches } from './resolveProgressionChordPitches';
