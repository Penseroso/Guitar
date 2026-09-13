// Public chord-theory and presentation types. The live voicing engine is exposed
// through explicit domain/chord/engine/* modules so legacy search cannot become an
// accidental production dependency through this barrel.
export type {
    PitchClass,
    GuitarStringIndex,
    ChordDefinition,
    ChordTone,
    ChordTones,
    VoicingTemplateString,
    VoicingTemplate,
    ResolvedVoicingNote,
    ResolvedVoicing,
    ChordInterpretationCandidate,
} from './types';

export type {
    ChordFamilyId,
    ChordFamilyDefinition,
    VoicingTemplateHint,
    ChordRegistryEntry,
} from './registry';

export {
    CHORD_FAMILIES,
    CHORD_REGISTRY_LIST,
    CHORD_REGISTRY,
    CHORD_REGISTRY_BY_SYMBOL,
    CHORD_REGISTRY_BY_LEGACY_TYPE,
    getChordRegistryEntry,
    getChordRegistryEntryBySymbol,
    getChordRegistryEntryByLegacyType,
} from './registry';

export type { BuildChordDefinitionOptions } from './helpers';

export {
    normalizePitchClass,
    getChordRegistryEntryOrThrow,
    resolveChordRegistryEntry,
    buildChordDefinitionFromRegistryEntry,
    buildChordTonesFromRegistryEntry,
    buildChordTonesById,
    getRequiredChordDegrees,
    getRequiredChordTones,
    getChordTypeLabel,
    getChordTypeSuffix,
} from './helpers';

export {
    deriveChordToneRole,
    isRequiredChordDegree,
    isFormulaClosedChordFamily,
    buildNormalizedChordTonesForEntry,
} from './semantics';

export { identifyChordsForPitchClasses } from './chordRecognition';

export type {
    HarmonicFunctionFit,
    FunctionalHarmonyKind,
    HarmonicFunctionInterpretation,
} from './functional-interpretation';

export {
    interpretChordAgainstTonalCenter,
} from './functional-interpretation';

export type {
    ChordRelatedScaleSuggestion,
    ChordScaleSuggestionCategory,
    HarmonicTonalContext,
} from './related-scales';

export {
    getRelatedScaleSuggestionsForChord,
} from './related-scales';
