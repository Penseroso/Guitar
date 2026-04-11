import { getChordTypeLabel, resolveChordRegistryEntry } from './helpers';
import { getVoicingDisplayName, getVoicingDisplaySubtitle, getVoicingProvenanceLabel } from './descriptor';
import { buildChordDefinitionFromRegistryEntry } from './helpers';
import { getExploratoryVoicingsForChord } from './voicings';
import type { ChordRegistryEntry } from './registry';
import type { ResolvedVoicing } from './types';

export const CURATED_QA_REVIEW_CHORD_IDS = [
    'major',
    'major-6',
    'major-7',
    'major-9',
    'minor',
    'minor-7',
    'dominant-7',
    'dominant-9',
    'sus2',
    'sus4',
] as const;

export type CuratedQaChordId = (typeof CURATED_QA_REVIEW_CHORD_IDS)[number];
export type CuratedQaDecision = 'accept' | 'borderline' | 'reject';

export interface CuratedQaReviewRecord {
    chordType: CuratedQaChordId;
    candidateId: string;
    decision: CuratedQaDecision;
    rootPitchClass?: number;
}

export type CuratedQaReviewState = Record<string, CuratedQaReviewRecord>;

export interface CuratedQaCandidate {
    candidateId: string;
    chordType: CuratedQaChordId;
    rootPitchClass: number;
    chordTypeLabel: string;
    chordLabel: string;
    voicing: ResolvedVoicing;
    sourceLabel: string;
    displayName: string;
    displaySubtitle: string | null;
    seedId?: string;
}

export interface CuratedQaCandidateGroup {
    chordType: CuratedQaChordId;
    chordTypeLabel: string;
    chordLabel: string;
    candidates: CuratedQaCandidate[];
}

export interface CuratedQaMacroCategory {
    inversionClass: 'root-position' | 'inversion' | 'slash-bass' | 'rootless';
    registerTopologyClass: 'low-cluster' | 'mid-cluster' | 'upper-cluster' | 'high-fret-not-upper';
    fullnessClass: 'lean' | 'standard' | 'fuller' | 'dense-color';
    topologyClass: string;
}

export interface CuratedQaMicroCategory {
    openStringUsageClass: 'none' | 'one' | 'two-plus';
    rootDistributionClass: 'single-root' | 'duplicated-root' | '3plus-root';
    optionalColorRetentionClass: 'no-optional' | 'some-optional' | 'color-rich';
    seedExplorationClass: string;
}

interface CuratedQaSlicePlan {
    maxCandidates: number;
    searchMultiplier?: number;
}

interface CuratedQaResolvedCandidate {
    candidate: CuratedQaCandidate;
}

interface CategorizedCuratedQaResolvedCandidate extends CuratedQaResolvedCandidate {
    fullnessClass: CuratedQaMacroCategory['fullnessClass'];
    inversionClass: CuratedQaMacroCategory['inversionClass'];
    registerTopologyClass: CuratedQaMacroCategory['registerTopologyClass'];
    topologyClass: CuratedQaMacroCategory['topologyClass'];
    macroCategoryKey: string;
    microCategoryKey: string;
}

interface CuratedQaCategoryInventory {
    byFullness: Map<CuratedQaMacroCategory['fullnessClass'], CategorizedCuratedQaResolvedCandidate[]>;
    byInversion: Map<CuratedQaMacroCategory['inversionClass'], CategorizedCuratedQaResolvedCandidate[]>;
    byRegisterTopology: Map<CuratedQaMacroCategory['registerTopologyClass'], CategorizedCuratedQaResolvedCandidate[]>;
    byTopology: Map<string, CategorizedCuratedQaResolvedCandidate[]>;
    byMacro: Map<string, CategorizedCuratedQaResolvedCandidate[]>;
    byMicro: Map<string, CategorizedCuratedQaResolvedCandidate[]>;
    byMacroMicro: Map<string, CategorizedCuratedQaResolvedCandidate[]>;
}

interface CuratedQaSelectionState {
    selectedIds: Set<string>;
    selected: CategorizedCuratedQaResolvedCandidate[];
    fullnessCounts: Map<string, number>;
    inversionCounts: Map<string, number>;
    registerTopologyCounts: Map<string, number>;
    topologyCounts: Map<string, number>;
    macroCounts: Map<string, number>;
    microCounts: Map<string, number>;
    macroMicroCounts: Map<string, number>;
}

