import { getChordTypeLabel, getChordTypeSuffix, resolveChordRegistryEntry } from './helpers';
import { getVoicingDisplayName, getVoicingDisplaySubtitle, getVoicingProvenanceLabel } from './descriptor';
import { buildChordDefinitionFromRegistryEntry } from './helpers';
import { getExploratoryVoicingsForChord } from './voicings';
import type { ChordRegistryEntry } from './registry';
import type { ResolvedVoicing, VoicingCandidate } from './types';

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

interface CuratedQaSlicePlan {
    maxCandidates: number;
    searchMultiplier?: number;
}

interface CuratedQaResolvedCandidate {
    sourceCandidate: VoicingCandidate;
    candidate: CuratedQaCandidate;
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
    sourceCandidate: VoicingCandidate,
    entry: ChordRegistryEntry,
    rootPitchClass: number
): CuratedQaResolvedCandidate {
    return {
        sourceCandidate,
        candidate: buildCuratedQaCandidateFromVoicing(entry, rootPitchClass, sourceCandidate.voicing),
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

function getCuratedQaStructureBucket(candidate: CuratedQaResolvedCandidate): string {
    const seedFacets = getGeneratedSeedFacetSummary(candidate.candidate.seedId);

    return [
        candidate.candidate.voicing.descriptor.provenance.sourceKind,
        candidate.candidate.voicing.descriptor.inversion,
        candidate.candidate.voicing.descriptor.rootString ?? 'none',
        seedFacets.bassString,
        candidate.candidate.voicing.descriptor.registerBand,
        candidate.candidate.voicing.descriptor.family,
        candidate.candidate.voicing.descriptor.noteCount,
        seedFacets.layoutKind,
        seedFacets.registerBias,
        seedFacets.coverageProfile,
        candidate.candidate.voicing.playable ? 'playable' : 'non-playable',
    ].join('::');
}

function selectStratifiedCandidatesForChord(
    entry: ChordRegistryEntry,
    rootPitchClass: number,
    plan: CuratedQaSlicePlan
): CuratedQaCandidate[] {
    const exploratoryCandidates = getExploratoryVoicingsForChord(entry, rootPitchClass, {
        maxRootFret: 15,
        maxCandidates: Math.max(plan.maxCandidates * (plan.searchMultiplier ?? 10), 24),
        includeCuratedCandidates: false,
        includeLegacyCandidates: false,
    });
    const deduped = new Map<string, CuratedQaResolvedCandidate>();

    for (const sourceCandidate of exploratoryCandidates) {
        const resolvedCandidate = getResolvedTemplateCandidate(sourceCandidate, entry, rootPitchClass);

        const voicingSignature = getResolvedVoicingSignature(resolvedCandidate.candidate.voicing);
        const existing = deduped.get(voicingSignature);

        if (!existing) {
            deduped.set(voicingSignature, resolvedCandidate);
        }
    }

    const dedupedCandidates = Array.from(deduped.values());
    const selected: CuratedQaResolvedCandidate[] = [];
    const selectedIds = new Set(selected.map((resolvedCandidate) => resolvedCandidate.candidate.candidateId));
    const selectedBuckets = new Set(selected.map(getCuratedQaStructureBucket));

    for (const resolvedCandidate of dedupedCandidates) {
        if (selected.length >= plan.maxCandidates) {
            break;
        }

        if (selectedIds.has(resolvedCandidate.candidate.candidateId)) {
            continue;
        }

        const bucket = getCuratedQaStructureBucket(resolvedCandidate);
        if (selectedBuckets.has(bucket)) {
            continue;
        }

        selected.push(resolvedCandidate);
        selectedIds.add(resolvedCandidate.candidate.candidateId);
        selectedBuckets.add(bucket);
    }

    for (const resolvedCandidate of dedupedCandidates) {
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
