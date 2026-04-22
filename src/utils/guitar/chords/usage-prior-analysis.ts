import { getUsagePriorReviewKey } from './usage-prior';
import type { UsagePriorReviewSnapshot } from './usage-prior-storage';
import type { UsagePriorSurfaceSetSnapshot } from './usage-prior-surface';

export interface UsagePriorAnalysisSummary {
    totalCandidates: number;
    reviewedCount: number;
    acceptedCount: number;
    rejectedCount: number;
    unreviewedCount: number;
    byChordType: Array<{
        chordType: string;
        totalCandidates: number;
        reviewedCount: number;
        acceptedCount: number;
        rejectedCount: number;
        unreviewedCount: number;
    }>;
}

export function buildUsagePriorAnalysisSummary(
    surfaceSnapshot: UsagePriorSurfaceSetSnapshot,
    reviewSnapshot: UsagePriorReviewSnapshot
): UsagePriorAnalysisSummary {
    const surfaceKeys = new Set(surfaceSnapshot.candidates.map((candidate) => getUsagePriorReviewKey(candidate)));
    const activeReviews = reviewSnapshot.reviews.filter((review) => surfaceKeys.has(getUsagePriorReviewKey(review)));
    const acceptedCount = activeReviews.filter((review) => review.decision === 'accept').length;
    const rejectedCount = activeReviews.filter((review) => review.decision === 'reject').length;
    const chordTypes = Array.from(new Set(surfaceSnapshot.candidates.map((candidate) => candidate.chordType))).sort();

    return {
        totalCandidates: surfaceSnapshot.candidates.length,
        reviewedCount: activeReviews.length,
        acceptedCount,
        rejectedCount,
        unreviewedCount: Math.max(surfaceSnapshot.candidates.length - activeReviews.length, 0),
        byChordType: chordTypes.map((chordType) => {
            const chordCandidates = surfaceSnapshot.candidates.filter((candidate) => candidate.chordType === chordType);
            const chordKeys = new Set(chordCandidates.map((candidate) => getUsagePriorReviewKey(candidate)));
            const chordReviews = activeReviews.filter((review) => chordKeys.has(getUsagePriorReviewKey(review)));
            const chordAcceptedCount = chordReviews.filter((review) => review.decision === 'accept').length;
            const chordRejectedCount = chordReviews.filter((review) => review.decision === 'reject').length;

            return {
                chordType,
                totalCandidates: chordCandidates.length,
                reviewedCount: chordReviews.length,
                acceptedCount: chordAcceptedCount,
                rejectedCount: chordRejectedCount,
                unreviewedCount: Math.max(chordCandidates.length - chordReviews.length, 0),
            };
        }),
    };
}

