import { STANDARD_GUITAR_TUNING_PITCH_CLASSES } from '../tuning';
import { buildChordTonesFromRegistryEntry, normalizePitchClass, resolveChordRegistryEntry } from './helpers';
import type { ChordRegistryEntry } from './registry';
import type { GuitarStringIndex, VoicingTemplate, VoicingTemplateString } from './types';

type ArchetypeFamily =
    | 'representative-mid'
    | 'upper-companion'
    | 'compact-seventh'
    | 'controlled-ninth'
    | 'suspension-open';

interface ArchetypeGeneratedSeed {
    id: string;
    label: string;
    archetypeFamily: ArchetypeFamily;
    rootString: GuitarStringIndex;
    offsets: Array<number | null>;
}

export const ARCHETYPE_GENERATED_CHORD_IDS = [
    'major',
    'minor',
    'major-7',
    'minor-7',
    'dominant-7',
    'sus2',
    'sus4',
    'major-9',
    'dominant-9',
] as const;

const ARCHETYPE_GENERATED_SEEDS: Partial<Record<ChordRegistryEntry['id'], ArchetypeGeneratedSeed[]>> = {
    major: [
        {
            id: 'representative-mid-root-5',
            label: 'Root 5 (Representative Mid)',
            archetypeFamily: 'representative-mid',
            rootString: 4,
            offsets: [0, 2, 2, 2, 0, null],
        },
        {
            id: 'upper-companion-root-4',
            label: 'Root 4 (Upper Companion)',
            archetypeFamily: 'upper-companion',
            rootString: 3,
            offsets: [2, 3, 2, 0, null, null],
        },
    ],
    minor: [
        {
            id: 'representative-mid-root-5',
            label: 'Root 5 (Representative Mid)',
            archetypeFamily: 'representative-mid',
            rootString: 4,
            offsets: [0, 1, 2, 2, 0, null],
        },
        {
            id: 'upper-companion-root-4',
            label: 'Root 4 (Upper Companion)',
            archetypeFamily: 'upper-companion',
            rootString: 3,
            offsets: [1, 3, 2, 0, null, null],
        },
    ],
    'major-7': [
        {
            id: 'compact-seventh-root-5',
            label: 'Root 5 (Compact 7th)',
            archetypeFamily: 'compact-seventh',
            rootString: 4,
            offsets: [0, 2, 1, 2, 0, null],
        },
        {
            id: 'upper-companion-root-4',
            label: 'Root 4 (Upper Companion 7th)',
            archetypeFamily: 'upper-companion',
            rootString: 3,
            offsets: [2, 2, 2, 0, null, null],
        },
    ],
    'minor-7': [
        {
            id: 'compact-seventh-root-5',
            label: 'Root 5 (Compact 7th)',
            archetypeFamily: 'compact-seventh',
            rootString: 4,
            offsets: [0, 1, 0, 2, 0, null],
        },
        {
            id: 'upper-companion-root-4',
            label: 'Root 4 (Upper Companion 7th)',
            archetypeFamily: 'upper-companion',
            rootString: 3,
            offsets: [1, 1, 2, 0, null, null],
        },
    ],
    'dominant-7': [
        {
            id: 'compact-seventh-root-5',
            label: 'Root 5 (Compact 7th)',
            archetypeFamily: 'compact-seventh',
            rootString: 4,
            offsets: [null, 2, 0, 2, 0, null],
        },
        {
            id: 'upper-companion-root-4',
            label: 'Root 4 (Upper Companion 7th)',
            archetypeFamily: 'upper-companion',
            rootString: 3,
            offsets: [2, 1, 2, 0, null, null],
        },
    ],
    sus2: [
        {
            id: 'suspension-open-root-5',
            label: 'Root 5 (Suspension Open)',
            archetypeFamily: 'suspension-open',
            rootString: 4,
            offsets: [0, 0, 2, 2, 0, null],
        },
        {
            id: 'upper-companion-root-4',
            label: 'Root 4 (Upper Companion Suspension)',
            archetypeFamily: 'upper-companion',
            rootString: 3,
            offsets: [0, 3, 2, 0, null, null],
        },
    ],
    sus4: [
        {
            id: 'suspension-open-root-5',
            label: 'Root 5 (Suspension Open)',
            archetypeFamily: 'suspension-open',
            rootString: 4,
            offsets: [null, 3, 2, 2, 0, null],
        },
        {
            id: 'upper-companion-root-4',
            label: 'Root 4 (Upper Companion Suspension)',
            archetypeFamily: 'upper-companion',
            rootString: 3,
            offsets: [3, 3, 2, 0, null, null],
        },
    ],
    'major-9': [
        {
            id: 'controlled-ninth-root-5',
            label: 'Root 5 (Controlled 9th)',
            archetypeFamily: 'controlled-ninth',
            rootString: 4,
            offsets: [null, 0, 1, -1, 0, null],
        },
        {
            id: 'upper-companion-root-4',
            label: 'Root 4 (Upper Companion 9th)',
            archetypeFamily: 'upper-companion',
            rootString: 3,
            offsets: [0, 2, -1, 0, null, null],
        },
    ],
    'dominant-9': [
        {
            id: 'controlled-ninth-root-5',
            label: 'Root 5 (Controlled 9th)',
            archetypeFamily: 'controlled-ninth',
            rootString: 4,
            offsets: [null, 0, 0, -1, 0, null],
        },
        {
            id: 'upper-companion-root-4',
            label: 'Root 4 (Upper Companion 9th)',
            archetypeFamily: 'upper-companion',
            rootString: 3,
            offsets: [0, 1, -1, 0, null, null],
        },
    ],
};

