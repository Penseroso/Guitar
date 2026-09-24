import { describe, expect, it } from 'vitest';
import { getScaleStructuralTones } from './scale-tones';
import { createScaleRef } from './scale-ref';
import { SCALES } from './scales';
import { parseNoteName } from '@/domain/shared/spelling';

describe('structural scale tones', () => {
    it('preserves A Ionian D and A Lydian D# rather than using the Eb pitch-class name', () => {
        const ionian = getScaleStructuralTones(createScaleRef('Diatonic Modes', 'Ionian', 9))!;
        const lydian = getScaleStructuralTones(createScaleRef('Diatonic Modes', 'Lydian', 9))!;
        expect(ionian[3]).toEqual({ pitchClass: 2, interval: 5, scaleDegree: '4', scaleNoteName: 'D' });
        expect(lydian[3]).toEqual({ pitchClass: 3, interval: 6, scaleDegree: '#4', scaleNoteName: 'D#' });
    });
    it('provides Altered structural Eb and Fb before any chord interpretation exists', () => {
        const tones = getScaleStructuralTones(createScaleRef('Jazz Minor Modes', 'Altered scale', 0))!;
        expect(tones.map(tone => tone.scaleNoteName)).toEqual(['C', 'Db', 'Eb', 'Fb', 'Gb', 'Ab', 'Bb']);
        expect(tones[3].scaleDegree).toBe('b4');
    });
    it('keeps repeated generic degrees in the eight-note half–whole structure', () => {
        const tones = getScaleStructuralTones(createScaleRef('Symmetric', 'Half-Whole Diminished', 0))!;
        expect(tones).toHaveLength(8);
        expect(tones.slice(2, 4)).toEqual([
            { pitchClass: 3, interval: 3, scaleDegree: 'b3', scaleNoteName: 'Eb' },
            { pitchClass: 4, interval: 4, scaleDegree: '3', scaleNoteName: 'E' },
        ]);
    });
    it('spells every registered scale at every tonic without missing or changing a pitch', () => {
        for (const [group, scales] of Object.entries(SCALES)) for (const [name, intervals] of Object.entries(scales)) {
            for (let tonic = 0; tonic < 12; tonic++) {
                const tones = getScaleStructuralTones(createScaleRef(group, name, tonic));
                expect(tones, `${name}/${tonic}`).not.toBeNull();
                expect(tones!.map(tone => tone.interval)).toEqual(intervals);
                for (const tone of tones!) {
                    expect(parseNoteName(tone.scaleNoteName)?.pitchClass).toBe(tone.pitchClass);
                    expect(tone.pitchClass).toBe((tonic + tone.interval) % 12);
                }
            }
        }
    });
    it('rejects invalid references rather than substituting a default scale', () => {
        const ref = createScaleRef('Diatonic Modes', 'Ionian', 0);
        expect(getScaleStructuralTones({ ...ref, scaleId: 'missing' })).toBeNull();
        expect(getScaleStructuralTones({ ...ref, tonic: NaN })).toBeNull();
    });
});
