import { resolveChordRegistryEntry } from './helpers';
import { getCuratedQaCandidatesForChord, type CuratedQaCandidate, type CuratedQaDecision } from './curated-qa';
import type { CuratedQaReviewSnapshot } from './curated-qa-storage';
import type { VoicingProvenanceSourceKind } from './types';

export interface CuratedQaDecisionCounts {
    accept: number;
    borderline: number;
    reject: number;
}

export interface CuratedQaAnalysisBucket {
    key: string;
    total: number;
    decisions: CuratedQaDecisionCounts;
}

export interface CuratedQaChordTypeAnalysis {
    chordType: string;
    chordFamily: string;
    reviewedCount: number;
    activeReviewedCount: number;
    staleReviewedCount: number;
    candidateCount: number;
    unreviewedCount: number;
    decisions: CuratedQaDecisionCounts;
    byStatus: CuratedQaAnalysisBucket[];
    provenance: CuratedQaAnalysisBucket[];
    inversions: CuratedQaAnalysisBucket[];
    rootStrings: CuratedQaAnalysisBucket[];
    registerBands: CuratedQaAnalysisBucket[];
    noteCounts: CuratedQaAnalysisBucket[];
    missingRequiredDegrees: CuratedQaAnalysisBucket[];
    outOfFormula: CuratedQaAnalysisBucket[];
    playability: CuratedQaAnalysisBucket[];
}

export interface CuratedQaAnalysisSummary {
    totalReviews: number;
    activeReviewCount: number;
    staleReviewCount: number;
    byDecision: CuratedQaDecisionCounts;
    byStatus: CuratedQaAnalysisBucket[];
    byChordFamily: CuratedQaAnalysisBucket[];
    byProvenance: CuratedQaAnalysisBucket[];
    byInversion: CuratedQaAnalysisBucket[];
    byRootString: CuratedQaAnalysisBucket[];
    byRegisterBand: CuratedQaAnalysisBucket[];
    byNoteCount: CuratedQaAnalysisBucket[];
    byMissingRequiredDegrees: CuratedQaAnalysisBucket[];
    byOutOfFormula: CuratedQaAnalysisBucket[];
    byPlayability: CuratedQaAnalysisBucket[];
    staleReviewReferences: Array<{
        chordType: string;
        candidateId: string;
        decision: CuratedQaDecision;
        rootPitchClass: number;
    }>;
    weakCoverageChordTypes: Array<{
        chordType: string;
        reviewedCount: number;
        activeReviewedCount: number;
        staleReviewedCount: number;
        candidateCount: number;
        unreviewedCount: number;
    }>;
    byChordType: CuratedQaChordTypeAnalysis[];
}

interface ResolvedReviewEvidence {
    chordType: string;
    chordFamily: string;
    candidateId: string;
    decision: CuratedQaDecision;
    rootPitchClass: number;
    candidate: CuratedQaCandidate | null;
    status: 'active' | 'stale';
}

function createDecisionCounts(): CuratedQaDecisionCounts {
    return {
        accept: 0,
        borderline: 0,
        reject: 0,
    };
}

function incrementDecisionCounts(counts: CuratedQaDecisionCounts, decision: CuratedQaDecision) {
    counts[decision] += 1;
}

function buildSortedBuckets(buckets: Map<string, CuratedQaDecisionCounts>): CuratedQaAnalysisBucket[] {
    return Array.from(buckets.entries())
        .map(([key, decisions]) => ({
            key,
            total: decisions.accept + decisions.borderline + decisions.reject,
            decisions,
        }))
        .sort((left, right) => {
            if (right.total !== left.total) {
                return right.total - left.total;
            }

            return left.key.localeCompare(right.key);
        });
}

function buildDecisionBuckets(
    evidence: ResolvedReviewEvidence[],
    deriveKey: (entry: ResolvedReviewEvidence) => string
): CuratedQaAnalysisBucket[] {
    const buckets = new Map<string, CuratedQaDecisionCounts>();

    for (const entry of evidence) {
        const key = deriveKey(entry);
        const counts = buckets.get(key) ?? createDecisionCounts();
        incrementDecisionCounts(counts, entry.decision);
        buckets.set(key, counts);
    }

    return buildSortedBuckets(buckets);
}

