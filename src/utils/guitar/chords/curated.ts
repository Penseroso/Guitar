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

// Curated QA inventory: keep this small and intentionally reviewed. The current subset
// favors representative root-5 mid-register grips plus root-4 upper-register companions so
// the curated layer reads as a consistent preferred inventory rather than a grab bag of shapes.
const CURATED_VOICING_SEEDS: Partial<Record<ChordRegistryEntry['id'], CuratedVoicingSeed[]>> = {
    major: [
        {
            id: 'root-5-reviewed-caged',
            label: 'Root 5 (Reviewed CAGED)',
            rootString: 4,
            offsets: [0, 2, 2, 2, 0, null],
        },
        {
            id: 'root-4-reviewed-upper',
            label: 'Root 4 (Reviewed Upper)',
            rootString: 3,
            offsets: [2, 3, 2, 0, null, null],
        },
    ],
    minor: [
        {
            id: 'root-5-reviewed-caged',
            label: 'Root 5 (Reviewed CAGED)',
            rootString: 4,
            offsets: [0, 1, 2, 2, 0, null],
        },
        {
            id: 'root-4-reviewed-upper',
            label: 'Root 4 (Reviewed Upper)',
            rootString: 3,
            offsets: [1, 3, 2, 0, null, null],
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
            id: 'root-5-reviewed-drop-2',
            label: 'Root 5 (Reviewed Drop 2)',
            rootString: 4,
            offsets: [null, 2, 0, 2, 0, null],
        },
        {
            id: 'root-4-reviewed-drop-2',
            label: 'Root 4 (Reviewed Drop 2)',
            rootString: 3,
            offsets: [2, 1, 2, 0, null, null],
        },
    ],
    sus2: [
        {
            id: 'root-5-reviewed-open-sus2',
            label: 'Root 5 (Reviewed Sus2)',
            rootString: 4,
            offsets: [0, 0, 2, 2, 0, null],
        },
        {
            id: 'root-4-reviewed-upper-sus2',
            label: 'Root 4 (Reviewed Upper Sus2)',
            rootString: 3,
            offsets: [0, 3, 2, 0, null, null],
        },
    ],
    sus4: [
        {
            id: 'root-5-reviewed-open-sus4',
            label: 'Root 5 (Reviewed Sus4)',
            rootString: 4,
            offsets: [null, 3, 2, 2, 0, null],
        },
        {
            id: 'root-4-reviewed-upper-sus4',
            label: 'Root 4 (Reviewed Upper Sus4)',
            rootString: 3,
            offsets: [3, 3, 2, 0, null, null],
        },
    ],
    'major-9': [
        {
            id: 'root-5-reviewed-major-9',
            label: 'Root 5 (Reviewed Major 9)',
            rootString: 4,
            offsets: [null, 0, 1, -1, 0, null],
        },
        {
            id: 'root-4-reviewed-upper-major-9',
            label: 'Root 4 (Reviewed Upper Major 9)',
            rootString: 3,
            offsets: [0, 2, -1, 0, null, null],
        },
    ],
    'dominant-9': [
        {
            id: 'root-5-reviewed-dominant-9',
            label: 'Root 5 (Reviewed Dominant 9)',
            rootString: 4,
            offsets: [null, 0, 0, -1, 0, null],
        },
        {
            id: 'root-4-reviewed-upper-dominant-9',
            label: 'Root 4 (Reviewed Upper Dominant 9)',
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
