import { STANDARD_GUITAR_TUNING_PITCH_CLASSES } from '../tuning';
import { getRequiredChordDegrees, normalizePitchClass, resolveChordRegistryEntry } from './helpers';
import { isFormulaClosedChordFamily } from './semantics';
import type { ChordRegistryEntry } from './registry';
import type { GuitarStringIndex, VoicingTemplate, VoicingTemplateString } from './types';

type GeneratedFamily = 'shell' | 'compact' | 'upper-register' | 'full';

interface GeneratedBlueprint {
    family: GeneratedFamily;
    rootString: GuitarStringIndex;
    strings: GuitarStringIndex[];
    maxNotes: number;
}

const GENERATED_BLUEPRINTS: GeneratedBlueprint[] = [
    { family: 'shell', rootString: 5, strings: [5, 4, 3, 2], maxNotes: 4 },
    { family: 'shell', rootString: 4, strings: [4, 3, 2, 1], maxNotes: 4 },
    { family: 'compact', rootString: 5, strings: [5, 4, 3, 2], maxNotes: 4 },
    { family: 'compact', rootString: 4, strings: [4, 3, 2, 1], maxNotes: 4 },
    { family: 'full', rootString: 5, strings: [5, 3, 2, 1, 0], maxNotes: 5 },
    { family: 'full', rootString: 4, strings: [4, 3, 2, 1, 0], maxNotes: 5 },
    { family: 'upper-register', rootString: 4, strings: [4, 3, 2, 1], maxNotes: 4 },
    { family: 'upper-register', rootString: 3, strings: [3, 2, 1, 0], maxNotes: 4 },
];

const FAMILY_LABELS: Record<GeneratedFamily, string> = {
    shell: 'Shell',
    compact: 'Compact',
    full: 'Full',
    'upper-register': 'Upper Register',
};

function buildDegreeIntervalMap(entry: ChordRegistryEntry): Map<string, number> {
    return new Map(entry.formula.degrees.map((degree, index) => [degree, entry.formula.intervals[index]]));
}

function getThirdDegree(entry: ChordRegistryEntry): string | null {
    if (entry.formula.degrees.includes('3')) return '3';
    if (entry.formula.degrees.includes('b3')) return 'b3';
    if (entry.id === 'sus2') return '2';
    if (entry.id === 'sus4') return '4';
    return null;
}

function getSeventhDegree(entry: ChordRegistryEntry): string | null {
    if (entry.formula.degrees.includes('7')) return '7';
    if (entry.formula.degrees.includes('b7')) return 'b7';
    if (entry.formula.degrees.includes('6')) return '6';
    return null;
}

function getExtensionPriority(entry: ChordRegistryEntry): string[] {
    const ordered = ['13', '9', '#9', 'b9', '11', '#11', 'b13', '2', '4'];
    return ordered.filter((degree) => entry.formula.degrees.includes(degree));
}

function getFifthPriority(entry: ChordRegistryEntry): string[] {
    const ordered = ['b5', '5', '#5'];
    return ordered.filter((degree) => entry.formula.degrees.includes(degree));
}

function getDegreePriority(entry: ChordRegistryEntry): string[] {
    const requiredDegrees = new Set(getRequiredChordDegrees(entry));
    const orderedByRole = [
        '1',
        getThirdDegree(entry),
        getSeventhDegree(entry),
        ...getExtensionPriority(entry),
        ...getFifthPriority(entry),
    ].filter((degree): degree is string => Boolean(degree));

    for (const degree of entry.formula.degrees) {
        if (!orderedByRole.includes(degree)) {
            orderedByRole.push(degree);
        }
    }

    return [
        ...orderedByRole.filter((degree) => requiredDegrees.has(degree)),
        ...orderedByRole.filter((degree) => !requiredDegrees.has(degree)),
    ];
}

