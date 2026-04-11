import { STANDARD_GUITAR_TUNING_PITCH_CLASSES } from '../tuning';
import { getRequiredChordDegrees, normalizePitchClass, resolveChordRegistryEntry } from './helpers';
import type { ChordRegistryEntry } from './registry';
import type { GuitarStringIndex, VoicingTemplate, VoicingTemplateString } from './types';

type GeneratedRegisterBias = 'neutral' | 'upper' | 'wide';
type GeneratedLayoutKind = 'contiguous' | 'skip';
type GeneratedCoverageProfile = 'baseline' | 'reduced' | 'fuller' | 'duplicated-root' | 'color-retained';
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
    bassDegrees: string[];
    duplicationBudgets: Record<string, number>;
    coverageRecipes: GeneratedCoverageRecipe[];
}

interface GeneratedCoverageRecipe {
    family: GeneratedCoverageProfile;
    requiredDegrees: string[];
    fillDegrees: string[];
}

const EXPLORATORY_STRINGS: GuitarStringIndex[] = [5, 4, 3, 2, 1, 0];
const MAX_GENERATED_NOTE_COUNT = 6;
const MIN_OFFSET_CANDIDATE = -3;
const MAX_OFFSET_CANDIDATE = 3;
const MAX_FILL_VARIANTS_PER_RECIPE = 10;
const MAX_ASSIGNMENTS_PER_RECIPE = 16;
const MAX_TEMPLATE_VARIANTS_PER_ASSIGNMENT = 8;

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

