import { STANDARD_GUITAR_TUNING_PITCH_CLASSES } from '../tuning';
import { getRequiredChordDegrees, normalizePitchClass, resolveChordRegistryEntry } from './helpers';
import type { ChordRegistryEntry } from './registry';
import type { GuitarStringIndex, VoicingTemplate, VoicingTemplateString } from './types';

type GeneratedRegisterBias = 'neutral' | 'upper' | 'wide';
type GeneratedLayoutKind = 'contiguous' | 'skip';
type GeneratedCoverageProfile = 'core' | 'inversional' | 'extension-forward' | 'duplicated-root' | 'dense';
type GeneratedChordClass = 'triad' | 'seventh' | 'ninth' | 'suspension' | 'extended' | 'altered';

interface GeneratedSearchSeed {
    bassString: GuitarStringIndex;
    rootString: GuitarStringIndex;
    playedStrings: GuitarStringIndex[];
    noteCount: number;
    layoutKind: GeneratedLayoutKind;
    registerBias: GeneratedRegisterBias;
    coverageProfile: GeneratedCoverageProfile;
    bassDegree: string;
}

interface GeneratedChordPolicy {
    chordClass: GeneratedChordClass;
    minimumNoteCount: number;
    maximumNoteCount: number;
    structuralDegrees: string[];
    extensionDegrees: string[];
    bassDegrees: string[];
    duplicationBudgets: Record<string, number>;
}

const EXPLORATORY_STRINGS: GuitarStringIndex[] = [5, 4, 3, 2, 1, 0];
const MAX_GENERATED_NOTE_COUNT = 6;

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