const CURATED_QA_SLICE_PLANS: Record<CuratedQaChordId, CuratedQaSlicePlan> = {
    major: {
        maxCandidates: 12,
        searchMultiplier: 12,
    },
    'major-6': {
        maxCandidates: 3,
    },
    'major-7': {
        maxCandidates: 6,
    },
    'major-9': {
        maxCandidates: 6,
    },
    minor: {
        maxCandidates: 8,
    },
    'minor-7': {
        maxCandidates: 6,
    },
    'dominant-7': {
        maxCandidates: 8,
    },
    'dominant-9': {
        maxCandidates: 6,
    },
    sus2: {
        maxCandidates: 3,
    },
    sus4: {
        maxCandidates: 4,
    },
};

function getReviewKey(chordType: CuratedQaChordId, candidateId: string): string {
    return `${chordType}::${candidateId}`;
}

export function getCuratedQaReviewKey(record: Pick<CuratedQaReviewRecord, 'chordType' | 'candidateId'>): string {
    return getReviewKey(record.chordType, record.candidateId);
}

export function recordCuratedQaDecision(
    currentState: CuratedQaReviewState,
    record: CuratedQaReviewRecord
): CuratedQaReviewState {
    return {
        ...currentState,
        [getCuratedQaReviewKey(record)]: record,
    };
}

export function clearCuratedQaDecision(
    currentState: CuratedQaReviewState,
    record: Pick<CuratedQaReviewRecord, 'chordType' | 'candidateId'>
): CuratedQaReviewState {
    const nextState = { ...currentState };
    delete nextState[getCuratedQaReviewKey(record)];
    return nextState;
}

export function buildCuratedQaReviewState(records: CuratedQaReviewRecord[]): CuratedQaReviewState {
    return records.reduce<CuratedQaReviewState>((accumulator, record) => {
        accumulator[getCuratedQaReviewKey(record)] = record;
        return accumulator;
    }, {});
}

export function mergeCuratedQaReviewStates(...states: Array<CuratedQaReviewState | null | undefined>): CuratedQaReviewState {
    return states.reduce<CuratedQaReviewState>((accumulator, state) => {
        if (!state) {
            return accumulator;
        }

        return {
            ...accumulator,
            ...state,
        };
    }, {});
}

export function recordCuratedQaSessionDecision(
    persistedState: CuratedQaReviewState,
    sessionState: CuratedQaReviewState,
    record: CuratedQaReviewRecord
): CuratedQaReviewState {
    const persistedRecord = persistedState[getCuratedQaReviewKey(record)];

    if (
        persistedRecord
        && persistedRecord.decision === record.decision
        && (persistedRecord.rootPitchClass ?? null) === (record.rootPitchClass ?? null)
    ) {
        return clearCuratedQaDecision(sessionState, record);
    }

    return recordCuratedQaDecision(sessionState, record);
}

export function getCuratedQaDecisionForCandidate(
    currentState: CuratedQaReviewState,
    candidate: Pick<CuratedQaCandidate, 'chordType' | 'candidateId'>
): CuratedQaDecision | null {
    return currentState[getReviewKey(candidate.chordType, candidate.candidateId)]?.decision ?? null;
}

export function isDeveloperCuratedQaEnabled(args: {
    nodeEnv?: string;
    search?: string;
}): boolean {
    if (args.nodeEnv === 'production') {
        return false;
    }

    const params = new URLSearchParams(args.search ?? '');
    return params.get('dev-curated-qa') === '1';
}

function buildCuratedQaCandidateFromVoicing(
    entry: ChordRegistryEntry,
    rootPitchClass: number,
    voicing: ResolvedVoicing
): CuratedQaCandidate {
    const chord = buildChordDefinitionFromRegistryEntry(entry, rootPitchClass);

    return {
        candidateId: voicing.id,
        chordType: entry.id as CuratedQaChordId,
        rootPitchClass,
        chordTypeLabel: getChordTypeLabel(entry),
        chordLabel: chord.symbol,
        voicing,
        sourceLabel: getVoicingProvenanceLabel(voicing.descriptor.provenance),
        displayName: getVoicingDisplayName(voicing.descriptor),
        displaySubtitle: getVoicingDisplaySubtitle(voicing.descriptor),
        seedId: voicing.descriptor.provenance.seedId,
    };
}

