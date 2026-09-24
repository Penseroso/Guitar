import { describe, expect, it } from 'vitest';
import { createScaleRef } from '@/domain/scale/scale-ref';
import { initialScaleModeState, reduceScaleMode } from './scale-mode-state';

describe('Scale analysis selection lifetime', () => {
    it('starts without an implied analysis chord and preserves an explicit choice when transposing', () => {
        expect(initialScaleModeState.selectedChordId).toBeNull();
        let state = reduceScaleMode(initialScaleModeState, { type: 'select-scale', scaleRef: createScaleRef('Diatonic Modes', 'Dorian', 0) });
        state = reduceScaleMode(state, { type: 'select-chord', chordId: 'minor-7' });
        state = reduceScaleMode(state, { type: 'toggle-modifier', modifier: 'blueNote' });
        const transposed = reduceScaleMode(state, { type: 'select-scale', scaleRef: createScaleRef('Diatonic Modes', 'Dorian', 2) });
        expect(transposed.selectedChordId).toBe('minor-7');
        expect(transposed.scaleRef.tonic).toBe(2);
        expect(transposed.blueNote).toBe(true);
        const changed = reduceScaleMode(transposed, { type: 'select-scale', scaleRef: createScaleRef('Diatonic Modes', 'Aeolian', 2) });
        expect(changed.selectedChordId).toBeNull();
        expect(changed.blueNote).toBe(false);
    });

    it('accepts displayed containment cards but never accepts a chord absent from the current list', () => {
        const selected = reduceScaleMode(initialScaleModeState, { type: 'select-chord', chordId: 'sus4' });
        expect(selected.selectedChordId).toBe('sus4');
        expect(reduceScaleMode(selected, { type: 'select-chord', chordId: 'minor-7' }).selectedChordId).toBeNull();
        expect(reduceScaleMode(selected, { type: 'select-chord', chordId: null }).selectedChordId).toBeNull();
    });

    it('uses exactly the same state transition for Half–Whole as every other scale', () => {
        let state = reduceScaleMode(initialScaleModeState, { type: 'select-scale', scaleRef: createScaleRef('Symmetric', 'Half-Whole Diminished', 0) });
        state = reduceScaleMode(state, { type: 'select-chord', chordId: 'dominant-7-flat-9' });
        expect(state.selectedChordId).toBe('dominant-7-flat-9');
        state = reduceScaleMode(state, { type: 'select-scale', scaleRef: createScaleRef('Symmetric', 'Half-Whole Diminished', 7) });
        expect(state.selectedChordId).toBe('dominant-7-flat-9');
        const invalid = { ...state.scaleRef, group: 'Pentatonic' };
        expect(reduceScaleMode(state, { type: 'select-scale', scaleRef: invalid })).toBe(state);
    });
});