function buildFullVoicingDegrees(entry: ChordRegistryEntry, maxNotes: number): string[] {
    const thirdLike = getThirdDegree(entry);
    const seventhLike = getSeventhDegree(entry);
    const extensionLike = getExtensionPriority(entry)[0] ?? null;
    const fifthLike = getFifthPriority(entry)[0] ?? null;
    const duplicatePlan = [
        '1',
        seventhLike ?? extensionLike ?? fifthLike ?? thirdLike,
        thirdLike ?? extensionLike ?? fifthLike,
        fifthLike ?? extensionLike ?? '1',
        '1',
        extensionLike ?? fifthLike ?? thirdLike ?? '1',
    ].filter((degree): degree is string => Boolean(degree));

    return duplicatePlan.slice(0, Math.min(maxNotes, 6));
}

function getDegreesForGeneratedFamily(entry: ChordRegistryEntry, family: GeneratedFamily, maxNotes: number): string[] {
    const requiredDegrees = getRequiredChordDegrees(entry);
    const degreePriority = getDegreePriority(entry);

    if (family === 'full') {
        return buildFullVoicingDegrees(entry, maxNotes);
    }

    if (family === 'shell') {
        if (isFormulaClosedChordFamily(entry)) {
            return entry.formula.degrees.slice(0, maxNotes);
        }

        return degreePriority
            .filter((degree) => requiredDegrees.includes(degree))
            .slice(0, Math.min(maxNotes, Math.max(3, requiredDegrees.length)));
    }

    return degreePriority.slice(0, maxNotes);
}

function chooseOffsetForDegree(args: {
    rootString: GuitarStringIndex;
    string: GuitarStringIndex;
    interval: number;
    preferredOffset?: number;
}): number {
    const { rootString, string, interval } = args;
    const preferredOffset = args.preferredOffset ?? 0;
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

function buildGeneratedTemplateStrings(
    entry: ChordRegistryEntry,
    blueprint: GeneratedBlueprint,
    degrees: string[]
): VoicingTemplateString[] {
    const degreeIntervalMap = buildDegreeIntervalMap(entry);
    const assignedDegrees = new Map<GuitarStringIndex, string>();

    blueprint.strings.slice(0, degrees.length).forEach((string, index) => {
        assignedDegrees.set(string, degrees[index]);
    });

    return ([0, 1, 2, 3, 4, 5] as GuitarStringIndex[]).map((string) => {
        const degree = assignedDegrees.get(string);

        if (!degree) {
            return {
                string,
                fretOffset: null,
            };
        }

        const interval = degreeIntervalMap.get(degree);
        if (interval === undefined) {
            return {
                string,
                fretOffset: null,
            };
        }

        return {
            string,
            fretOffset: string === blueprint.rootString
                ? 0
                : chooseOffsetForDegree({
                    rootString: blueprint.rootString,
                    string,
                    interval,
                }),
            toneDegree: degree,
            isOptional: !getRequiredChordDegrees(entry).includes(degree),
        };
    });
}

function buildGeneratedTemplate(entry: ChordRegistryEntry, blueprint: GeneratedBlueprint): VoicingTemplate | null {
    if (blueprint.family === 'full' && entry.family === 'extended') {
        return null;
    }

    const degrees = getDegreesForGeneratedFamily(entry, blueprint.family, blueprint.maxNotes);

    if (degrees.length < 3 || !degrees.includes('1')) {
        return null;
    }

    return {
        id: `${entry.id}:generated:${blueprint.family}:root-${blueprint.rootString + 1}`,
        label: `Root ${blueprint.rootString + 1} (${FAMILY_LABELS[blueprint.family]})`,
        instrument: 'guitar',
        rootString: blueprint.rootString,
        strings: buildGeneratedTemplateStrings(entry, blueprint, degrees),
        source: 'generated',
        tags: [
            ...(entry.tags ?? []),
            `root-string-${blueprint.rootString + 1}`,
            'generated',
            `generated-${blueprint.family}`,
        ],
    };
}

export function getGeneratedVoicingTemplatesForChord(entryInput: string | ChordRegistryEntry): VoicingTemplate[] {
    const entry = resolveChordRegistryEntry(entryInput);

    return GENERATED_BLUEPRINTS
        .map((blueprint) => buildGeneratedTemplate(entry, blueprint))
        .filter((template): template is VoicingTemplate => template !== null);
}
