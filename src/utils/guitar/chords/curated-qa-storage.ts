import path from 'node:path';

import {
    buildCuratedQaReviewState,
    mergeCuratedQaReviewStates,
    type CuratedQaReviewRecord,
    type CuratedQaReviewState,
} from './curated-qa';

export interface CuratedQaReviewSnapshot {
    updatedAt: string | null;
    reviews: CuratedQaReviewRecord[];
}

export const CURATED_QA_REVIEW_STORAGE_PATH = path.join(
    process.cwd(),
    'src',
    'utils',
    'guitar',
    'chords',
    'curated-qa-reviews.json'
);

function isValidDecision(value: unknown): value is CuratedQaReviewRecord['decision'] {
    return value === 'accept' || value === 'borderline' || value === 'reject';
}

function isValidReviewRecord(value: unknown): value is CuratedQaReviewRecord {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Partial<CuratedQaReviewRecord>;
    return typeof candidate.chordType === 'string'
        && typeof candidate.candidateId === 'string'
        && (candidate.rootPitchClass === undefined || Number.isInteger(candidate.rootPitchClass))
        && (candidate.reason === undefined || typeof candidate.reason === 'string')
        && isValidDecision(candidate.decision);
}

export function normalizeCuratedQaReviewRecords(value: unknown): CuratedQaReviewRecord[] {
    return Array.isArray(value)
        ? value.filter(isValidReviewRecord)
        : [];
}

export function normalizeCuratedQaReviewSnapshot(value: unknown): CuratedQaReviewSnapshot {
    if (!value || typeof value !== 'object') {
        return { updatedAt: null, reviews: [] };
    }

    const snapshot = value as Partial<CuratedQaReviewSnapshot>;
    const reviews = normalizeCuratedQaReviewRecords(snapshot.reviews);

    return {
        updatedAt: typeof snapshot.updatedAt === 'string' ? snapshot.updatedAt : null,
        reviews,
    };
}

export function buildCuratedQaReviewSnapshot(reviewState: CuratedQaReviewState, updatedAt = new Date().toISOString()): CuratedQaReviewSnapshot {
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

export function applyCuratedQaReviewUpdates(
    snapshot: CuratedQaReviewSnapshot,
    submittedReviews: CuratedQaReviewRecord[],
    updatedAt = new Date().toISOString()
): CuratedQaReviewSnapshot {
    const persistedState = buildCuratedQaReviewState(snapshot.reviews);
    const submittedState = buildCuratedQaReviewState(submittedReviews);
    return buildCuratedQaReviewSnapshot(
        mergeCuratedQaReviewStates(persistedState, submittedState),
        updatedAt
    );
}