function buildToneDegreeMap(entry: ChordRegistryEntry): Map<number, { degree: string; isRequired: boolean }> {
    const tones = buildChordTonesFromRegistryEntry(entry, 0).tones;

    return new Map(
        tones.map((tone) => [
            normalizePitchClass(tone.pitchClass),
            {
                degree: tone.degree,
                isRequired: tone.isRequired ?? false,
            },
        ])
    );
}

function buildTemplateStrings(entry: ChordRegistryEntry, seed: ArchetypeGeneratedSeed): VoicingTemplateString[] {
    const toneDegreeMap = buildToneDegreeMap(entry);
    const rootStringPitchClass = STANDARD_GUITAR_TUNING_PITCH_CLASSES[seed.rootString];

    return seed.offsets.map((fretOffset, stringIndex) => {
        const stringPitchClass = STANDARD_GUITAR_TUNING_PITCH_CLASSES[stringIndex];

        if (fretOffset === null) {
            return {
                string: stringIndex as GuitarStringIndex,
                fretOffset: null,
            };
        }

        const normalizedPitchClass = normalizePitchClass(
            stringPitchClass - rootStringPitchClass + fretOffset
        );
        const matchedTone = toneDegreeMap.get(normalizedPitchClass);

        return {
            string: stringIndex as GuitarStringIndex,
            fretOffset,
            toneDegree: matchedTone?.degree,
            isOptional: matchedTone ? !matchedTone.isRequired : undefined,
        };
    });
}

function buildArchetypeTags(entry: ChordRegistryEntry, seed: ArchetypeGeneratedSeed): string[] {
    return Array.from(new Set([
        ...(entry.tags ?? []),
        ...(entry.voicingHint?.tags ?? []),
        'archetype-generated',
        `archetype-${seed.archetypeFamily}`,
        `root-string-${seed.rootString + 1}`,
    ]));
}

function buildArchetypeTemplate(entry: ChordRegistryEntry, seed: ArchetypeGeneratedSeed): VoicingTemplate {
    return {
        id: `${entry.id}:archetype-generated:${seed.id}`,
        label: seed.label,
        instrument: 'guitar',
        rootString: seed.rootString,
        strings: buildTemplateStrings(entry, seed),
        source: 'archetype-generated',
        tags: buildArchetypeTags(entry, seed),
    };
}

export function getArchetypeGeneratedVoicingTemplatesForChord(entryInput: string | ChordRegistryEntry): VoicingTemplate[] {
    const entry = resolveChordRegistryEntry(entryInput);
    const seeds = ARCHETYPE_GENERATED_SEEDS[entry.id] ?? [];

    return seeds.map((seed) => buildArchetypeTemplate(entry, seed));
}
