// Future-facing chord domain surface. Legacy chord-gallery types remain in ../types and ../theory.
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
    VoicingRankingMode,
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
    buildChordDefinitionById,
    buildChordTonesFromRegistryEntry,
    buildChordTonesById,
    getRequiredChordDegrees,
    getOptionalChordDegrees,
    getRequiredChordTones,
    getOptionalChordTones,
    getChordRegistryEntryFromLegacyTypeOrThrow,
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
    buildVoicingTemplateFromLegacyShape,
    getLegacyShapeKeyForChord,
    getVoicingTemplatesForChord,
    getVoicingTemplatesByLegacyType,
} from './templates';

export {
    deriveVoicingDescriptor,
    getVoicingDisplayName,
    getVoicingDisplaySubtitle,
    getVoicingFamilyLabel,
    getVoicingRegisterLabel,
    getVoicingProvenanceLabel,
} from './descriptor';

export {
    getGeneratedVoicingTemplatesForChord,
} from './generated';

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
} from './ranking';

export {
    getVoicingShapeMetrics,
    VOICING_RANKING_MODES,
    scoreResolvedVoicing,
    buildVoicingCandidate,
    rankVoicingCandidates,
} from './ranking';

export type { GetRankedVoicingsOptions } from './voicings';

export {
    getRankedVoicingsForChord,
    orderChordModeVoicingCandidates,
} from './voicings';

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
