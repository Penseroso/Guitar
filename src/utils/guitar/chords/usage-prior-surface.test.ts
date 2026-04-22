import { describe, expect, it } from 'vitest';

import { buildUsagePriorSurfaceSetSnapshot } from './usage-prior-surface';

describe('usage prior surface snapshot', () => {
    it('builds a non-empty snapshot from the current chord-mode surface path', () => {
        const snapshot = buildUsagePriorSurfaceSetSnapshot({
            rootPitchClasses: [0],
            chordTypes: ['major'],
            maxCandidates: 3,
            snapshotGeneratedAt: '2026-04-22T00:00:00.000Z',
        });

        expect(snapshot.candidates.length).toBeGreaterThan(0);
        expect(snapshot.rootPitchClasses).toEqual([0]);
        expect(snapshot.candidates[0]).toEqual(expect.objectContaining({
            chordType: expect.any(String),
            candidateId: expect.any(String),
            rootPitchClass: 0,
            chordLabel: expect.any(String),
            chordTypeLabel: expect.any(String),
            displayName: expect.any(String),
            sourceLabel: expect.any(String),
            sourceKind: expect.any(String),
            snapshotGeneratedAt: '2026-04-22T00:00:00.000Z',
        }));
        expect(snapshot.candidates[0].voicingDescriptor).toEqual(expect.objectContaining({
            family: expect.any(String),
            registerBand: expect.any(String),
            inversion: expect.any(String),
            noteCount: expect.any(Number),
            playedStrings: expect.any(Array),
            optionalCoverageDegrees: expect.any(Array),
            rootOccurrenceCount: expect.any(Number),
        }));
    });
});
