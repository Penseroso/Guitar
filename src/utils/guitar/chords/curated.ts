import { STANDARD_GUITAR_TUNING_PITCH_CLASSES } from '../tuning';
import { buildChordTonesFromRegistryEntry, normalizePitchClass, resolveChordRegistryEntry } from './helpers';
import type { ChordRegistryEntry } from './registry';
import type { GuitarStringIndex, VoicingTemplate, VoicingTemplateString } from './types';

interface CuratedVoicingSeed {
    id: string;
    label: string;
    rootString: GuitarStringIndex;
    offsets: Array<number | null>;
}

const CURATED_VOICING_SEEDS: Partial<Record<ChordRegistryEntry['id'], CuratedVoicingSeed[]>> = {
    major: [
        {
            id: 'root-6-reviewed-open',
            label: 'Root 6 (Reviewed Open)',
            rootString: 5,
            offsets: [0, 0, 1, 2, 2, 0],
        },
        {
            id: 'root-5-reviewed-caged',
            label: 'Root 5 (Reviewed CAGED)',
            rootString: 4,
            offsets: [0, 2, 2, 2, 0, null],
        },
    ],
    minor: [
        {
            id: 'root-6-reviewed-open',
            label: 'Root 6 (Reviewed Open)',
            rootString: 5,
            offsets: [0, 0, 0, 2, 2, 0],
        },
        {
            id: 'root-5-reviewed-caged',
            label: 'Root 5 (Reviewed CAGED)',
            rootString: 4,
            offsets: [0, 1, 2, 2, 0, null],
        },
    ],
    'major-7': [
        {
            id: 'root-5-reviewed-drop-2',
            label: 'Root 5 (Reviewed Drop 2)',
            rootString: 4,
            offsets: [0, 2, 1, 2, 0, null],
        },
        {
            id: 'root-4-reviewed-drop-2',
            label: 'Root 4 (Reviewed Drop 2)',
            rootString: 3,
            offsets: [2, 2, 2, 0, null, null],
        },
    ],
    'minor-7': [
        {
            id: 'root-5-reviewed-drop-2',
            label: 'Root 5 (Reviewed Drop 2)',
            rootString: 4,
            offsets: [0, 1, 0, 2, 0, null],
        },
        {
            id: 'root-4-reviewed-drop-2',
            label: 'Root 4 (Reviewed Drop 2)',
            rootString: 3,
            offsets: [1, 1, 2, 0, null, null],
        },
    ],
    'dominant-7': [
        {
            id: 'root-5-reviewed-c7',
            label: 'Root 5 (Reviewed C7)',
            rootString: 4,
            offsets: [-3, -2, 0, -1, 0, null],
        },
        {
            id: 'root-4-reviewed-drop-2',
            label: 'Root 4 (Reviewed Drop 2)',
            rootString: 3,
            offsets: [2, 1, 2, 0, null, null],
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

function buildCuratedTemplateStrings(entry: ChordRegistryEntry, seed: CuratedVoicingSeed): VoicingTemplateString[] {
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

function buildCuratedTags(entry: ChordRegistryEntry, seed: CuratedVoicingSeed): string[] {
    return Array.from(new Set([
        ...(entry.tags ?? []),
        ...(entry.voicingHint?.tags ?? []),
        'curated',
        'reviewed',
        `root-string-${seed.rootString + 1}`,
    ]));
}

function buildCuratedVoicingTemplate(entry: ChordRegistryEntry, seed: CuratedVoicingSeed): VoicingTemplate {
    return {
        id: `${entry.id}:curated:${seed.id}`,
        label: seed.label,
        instrument: 'guitar',
        rootString: seed.rootString,
        strings: buildCuratedTemplateStrings(entry, seed),
        source: 'curated',
        tags: buildCuratedTags(entry, seed),
    };
}

export function getCuratedVoicingTemplatesForChord(entryInput: string | ChordRegistryEntry): VoicingTemplate[] {
    const entry = resolveChordRegistryEntry(entryInput);
    const seeds = CURATED_VOICING_SEEDS[entry.id] ?? [];

    return seeds.map((seed) => buildCuratedVoicingTemplate(entry, seed));
}