function compactDefinedDegrees(degrees: Array<string | null | undefined>): string[] {
    const result: string[] = [];
    pushUniqueDegrees(result, degrees);
    return result;
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

function buildGeneratedCoverageRecipes(entry: ChordRegistryEntry, chordClass: GeneratedChordClass): GeneratedCoverageRecipe[] {
    const requiredDegrees = getRequiredChordDegrees(entry);
    const thirdLike = getThirdDegree(entry);
    const fifthLike = getFifthDegree(entry);
    const seventhLike = getSeventhDegree(entry);
    const extensionDegrees = getExtensionPriority(entry);
    const optionalFormulaDegrees = entry.formula.degrees.filter((degree) => !requiredDegrees.includes(degree));
    const baselineRequired = chordClass === 'triad'
        ? compactDefinedDegrees([...requiredDegrees, thirdLike, fifthLike])
        : compactDefinedDegrees([...requiredDegrees, thirdLike, fifthLike, seventhLike]);
    const reducedRequired = compactDefinedDegrees(requiredDegrees);
    const fullerRequired = compactDefinedDegrees([...baselineRequired, extensionDegrees[0]]);
    const colorRetainedRequired = compactDefinedDegrees([
        ...requiredDegrees,
        fifthLike,
        extensionDegrees[0],
        extensionDegrees[1],
    ]);
    const baselineFill = compactDefinedDegrees([
        ...entry.formula.degrees,
        ...optionalFormulaDegrees,
        '1',
        fifthLike,
    ]);
    const reducedFill = compactDefinedDegrees([
        fifthLike,
        ...entry.formula.degrees,
        ...optionalFormulaDegrees,
        '1',
    ]);
    const fullerFill = compactDefinedDegrees([
        ...entry.formula.degrees,
        ...optionalFormulaDegrees,
        '1',
        fifthLike,
        thirdLike,
        seventhLike,
    ]);
    const duplicatedRootFill = compactDefinedDegrees([
        '1',
        ...entry.formula.degrees,
        ...optionalFormulaDegrees,
        fifthLike,
    ]);
    const recipes: GeneratedCoverageRecipe[] = [
        {
            family: 'baseline',
            requiredDegrees: baselineRequired,
            fillDegrees: baselineFill,
        },
        {
            family: 'reduced',
            requiredDegrees: reducedRequired,
            fillDegrees: reducedFill,
        },
        {
            family: 'fuller',
            requiredDegrees: fullerRequired,
            fillDegrees: fullerFill,
        },
        {
            family: 'duplicated-root',
            requiredDegrees: baselineRequired,
            fillDegrees: duplicatedRootFill,
        },
    ];

    if (colorRetainedRequired.length > 0 && colorRetainedRequired.some((degree) => extensionDegrees.includes(degree))) {
        recipes.push({
            family: 'color-retained',
            requiredDegrees: colorRetainedRequired,
            fillDegrees: compactDefinedDegrees([
                ...extensionDegrees,
                ...entry.formula.degrees,
                '1',
                fifthLike,
            ]),
        });
    }

    return recipes;
}

function buildGeneratedChordPolicy(entry: ChordRegistryEntry): GeneratedChordPolicy {
    const thirdLike = getThirdDegree(entry);
    const fifthLike = getFifthDegree(entry);
    const seventhLike = getSeventhDegree(entry);
    const extensionDegrees = getExtensionPriority(entry);
    const chordClass = getChordClass(entry);
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
        bassDegrees,
        duplicationBudgets: buildDuplicationBudgets(entry, chordClass),
        coverageRecipes: buildGeneratedCoverageRecipes(entry, chordClass),
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

function getExploratorySeedsForChord(entry: ChordRegistryEntry): GeneratedSearchSeed[] {
    const policy = buildGeneratedChordPolicy(entry);
    const seeds: GeneratedSearchSeed[] = [];

    for (let noteCount = policy.minimumNoteCount; noteCount <= policy.maximumNoteCount; noteCount += 1) {
        for (const playedStrings of combinations(EXPLORATORY_STRINGS, noteCount)) {
            const descendingStrings = [...playedStrings].sort((left, right) => right - left) as GuitarStringIndex[];
            const bassString = descendingStrings[0];
            const layoutKind = classifyLayoutKind(descendingStrings);
            const registerBiases = getGeneratedRegisterBiases(descendingStrings, layoutKind);

            for (const rootString of descendingStrings) {
                for (const bassDegree of policy.bassDegrees) {
                    for (const registerBias of registerBiases) {
                        for (const coverageRecipe of policy.coverageRecipes) {
                            seeds.push({
                                bassString,
                                rootString,
                                playedStrings: descendingStrings,
                                noteCount,
                                layoutKind,
                                registerBias,
                                coverageProfile: coverageRecipe.family,
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

function getCoverageRecipeForSeed(policy: GeneratedChordPolicy, seed: GeneratedSearchSeed): GeneratedCoverageRecipe | null {
    return policy.coverageRecipes.find((recipe) => recipe.family === seed.coverageProfile) ?? null;
}

function cloneDegreeCounts(counts: Map<string, number>): Map<string, number> {
    return new Map(counts.entries());
}

function getRemainingRecipeRequiredDegrees(
    recipe: GeneratedCoverageRecipe,
    fixedDegreeCounts: Map<string, number>
): string[] {
    const remainingFixedCounts = cloneDegreeCounts(fixedDegreeCounts);
    const remaining: string[] = [];

    for (const degree of recipe.requiredDegrees) {
        const count = remainingFixedCounts.get(degree) ?? 0;

        if (count > 0) {
            remainingFixedCounts.set(degree, count - 1);
            continue;
        }

        remaining.push(degree);
    }

    return remaining;
}

function appendRecipeFillVariants(
    fillDegrees: string[],
    duplicationBudgets: Record<string, number>,
    degreeCounts: Map<string, number>,
    remainingSlots: number,
    startIndex: number,
    current: string[],
    results: string[][]
) {
    if (results.length >= MAX_FILL_VARIANTS_PER_RECIPE) {
        return;
    }

    if (remainingSlots === 0) {
        results.push([...current]);
        return;
    }

    for (let index = startIndex; index < fillDegrees.length; index += 1) {
        const degree = fillDegrees[index]!;
        const budget = duplicationBudgets[degree] ?? 1;
        const count = degreeCounts.get(degree) ?? 0;

        if (count >= budget) {
            continue;
        }

        degreeCounts.set(degree, count + 1);
        current.push(degree);
        appendRecipeFillVariants(fillDegrees, duplicationBudgets, degreeCounts, remainingSlots - 1, index, current, results);
        current.pop();
        degreeCounts.set(degree, count);
    }
}

function getRecipeFillVariants(
    recipe: GeneratedCoverageRecipe,
    policy: GeneratedChordPolicy,
    degreeCounts: Map<string, number>,
    remainingSlots: number
): string[][] {
    if (remainingSlots === 0) {
        return [[]];
    }

    const variants: string[][] = [];
    appendRecipeFillVariants(
        recipe.fillDegrees,
        policy.duplicationBudgets,
        cloneDegreeCounts(degreeCounts),
        remainingSlots,
        0,
        [],
        variants
    );

    return variants;
}

function buildUniquePermutations(values: string[]): string[][] {
    if (values.length <= 1) {
        return [values];
    }

    const counts = new Map<string, number>();
    for (const value of values) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    const permutations: string[][] = [];
    const current: string[] = [];
    const distinctValues = Array.from(counts.keys()).sort();

    const walk = () => {
        if (permutations.length >= MAX_ASSIGNMENTS_PER_RECIPE) {
            return;
        }

        if (current.length === values.length) {
            permutations.push([...current]);
            return;
        }

        for (const value of distinctValues) {
            const count = counts.get(value) ?? 0;
            if (count <= 0) {
                continue;
            }

            counts.set(value, count - 1);
            current.push(value);
            walk();
            current.pop();
            counts.set(value, count);
        }
    };

    walk();
    return permutations;
}

function buildDegreeAssignmentsForSeed(
    entry: ChordRegistryEntry,
    policy: GeneratedChordPolicy,
    seed: GeneratedSearchSeed
): string[][] {
    const recipe = getCoverageRecipeForSeed(policy, seed);
    const rootIndex = seed.playedStrings.indexOf(seed.rootString);
    const bassIndex = seed.playedStrings.indexOf(seed.bassString);

    if (!recipe || rootIndex === -1 || bassIndex === -1) {
        return [];
    }

    if (rootIndex === bassIndex && seed.bassDegree !== '1') {
        return [];
    }

    const fixedAssignments = Array.from({ length: seed.playedStrings.length }).fill('') as string[];
    const fixedCounts = new Map<string, number>();
    fixedAssignments[rootIndex] = '1';
    fixedCounts.set('1', 1);

    if (!fixedAssignments[bassIndex]) {
        fixedAssignments[bassIndex] = seed.bassDegree;
        fixedCounts.set(seed.bassDegree, (fixedCounts.get(seed.bassDegree) ?? 0) + 1);
    }

    const remainingRequiredDegrees = getRemainingRecipeRequiredDegrees(recipe, fixedCounts);
    const remainingIndexes = fixedAssignments
        .map((degree, index) => ({ degree, index }))
        .filter((entryValue) => entryValue.degree === '')
        .map((entryValue) => entryValue.index);

    if (remainingRequiredDegrees.length > remainingIndexes.length) {
        return [];
    }

    const currentCounts = cloneDegreeCounts(fixedCounts);
    for (const degree of remainingRequiredDegrees) {
        currentCounts.set(degree, (currentCounts.get(degree) ?? 0) + 1);
    }

    const fillVariants = getRecipeFillVariants(
        recipe,
        policy,
        currentCounts,
        remainingIndexes.length - remainingRequiredDegrees.length
    );
    const assignments = new Set<string>();

    for (const fillVariant of fillVariants) {
        const remainingDegrees = [...remainingRequiredDegrees, ...fillVariant];
        const permutations = buildUniquePermutations(remainingDegrees);

        for (const permutation of permutations) {
            const assignment = [...fixedAssignments];
            remainingIndexes.forEach((index, permutationIndex) => {
                assignment[index] = permutation[permutationIndex]!;
            });

            const requiredDegrees = getRequiredChordDegrees(entry);
            if (requiredDegrees.some((degree) => !assignment.includes(degree))) {
                continue;
            }

            assignments.add(assignment.join('|'));
        }
    }

    return Array.from(assignments).map((signature) => signature.split('|'));
}

function getOffsetCandidatesForDegree(args: {
    rootString: GuitarStringIndex;
    string: GuitarStringIndex;
    interval: number;
}): number[] {
    const { rootString, string, interval } = args;
    const rootStringPitch = STANDARD_GUITAR_TUNING_PITCH_CLASSES[rootString];
    const stringPitch = STANDARD_GUITAR_TUNING_PITCH_CLASSES[string];
    const intervalFromRootString = normalizePitchClass(stringPitch - rootStringPitch);
    const candidates: number[] = [];

    for (let offset = MIN_OFFSET_CANDIDATE; offset <= MAX_OFFSET_CANDIDATE; offset += 1) {
        if (normalizePitchClass(intervalFromRootString + offset) === normalizePitchClass(interval)) {
            candidates.push(offset);
        }
    }

    return candidates;
}

function buildGeneratedTemplateStringVariants(
    entry: ChordRegistryEntry,
    seed: GeneratedSearchSeed,
    degrees: string[]
): VoicingTemplateString[][] {
    const degreeIntervalMap = buildDegreeIntervalMap(entry);
    const assignedDegrees = new Map<GuitarStringIndex, string>();
    const stringVariants = new Map<GuitarStringIndex, VoicingTemplateString[]>();

    seed.playedStrings.forEach((string, index) => {
        assignedDegrees.set(string, degrees[index]);
    });

    for (const string of ([0, 1, 2, 3, 4, 5] as GuitarStringIndex[])) {
        const degree = assignedDegrees.get(string);

        if (!degree) {
            stringVariants.set(string, [{
                string,
                fretOffset: null,
            }]);
            continue;
        }

        const interval = degreeIntervalMap.get(degree);
        if (interval === undefined) {
            return [];
        }

        const offsets = string === seed.rootString
            ? [0]
            : getOffsetCandidatesForDegree({
                rootString: seed.rootString,
                string,
                interval,
            });

        if (offsets.length === 0) {
            return [];
        }

        stringVariants.set(string, offsets.map((offset) => ({
            string,
            fretOffset: offset,
            toneDegree: degree,
            isOptional: !getRequiredChordDegrees(entry).includes(degree),
        })));
    }

    const strings = [0, 1, 2, 3, 4, 5] as GuitarStringIndex[];
    const results: VoicingTemplateString[][] = [];
    const current: VoicingTemplateString[] = [];

    const walk = (index: number) => {
        if (results.length >= MAX_TEMPLATE_VARIANTS_PER_ASSIGNMENT) {
            return;
        }

        if (index >= strings.length) {
            results.push([...current]);
            return;
        }

        const string = strings[index]!;
        const variants = stringVariants.get(string) ?? [];
        for (const variant of variants) {
            current.push(variant);
            walk(index + 1);
            current.pop();
        }
    };

    walk(0);
    return results;
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
    const degreeAssignments = buildDegreeAssignmentsForSeed(entry, policy, seed);
    const requiredDegrees = getRequiredChordDegrees(entry);

    if (degreeAssignments.length === 0) {
        return null;
    }

    return {
        id: `${entry.id}:generated:b${seed.bassString + 1}:r${seed.rootString + 1}:s${seed.playedStrings.map((string) => string + 1).join('')}:n${seed.noteCount}:${seed.layoutKind}:${seed.registerBias}:${seed.coverageProfile}:${seed.bassDegree}`,
        label: `Root ${seed.rootString + 1} exploratory ${seed.noteCount}-note`,
        instrument: 'guitar',
        rootString: seed.rootString,
        strings: buildGeneratedTemplateStringVariants(entry, seed, degreeAssignments[0]!).find((strings) =>
            requiredDegrees.every((degree) => strings.some((stringValue) => stringValue.toneDegree === degree))
        ) ?? [],
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
