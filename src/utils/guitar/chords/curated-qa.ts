import { getChordTypeLabel, getChordTypeSuffix, resolveChordRegistryEntry } from './helpers';
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
    macroCategoryKey: string;
    microCategoryKey: string;
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
        chordLabel: `${chord.symbol}${getChordTypeSuffix(entry)}`,
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
    return {
        ...resolvedCandidate,
        macroCategoryKey: getCuratedQaMacroCategoryKey(resolvedCandidate.candidate),
        microCategoryKey: getCuratedQaMicroCategoryKey(resolvedCandidate.candidate),
    };
}

function buildMacroCategoryInventory(
    candidates: CategorizedCuratedQaResolvedCandidate[]
): Map<string, CategorizedCuratedQaResolvedCandidate[]> {
    const inventory = new Map<string, CategorizedCuratedQaResolvedCandidate[]>();

    for (const candidate of candidates) {
        const existing = inventory.get(candidate.macroCategoryKey) ?? [];
        existing.push(candidate);
        inventory.set(candidate.macroCategoryKey, existing);
    }

    return inventory;
}

function selectMacroCoverageCandidates(
    candidates: CategorizedCuratedQaResolvedCandidate[],
    maxCandidates: number
): CategorizedCuratedQaResolvedCandidate[] {
    const macroInventory = buildMacroCategoryInventory(candidates);
    const selected: CategorizedCuratedQaResolvedCandidate[] = [];
    const selectedIds = new Set<string>();
    const macroKeys = Array.from(macroInventory.keys());
    let macroIndex = 0;

    while (selected.length < maxCandidates && macroKeys.length > 0) {
        let selectedInRound = false;

        for (let index = 0; index < macroKeys.length; index += 1) {
            const macroKey = macroKeys[(macroIndex + index) % macroKeys.length];
            const nextCandidate = (macroInventory.get(macroKey) ?? []).find((candidate) => !selectedIds.has(candidate.candidate.candidateId));

            if (!nextCandidate) {
                continue;
            }

            selected.push(nextCandidate);
            selectedIds.add(nextCandidate.candidate.candidateId);
            macroIndex = (macroIndex + index + 1) % macroKeys.length;
            selectedInRound = true;

            if (selected.length >= maxCandidates) {
                break;
            }
        }

        if (!selectedInRound) {
            break;
        }
    }

    return selected;
}

function selectMicroDiversityCandidates(
    candidates: CategorizedCuratedQaResolvedCandidate[],
    selected: CategorizedCuratedQaResolvedCandidate[],
    maxCandidates: number
): CategorizedCuratedQaResolvedCandidate[] {
    const selectedIds = new Set(selected.map((candidate) => candidate.candidate.candidateId));
    const selectedMacroMicroPairs = new Set(selected.map((candidate) => `${candidate.macroCategoryKey}::${candidate.microCategoryKey}`));
    const macroInventory = buildMacroCategoryInventory(candidates);
    const macroKeys = Array.from(macroInventory.keys());
    let macroIndex = 0;

    while (selected.length < maxCandidates && macroKeys.length > 0) {
        let selectedInRound = false;

        for (let index = 0; index < macroKeys.length; index += 1) {
            const macroKey = macroKeys[(macroIndex + index) % macroKeys.length];
            const macroCandidates = macroInventory.get(macroKey) ?? [];
            const nextCandidate = macroCandidates.find((candidate) => {
                if (selectedIds.has(candidate.candidate.candidateId)) {
                    return false;
                }

                return !selectedMacroMicroPairs.has(`${candidate.macroCategoryKey}::${candidate.microCategoryKey}`);
            });

            if (!nextCandidate) {
                continue;
            }

            selected.push(nextCandidate);
            selectedIds.add(nextCandidate.candidate.candidateId);
            selectedMacroMicroPairs.add(`${nextCandidate.macroCategoryKey}::${nextCandidate.microCategoryKey}`);
            macroIndex = (macroIndex + index + 1) % macroKeys.length;
            selectedInRound = true;

            if (selected.length >= maxCandidates) {
                break;
            }
        }

        if (!selectedInRound) {
            break;
        }
    }

    return selected;
}

function selectStratifiedCandidatesForChord(
    entry: ChordRegistryEntry,
    rootPitchClass: number,
    plan: CuratedQaSlicePlan
): CuratedQaCandidate[] {
    const exploratoryCandidates = getExploratoryVoicingsForChord(entry, rootPitchClass, {
        maxRootFret: 15,
        includeNonPlayableCandidates: false,
    });
    const deduped = new Map<string, CuratedQaResolvedCandidate>();

    for (const voicing of exploratoryCandidates) {
        const resolvedCandidate = getResolvedTemplateCandidate(voicing, entry, rootPitchClass);

        const voicingSignature = getResolvedVoicingSignature(resolvedCandidate.candidate.voicing);
        const existing = deduped.get(voicingSignature);

        if (!existing) {
            deduped.set(voicingSignature, resolvedCandidate);
        }
    }

    const categorizedCandidates = Array.from(deduped.values()).map(categorizeCuratedQaResolvedCandidate);
    const selected = selectMicroDiversityCandidates(
        categorizedCandidates,
        selectMacroCoverageCandidates(categorizedCandidates, plan.maxCandidates),
        plan.maxCandidates
    );
    const selectedIds = new Set(selected.map((resolvedCandidate) => resolvedCandidate.candidate.candidateId));

    for (const resolvedCandidate of categorizedCandidates) {
        if (selected.length >= plan.maxCandidates) {
            break;
        }

        if (selectedIds.has(resolvedCandidate.candidate.candidateId)) {
            continue;
        }

        selected.push(resolvedCandidate);
        selectedIds.add(resolvedCandidate.candidate.candidateId);
    }

    return selected
        .slice(0, plan.maxCandidates)
        .map((resolvedCandidate) => resolvedCandidate.candidate);
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