function getResolvedVoicingSignature(voicing: ResolvedVoicing): string {
    return voicing.notes
        .map((note) => `${note.string}:${note.isMuted ? 'x' : note.fret}`)
        .join('|');
}

function getResolvedTemplateCandidate(
    voicing: ResolvedVoicing,
    entry: ChordRegistryEntry,
    rootPitchClass: number
): CuratedQaResolvedCandidate {
    return {
        candidate: buildCuratedQaCandidateFromVoicing(entry, rootPitchClass, voicing),
    };
}

function incrementSelectionCount(counts: Map<string, number>, key: string) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
}

interface GeneratedSeedFacetSummary {
    bassString: string;
    layoutKind: string;
    registerBias: string;
    coverageProfile: string;
}

function getGeneratedSeedFacetSummary(seedId?: string): GeneratedSeedFacetSummary {
    if (!seedId || !seedId.includes(':generated:')) {
        return {
            bassString: 'na',
            layoutKind: 'na',
            registerBias: 'na',
            coverageProfile: 'na',
        };
    }

    const match = seedId.match(/:generated:b(\d):r\d:s[1-6]+:n\d+:([^:]+):([^:]+):([^:]+):/);
    if (!match) {
        return {
            bassString: 'generated',
            layoutKind: 'generated',
            registerBias: 'generated',
            coverageProfile: 'generated',
        };
    }

    return {
        bassString: `bass-${match[1]}`,
        layoutKind: match[2],
        registerBias: match[3],
        coverageProfile: match[4],
    };
}

function getCuratedQaPlayedStringTopology(voicing: ResolvedVoicing): string {
    return voicing.descriptor.playedStrings.join(',') || 'none';
}

function getCuratedQaRegisterTopologyClass(voicing: ResolvedVoicing): CuratedQaMacroCategory['registerTopologyClass'] {
    const playedStrings = voicing.descriptor.playedStrings;
    const allUpperStrings = playedStrings.length > 0 && playedStrings.every((string) => string <= 2);
    const allLowerStrings = playedStrings.length > 0 && playedStrings.every((string) => string >= 3);

    if (allUpperStrings) {
        return 'upper-cluster';
    }

    if (voicing.descriptor.registerBand === 'high') {
        return 'high-fret-not-upper';
    }

    if (voicing.descriptor.registerBand === 'low' || allLowerStrings) {
        return 'low-cluster';
    }

    return 'mid-cluster';
}

export function getCuratedQaMacroCategory(candidate: CuratedQaCandidate): CuratedQaMacroCategory {
    const voicing = candidate.voicing;
    const optionalColorCount = voicing.descriptor.optionalCoverageDegrees.length;
    const fullnessClass: CuratedQaMacroCategory['fullnessClass'] = optionalColorCount >= 2 || voicing.descriptor.noteCount >= 6
        ? 'dense-color'
        : voicing.descriptor.noteCount >= 5
            ? 'fuller'
            : voicing.descriptor.noteCount <= 3
                ? 'lean'
                : 'standard';

    return {
        inversionClass: voicing.descriptor.inversion,
        registerTopologyClass: getCuratedQaRegisterTopologyClass(voicing),
        fullnessClass,
        topologyClass: getCuratedQaPlayedStringTopology(voicing),
    };
}

export function getCuratedQaMicroCategory(candidate: CuratedQaCandidate): CuratedQaMicroCategory {
    const voicing = candidate.voicing;
    const openStringCount = voicing.notes.filter((note) => !note.isMuted && note.fret === 0).length;
    const seedFacets = getGeneratedSeedFacetSummary(candidate.seedId);
    const rootDistributionClass: CuratedQaMicroCategory['rootDistributionClass'] = voicing.descriptor.rootOccurrenceCount >= 3
        ? '3plus-root'
        : voicing.descriptor.rootOccurrenceCount >= 2
            ? 'duplicated-root'
            : 'single-root';
    const optionalColorRetentionClass: CuratedQaMicroCategory['optionalColorRetentionClass'] = voicing.descriptor.optionalCoverageDegrees.length >= 2
        ? 'color-rich'
        : voicing.descriptor.optionalCoverageDegrees.length >= 1
            ? 'some-optional'
            : 'no-optional';

    return {
        openStringUsageClass: openStringCount >= 2 ? 'two-plus' : openStringCount === 1 ? 'one' : 'none',
        rootDistributionClass,
        optionalColorRetentionClass,
        seedExplorationClass: `${seedFacets.coverageProfile}:${seedFacets.layoutKind}`,
    };
}

