import { ChordDefinition, ChordTones, GuitarStringIndex } from './types';
import { buildNormalizedChordTonesForEntry } from './semantics';

export type ChordFamilyId = 'triad' | 'seventh' | 'extended';

export interface ChordFamilyDefinition {
    id: ChordFamilyId;
    label: string;
    description: string;
}

export interface VoicingTemplateHint {
    rootStrings?: GuitarStringIndex[];
    tags?: string[];
}

export interface ChordRegistryEntry {
    id: string;
    symbol: string;
    displayName: string;
    family: ChordFamilyId;
    aliases: string[];
    legacyType?: string;
    formula: {
        degrees: string[];
        intervals: number[];
    };
    definition: ChordDefinition;
    normalizedTones: ChordTones;
    voicingHint?: VoicingTemplateHint;
    tags?: string[];
}

const NORMALIZED_ROOT_PITCH_CLASS = 0;

function createChordRegistryEntry(config: {
    id: string;
    symbol: string;
    displayName: string;
    family: ChordFamilyId;
    degrees: string[];
    intervals: number[];
    quality: string;
    aliases?: string[];
    legacyType?: string;
    extensions?: string[];
    alterations?: string[];
    voicingHint?: VoicingTemplateHint;
    tags?: string[];
}): ChordRegistryEntry {
    const entry: ChordRegistryEntry = {
        id: config.id,
        symbol: config.symbol,
        displayName: config.displayName,
        family: config.family,
        aliases: config.aliases ?? [],
        legacyType: config.legacyType,
        formula: {
            degrees: config.degrees,
            intervals: config.intervals,
        },
        definition: {
            id: config.id,
            symbol: config.symbol,
            rootPitchClass: NORMALIZED_ROOT_PITCH_CLASS,
            quality: config.quality,
            intervals: config.intervals,
            extensions: config.extensions,
            alterations: config.alterations,
            tags: config.tags,
        },
        normalizedTones: {
            rootPitchClass: NORMALIZED_ROOT_PITCH_CLASS,
            intervals: config.intervals,
            tones: [],
        },
        voicingHint: config.voicingHint,
        tags: config.tags,
    };

    entry.normalizedTones.tones = buildNormalizedChordTonesForEntry(entry);

    return entry;
}

export const CHORD_FAMILIES: ChordFamilyDefinition[] = [
    { id: 'triad', label: 'Triads', description: 'Core triads, power chords, and suspended triads.' },
    { id: 'seventh', label: '7th', description: 'Primary seventh-chord colors used by the current app.' },
    { id: 'extended', label: 'Extended', description: 'Ninth, eleventh, thirteenth, and altered dominant sonorities.' },
];

