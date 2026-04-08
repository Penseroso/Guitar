import { STANDARD_GUITAR_TUNING_PITCH_CLASSES } from '../tuning';
import { buildChordTonesFromRegistryEntry, normalizePitchClass, resolveChordRegistryEntry } from './helpers';
import type { ChordRegistryEntry } from './registry';
import type { GuitarStringIndex, VoicingTemplate, VoicingTemplateString } from './types';

export type ArchetypeFamily =
    | 'representative-mid'
    | 'upper-companion'
    | 'compact-seventh'
    | 'controlled-ninth'
    | 'suspension-open';

type ArchetypeChordClass = 'triad' | 'seventh' | 'ninth' | 'suspension';
type ArchetypeRole = 'root' | 'third-like' | 'fifth' | 'seventh-like' | 'extension-like' | 'suspension-like';

interface ArchetypeBlueprint {
    family: ArchetypeFamily;
    rootString: GuitarStringIndex;
    label: string;
    stringOrder: GuitarStringIndex[];
    roleSequence: ArchetypeRole[];
    preferredOffsets: number[];
}

interface ChordArchetypePlan {
    chordClass: ArchetypeChordClass;
    families: ArchetypeFamily[];
}

interface ArchetypeResolvedSlot {
    string: GuitarStringIndex;
    degree: string;
    preferredOffset: number;
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

const CHORD_ARCHETYPE_PLANS: Record<(typeof ARCHETYPE_GENERATED_CHORD_IDS)[number], ChordArchetypePlan> = {
    major: {
        chordClass: 'triad',
        families: ['representative-mid', 'upper-companion'],
    },
    minor: {
        chordClass: 'triad',
        families: ['representative-mid', 'upper-companion'],
    },
    'major-7': {
        chordClass: 'seventh',
        families: ['compact-seventh', 'upper-companion'],
    },
    'minor-7': {
        chordClass: 'seventh',
        families: ['compact-seventh', 'upper-companion'],
    },
    'dominant-7': {
        chordClass: 'seventh',
        families: ['compact-seventh', 'upper-companion'],
    },
    sus2: {
        chordClass: 'suspension',
        families: ['suspension-open', 'upper-companion'],
    },
    sus4: {
        chordClass: 'suspension',
        families: ['suspension-open', 'upper-companion'],
    },
    'major-9': {
        chordClass: 'ninth',
        families: ['controlled-ninth', 'upper-companion'],
    },
    'dominant-9': {
        chordClass: 'ninth',
        families: ['controlled-ninth', 'upper-companion'],
    },
};

const ARCHETYPE_BLUEPRINTS: Record<ArchetypeFamily, Partial<Record<ArchetypeChordClass, ArchetypeBlueprint>>> = {
    'representative-mid': {
        triad: {
            family: 'representative-mid',
            rootString: 4,
            label: 'Root 5 (Representative Mid)',
            stringOrder: [4, 3, 2, 1, 0],
            roleSequence: ['root', 'fifth', 'root', 'third-like', 'fifth'],
            preferredOffsets: [0, 2, 2, 2, 0],
        },
    },
    'upper-companion': {
        triad: {
            family: 'upper-companion',
            rootString: 3,
            label: 'Root 4 (Upper Companion)',
            stringOrder: [3, 2, 1, 0],
            roleSequence: ['root', 'fifth', 'root', 'third-like'],
            preferredOffsets: [0, 2, 2, 0],
        },
        seventh: {
            family: 'upper-companion',
            rootString: 3,
            label: 'Root 4 (Upper Companion 7th)',
            stringOrder: [3, 2, 1, 0],
            roleSequence: ['root', 'fifth', 'seventh-like', 'third-like'],
            preferredOffsets: [0, 2, 2, 2],
        },
        ninth: {
            family: 'upper-companion',
            rootString: 3,
            label: 'Root 4 (Upper Companion 9th)',
            stringOrder: [3, 2, 1, 0],
            roleSequence: ['root', 'third-like', 'seventh-like', 'extension-like'],
            preferredOffsets: [0, -1, 2, 0],
        },
        suspension: {
            family: 'upper-companion',
            rootString: 3,
            label: 'Root 4 (Upper Companion Suspension)',
            stringOrder: [3, 2, 1, 0],
            roleSequence: ['root', 'fifth', 'root', 'suspension-like'],
            preferredOffsets: [0, 2, 2, 0],
        },
    },
    'compact-seventh': {
        seventh: {
            family: 'compact-seventh',
            rootString: 4,
            label: 'Root 5 (Compact 7th)',
            stringOrder: [4, 3, 2, 1, 0],
            roleSequence: ['root', 'fifth', 'seventh-like', 'third-like', 'fifth'],
            preferredOffsets: [0, 2, 1, 2, 0],
        },
    },
    'controlled-ninth': {
        ninth: {
            family: 'controlled-ninth',
            rootString: 4,
            label: 'Root 5 (Controlled 9th)',
            stringOrder: [4, 3, 2, 1],
            roleSequence: ['root', 'third-like', 'seventh-like', 'extension-like'],
            preferredOffsets: [0, -1, 1, 0],
        },
    },
    'suspension-open': {
        suspension: {
            family: 'suspension-open',
            rootString: 4,
            label: 'Root 5 (Suspension Open)',
            stringOrder: [4, 3, 2, 1, 0],
            roleSequence: ['root', 'fifth', 'root', 'suspension-like', 'fifth'],
            preferredOffsets: [0, 2, 2, 0, 0],
        },
    },
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

function getThirdLikeDegree(entry: ChordRegistryEntry): string {
    if (entry.formula.degrees.includes('b3')) {
        return 'b3';
    }

    return '3';
}

function getSeventhLikeDegree(entry: ChordRegistryEntry): string {
    if (entry.formula.degrees.includes('7')) {
        return '7';
    }

    return 'b7';
}

function getExtensionLikeDegree(entry: ChordRegistryEntry): string {
    if (entry.formula.degrees.includes('9')) {
        return '9';
    }

    return entry.formula.degrees.includes('2') ? '2' : entry.formula.degrees[0];
}

function getSuspensionLikeDegree(entry: ChordRegistryEntry): string {
    if (entry.id === 'sus4') {
        return '4';
    }

    return '2';
}

function resolveDegreeForRole(entry: ChordRegistryEntry, role: ArchetypeRole): string | null {
    switch (role) {
        case 'root':
            return '1';
        case 'third-like':
            return getThirdLikeDegree(entry);
        case 'fifth':
            return entry.formula.degrees.includes('5') ? '5' : null;
        case 'seventh-like':
            return getSeventhLikeDegree(entry);
        case 'extension-like':
            return getExtensionLikeDegree(entry);
        case 'suspension-like':
            return getSuspensionLikeDegree(entry);
        default:
            return null;
    }
}

function chooseOffsetForDegree(args: {
    rootString: GuitarStringIndex;
    string: GuitarStringIndex;
    interval: number;
    preferredOffset: number;
}): number {
    const { rootString, string, interval, preferredOffset } = args;
    const rootStringPitch = STANDARD_GUITAR_TUNING_PITCH_CLASSES[rootString];
    const stringPitch = STANDARD_GUITAR_TUNING_PITCH_CLASSES[string];
    const intervalFromRootString = normalizePitchClass(stringPitch - rootStringPitch);
    const baseOffset = normalizePitchClass(interval - intervalFromRootString);
    const candidates = [baseOffset - 12, baseOffset, baseOffset + 12]
        .filter((value) => value >= -6 && value <= 8);

    return candidates.sort((left, right) => {
        const leftDistance = Math.abs(left - preferredOffset);
        const rightDistance = Math.abs(right - preferredOffset);

        if (leftDistance !== rightDistance) {
            return leftDistance - rightDistance;
        }

        return Math.abs(left) - Math.abs(right);
    })[0] ?? baseOffset;
}

function getBlueprintForEntry(entry: ChordRegistryEntry, family: ArchetypeFamily): ArchetypeBlueprint | null {
    const plan = CHORD_ARCHETYPE_PLANS[entry.id as (typeof ARCHETYPE_GENERATED_CHORD_IDS)[number]];
    const blueprint = plan ? ARCHETYPE_BLUEPRINTS[family][plan.chordClass] : undefined;

    return blueprint ?? null;
}

function resolveBlueprintSlots(entry: ChordRegistryEntry, blueprint: ArchetypeBlueprint): ArchetypeResolvedSlot[] {
    const degreeIntervalMap = new Map(entry.formula.degrees.map((degree, index) => [degree, entry.formula.intervals[index]]));

    return blueprint.stringOrder.flatMap((string, index) => {
        const degree = resolveDegreeForRole(entry, blueprint.roleSequence[index]);
        if (!degree) {
            return [];
        }

        const interval = degreeIntervalMap.get(degree);
        if (interval === undefined) {
            return [];
        }

        return [{
            string,
            degree,
            preferredOffset: chooseOffsetForDegree({
                rootString: blueprint.rootString,
                string,
                interval,
                preferredOffset: blueprint.preferredOffsets[index],
            }),
        }];
    });
}

function buildTemplateStrings(entry: ChordRegistryEntry, blueprint: ArchetypeBlueprint): VoicingTemplateString[] {
    const toneDegreeMap = buildToneDegreeMap(entry);
    const resolvedSlots = new Map(resolveBlueprintSlots(entry, blueprint).map((slot) => [slot.string, slot]));
    const rootStringPitchClass = STANDARD_GUITAR_TUNING_PITCH_CLASSES[blueprint.rootString];

    return ([0, 1, 2, 3, 4, 5] as GuitarStringIndex[]).map((string) => {
        const slot = resolvedSlots.get(string);
        if (!slot) {
            return {
                string,
                fretOffset: null,
            };
        }

        const stringPitchClass = STANDARD_GUITAR_TUNING_PITCH_CLASSES[string];
        const normalizedPitchClass = normalizePitchClass(
            stringPitchClass - rootStringPitchClass + slot.preferredOffset
        );
        const matchedTone = toneDegreeMap.get(normalizedPitchClass);

        return {
            string,
            fretOffset: slot.preferredOffset,
            toneDegree: matchedTone?.degree ?? slot.degree,
            isOptional: matchedTone ? !matchedTone.isRequired : undefined,
        };
    });
}

function buildArchetypeTags(entry: ChordRegistryEntry, blueprint: ArchetypeBlueprint, chordClass: ArchetypeChordClass): string[] {
    return Array.from(new Set([
        ...(entry.tags ?? []),
        ...(entry.voicingHint?.tags ?? []),
        'archetype-generated',
        `archetype-${blueprint.family}`,
        `archetype-class-${chordClass}`,
        `root-string-${blueprint.rootString + 1}`,
    ]));
}

function buildArchetypeTemplate(entry: ChordRegistryEntry, family: ArchetypeFamily): VoicingTemplate | null {
    const plan = CHORD_ARCHETYPE_PLANS[entry.id as (typeof ARCHETYPE_GENERATED_CHORD_IDS)[number]];
    const blueprint = getBlueprintForEntry(entry, family);

    if (!plan || !blueprint) {
        return null;
    }

    return {
        id: `${entry.id}:archetype-generated:${family}:root-${blueprint.rootString + 1}`,
        label: blueprint.label,
        instrument: 'guitar',
        rootString: blueprint.rootString,
        strings: buildTemplateStrings(entry, blueprint),
        source: 'archetype-generated',
        tags: buildArchetypeTags(entry, blueprint, plan.chordClass),
    };
}

export function getArchetypePlanForChord(entryInput: string | ChordRegistryEntry): ChordArchetypePlan | null {
    const entry = resolveChordRegistryEntry(entryInput);
    return CHORD_ARCHETYPE_PLANS[entry.id as (typeof ARCHETYPE_GENERATED_CHORD_IDS)[number]] ?? null;
}

export function getArchetypeGeneratedVoicingTemplatesForChord(entryInput: string | ChordRegistryEntry): VoicingTemplate[] {
    const entry = resolveChordRegistryEntry(entryInput);
    const plan = getArchetypePlanForChord(entry);

    if (!plan) {
        return [];
    }

    return plan.families
        .map((family) => buildArchetypeTemplate(entry, family))
        .filter((template): template is VoicingTemplate => template !== null);
}
