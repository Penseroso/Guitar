import { describe, expect, it } from 'vitest';

import {
    createHarmonicWorkspaceState,
    reduceHarmonicWorkspaceState,
} from './state';

describe('harmonic workspace state', () => {
    it('tracks the selected candidate within the current scope', () => {
        const state = createHarmonicWorkspaceState('major::0', {
            selectedKey: 0,
            tonicPitchClass: 0,
            scaleGroup: 'Diatonic Modes',
            scaleName: 'Ionian',
        });
        const next = reduceHarmonicWorkspaceState(state, {
            type: 'select-candidate',
            scopeKey: 'major::0',
            candidateId: 'major-open',
        });

        expect(next.selectedCandidateId).toBe('major-open');
    });

    it('resets selected candidate state when the chord scope changes', () => {
        const state = {
            ...createHarmonicWorkspaceState('major::0', {
                selectedKey: 0,
                tonicPitchClass: 0,
                scaleGroup: 'Diatonic Modes',
                scaleName: 'Ionian',
            }),
            selectedCandidateId: 'major-open',
        };

        const next = reduceHarmonicWorkspaceState(state, {
            type: 'sync-scope',
            scopeKey: 'dominant-7::7',
            tonalContext: {
                selectedKey: 7,
                tonicPitchClass: 0,
                scaleGroup: 'Diatonic Modes',
                scaleName: 'Mixolydian',
            },
        });

        expect(next.scopeKey).toBe('dominant-7::7');
        expect(next.selectedCandidateId).toBeNull();
    });
});