export const CHORD_REGISTRY_LIST: ChordRegistryEntry[] = [
    createChordRegistryEntry({
        id: 'major',
        symbol: '',
        displayName: 'maj',
        family: 'triad',
        degrees: ['1', '3', '5'],
        intervals: [0, 4, 7],
        quality: 'major',
        aliases: ['maj'],
        legacyType: 'Major',
        voicingHint: { rootStrings: [5, 4, 3], tags: ['caged'] },
        tags: ['triad'],
    }),
    createChordRegistryEntry({
        id: 'minor',
        symbol: 'm',
        displayName: 'm',
        family: 'triad',
        degrees: ['1', 'b3', '5'],
        intervals: [0, 3, 7],
        quality: 'minor',
        aliases: ['min', '-'],
        legacyType: 'Minor',
        voicingHint: { rootStrings: [5, 4, 3], tags: ['caged'] },
        tags: ['triad'],
    }),
    createChordRegistryEntry({
        id: 'power-5',
        symbol: '5',
        displayName: '5',
        family: 'triad',
        degrees: ['1', '5'],
        intervals: [0, 7],
        quality: 'power',
        aliases: ['power'],
        legacyType: 'Power (5)',
        voicingHint: { rootStrings: [5, 4], tags: ['power-chord'] },
        tags: ['triad', 'omit-third'],
    }),
    createChordRegistryEntry({
        id: 'major-7',
        symbol: 'maj7',
        displayName: 'maj7',
        family: 'seventh',
        degrees: ['1', '3', '5', '7'],
        intervals: [0, 4, 7, 11],
        quality: 'major-seventh',
        aliases: ['M7', 'Δ7'],
        legacyType: 'Major 7',
        voicingHint: { rootStrings: [5, 4, 3], tags: ['drop-2', 'drop-3'] },
        tags: ['seventh'],
    }),
    createChordRegistryEntry({
        id: 'major-6',
        symbol: '6',
        displayName: '6',
        family: 'seventh',
        degrees: ['1', '3', '5', '6'],
        intervals: [0, 4, 7, 9],
        quality: 'major-sixth',
        aliases: ['maj6', 'M6'],
        legacyType: 'Major 6',
        voicingHint: { rootStrings: [5, 4, 3], tags: ['color-chord', 'rooted'] },
        tags: ['seventh', 'color-chord'],
    }),
    createChordRegistryEntry({
        id: 'minor-7',
        symbol: 'm7',
        displayName: 'm7',
        family: 'seventh',
        degrees: ['1', 'b3', '5', 'b7'],
        intervals: [0, 3, 7, 10],
        quality: 'minor-seventh',
        aliases: ['min7', '-7'],
        legacyType: 'Minor 7',
        voicingHint: { rootStrings: [5, 4, 3], tags: ['drop-2', 'drop-3'] },
        tags: ['seventh'],
    }),
    createChordRegistryEntry({
        id: 'dominant-7',
        symbol: '7',
        displayName: '7',
        family: 'seventh',
        degrees: ['1', '3', '5', 'b7'],
        intervals: [0, 4, 7, 10],
        quality: 'dominant-seventh',
        aliases: ['dom7'],
        legacyType: 'Dominant 7',
        voicingHint: { rootStrings: [5, 4, 3], tags: ['drop-2', 'drop-3'] },
        tags: ['seventh', 'dominant'],
    }),
    createChordRegistryEntry({
        id: 'half-diminished-7',
        symbol: 'm7b5',
        displayName: 'm7b5',
        family: 'seventh',
        degrees: ['1', 'b3', 'b5', 'b7'],
        intervals: [0, 3, 6, 10],
        quality: 'half-diminished',
        aliases: ['ø7', 'half-dim'],
        legacyType: 'm7b5 (Half Dim)',
        voicingHint: { rootStrings: [5, 4, 3], tags: ['drop-2', 'drop-3'] },
        tags: ['seventh', 'diminished-family'],
    }),
    createChordRegistryEntry({
        id: 'diminished-7',
        symbol: 'dim7',
        displayName: 'dim7',
        family: 'seventh',
        degrees: ['1', 'b3', 'b5', '6'],
        intervals: [0, 3, 6, 9],
        quality: 'diminished-seventh',
        aliases: ['°7'],
        legacyType: 'Diminished 7',
        voicingHint: { rootStrings: [5, 4, 3], tags: ['symmetric'] },
        tags: ['seventh', 'diminished-family'],
    }),
    createChordRegistryEntry({
        id: 'major-9',
        symbol: 'maj9',
        displayName: 'maj9',
        family: 'extended',
        degrees: ['1', '3', '5', '7', '9'],
        intervals: [0, 4, 7, 11, 2],
        quality: 'major-ninth',
        aliases: ['M9', 'Δ9'],
        legacyType: 'Major 9',
        extensions: ['9'],
        voicingHint: { rootStrings: [5, 4], tags: ['extended'] },
        tags: ['extended'],
    }),
    createChordRegistryEntry({
        id: 'minor-9',
        symbol: 'm9',
        displayName: 'm9',
        family: 'extended',
        degrees: ['1', 'b3', '5', 'b7', '9'],
        intervals: [0, 3, 7, 10, 2],
        quality: 'minor-ninth',
        aliases: ['min9', '-9'],
        legacyType: 'Minor 9',
        extensions: ['9'],
        voicingHint: { rootStrings: [5, 4], tags: ['extended'] },
        tags: ['extended'],
    }),
    createChordRegistryEntry({
        id: 'dominant-9',
        symbol: '9',
        displayName: '9',
        family: 'extended',
        degrees: ['1', '3', '5', 'b7', '9'],
        intervals: [0, 4, 7, 10, 2],
        quality: 'dominant-ninth',
        aliases: ['dom9'],
        legacyType: 'Dominant 9',
        extensions: ['9'],
        voicingHint: { rootStrings: [5, 4], tags: ['extended', 'dominant'] },
        tags: ['extended', 'dominant'],
    }),
    createChordRegistryEntry({
        id: 'dominant-11',
        symbol: '11',
        displayName: '11',
        family: 'extended',
        degrees: ['1', '3', '5', 'b7', '9', '11'],
        intervals: [0, 4, 7, 10, 2, 5],
        quality: 'dominant-eleventh',
        aliases: ['dom11'],
        legacyType: '11',
        extensions: ['9', '11'],
        voicingHint: { rootStrings: [5, 4], tags: ['extended', 'dominant'] },
        tags: ['extended', 'dominant'],
    }),
    createChordRegistryEntry({
        id: 'dominant-13',
        symbol: '13',
        displayName: '13',
        family: 'extended',
        degrees: ['1', '3', '5', 'b7', '9', '13'],
        intervals: [0, 4, 7, 10, 2, 9],
        quality: 'dominant-thirteenth',
        legacyType: '13',
        extensions: ['9', '13'],
        voicingHint: { rootStrings: [5, 4], tags: ['extended', 'dominant'] },
        tags: ['extended', 'dominant'],
    }),
    createChordRegistryEntry({
        id: 'hendrix-7-sharp-9',
        symbol: '7#9',
        displayName: '7#9',
        family: 'extended',
        degrees: ['1', '3', '5', 'b7', '#9'],
        intervals: [0, 4, 7, 10, 3],
        quality: 'altered-dominant',
        aliases: ['hendrix'],
        legacyType: '7#9 (Hendrix)',
        alterations: ['#9'],
        voicingHint: { rootStrings: [4], tags: ['altered', 'hendrix'] },
        tags: ['altered', 'dominant'],
    }),
    createChordRegistryEntry({
        id: 'dominant-7-flat-9',
        symbol: '7b9',
        displayName: '7b9',
        family: 'extended',
        degrees: ['1', '3', '5', 'b7', 'b9'],
        intervals: [0, 4, 7, 10, 1],
        quality: 'altered-dominant',
        legacyType: '7b9',
        alterations: ['b9'],
        voicingHint: { rootStrings: [5, 4], tags: ['altered', 'dominant'] },
        tags: ['altered', 'dominant'],
    }),
    createChordRegistryEntry({
        id: 'sus4',
        symbol: 'sus4',
        displayName: 'sus4',
        family: 'triad',
        degrees: ['1', '4', '5'],
        intervals: [0, 5, 7],
        quality: 'suspended-fourth',
        aliases: ['sus'],
        legacyType: 'sus4',
        voicingHint: { rootStrings: [5, 4, 3], tags: ['suspended'] },
        tags: ['triad', 'suspended'],
    }),
    createChordRegistryEntry({
        id: 'sus2',
        symbol: 'sus2',
        displayName: 'sus2',
        family: 'triad',
        degrees: ['1', '2', '5'],
        intervals: [0, 2, 7],
        quality: 'suspended-second',
        legacyType: 'sus2',
        voicingHint: { rootStrings: [4, 3], tags: ['suspended'] },
        tags: ['triad', 'suspended'],
    }),
];

