// Chord domain surface — the deductive voicing engine (search, ranking, classification) plus
// chord-registry theory and the cross-domain interpretation layer built on top of it.
export type {
    PitchClass,
    GuitarStringIndex,
    ChordDefinition,
    ChordTone,
    ChordTones,
    VoicingTemplateString,
    VoicingTemplate,
    VoicingConstraints,
    VoicingProvenance,
    VoicingProvenanceSourceKind,
    VoicingDescriptor,
    VoicingFamily,
    VoicingRegisterBand,
    ResolvedVoicingNote,
    ResolvedVoicing,
    VoicingCandidate,
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

export {
    deriveVoicingDescriptor,
    getVoicingDisplayName,
    getVoicingDisplaySubtitle,
    getVoicingFamilyLabel,
    getVoicingRegisterLabel,
    getVoicingProvenanceLabel,
} from './descriptor';

// resolveVoicingTemplate has no production caller left (the old template-based engine that used
// it is gone) — it's kept only as test-fixture infrastructure for the new engine's test suites.
export type { ResolveVoicingOptions } from './resolver';
export {
    getCandidateRootFretsForTemplate,
    resolveVoicingNote,
    resolveVoicingTemplate,
    resolveVoicingTemplateAcrossPositions,
    resolveVoicingTemplates,
    resolveVoicingTemplatesAcrossPositions,
    resolveVoicingTemplatesForChord,
    resolveVoicingTemplatesAcrossPositionsForChord,
} from './resolver';

export type {
    VoicingShapeMetrics,
    VoicingScore,
    VoicingTechniqueTag,
    ScoreResolvedVoicingOptions,
} from './deductiveRanking';

export {
    getVoicingShapeMetrics,
    getVoicingTechniqueTag,
    scoreResolvedVoicing,
    buildVoicingCandidate,
    rankVoicingCandidates,
} from './deductiveRanking';

export type { VoicingSearchOptions } from './voicingSearch';
export { searchDeductiveVoicings } from './voicingSearch';

export type { VoicingPosition, VoicingStyleSpec } from './voicingStyles';

export type { DeductiveChordSurfaceOptions } from './rankedVoicingSearch';
export {
    searchAndRankDeductiveVoicings,
    getDeductiveChordSurfaceVoicingsForChord,
} from './rankedVoicingSearch';

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

export type {
    HarmonicRoleLabel,
    ProgressionHandoffPayload,
    ChordProgressionHint,
    ChordProgressionContext,
} from './progression-links';

export {
    getProgressionLinksForChord,
} from './progression-links';
