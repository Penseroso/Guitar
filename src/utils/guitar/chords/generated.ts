import { STANDARD_GUITAR_TUNING_PITCH_CLASSES } from '../tuning';
import { getRequiredChordDegrees, normalizePitchClass, resolveChordRegistryEntry } from './helpers';
import type { ChordRegistryEntry } from './registry';
import type { GuitarStringIndex, VoicingTemplate, VoicingTemplateString } from './types';

type GeneratedRegisterBias = 'neutral' | 'upper' | 'wide';
type GeneratedLayoutKind = 'contiguous' | 'skip';
type GeneratedCoverageProfile = 'core' | 'inversional' | 'extension-forward' | 'duplicated-root';

interface GeneratedSearchSeed {
    rootString: GuitarStringIndex;
    playedStrings: GuitarStringIndex[];
    noteCount: number;
    layoutKind: GeneratedLayoutKind;
    registerBias: GeneratedRegisterBias;
    coverageProfile: GeneratedCoverageProfile;
}

const EXPLORATORY_ROOT_STRINGS: GuitarStringIndex[] = [5, 4, 3];
const MAX_GENERATED_NOTE_COUNT = 5;

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
        ...getFifthPriority(entry),
        getSeventhDegree(entry),
        ...getExtensionPriority(entry),
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

function combinations<T>(items: T[], pickCount: number): T[][] {
    if (pickCount === 0) {
        return [[]];
    }

    if (pickCount > items.length) {
        return [];
    }

    if (pickCount === items.length) {
        return [items];
    }

    const [first, ...rest] = items;

    return [
        ...combinations(rest, pickCount - 1).map((combo) => [first, ...combo]),
        ...combinations(rest, pickCount),
    ];
}

function classifyLayoutKind(strings: GuitarStringIndex[]): GeneratedLayoutKind {
    for (let index = 1; index < strings.length; index += 1) {
        if (strings[index - 1] - strings[index] > 1) {
            return 'skip';
        }
    }

    return 'contiguous';
}

function getGeneratedRegisterBiases(strings: GuitarStringIndex[], layoutKind: GeneratedLayoutKind): GeneratedRegisterBias[] {
    const biases: GeneratedRegisterBias[] = ['neutral'];

    if (strings.every((string) => string <= 3)) {
        biases.push('upper');
    }

    if (layoutKind === 'skip') {
        biases.push('wide');
    }

    return biases;
}

function getCoverageDegreeOrders(entry: ChordRegistryEntry): Record<GeneratedCoverageProfile, string[]> {
    const thirdLike = getThirdDegree(entry);
    const seventhLike = getSeventhDegree(entry);
    const fifthLike = getFifthPriority(entry)[0] ?? null;
    const [extensionLike, secondaryExtensionLike] = getExtensionPriority(entry);
    const fallbackDegrees = getDegreePriority(entry);
    const buildOrder = (degrees: Array<string | null | undefined>) => {
        const ordered: string[] = [];

        for (const degree of degrees) {
            if (degree && !ordered.includes(degree)) {
                ordered.push(degree);
            }
        }

        for (const degree of fallbackDegrees) {
            if (!ordered.includes(degree)) {
                ordered.push(degree);
            }
        }

        return ordered;
    };

    return {
        core: buildOrder(['1', thirdLike, fifthLike, seventhLike, extensionLike, secondaryExtensionLike, '1']),
        inversional: buildOrder(['1', fifthLike, thirdLike, seventhLike, extensionLike, '1']),
        'extension-forward': buildOrder(['1', thirdLike, seventhLike, extensionLike, fifthLike, secondaryExtensionLike, '1']),
        'duplicated-root': buildOrder(['1', fifthLike, '1', thirdLike, seventhLike, extensionLike, '1']),
    };
}