function getFifthDegree(entry: ChordRegistryEntry): string | null {
    if (entry.formula.degrees.includes('5')) return '5';
    if (entry.formula.degrees.includes('b5')) return 'b5';
    if (entry.formula.degrees.includes('#5')) return '#5';
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

function getChordClass(entry: ChordRegistryEntry): GeneratedChordClass {
    if (entry.id === 'sus2' || entry.id === 'sus4') {
        return 'suspension';
    }

    if (entry.id.includes('sharp') || entry.id.includes('flat')) {
        return 'altered';
    }

    if (entry.family === 'triad') {
        return 'triad';
    }

    if (entry.family === 'seventh') {
        return 'seventh';
    }

    if (entry.id.includes('9')) {
        return 'ninth';
    }

    return 'extended';
}

function pushUniqueDegrees(target: string[], degrees: Array<string | null | undefined>) {
    for (const degree of degrees) {
        if (degree && !target.includes(degree)) {
            target.push(degree);
        }
    }
}

function buildDuplicationBudgets(entry: ChordRegistryEntry, chordClass: GeneratedChordClass): Record<string, number> {
    const budgets: Record<string, number> = {
        '1': chordClass === 'triad' ? 3 : 2,
    };
    const structuralDegrees = [
        getThirdDegree(entry),
        getFifthDegree(entry),
        getSeventhDegree(entry),
        ...getExtensionPriority(entry),
    ];

    for (const degree of structuralDegrees) {
        if (!degree) {
            continue;
        }

        budgets[degree] = degree === '1'
            ? budgets[degree]
            : (degree === getFifthDegree(entry) && chordClass !== 'triad' ? 1 : 2);
    }

    return budgets;
}

function buildGeneratedChordPolicy(entry: ChordRegistryEntry): GeneratedChordPolicy {
    const thirdLike = getThirdDegree(entry);
    const fifthLike = getFifthDegree(entry);
    const seventhLike = getSeventhDegree(entry);
    const extensionDegrees = getExtensionPriority(entry);
    const chordClass = getChordClass(entry);
    const structuralDegrees: string[] = ['1'];

    switch (chordClass) {
        case 'triad':
            pushUniqueDegrees(structuralDegrees, [thirdLike, fifthLike]);
            break;
        case 'suspension':
            pushUniqueDegrees(structuralDegrees, [thirdLike, fifthLike, seventhLike]);
            break;
        case 'seventh':
            pushUniqueDegrees(structuralDegrees, [thirdLike, seventhLike, fifthLike]);
            break;
        case 'ninth':
            pushUniqueDegrees(structuralDegrees, [thirdLike, seventhLike, extensionDegrees[0], fifthLike]);
            break;
        case 'altered':
        case 'extended':
            pushUniqueDegrees(structuralDegrees, [thirdLike, seventhLike, extensionDegrees[0], extensionDegrees[1], fifthLike]);
            break;
    }

    const bassDegrees: string[] = ['1'];
    switch (chordClass) {
        case 'triad':
            pushUniqueDegrees(bassDegrees, [thirdLike, fifthLike]);
            break;
        case 'suspension':
            pushUniqueDegrees(bassDegrees, [thirdLike, fifthLike]);
            break;
        case 'seventh':
            pushUniqueDegrees(bassDegrees, [thirdLike, fifthLike, seventhLike]);
            break;
        case 'ninth':
        case 'extended':
        case 'altered':
            pushUniqueDegrees(bassDegrees, [thirdLike, seventhLike, fifthLike, extensionDegrees[0]]);
            break;
    }

    return {
        chordClass,
        minimumNoteCount: Math.max(3, Math.min(getRequiredChordDegrees(entry).length, MAX_GENERATED_NOTE_COUNT)),
        maximumNoteCount: MAX_GENERATED_NOTE_COUNT,
        structuralDegrees,
        extensionDegrees,
        bassDegrees,
        duplicationBudgets: buildDuplicationBudgets(entry, chordClass),
    };
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

    if (layoutKind === 'skip' || strings[0] - strings[strings.length - 1] >= 4) {
        biases.push('wide');
    }

    return biases;
}

function getCoverageProfilesForSeed(noteCount: number): GeneratedCoverageProfile[] {
    if (noteCount <= 3) {
        return ['core', 'inversional'];
    }

    if (noteCount === 4) {
        return ['core', 'inversional', 'extension-forward', 'duplicated-root'];
    }

    return ['core', 'inversional', 'extension-forward', 'duplicated-root', 'dense'];
}

function getExploratorySeedsForChord(entry: ChordRegistryEntry): GeneratedSearchSeed[] {
    const policy = buildGeneratedChordPolicy(entry);
    const seeds: GeneratedSearchSeed[] = [];

    for (let noteCount = policy.minimumNoteCount; noteCount <= policy.maximumNoteCount; noteCount += 1) {
        for (const playedStrings of combinations(EXPLORATORY_STRINGS, noteCount)) {
            const descendingStrings = [...playedStrings].sort((left, right) => right - left) as GuitarStringIndex[];
            const bassString = descendingStrings[0];
            const layoutKind = classifyLayoutKind(descendingStrings);
            const registerBiases = getGeneratedRegisterBiases(descendingStrings, layoutKind);
            const coverageProfiles = getCoverageProfilesForSeed(noteCount);

            for (const rootString of descendingStrings) {
                for (const bassDegree of policy.bassDegrees) {
                    for (const registerBias of registerBiases) {
                        for (const coverageProfile of coverageProfiles) {
                            seeds.push({
                                bassString,
                                rootString,
                                playedStrings: descendingStrings,
                                noteCount,
                                layoutKind,
                                registerBias,
                                coverageProfile,
                                bassDegree,
                            });
                        }
                    }
                }
            }
        }
    }

    return seeds;
}

function buildCoverageOrder(
    entry: ChordRegistryEntry,
    policy: GeneratedChordPolicy,
    seed: GeneratedSearchSeed
): string[] {
    const thirdLike = getThirdDegree(entry);
    const fifthLike = getFifthDegree(entry);
    const seventhLike = getSeventhDegree(entry);
    const [extensionLike, secondaryExtensionLike] = policy.extensionDegrees;
    const base: string[] = [];

    switch (seed.coverageProfile) {
        case 'inversional':
            pushUniqueDegrees(base, [seed.bassDegree, thirdLike, seventhLike, fifthLike, extensionLike, '1', secondaryExtensionLike]);
            break;
        case 'extension-forward':
            pushUniqueDegrees(base, [seed.bassDegree, extensionLike, thirdLike, seventhLike, secondaryExtensionLike, fifthLike, '1']);
            break;
        case 'duplicated-root':
            pushUniqueDegrees(base, [seed.bassDegree, '1', thirdLike, fifthLike, seventhLike, extensionLike, '1']);
            break;
        case 'dense':
            pushUniqueDegrees(base, [seed.bassDegree, '1', thirdLike, fifthLike, seventhLike, extensionLike, secondaryExtensionLike, '1']);
            break;
        default:
            pushUniqueDegrees(base, [seed.bassDegree, ...policy.structuralDegrees, ...policy.extensionDegrees, '1']);
            break;
    }

    pushUniqueDegrees(base, entry.formula.degrees);
    return base;
}

function buildDegreeSequenceForSeed(
    entry: ChordRegistryEntry,
    policy: GeneratedChordPolicy,
    seed: GeneratedSearchSeed
): string[] {
    const requiredDegrees = getRequiredChordDegrees(entry);
    const coverageOrder = buildCoverageOrder(entry, policy, seed);
    const selected = Array.from({ length: seed.playedStrings.length }).fill('') as string[];
    const rootIndex = seed.playedStrings.indexOf(seed.rootString);
    const bassIndex = seed.playedStrings.indexOf(seed.bassString);
    const degreeCounts = new Map<string, number>();
    const incrementDegree = (degree: string) => degreeCounts.set(degree, (degreeCounts.get(degree) ?? 0) + 1);

    selected[rootIndex] = '1';
    incrementDegree('1');

    if (!selected[bassIndex]) {
        selected[bassIndex] = seed.bassDegree;
        incrementDegree(seed.bassDegree);
    }

    const openIndexes = selected
        .map((degree, index) => ({ degree, index }))
        .filter((entry) => entry.degree === '')
        .map((entry) => entry.index);

    for (const index of openIndexes) {
        const nextDegree = coverageOrder.find((degree) => {
            const duplicateBudget = policy.duplicationBudgets[degree] ?? 1;
            const currentCount = degreeCounts.get(degree) ?? 0;

            return currentCount < duplicateBudget;
        }) ?? '1';

        selected[index] = nextDegree;
        incrementDegree(nextDegree);
    }

    for (const degree of requiredDegrees) {
        if (selected.includes(degree)) {
            continue;
        }

        const replacementIndex = selected.findIndex((selectedDegree, index) => {
            if (index === rootIndex) {
                return false;
            }

            return !requiredDegrees.includes(selectedDegree) || selectedDegree === seed.bassDegree;
        });

        if (replacementIndex !== -1) {
            selected[replacementIndex] = degree;
        }
    }

    return selected;
}

function chooseOffsetForDegree(args: {
    rootString: GuitarStringIndex;
    string: GuitarStringIndex;
    interval: number;
    registerBias: GeneratedRegisterBias;
    layoutKind: GeneratedLayoutKind;
    bassString: GuitarStringIndex;
}): number {
    const { rootString, string, interval, registerBias, layoutKind, bassString } = args;
    const rootStringPitch = STANDARD_GUITAR_TUNING_PITCH_CLASSES[rootString];
    const stringPitch = STANDARD_GUITAR_TUNING_PITCH_CLASSES[string];
    const intervalFromRootString = normalizePitchClass(stringPitch - rootStringPitch);
    const baseOffset = normalizePitchClass(interval - intervalFromRootString);
    const candidates = [baseOffset - 12, baseOffset, baseOffset + 12]
        .filter((value) => value >= -8 && value <= 10);
    const preferredOffset = registerBias === 'upper'
        ? 4
        : registerBias === 'wide'
            ? (layoutKind === 'skip' ? 3 : 2)
            : (string === bassString ? -1 : 0);

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
                    bassString: seed.bassString,
                }),
            toneDegree: degree,
            isOptional: !getRequiredChordDegrees(entry).includes(degree),
        };
    });
}