function getCuratedQaMacroCategoryKey(candidate: CuratedQaCandidate): string {
    const category = getCuratedQaMacroCategory(candidate);

    return [
        category.inversionClass,
        category.registerTopologyClass,
        category.fullnessClass,
        category.topologyClass,
    ].join('::');
}

function getCuratedQaMicroCategoryKey(candidate: CuratedQaCandidate): string {
    const category = getCuratedQaMicroCategory(candidate);

    return [
        category.openStringUsageClass,
        category.rootDistributionClass,
        category.optionalColorRetentionClass,
        category.seedExplorationClass,
    ].join('::');
}

function categorizeCuratedQaResolvedCandidate(
    resolvedCandidate: CuratedQaResolvedCandidate
): CategorizedCuratedQaResolvedCandidate {
    const macroCategory = getCuratedQaMacroCategory(resolvedCandidate.candidate);
    const microCategoryKey = getCuratedQaMicroCategoryKey(resolvedCandidate.candidate);
    const macroCategoryKey = [
        macroCategory.inversionClass,
        macroCategory.registerTopologyClass,
        macroCategory.fullnessClass,
        macroCategory.topologyClass,
    ].join('::');

    return {
        ...resolvedCandidate,
        fullnessClass: macroCategory.fullnessClass,
        inversionClass: macroCategory.inversionClass,
        registerTopologyClass: macroCategory.registerTopologyClass,
        topologyClass: macroCategory.topologyClass,
        macroCategoryKey,
        microCategoryKey,
    };
}

function pushInventoryEntry<Key extends string>(
    inventory: Map<Key, CategorizedCuratedQaResolvedCandidate[]>,
    key: Key,
    candidate: CategorizedCuratedQaResolvedCandidate
) {
    const existing = inventory.get(key) ?? [];
    existing.push(candidate);
    inventory.set(key, existing);
}

function buildCuratedQaCategoryInventory(
    candidates: CategorizedCuratedQaResolvedCandidate[]
): CuratedQaCategoryInventory {
    const inventory: CuratedQaCategoryInventory = {
        byFullness: new Map(),
        byInversion: new Map(),
        byRegisterTopology: new Map(),
        byTopology: new Map(),
        byMacro: new Map(),
        byMicro: new Map(),
        byMacroMicro: new Map(),
    };

    for (const candidate of candidates) {
        pushInventoryEntry(inventory.byFullness, candidate.fullnessClass, candidate);
        pushInventoryEntry(inventory.byInversion, candidate.inversionClass, candidate);
        pushInventoryEntry(inventory.byRegisterTopology, candidate.registerTopologyClass, candidate);
        pushInventoryEntry(inventory.byTopology, candidate.topologyClass, candidate);
        pushInventoryEntry(inventory.byMacro, candidate.macroCategoryKey, candidate);
        pushInventoryEntry(inventory.byMicro, candidate.microCategoryKey, candidate);
        pushInventoryEntry(inventory.byMacroMicro, `${candidate.macroCategoryKey}::${candidate.microCategoryKey}`, candidate);
    }

    return inventory;
}

function compareCandidateTieBreak(left: CuratedQaResolvedCandidate, right: CuratedQaResolvedCandidate): number {
    const candidateIdOrder = left.candidate.candidateId.localeCompare(right.candidate.candidateId);
    if (candidateIdOrder !== 0) {
        return candidateIdOrder;
    }

    return (left.candidate.seedId ?? '').localeCompare(right.candidate.seedId ?? '');
}

function buildExactSignatureRepresentatives(
    candidates: CuratedQaResolvedCandidate[]
): CuratedQaResolvedCandidate[] {
    const groups = new Map<string, CuratedQaResolvedCandidate[]>();

    for (const candidate of candidates) {
        const signature = getResolvedVoicingSignature(candidate.candidate.voicing);
        const existing = groups.get(signature) ?? [];
        existing.push(candidate);
        groups.set(signature, existing);
    }

    return Array.from(groups.values())
        .map((group) => [...group].sort(compareCandidateTieBreak)[0]!)
        .sort(compareCandidateTieBreak);
}

function createCuratedQaSelectionState(): CuratedQaSelectionState {
    return {
        selectedIds: new Set(),
        selected: [],
        fullnessCounts: new Map(),
        inversionCounts: new Map(),
        registerTopologyCounts: new Map(),
        topologyCounts: new Map(),
        macroCounts: new Map(),
        microCounts: new Map(),
        macroMicroCounts: new Map(),
    };
}