function buildDegreeSequenceForSeed(entry: ChordRegistryEntry, seed: GeneratedSearchSeed): string[] {
    const requiredDegrees = getRequiredChordDegrees(entry);
    const requiredWithoutRoot = requiredDegrees.filter((degree) => degree !== '1');
    const coverageOrder = getCoverageDegreeOrders(entry)[seed.coverageProfile];
    const selected: string[] = ['1'];

    for (const degree of requiredWithoutRoot) {
        if (selected.length >= seed.noteCount) {
            break;
        }

        if (!selected.includes(degree)) {
            selected.push(degree);
        }
    }

    for (const degree of coverageOrder) {
        if (selected.length >= seed.noteCount) {
            break;
        }

        const duplicateBudget = degree === '1' ? 3 : 2;
        const currentCount = selected.filter((selectedDegree) => selectedDegree === degree).length;

        if (currentCount >= duplicateBudget) {
            continue;
        }

        selected.push(degree);
    }

    const missingRequiredDegrees = requiredDegrees.filter((degree) => !selected.includes(degree));
    for (const degree of missingRequiredDegrees) {
        if (selected.length < seed.noteCount) {
            selected.push(degree);
            continue;
        }

        selected[selected.length - 1] = degree;
    }

    return selected.slice(0, seed.noteCount);
}

function getExploratorySeedsForChord(entry: ChordRegistryEntry): GeneratedSearchSeed[] {
    const requiredCount = getRequiredChordDegrees(entry).length;
    const minNoteCount = Math.max(3, Math.min(requiredCount, MAX_GENERATED_NOTE_COUNT));
    const maxNoteCount = Math.min(MAX_GENERATED_NOTE_COUNT, Math.max(requiredCount + 1, minNoteCount));
    const seeds: GeneratedSearchSeed[] = [];

    for (const rootString of EXPLORATORY_ROOT_STRINGS) {
        const higherStrings = Array.from({ length: rootString }, (_, index) => index)
            .reverse() as GuitarStringIndex[];

        for (let noteCount = minNoteCount; noteCount <= maxNoteCount; noteCount += 1) {
            const subsets = combinations(higherStrings, noteCount - 1)
                .map((subset) => [rootString, ...subset] as GuitarStringIndex[])
                .filter((playedStrings) => playedStrings.length >= 3);

            for (const playedStrings of subsets) {
                const layoutKind = classifyLayoutKind(playedStrings);
                const registerBiases = getGeneratedRegisterBiases(playedStrings, layoutKind);
                const coverageProfiles: GeneratedCoverageProfile[] = noteCount <= 3
                    ? ['core', 'inversional']
                    : ['core', 'inversional', 'extension-forward', 'duplicated-root'];

                for (const registerBias of registerBiases) {
                    for (const coverageProfile of coverageProfiles) {
                        seeds.push({
                            rootString,
                            playedStrings,
                            noteCount,
                            layoutKind,
                            registerBias,
                            coverageProfile,
                        });
                    }
                }
            }
        }
    }

    return seeds;
}

function chooseOffsetForDegree(args: {
    rootString: GuitarStringIndex;
    string: GuitarStringIndex;
    interval: number;
    registerBias: GeneratedRegisterBias;
    layoutKind: GeneratedLayoutKind;
}): number {
    const { rootString, string, interval, registerBias, layoutKind } = args;
    const rootStringPitch = STANDARD_GUITAR_TUNING_PITCH_CLASSES[rootString];
    const stringPitch = STANDARD_GUITAR_TUNING_PITCH_CLASSES[string];
    const intervalFromRootString = normalizePitchClass(stringPitch - rootStringPitch);
    const baseOffset = normalizePitchClass(interval - intervalFromRootString);
    const candidates = [baseOffset - 12, baseOffset, baseOffset + 12]
        .filter((value) => value >= -6 && value <= 8);
    const preferredOffset = registerBias === 'upper'
        ? 4
        : registerBias === 'wide'
            ? (layoutKind === 'skip' ? 3 : 2)
            : 0;

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
    seed: GeneratedSearchSeed,
    degrees: string[]
): VoicingTemplateString[] {
    const degreeIntervalMap = buildDegreeIntervalMap(entry);
    const assignedDegrees = new Map<GuitarStringIndex, string>();

    seed.playedStrings.forEach((string, index) => {
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
            fretOffset: string === seed.rootString
                ? 0
                : chooseOffsetForDegree({
                    rootString: seed.rootString,
                    string,
                    interval,
                    registerBias: seed.registerBias,
                    layoutKind: seed.layoutKind,
                }),
            toneDegree: degree,
            isOptional: !getRequiredChordDegrees(entry).includes(degree),
        };
    });
}

