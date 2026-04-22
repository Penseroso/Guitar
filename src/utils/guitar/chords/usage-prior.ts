import type { UsagePriorSurfaceCandidate } from './usage-prior-surface';

export type UsagePriorDecision = 'accept' | 'reject';

export interface UsagePriorReviewRecord {
    chordType: string;
    candidateId: string;
    decision: UsagePriorDecision;
    rootPitchClass?: number;
    reviewedAt?: string;
    sourceSnapshotId?: string;
}

export type UsagePriorReviewState = Record<string, UsagePriorReviewRecord>;

function normalizeUsagePriorReviewRecord(record: UsagePriorReviewRecord): UsagePriorReviewRecord {
    return {
        chordType: record.chordType,
        candidateId: record.candidateId,
        decision: record.decision,
        rootPitchClass: record.rootPitchClass,
        reviewedAt: record.reviewedAt,
        sourceSnapshotId: record.sourceSnapshotId,
    };
}

export function getUsagePriorReviewKey(
    record: Pick<UsagePriorReviewRecord, 'chordType' | 'candidateId'>
): string {
    return `${record.chordType}::${record.candidateId}`;
}

export function recordUsagePriorDecision(
    currentState: UsagePriorReviewState,
    record: UsagePriorReviewRecord
): UsagePriorReviewState {
    const normalizedRecord = normalizeUsagePriorReviewRecord(record);

    return {
        ...currentState,
        [getUsagePriorReviewKey(normalizedRecord)]: normalizedRecord,
    };
}

export function clearUsagePriorDecision(
    currentState: UsagePriorReviewState,
    record: Pick<UsagePriorReviewRecord, 'chordType' | 'candidateId'>
): UsagePriorReviewState {
    const nextState = { ...currentState };
    delete nextState[getUsagePriorReviewKey(record)];
    return nextState;
}

export function buildUsagePriorReviewState(records: UsagePriorReviewRecord[]): UsagePriorReviewState {
    return records.reduce<UsagePriorReviewState>((accumulator, record) => {
        accumulator[getUsagePriorReviewKey(record)] = normalizeUsagePriorReviewRecord(record);
        return accumulator;
    }, {});
}

export function mergeUsagePriorReviewStates(
    ...states: Array<UsagePriorReviewState | null | undefined>
): UsagePriorReviewState {
    return states.reduce<UsagePriorReviewState>((accumulator, state) => {
        if (!state) {
            return accumulator;
        }

        return {
            ...accumulator,
            ...state,
        };
    }, {});
}

export function recordUsagePriorSessionDecision(
    persistedState: UsagePriorReviewState,
    sessionState: UsagePriorReviewState,
    record: UsagePriorReviewRecord
): UsagePriorReviewState {
    const normalizedRecord = normalizeUsagePriorReviewRecord(record);
    const persistedRecord = persistedState[getUsagePriorReviewKey(normalizedRecord)];

    if (
        persistedRecord
        && persistedRecord.decision === normalizedRecord.decision
        && (persistedRecord.rootPitchClass ?? null) === (normalizedRecord.rootPitchClass ?? null)
        && (persistedRecord.sourceSnapshotId ?? null) === (normalizedRecord.sourceSnapshotId ?? null)
    ) {
        return clearUsagePriorDecision(sessionState, normalizedRecord);
    }

    return recordUsagePriorDecision(sessionState, normalizedRecord);
}

export function getUsagePriorDecisionForCandidate(
    currentState: UsagePriorReviewState,
    candidate: Pick<UsagePriorSurfaceCandidate, 'chordType' | 'candidateId'>
): UsagePriorDecision | null {
    return currentState[getUsagePriorReviewKey(candidate)]?.decision ?? null;
}

export function getUsagePriorReviewForCandidate(
    currentState: UsagePriorReviewState,
    candidate: Pick<UsagePriorSurfaceCandidate, 'chordType' | 'candidateId'>
): UsagePriorReviewRecord | null {
    return currentState[getUsagePriorReviewKey(candidate)] ?? null;
}

export function isDeveloperUsagePriorEnabled(args: {
    nodeEnv?: string;
    search?: string;
}): boolean {
    if (args.nodeEnv === 'production') {
        return false;
    }

    const params = new URLSearchParams(args.search ?? '');
    return params.get('dev-usage-prior') === '1';
}