function resolveReviewEvidence(snapshot: CuratedQaReviewSnapshot): ResolvedReviewEvidence[] {
    return snapshot.reviews.map((review) => {
        const rootPitchClass = review.rootPitchClass ?? 0;
        const chordEntry = resolveChordRegistryEntry(review.chordType);
        const candidate = getCuratedQaCandidatesForChord(review.chordType, rootPitchClass)
            .find((item) => item.candidateId === review.candidateId) ?? null;

        return {
            chordType: review.chordType,
            chordFamily: chordEntry.family,
            candidateId: review.candidateId,
            decision: review.decision,
            rootPitchClass,
            candidate,
            status: candidate ? 'active' : 'stale',
        };
    });
}

function getCandidateCoverage(chordType: string, evidence: ResolvedReviewEvidence[]) {
    const rootPitchClass = evidence.find((entry) => entry.chordType === chordType)?.rootPitchClass ?? 0;
    const candidates = getCuratedQaCandidatesForChord(chordType as Parameters<typeof getCuratedQaCandidatesForChord>[0], rootPitchClass);
    const reviewedCandidateIds = new Set(
        evidence
            .filter((entry) => entry.chordType === chordType && entry.status === 'active' && entry.candidate)
            .map((entry) => entry.candidate!.candidateId)
    );

    return {
        candidateCount: candidates.length,
        unreviewedCount: candidates.filter((candidate) => !reviewedCandidateIds.has(candidate.candidateId)).length,
    };
}

function buildChordTypeAnalysis(
    chordType: string,
    evidence: ResolvedReviewEvidence[]
): CuratedQaChordTypeAnalysis {
    const chordEvidence = evidence.filter((entry) => entry.chordType === chordType);
    const chordEntry = resolveChordRegistryEntry(chordType);
    const decisions = createDecisionCounts();

    for (const entry of chordEvidence) {
        incrementDecisionCounts(decisions, entry.decision);
    }

    const activeReviewedCount = chordEvidence.filter((entry) => entry.status === 'active').length;
    const staleReviewedCount = chordEvidence.length - activeReviewedCount;
    const coverage = getCandidateCoverage(chordType, evidence);

    return {
        chordType,
        chordFamily: chordEntry.family,
        reviewedCount: chordEvidence.length,
        activeReviewedCount,
        staleReviewedCount,
        candidateCount: coverage.candidateCount,
        unreviewedCount: coverage.unreviewedCount,
        decisions,
        byStatus: buildDecisionBuckets(chordEvidence, (entry) => entry.status),
        provenance: buildDecisionBuckets(chordEvidence, (entry) => entry.candidate?.voicing.descriptor.provenance.sourceKind ?? 'stale'),
        inversions: buildDecisionBuckets(chordEvidence, (entry) => entry.candidate?.voicing.descriptor.inversion ?? 'stale'),
        rootStrings: buildDecisionBuckets(chordEvidence, (entry) => {
            if (entry.status === 'stale') {
                return 'stale';
            }

            const rootString = entry.candidate?.voicing.descriptor.rootString;
            return rootString === undefined ? 'none' : `root-${rootString + 1}`;
        }),
        registerBands: buildDecisionBuckets(chordEvidence, (entry) => entry.candidate?.voicing.descriptor.registerBand ?? 'stale'),
        noteCounts: buildDecisionBuckets(chordEvidence, (entry) => String(entry.candidate?.voicing.descriptor.noteCount ?? 'stale')),
        missingRequiredDegrees: buildDecisionBuckets(chordEvidence, (entry) => {
            if (entry.status === 'stale') {
                return 'stale';
            }

            const count = entry.candidate?.voicing.missingRequiredDegrees?.length ?? 0;
            return count === 0 ? 'complete' : `missing-${count}`;
        }),
        outOfFormula: buildDecisionBuckets(chordEvidence, (entry) => {
            if (entry.status === 'stale') {
                return 'stale';
            }

            const count = entry.candidate?.voicing.outOfFormulaPitchClasses?.length ?? 0;
            return count === 0 ? 'formula-closed' : `out-of-formula-${count}`;
        }),
        playability: buildDecisionBuckets(chordEvidence, (entry) => {
            if (entry.status === 'stale') {
                return 'stale';
            }

            return entry.candidate?.voicing.playable === false ? 'non-playable' : 'playable';
        }),
    };
}

