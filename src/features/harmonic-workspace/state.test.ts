import { describe, expect, it } from 'vitest';

import {
    buildProgressionDraftFromHandoff,
    createHarmonicWorkspaceState,
    reduceHarmonicWorkspaceState,
} from './state';

describe('harmonic workspace state', () => {
    it('stages a progression handoff into an executable draft', () => {
        const state = createHarmonicWorkspaceState('major::0', {
            selectedKey: 0,
            scaleGroup: 'Diatonic Modes',
            scaleName: 'Ionian',
        });
        const next = reduceHarmonicWorkspaceState(state, {
            type: 'prepare-handoff',
            scopeKey: 'major::0',
            tonalContext: state.tonalContext,
            payload: {
                hintId: 'classic-251',
                title: 'Classic 2-5-1',
                summary: 'Jazz backbone',
                degrees: ['ii', 'V', 'I'],
                chordType: 'minor-7',
                selectedKey: 0,
                progressionId: 'classic-251',
            },
        });

        expect(next.preparedHandoff?.title).toBe('Classic 2-5-1');
        expect(next.stagedProgression?.degrees).toEqual(['ii', 'V', 'I']);
        expect(next.stagedProgression?.document.measures).toHaveLength(3);
        expect(next.stagedProgression?.applied).toBe(false);
    });

    it('marks a staged progression as applied without rebuilding the draft', () => {
        const draft = buildProgressionDraftFromHandoff({
            hintId: 'dominant-resolution',
            title: 'Resolve to tonic',
            summary: 'V to I',
            degrees: ['V', 'I'],
            chordType: 'dominant-7',
            selectedKey: 7,
        });
        const state = {
            ...createHarmonicWorkspaceState('dominant-7::7', {
                selectedKey: 7,
                scaleGroup: 'Diatonic Modes',
                scaleName: 'Mixolydian',
            }),
            stagedProgression: draft,
        };

        const next = reduceHarmonicWorkspaceState(state, {
            type: 'mark-handoff-applied',
            scopeKey: 'dominant-7::7',
            tonalContext: state.tonalContext,
        });

        expect(next.stagedProgression?.applied).toBe(true);
        expect(next.stagedProgression?.degrees).toEqual(['V', 'I']);
    });

    it('resets staged handoff state when the chord scope changes', () => {
        const state = {
            ...createHarmonicWorkspaceState('major::0', {
                selectedKey: 0,
                scaleGroup: 'Diatonic Modes',
                scaleName: 'Ionian',
            }),
            selectedScaleId: 'Diatonic Modes::Ionian',
            preparedHandoff: {
                hintId: 'classic-251',
                title: 'Classic 2-5-1',
                summary: 'Jazz backbone',
                degrees: ['ii', 'V', 'I'],
                chordType: 'minor-7',
                selectedKey: 0,
                progressionId: 'classic-251',
            },
        };

        const next = reduceHarmonicWorkspaceState(state, {
            type: 'sync-scope',
            scopeKey: 'dominant-7::7',
            tonalContext: {
                selectedKey: 7,
                scaleGroup: 'Diatonic Modes',
                scaleName: 'Mixolydian',
            },
        });

        expect(next.scopeKey).toBe('dominant-7::7');
        expect(next.selectedScaleId).toBeNull();
        expect(next.preparedHandoff).toBeNull();
    });
});