export const CHORD_REGISTRY: Record<string, ChordRegistryEntry> = Object.fromEntries(
    CHORD_REGISTRY_LIST.map((entry) => [entry.id, entry])
);

export const CHORD_REGISTRY_BY_SYMBOL: Record<string, ChordRegistryEntry> = Object.fromEntries(
    CHORD_REGISTRY_LIST.flatMap((entry) => [
        [entry.symbol, entry],
        ...entry.aliases.map((alias) => [alias, entry] as const),
    ])
);

export const CHORD_REGISTRY_BY_LEGACY_TYPE: Record<string, ChordRegistryEntry> = Object.fromEntries(
    CHORD_REGISTRY_LIST
        .filter((entry) => entry.legacyType)
        .map((entry) => [entry.legacyType as string, entry])
);

export function getChordRegistryEntry(id: string): ChordRegistryEntry | undefined {
    return CHORD_REGISTRY[id];
}

export function getChordRegistryEntryBySymbol(symbol: string): ChordRegistryEntry | undefined {
    return CHORD_REGISTRY_BY_SYMBOL[symbol];
}

export function getChordRegistryEntryByLegacyType(legacyType: string): ChordRegistryEntry | undefined {
    return CHORD_REGISTRY_BY_LEGACY_TYPE[legacyType];
}