export function buildCuratedQaAnalysisSummary(snapshot: CuratedQaReviewSnapshot): CuratedQaAnalysisSummary {
    const evidence = resolveReviewEvidence(snapshot);
    const byDecision = createDecisionCounts();

    for (const review of snapshot.reviews) {
        incrementDecisionCounts(byDecision, review.decision);
    }

    const activeReviewCount = evidence.filter((entry) => entry.status === 'active').length;
    const staleReviewCount = evidence.length - activeReviewCount;
    const chordTypes = [...new Set(snapshot.reviews.map((review) => review.chordType))]
        .sort((left, right) => left.localeCompare(right));
    const byChordType = chordTypes.map((chordType) => buildChordTypeAnalysis(chordType, evidence));

    return {
        totalReviews: snapshot.reviews.length,
        activeReviewCount,
        staleReviewCount,
        byDecision,
        byStatus: buildDecisionBuckets(evidence, (entry) => entry.status),
        byChordFamily: buildDecisionBuckets(evidence, (entry) => entry.chordFamily),
        byProvenance: buildDecisionBuckets(evidence, (entry) => entry.candidate?.voicing.descriptor.provenance.sourceKind ?? 'stale'),
        byInversion: buildDecisionBuckets(evidence, (entry) => entry.candidate?.voicing.descriptor.inversion ?? 'stale'),
        byRootString: buildDecisionBuckets(evidence, (entry) => {
            if (entry.status === 'stale') {
                return 'stale';
            }

            const rootString = entry.candidate?.voicing.descriptor.rootString;
            return rootString === undefined ? 'none' : `root-${rootString + 1}`;
        }),
        byRegisterBand: buildDecisionBuckets(evidence, (entry) => entry.candidate?.voicing.descriptor.registerBand ?? 'stale'),
        byNoteCount: buildDecisionBuckets(evidence, (entry) => String(entry.candidate?.voicing.descriptor.noteCount ?? 'stale')),
        byMissingRequiredDegrees: buildDecisionBuckets(evidence, (entry) => {
            if (entry.status === 'stale') {
                return 'stale';
            }

            const count = entry.candidate?.voicing.missingRequiredDegrees?.length ?? 0;
            return count === 0 ? 'complete' : `missing-${count}`;
        }),
        byOutOfFormula: buildDecisionBuckets(evidence, (entry) => {
            if (entry.status === 'stale') {
                return 'stale';
            }

            const count = entry.candidate?.voicing.outOfFormulaPitchClasses?.length ?? 0;
            return count === 0 ? 'formula-closed' : `out-of-formula-${count}`;
        }),
        byPlayability: buildDecisionBuckets(evidence, (entry) => {
            if (entry.status === 'stale') {
                return 'stale';
            }

            return entry.candidate?.voicing.playable === false ? 'non-playable' : 'playable';
        }),
        staleReviewReferences: evidence
            .filter((entry) => entry.status === 'stale')
            .map((entry) => ({
                chordType: entry.chordType,
                candidateId: entry.candidateId,
                decision: entry.decision,
                rootPitchClass: entry.rootPitchClass,
            })),
        weakCoverageChordTypes: byChordType
            .filter((entry) => entry.unreviewedCount > 0)
            .map((entry) => ({
                chordType: entry.chordType,
                reviewedCount: entry.reviewedCount,
                activeReviewedCount: entry.activeReviewedCount,
                staleReviewedCount: entry.staleReviewedCount,
                candidateCount: entry.candidateCount,
                unreviewedCount: entry.unreviewedCount,
            }))
            .sort((left, right) => {
                if (right.unreviewedCount !== left.unreviewedCount) {
                    return right.unreviewedCount - left.unreviewedCount;
                }

                return left.chordType.localeCompare(right.chordType);
            }),
        byChordType,
    };
}

export function getAcceptedSourceKinds(summary: CuratedQaAnalysisSummary): VoicingProvenanceSourceKind[] {
    return summary.byProvenance
        .filter((bucket) => bucket.decisions.accept > 0)
        .map((bucket) => bucket.key as VoicingProvenanceSourceKind);
}
