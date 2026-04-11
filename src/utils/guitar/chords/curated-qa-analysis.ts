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
    candidateCount: number;
    unreviewedCount: number;
    decisions: CuratedQaDecisionCounts;
    provenance: CuratedQaAnalysisBucket[];
    rootStrings: CuratedQaAnalysisBucket[];
    registerBands: CuratedQaAnalysisBucket[];
    noteCounts: CuratedQaAnalysisBucket[];
    missingRequiredDegrees: CuratedQaAnalysisBucket[];
    outOfFormula: CuratedQaAnalysisBucket[];
    playability: CuratedQaAnalysisBucket[];
}

export interface CuratedQaAnalysisSummary {
    totalReviews: number;
    byDecision: CuratedQaDecisionCounts;
    byChordFamily: CuratedQaAnalysisBucket[];
    byProvenance: CuratedQaAnalysisBucket[];
    byRootString: CuratedQaAnalysisBucket[];
    byRegisterBand: CuratedQaAnalysisBucket[];
    byNoteCount: CuratedQaAnalysisBucket[];
    byMissingRequiredDegrees: CuratedQaAnalysisBucket[];
    byOutOfFormula: CuratedQaAnalysisBucket[];
    byPlayability: CuratedQaAnalysisBucket[];
    weakCoverageChordTypes: Array<{
        chordType: string;
        reviewedCount: number;
        candidateCount: number;
        unreviewedCount: number;
    }>;
    byChordType: CuratedQaChordTypeAnalysis[];
}

interface ResolvedReviewEvidence {
    chordType: string;
    chordFamily: string;
    decision: CuratedQaDecision;
    candidate: CuratedQaCandidate | null;
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
            decision: review.decision,
            candidate,
        };
    });
}

function getCandidateCoverage(chordType: string, snapshot: CuratedQaReviewSnapshot) {
    const rootPitchClass = snapshot.reviews.find((review) => review.chordType === chordType)?.rootPitchClass ?? 0;
    const candidates = getCuratedQaCandidatesForChord(chordType as Parameters<typeof getCuratedQaCandidatesForChord>[0], rootPitchClass);
    const reviewedCandidateIds = new Set(
        snapshot.reviews
            .filter((review) => review.chordType === chordType)
            .map((review) => review.candidateId)
    );

    return {
        candidateCount: candidates.length,
        unreviewedCount: candidates.filter((candidate) => !reviewedCandidateIds.has(candidate.candidateId)).length,
    };
}

function buildChordTypeAnalysis(
    chordType: string,
    snapshot: CuratedQaReviewSnapshot,
    evidence: ResolvedReviewEvidence[]
): CuratedQaChordTypeAnalysis {
    const chordEvidence = evidence.filter((entry) => entry.chordType === chordType);
    const chordEntry = resolveChordRegistryEntry(chordType);
    const decisions = createDecisionCounts();

    for (const entry of chordEvidence) {
        incrementDecisionCounts(decisions, entry.decision);
    }

    const coverage = getCandidateCoverage(chordType, snapshot);

    return {
        chordType,
        chordFamily: chordEntry.family,
        reviewedCount: chordEvidence.length,
        candidateCount: coverage.candidateCount,
        unreviewedCount: coverage.unreviewedCount,
        decisions,
        provenance: buildDecisionBuckets(chordEvidence, (entry) => entry.candidate?.voicing.descriptor.provenance.sourceKind ?? 'unknown'),
        rootStrings: buildDecisionBuckets(chordEvidence, (entry) => {
            const rootString = entry.candidate?.voicing.descriptor.rootString;
            return rootString === undefined ? 'none' : `root-${rootString + 1}`;
        }),
        registerBands: buildDecisionBuckets(chordEvidence, (entry) => entry.candidate?.voicing.descriptor.registerBand ?? 'unknown'),
        noteCounts: buildDecisionBuckets(chordEvidence, (entry) => String(entry.candidate?.voicing.descriptor.noteCount ?? 'unknown')),
        missingRequiredDegrees: buildDecisionBuckets(chordEvidence, (entry) => {
            const count = entry.candidate?.voicing.missingRequiredDegrees?.length ?? 0;
            return count === 0 ? 'complete' : `missing-${count}`;
        }),
        outOfFormula: buildDecisionBuckets(chordEvidence, (entry) => {
            const count = entry.candidate?.voicing.outOfFormulaPitchClasses?.length ?? 0;
            return count === 0 ? 'formula-closed' : `out-of-formula-${count}`;
        }),
        playability: buildDecisionBuckets(chordEvidence, (entry) => entry.candidate?.voicing.playable === false ? 'non-playable' : 'playable'),
    };
}

export function buildCuratedQaAnalysisSummary(snapshot: CuratedQaReviewSnapshot): CuratedQaAnalysisSummary {
    const evidence = resolveReviewEvidence(snapshot);
    const byDecision = createDecisionCounts();

    for (const review of snapshot.reviews) {
        incrementDecisionCounts(byDecision, review.decision);
    }

    const chordTypes = [...new Set(snapshot.reviews.map((review) => review.chordType))]
        .sort((left, right) => left.localeCompare(right));
    const byChordType = chordTypes.map((chordType) => buildChordTypeAnalysis(chordType, snapshot, evidence));

    return {
        totalReviews: snapshot.reviews.length,
        byDecision,
        byChordFamily: buildDecisionBuckets(evidence, (entry) => entry.chordFamily),
        byProvenance: buildDecisionBuckets(evidence, (entry) => entry.candidate?.voicing.descriptor.provenance.sourceKind ?? 'unknown'),
        byRootString: buildDecisionBuckets(evidence, (entry) => {
            const rootString = entry.candidate?.voicing.descriptor.rootString;
            return rootString === undefined ? 'none' : `root-${rootString + 1}`;
        }),
        byRegisterBand: buildDecisionBuckets(evidence, (entry) => entry.candidate?.voicing.descriptor.registerBand ?? 'unknown'),
        byNoteCount: buildDecisionBuckets(evidence, (entry) => String(entry.candidate?.voicing.descriptor.noteCount ?? 'unknown')),
        byMissingRequiredDegrees: buildDecisionBuckets(evidence, (entry) => {
            const count = entry.candidate?.voicing.missingRequiredDegrees?.length ?? 0;
            return count === 0 ? 'complete' : `missing-${count}`;
        }),
        byOutOfFormula: buildDecisionBuckets(evidence, (entry) => {
            const count = entry.candidate?.voicing.outOfFormulaPitchClasses?.length ?? 0;
            return count === 0 ? 'formula-closed' : `out-of-formula-${count}`;
        }),
        byPlayability: buildDecisionBuckets(evidence, (entry) => entry.candidate?.voicing.playable === false ? 'non-playable' : 'playable'),
        weakCoverageChordTypes: byChordType
            .filter((entry) => entry.unreviewedCount > 0)
            .map((entry) => ({
                chordType: entry.chordType,
                reviewedCount: entry.reviewedCount,
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
