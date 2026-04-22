import path from 'node:path';

import {
    buildUsagePriorReviewState,
    mergeUsagePriorReviewStates,
    type UsagePriorReviewRecord,
    type UsagePriorReviewState,
} from './usage-prior';
import type { UsagePriorSurfaceCandidate, UsagePriorSurfaceSetSnapshot } from './usage-prior-surface';

export interface UsagePriorReviewSnapshot {
    updatedAt: string | null;
    reviews: UsagePriorReviewRecord[];
}

export interface UsagePriorAcceptedCandidate extends UsagePriorSurfaceCandidate {
    reviewedAt?: string;
    sourceSnapshotId?: string;
}

export interface UsagePriorAcceptedExport {
    updatedAt: string;
    source: 'surface-set-review';
    sourceSnapshotId: string;
    acceptedCandidates: UsagePriorAcceptedCandidate[];
    byChordType: Array<{
        chordType: string;
        acceptedCount: number;
        candidates: UsagePriorAcceptedCandidate[];
    }>;
}

export const USAGE_PRIOR_REVIEW_STORAGE_PATH = path.join(
    process.cwd(),
    'src',
    'utils',
    'guitar',
    'chords',
    'usage-prior-reviews.json'
);

export const USAGE_PRIOR_REVIEWED_EXPORT_PATH = path.join(
    process.cwd(),
    'src',
    'utils',
    'guitar',
    'chords',
    'usage-prior-reviewed.json'
);

function isValidDecision(value: unknown): value is UsagePriorReviewRecord['decision'] {
    return value === 'accept' || value === 'reject';
}

function isValidReviewRecord(value: unknown): value is UsagePriorReviewRecord {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Partial<UsagePriorReviewRecord>;
    return typeof candidate.chordType === 'string'
        && typeof candidate.candidateId === 'string'
        && (candidate.rootPitchClass === undefined || Number.isInteger(candidate.rootPitchClass))
        && (candidate.reviewedAt === undefined || typeof candidate.reviewedAt === 'string')
        && (candidate.sourceSnapshotId === undefined || typeof candidate.sourceSnapshotId === 'string')
        && isValidDecision(candidate.decision);
}

export function normalizeUsagePriorReviewRecords(value: unknown): UsagePriorReviewRecord[] {
    return Array.isArray(value)
        ? value.filter(isValidReviewRecord)
        : [];
}

export function normalizeUsagePriorReviewSnapshot(value: unknown): UsagePriorReviewSnapshot {
    if (!value || typeof value !== 'object') {
        return { updatedAt: null, reviews: [] };
    }

    const snapshot = value as Partial<UsagePriorReviewSnapshot>;

    return {
        updatedAt: typeof snapshot.updatedAt === 'string' ? snapshot.updatedAt : null,
        reviews: normalizeUsagePriorReviewRecords(snapshot.reviews),
    };
}

export function buildUsagePriorReviewSnapshot(
    reviewState: UsagePriorReviewState,
    updatedAt = new Date().toISOString()
): UsagePriorReviewSnapshot {
    return {
        updatedAt,
        reviews: Object.values(reviewState).sort((left, right) => {
            const chordOrder = left.chordType.localeCompare(right.chordType);
            if (chordOrder !== 0) {
                return chordOrder;
            }

            return left.candidateId.localeCompare(right.candidateId);
        }),
    };
}

export function applyUsagePriorReviewUpdates(
    snapshot: UsagePriorReviewSnapshot,
    submittedReviews: UsagePriorReviewRecord[],
    updatedAt = new Date().toISOString()
): UsagePriorReviewSnapshot {
    const persistedState = buildUsagePriorReviewState(snapshot.reviews);
    const submittedState = buildUsagePriorReviewState(submittedReviews);

    return buildUsagePriorReviewSnapshot(
        mergeUsagePriorReviewStates(persistedState, submittedState),
        updatedAt
    );
}

export function buildUsagePriorAcceptedExport(
    reviewSnapshot: UsagePriorReviewSnapshot,
    surfaceSnapshot: UsagePriorSurfaceSetSnapshot,
    updatedAt = reviewSnapshot.updatedAt ?? new Date().toISOString()
): UsagePriorAcceptedExport {
    const surfaceByKey = new Map<string, UsagePriorSurfaceCandidate>();
    for (const candidate of surfaceSnapshot.candidates) {
        surfaceByKey.set(`${candidate.chordType}::${candidate.candidateId}`, candidate);
    }

    const acceptedCandidates = reviewSnapshot.reviews
        .filter((review) => review.decision === 'accept')
        .reduce<UsagePriorAcceptedCandidate[]>((accumulator, review) => {
            const surfaceCandidate = surfaceByKey.get(`${review.chordType}::${review.candidateId}`);
            if (!surfaceCandidate) {
                return accumulator;
            }

            const acceptedCandidate: UsagePriorAcceptedCandidate = {
                ...surfaceCandidate,
            };

            if (review.reviewedAt !== undefined) {
                acceptedCandidate.reviewedAt = review.reviewedAt;
            }

            if (review.sourceSnapshotId !== undefined) {
                acceptedCandidate.sourceSnapshotId = review.sourceSnapshotId;
            }

            accumulator.push(acceptedCandidate);
            return accumulator;
        }, []);

    const byChordType = Array.from(
        acceptedCandidates.reduce<Map<string, UsagePriorAcceptedCandidate[]>>((accumulator, candidate) => {
            const existing = accumulator.get(candidate.chordType) ?? [];
            existing.push(candidate);
            accumulator.set(candidate.chordType, existing);
            return accumulator;
        }, new Map())
    ).map(([chordType, candidates]) => ({
        chordType,
        acceptedCount: candidates.length,
        candidates,
    })).sort((left, right) => left.chordType.localeCompare(right.chordType));

    return {
        updatedAt,
        source: 'surface-set-review',
        sourceSnapshotId: surfaceSnapshot.snapshotId,
        acceptedCandidates,
        byChordType,
    };
}
