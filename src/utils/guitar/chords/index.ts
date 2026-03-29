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
    buildChordDefinitionById,
    buildChordTonesFromRegistryEntry,
    buildChordTonesById,
    getRequiredChordDegrees,
    getOptionalChordDegrees,
    getRequiredChordTones,
    getOptionalChordTones,
    getChordRegistryEntryFromLegacyTypeOrThrow,
} from './helpers';

export {
    deriveChordToneRole,
    isRequiredChordDegree,
    buildNormalizedChordTonesForEntry,
} from './semantics';