function buildGeneratedTags(entry: ChordRegistryEntry, seed: GeneratedSearchSeed): string[] {
    return Array.from(new Set([
        ...(entry.tags ?? []),
        'generated',
        `root-string-${seed.rootString + 1}`,
        `generated-strings-${seed.playedStrings.map((string) => string + 1).join('')}`,
        `generated-layout-${seed.layoutKind}`,
        `generated-register-${seed.registerBias}`,
        `generated-note-count-${seed.noteCount}`,
        `generated-profile-${seed.coverageProfile}`,
    ]));
}

function buildGeneratedTemplate(entry: ChordRegistryEntry, seed: GeneratedSearchSeed): VoicingTemplate | null {
    const degrees = buildDegreeSequenceForSeed(entry, seed);
    const requiredDegrees = getRequiredChordDegrees(entry);

    if (!degrees.includes('1')) {
        return null;
    }

    if (requiredDegrees.some((degree) => !degrees.includes(degree))) {
        return null;
    }

    return {
        id: `${entry.id}:generated:r${seed.rootString + 1}:s${seed.playedStrings.map((string) => string + 1).join('')}:n${seed.noteCount}:${seed.layoutKind}:${seed.registerBias}:${seed.coverageProfile}`,
        label: `Root ${seed.rootString + 1} exploratory ${seed.noteCount}-note`,
        instrument: 'guitar',
        rootString: seed.rootString,
        strings: buildGeneratedTemplateStrings(entry, seed, degrees),
        source: 'generated',
        tags: buildGeneratedTags(entry, seed),
    };
}

function isPrimarySurfaceSeed(template: VoicingTemplate): boolean {
    const tags = new Set(template.tags ?? []);
    const isWide = tags.has('generated-register-wide');
    const isSkipLayout = tags.has('generated-layout-skip');
    const isUpperRootFour = tags.has('root-string-4') && tags.has('generated-register-upper');

    if (isWide) {
        return false;
    }

    if (isUpperRootFour) {
        return true;
    }

    return !isSkipLayout || tags.has('generated-note-count-5');
}

function getGeneratedTemplateSignature(template: VoicingTemplate): string {
    return template.strings
        .map((stringValue) => `${stringValue.string}:${stringValue.fretOffset ?? 'x'}:${stringValue.toneDegree ?? '_'}`)
        .join('|');
}

function dedupeGeneratedTemplates(templates: VoicingTemplate[]): VoicingTemplate[] {
    const deduped = new Map<string, VoicingTemplate>();

    for (const template of templates) {
        const signature = getGeneratedTemplateSignature(template);

        if (!deduped.has(signature)) {
            deduped.set(signature, template);
        }
    }

    return Array.from(deduped.values());
}

export function getGeneratedVoicingTemplatesForChord(entryInput: string | ChordRegistryEntry): VoicingTemplate[] {
    const entry = resolveChordRegistryEntry(entryInput);

    return dedupeGeneratedTemplates(getExploratorySeedsForChord(entry)
        .map((seed) => buildGeneratedTemplate(entry, seed))
        .filter((template): template is VoicingTemplate => template !== null));
}

export function getPrimaryGeneratedVoicingTemplatesForChord(entryInput: string | ChordRegistryEntry): VoicingTemplate[] {
    return getGeneratedVoicingTemplatesForChord(entryInput)
        .filter(isPrimarySurfaceSeed);
}
