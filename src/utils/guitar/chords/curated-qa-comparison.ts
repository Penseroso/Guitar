import type { CuratedQaDecision, CuratedQaReviewRecord } from './curated-qa';
import type { CuratedQaReviewSnapshot } from './curated-qa-storage';
import type { ResolvedVoicing } from './types';

export interface CuratedQaReviewBuckets {
    accept: CuratedQaReviewRecord[];
    borderline: CuratedQaReviewRecord[];
    reject: CuratedQaReviewRecord[];
}

export interface VoicingStructuralProfile {
    signature: string;
    rootString?: number;
    registerBand: ResolvedVoicing['descriptor']['registerBand'];
    family: ResolvedVoicing['descriptor']['family'];
    noteCount: number;
    missingRequiredDegreeCount: number;
    outOfFormulaPitchClassCount: number;
}

export function getCuratedQaReviewsByDecision(
    snapshot: CuratedQaReviewSnapshot,
    decision: CuratedQaDecision
): CuratedQaReviewRecord[] {
    return snapshot.reviews.filter((review) => review.decision === decision);
}

export function partitionCuratedQaReviews(snapshot: CuratedQaReviewSnapshot): CuratedQaReviewBuckets {
    return {
        accept: getCuratedQaReviewsByDecision(snapshot, 'accept'),
        borderline: getCuratedQaReviewsByDecision(snapshot, 'borderline'),
        reject: getCuratedQaReviewsByDecision(snapshot, 'reject'),
    };
}

export function getVoicingSignature(voicing: Pick<ResolvedVoicing, 'notes'>): string {
    return voicing.notes
        .map((note) => `${note.string}:${note.isMuted ? 'x' : note.fret}`)
        .join('|');
}

export function getVoicingStructuralProfile(voicing: ResolvedVoicing): VoicingStructuralProfile {
    return {
        signature: getVoicingSignature(voicing),
        rootString: voicing.descriptor.rootString,
        registerBand: voicing.descriptor.registerBand,
        family: voicing.descriptor.family,
        noteCount: voicing.descriptor.noteCount,
        missingRequiredDegreeCount: voicing.missingRequiredDegrees?.length ?? 0,
        outOfFormulaPitchClassCount: voicing.outOfFormulaPitchClasses?.length ?? 0,
    };
}

export function isStructurallyCloseToAcceptedReference(
    archetypeVoicing: ResolvedVoicing,
    acceptedReference: ResolvedVoicing
): boolean {
    const candidateProfile = getVoicingStructuralProfile(archetypeVoicing);
    const acceptedProfile = getVoicingStructuralProfile(acceptedReference);

    return candidateProfile.signature === acceptedProfile.signature
        || (
            candidateProfile.rootString === acceptedProfile.rootString
            && candidateProfile.missingRequiredDegreeCount === 0
            && candidateProfile.outOfFormulaPitchClassCount === 0
            && Math.abs(candidateProfile.noteCount - acceptedProfile.noteCount) <= 1
        );
}

export function matchesRejectedReferencePattern(
    archetypeVoicing: ResolvedVoicing,
    rejectedReference: ResolvedVoicing
): boolean {
    const candidateProfile = getVoicingStructuralProfile(archetypeVoicing);
    const rejectedProfile = getVoicingStructuralProfile(rejectedReference);

    return candidateProfile.signature === rejectedProfile.signature
        || (
            candidateProfile.rootString === rejectedProfile.rootString
            && candidateProfile.registerBand === rejectedProfile.registerBand
            && candidateProfile.family === rejectedProfile.family
            && candidateProfile.noteCount === rejectedProfile.noteCount
        );
}

export function prefersAcceptedReferenceOverRejected(
    archetypeVoicing: ResolvedVoicing,
    acceptedReferences: ResolvedVoicing[],
    rejectedReferences: ResolvedVoicing[]
): boolean {
    const matchesAccepted = acceptedReferences.some((reference) =>
        isStructurallyCloseToAcceptedReference(archetypeVoicing, reference)
    );
    const matchesRejected = rejectedReferences.some((reference) =>
        matchesRejectedReferencePattern(archetypeVoicing, reference)
    );

    return matchesAccepted || !matchesRejected;
}
