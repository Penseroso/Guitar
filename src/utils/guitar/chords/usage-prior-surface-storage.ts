import path from 'node:path';

import {
    buildUsagePriorSurfaceSetSnapshot,
    type UsagePriorSurfaceCandidate,
    type UsagePriorSurfaceSetSnapshot,
} from './usage-prior-surface';

export const USAGE_PRIOR_SURFACE_SET_STORAGE_PATH = path.join(
    process.cwd(),
    'src',
    'utils',
    'guitar',
    'chords',
    'usage-prior-surface-set.json'
);

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNumberArray(value: unknown): value is number[] {
    return Array.isArray(value) && value.every((item) => Number.isInteger(item));
}

function isValidSurfaceCandidate(value: unknown): value is UsagePriorSurfaceCandidate {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Partial<UsagePriorSurfaceCandidate>;
    const descriptor = candidate.voicingDescriptor;

    return typeof candidate.chordType === 'string'
        && typeof candidate.candidateId === 'string'
        && Number.isInteger(candidate.rootPitchClass)
        && typeof candidate.chordLabel === 'string'
        && typeof candidate.chordTypeLabel === 'string'
        && typeof candidate.displayName === 'string'
        && (candidate.displaySubtitle === null || typeof candidate.displaySubtitle === 'string')
        && typeof candidate.sourceLabel === 'string'
        && (candidate.seedId === undefined || typeof candidate.seedId === 'string')
        && typeof candidate.sourceKind === 'string'
        && typeof candidate.snapshotGeneratedAt === 'string'
        && !!descriptor
        && typeof descriptor === 'object'
        && typeof descriptor.family === 'string'
        && typeof descriptor.registerBand === 'string'
        && (descriptor.rootString === undefined || Number.isInteger(descriptor.rootString))
        && typeof descriptor.inversion === 'string'
        && Number.isInteger(descriptor.noteCount)
        && isNumberArray(descriptor.playedStrings)
        && isStringArray(descriptor.optionalCoverageDegrees)
        && Number.isInteger(descriptor.rootOccurrenceCount)
        && !!candidate.voicing
        && typeof candidate.voicing === 'object';
}

export function normalizeUsagePriorSurfaceSetSnapshot(value: unknown): UsagePriorSurfaceSetSnapshot {
    if (!value || typeof value !== 'object') {
        return buildUsagePriorSurfaceSetSnapshot();
    }

    const snapshot = value as Partial<UsagePriorSurfaceSetSnapshot>;
    const candidates = Array.isArray(snapshot.candidates)
        ? snapshot.candidates.filter(isValidSurfaceCandidate)
        : [];
    const snapshotGeneratedAt = typeof snapshot.snapshotGeneratedAt === 'string'
        ? snapshot.snapshotGeneratedAt
        : new Date().toISOString();
    const rootPitchClasses = isNumberArray(snapshot.rootPitchClasses)
        ? snapshot.rootPitchClasses
        : Array.from(new Set(candidates.map((candidate) => candidate.rootPitchClass))).sort((left, right) => left - right);

    if (candidates.length === 0) {
        return buildUsagePriorSurfaceSetSnapshot({ rootPitchClasses: rootPitchClasses.length > 0 ? rootPitchClasses : [0] });
    }

    return {
        snapshotId: typeof snapshot.snapshotId === 'string'
            ? snapshot.snapshotId
            : `surface-set:${rootPitchClasses.join('-')}:${snapshotGeneratedAt}`,
        snapshotGeneratedAt,
        rootPitchClasses,
        candidates,
    };
}