function buildGeneratedTags(entry: ChordRegistryEntry, seed: GeneratedSearchSeed, policy: GeneratedChordPolicy): string[] {
    return Array.from(new Set([
        ...(entry.tags ?? []),
        'generated',
        `generated-class-${policy.chordClass}`,
        `root-string-${seed.rootString + 1}`,
        `bass-string-${seed.bassString + 1}`,
        `generated-bass-degree-${seed.bassDegree}`,
        `generated-strings-${seed.playedStrings.map((string) => string + 1).join('')}`,
        `generated-layout-${seed.layoutKind}`,
        `generated-register-${seed.registerBias}`,
        `generated-note-count-${seed.noteCount}`,
        `generated-profile-${seed.coverageProfile}`,
        seed.bassDegree === '1' ? 'generated-root-bass' : 'generated-inversional-bass',
    ]));
}

function buildGeneratedTemplate(entry: ChordRegistryEntry, seed: GeneratedSearchSeed): VoicingTemplate | null {
    const policy = buildGeneratedChordPolicy(entry);
    const degrees = buildDegreeSequenceForSeed(entry, policy, seed);
    const requiredDegrees = getRequiredChordDegrees(entry);

    if (!degrees.includes('1')) {
        return null;
    }

    if (requiredDegrees.some((degree) => !degrees.includes(degree))) {
        return null;
    }

    return {
        id: `${entry.id}:generated:b${seed.bassString + 1}:r${seed.rootString + 1}:s${seed.playedStrings.map((string) => string + 1).join('')}:n${seed.noteCount}:${seed.layoutKind}:${seed.registerBias}:${seed.coverageProfile}:${seed.bassDegree}`,
        label: `Root ${seed.rootString + 1} exploratory ${seed.noteCount}-note`,
        instrument: 'guitar',
        rootString: seed.rootString,
        strings: buildGeneratedTemplateStrings(entry, seed, degrees),
        source: 'generated',
        tags: buildGeneratedTags(entry, seed, policy),
    };
}

function isPrimarySurfaceSeed(template: VoicingTemplate): boolean {
    const tags = new Set(template.tags ?? []);
    const isWide = tags.has('generated-register-wide');
    const isDense = tags.has('generated-note-count-6');
    const isInversionalBass = tags.has('generated-inversional-bass');
    const isUpperRootFour = tags.has('root-string-4') && tags.has('generated-register-upper');
    const allowsExtensionForward = (
        tags.has('generated-class-ninth')
        || tags.has('generated-class-extended')
        || tags.has('generated-class-altered')
    ) && tags.has('generated-profile-extension-forward');

    if (isWide || isDense || isInversionalBass) {
        return false;
    }

    if (isUpperRootFour) {
        return true;
    }

    return tags.has('generated-layout-contiguous')
        && (tags.has('generated-profile-core') || allowsExtensionForward);
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