function addSelectedCandidate(
    state: CuratedQaSelectionState,
    candidate: CategorizedCuratedQaResolvedCandidate
) {
    if (state.selectedIds.has(candidate.candidate.candidateId)) {
        return;
    }

    state.selected.push(candidate);
    state.selectedIds.add(candidate.candidate.candidateId);
    incrementSelectionCount(state.fullnessCounts, candidate.fullnessClass);
    incrementSelectionCount(state.inversionCounts, candidate.inversionClass);
    incrementSelectionCount(state.registerTopologyCounts, candidate.registerTopologyClass);
    incrementSelectionCount(state.topologyCounts, candidate.topologyClass);
    incrementSelectionCount(state.macroCounts, candidate.macroCategoryKey);
    incrementSelectionCount(state.microCounts, candidate.microCategoryKey);
    incrementSelectionCount(state.macroMicroCounts, `${candidate.macroCategoryKey}::${candidate.microCategoryKey}`);
}

function compareTupleValues(left: Array<string | number>, right: Array<string | number>): number {
    const length = Math.max(left.length, right.length);

    for (let index = 0; index < length; index += 1) {
        const leftValue = left[index];
        const rightValue = right[index];

        if (leftValue === rightValue) {
            continue;
        }

        if (typeof leftValue === 'number' && typeof rightValue === 'number') {
            return leftValue - rightValue;
        }

        return String(leftValue).localeCompare(String(rightValue));
    }

    return 0;
}

function getInventoryCandidateRarityTuple(
    candidate: CategorizedCuratedQaResolvedCandidate,
    inventory: CuratedQaCategoryInventory
): Array<string | number> {
    return [
        inventory.byMacro.get(candidate.macroCategoryKey)?.length ?? Number.MAX_SAFE_INTEGER,
        inventory.byFullness.get(candidate.fullnessClass)?.length ?? Number.MAX_SAFE_INTEGER,
        inventory.byInversion.get(candidate.inversionClass)?.length ?? Number.MAX_SAFE_INTEGER,
        inventory.byRegisterTopology.get(candidate.registerTopologyClass)?.length ?? Number.MAX_SAFE_INTEGER,
        inventory.byTopology.get(candidate.topologyClass)?.length ?? Number.MAX_SAFE_INTEGER,
        inventory.byMicro.get(candidate.microCategoryKey)?.length ?? Number.MAX_SAFE_INTEGER,
        candidate.candidate.candidateId,
        candidate.candidate.seedId ?? '',
    ];
}

function getSelectionBalanceTuple(
    candidate: CategorizedCuratedQaResolvedCandidate,
    state: CuratedQaSelectionState,
    inventory: CuratedQaCategoryInventory
): Array<string | number> {
    return [
        state.macroCounts.get(candidate.macroCategoryKey) ?? 0,
        state.macroMicroCounts.get(`${candidate.macroCategoryKey}::${candidate.microCategoryKey}`) ?? 0,
        state.fullnessCounts.get(candidate.fullnessClass) ?? 0,
        state.inversionCounts.get(candidate.inversionClass) ?? 0,
        state.registerTopologyCounts.get(candidate.registerTopologyClass) ?? 0,
        state.topologyCounts.get(candidate.topologyClass) ?? 0,
        state.microCounts.get(candidate.microCategoryKey) ?? 0,
        ...getInventoryCandidateRarityTuple(candidate, inventory),
    ];
}

function pickBestRepresentativeCandidate(
    candidates: CategorizedCuratedQaResolvedCandidate[],
    state: CuratedQaSelectionState,
    inventory: CuratedQaCategoryInventory
): CategorizedCuratedQaResolvedCandidate | undefined {
    return [...candidates]
        .filter((candidate) => !state.selectedIds.has(candidate.candidate.candidateId))
        .sort((left, right) =>
            compareTupleValues(
                getSelectionBalanceTuple(left, state, inventory),
                getSelectionBalanceTuple(right, state, inventory)
            )
        )[0];
}

