import { getChordTypeLabel, getChordTypeSuffix, resolveChordRegistryEntry } from './helpers';
import { getCuratedVoicingTemplatesForChord } from './curated';
import { getVoicingDisplayName, getVoicingDisplaySubtitle, getVoicingProvenanceLabel } from './descriptor';
import { getLegacyVoicingTemplatesForChord } from './templates';
import { buildChordDefinitionFromRegistryEntry, buildChordTonesFromRegistryEntry } from './helpers';
import { resolveVoicingTemplate } from './resolver';
import type { ChordRegistryEntry } from './registry';
import type { ResolvedVoicing, VoicingTemplate } from './types';

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
}

export type CuratedQaReviewState = Record<string, CuratedQaReviewRecord>;

export interface CuratedQaCandidate {
    candidateId: string;
    chordType: CuratedQaChordId;
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
    includeLegacyCandidates: boolean;
    maxCandidates: number;
}

interface CuratedQaResolvedTemplateCandidate {
    template: VoicingTemplate;
    candidate: CuratedQaCandidate;
}

const CURATED_QA_SLICE_PLANS: Record<CuratedQaChordId, CuratedQaSlicePlan> = {
    major: {
        includeLegacyCandidates: true,
        maxCandidates: 5,
    },
    'major-6': {
        includeLegacyCandidates: false,
        maxCandidates: 2,
    },
    'major-7': {
        includeLegacyCandidates: true,
        maxCandidates: 3,
    },
    'major-9': {
        includeLegacyCandidates: true,
        maxCandidates: 3,
    },
    minor: {
        includeLegacyCandidates: true,
        maxCandidates: 4,
    },
    'minor-7': {
        includeLegacyCandidates: true,
        maxCandidates: 3,
    },
    'dominant-7': {
        includeLegacyCandidates: true,
        maxCandidates: 4,
    },
    'dominant-9': {
        includeLegacyCandidates: true,
        maxCandidates: 3,
    },
    sus2: {
        includeLegacyCandidates: false,
        maxCandidates: 2,
    },
    sus4: {
        includeLegacyCandidates: true,
        maxCandidates: 3,
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

function buildCuratedQaCandidateFromTemplate(
    entry: ChordRegistryEntry,
    rootPitchClass: number,
    template: VoicingTemplate
): CuratedQaCandidate {
    const chord = buildChordDefinitionFromRegistryEntry(entry, rootPitchClass);
    const tones = buildChordTonesFromRegistryEntry(entry, rootPitchClass);
    const voicing = resolveVoicingTemplate(chord, tones, template);

    return {
        candidateId: voicing.id,
        chordType: entry.id as CuratedQaChordId,
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
    entry: ChordRegistryEntry,
    rootPitchClass: number,
    template: VoicingTemplate
): CuratedQaResolvedTemplateCandidate {
    return {
        template,
        candidate: buildCuratedQaCandidateFromTemplate(entry, rootPitchClass, template),
    };
}

function getCuratedQaStructureBucket(candidate: CuratedQaResolvedTemplateCandidate): string {
    return [
        candidate.template.rootString ?? 'none',
        candidate.candidate.voicing.descriptor.registerBand,
        candidate.candidate.voicing.descriptor.family,
        candidate.candidate.voicing.descriptor.noteCount,
    ].join('::');
}

function selectStratifiedCandidatesForChord(
    entry: ChordRegistryEntry,
    rootPitchClass: number,
    plan: CuratedQaSlicePlan
): CuratedQaCandidate[] {
    const templatePool = [
        ...getCuratedVoicingTemplatesForChord(entry),
        ...(plan.includeLegacyCandidates ? getLegacyVoicingTemplatesForChord(entry) : []),
    ];
    const deduped = new Map<string, CuratedQaResolvedTemplateCandidate>();

    for (const template of templatePool) {
        const resolvedCandidate = getResolvedTemplateCandidate(entry, rootPitchClass, template);

        if (!resolvedCandidate.candidate.voicing.playable) {
            continue;
        }

        const voicingSignature = getResolvedVoicingSignature(resolvedCandidate.candidate.voicing);
        const existing = deduped.get(voicingSignature);

        if (!existing) {
            deduped.set(voicingSignature, resolvedCandidate);
            continue;
        }

        if (existing.candidate.voicing.descriptor.provenance.sourceKind !== 'curated'
            && resolvedCandidate.candidate.voicing.descriptor.provenance.sourceKind === 'curated') {
            deduped.set(voicingSignature, resolvedCandidate);
        }
    }

    const dedupedCandidates = Array.from(deduped.values());
    const selected = dedupedCandidates.filter(
        (resolvedCandidate) => resolvedCandidate.candidate.voicing.descriptor.provenance.sourceKind === 'curated'
    );
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