function applyCategoryCoveragePass<Key extends string>(
    categoryMap: Map<Key, CategorizedCuratedQaResolvedCandidate[]>,
    state: CuratedQaSelectionState,
    inventory: CuratedQaCategoryInventory,
    maxCandidates: number
) {
    const orderedCategories = Array.from(categoryMap.entries())
        .sort((left, right) => {
            if (left[1].length !== right[1].length) {
                return left[1].length - right[1].length;
            }

            return String(left[0]).localeCompare(String(right[0]));
        });

    for (const [, candidates] of orderedCategories) {
        if (state.selected.length >= maxCandidates) {
            break;
        }

        const nextCandidate = pickBestRepresentativeCandidate(candidates, state, inventory);
        if (!nextCandidate) {
            continue;
        }

        addSelectedCandidate(state, nextCandidate);
    }
}

function applyFillPass(
    candidates: CategorizedCuratedQaResolvedCandidate[],
    state: CuratedQaSelectionState,
    inventory: CuratedQaCategoryInventory,
    maxCandidates: number
) {
    while (state.selected.length < maxCandidates) {
        const nextCandidate = pickBestRepresentativeCandidate(candidates, state, inventory);

        if (!nextCandidate) {
            break;
        }

        addSelectedCandidate(state, nextCandidate);
    }
}

export function selectCuratedQaCandidatesFromResolvedVoicings(
    entry: ChordRegistryEntry,
    rootPitchClass: number,
    voicings: ResolvedVoicing[],
    plan: Pick<CuratedQaSlicePlan, 'maxCandidates'>
): CuratedQaCandidate[] {
    const representativeCandidates = buildExactSignatureRepresentatives(
        voicings.map((voicing) => getResolvedTemplateCandidate(voicing, entry, rootPitchClass))
    ).map(categorizeCuratedQaResolvedCandidate);
    const inventory = buildCuratedQaCategoryInventory(representativeCandidates);
    const selectionState = createCuratedQaSelectionState();

    applyCategoryCoveragePass(inventory.byFullness, selectionState, inventory, plan.maxCandidates);
    applyCategoryCoveragePass(inventory.byInversion, selectionState, inventory, plan.maxCandidates);
    applyCategoryCoveragePass(inventory.byRegisterTopology, selectionState, inventory, plan.maxCandidates);
    applyCategoryCoveragePass(inventory.byMacro, selectionState, inventory, plan.maxCandidates);
    applyCategoryCoveragePass(inventory.byMacroMicro, selectionState, inventory, plan.maxCandidates);
    applyFillPass(representativeCandidates, selectionState, inventory, plan.maxCandidates);

    return selectionState.selected
        .slice(0, plan.maxCandidates)
        .map((resolvedCandidate) => resolvedCandidate.candidate);
}

function selectStratifiedCandidatesForChord(
    entry: ChordRegistryEntry,
    rootPitchClass: number,
    plan: CuratedQaSlicePlan
): CuratedQaCandidate[] {
    const exploratoryCandidates = getExploratoryVoicingsForChord(entry, rootPitchClass, {
        maxRootFret: 15,
        includeNonPlayableCandidates: false,
        dedupeResolvedCandidates: false,
    });

    return selectCuratedQaCandidatesFromResolvedVoicings(entry, rootPitchClass, exploratoryCandidates, plan);
}

export function getCuratedQaCandidates(rootPitchClass: number): CuratedQaCandidate[] {
    return CURATED_QA_REVIEW_CHORD_IDS.flatMap((chordType) => {
        return getCuratedQaCandidatesForChord(chordType, rootPitchClass);
    });
}

export function getCuratedQaCandidatesForChord(
    chordType: CuratedQaChordId,
    rootPitchClass: number
): CuratedQaCandidate[] {
    const entry = resolveChordRegistryEntry(chordType);
    const plan = CURATED_QA_SLICE_PLANS[chordType];

    return selectStratifiedCandidatesForChord(entry, rootPitchClass, plan);
}

export function groupCuratedQaCandidates(candidates: CuratedQaCandidate[]): CuratedQaCandidateGroup[] {
    return CURATED_QA_REVIEW_CHORD_IDS.map((chordType) => {
        const matchingCandidates = candidates.filter((candidate) => candidate.chordType === chordType);

        if (matchingCandidates.length === 0) {
            return null;
        }

        return {
            chordType,
            chordTypeLabel: matchingCandidates[0].chordTypeLabel,
            chordLabel: matchingCandidates[0].chordLabel,
            candidates: matchingCandidates,
        };
    }).filter((group): group is CuratedQaCandidateGroup => group !== null);
}
