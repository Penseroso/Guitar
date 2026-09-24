import { describe, expect, it } from 'vitest';
import { getScaleToneAnalysis } from './scale-tone-analysis';
import { createScaleRef } from '@/domain/scale/scale-ref';
import { SOURCE_CATALOG } from '@/domain/scale/scale-identity';
import { SCALES } from '@/domain/scale/scales';
import { parseNoteName } from '@/domain/shared/spelling';
import { getScaleCompatibleChords } from './chord-scale-compatibility';
import { CHORD_REGISTRY } from './registry';
import { canonicalTone } from './engine/catalog';

describe('scale tone analysis', () => {
    it('keeps structural spelling, membership and provenance valid for all scales, tonics and selectable chords', () => {
        for (const [group, scales] of Object.entries(SCALES)) for (const [name, intervals] of Object.entries(scales)) {
            for (let tonic = 0; tonic < 12; tonic++) {
                const ref = createScaleRef(group, name, tonic);
                const contexts = [null, ...getScaleCompatibleChords(group, name, tonic).map(chord => chord.chordId)];
                for (const chordId of contexts) {
                    const analysis = getScaleToneAnalysis(ref, chordId);
                    expect(analysis, `${name}/${tonic}/${chordId}`).not.toBeNull();
                    expect(analysis!.tones).toHaveLength(intervals.length);
                    for (const tone of analysis!.tones) {
                        expect(parseNoteName(tone.scaleNoteName)?.pitchClass).toBe(tone.pitchClass);
                        expect(tone.pitchClass).toBe((tonic + tone.interval) % 12);
                        expect(tone.chordDegree === null).toBe(tone.chordNoteName === null);
                        if (tone.chordNoteName) expect(parseNoteName(tone.chordNoteName)?.pitchClass).toBe(tone.pitchClass);
                        if (chordId) {
                            const entry = CHORD_REGISTRY[chordId];
                            const index = entry.formula.intervals.indexOf(tone.interval);
                            expect(tone.chordMembership).toBe(index >= 0 ? 'member' : 'non-member');
                            if (index >= 0) expect(tone.chordDegree).toBe(canonicalTone(chordId, entry.formula.degrees[index]));
                        } else expect(tone.chordMembership).toBe('no-context');
                        for (const interpretation of tone.interpretations) {
                            expect(interpretation.status).toBe('reviewed');
                            expect(interpretation.sourceRefs.length).toBeGreaterThan(0);
                            expect(interpretation.conditions.length).toBeGreaterThan(0);
                            for (const source of interpretation.sourceRefs) expect(SOURCE_CATALOG[source]).toBeDefined();
                        }
                    }
                }
            }
        }
    });
    it('changes Dorian chord membership without changing scale identity', () => {
        const ref = createScaleRef('Diatonic Modes', 'Dorian', 0);
        const seventh = getScaleToneAnalysis(ref, 'minor-7')!;
        const ninth = getScaleToneAnalysis(ref, 'minor-9')!;
        const sixth = getScaleToneAnalysis(ref, 'minor-6')!;
        expect(seventh.tones.find(tone => tone.interval === 2)).toMatchObject({ chordMembership: 'non-member', chordDegree: '9' });
        expect(ninth.tones.find(tone => tone.interval === 2)).toMatchObject({ chordMembership: 'member', chordDegree: '9' });
        expect(seventh.tones.find(tone => tone.interval === 9)).toMatchObject({ chordMembership: 'non-member', chordDegree: '13' });
        const a = sixth.tones.find(tone => tone.interval === 9)!;
        expect(a).toMatchObject({ chordMembership: 'member', chordDegree: '6', scaleDegree: '6' });
        expect(a.interpretations.some(item => item.kind === 'characteristic')).toBe(true);
        expect(seventh.identity).toEqual(sixth.identity);
    });
    it('makes Ionian fourth caution contextual rather than forbidden or attached to a suspended chord', () => {
        const ref = createScaleRef('Diatonic Modes', 'Ionian', 0);
        const f = getScaleToneAnalysis(ref, 'major-7')!.tones.find(tone => tone.interval === 5)!;
        expect(f.chordMembership).toBe('non-member');
        expect(f.interpretations.some(item => item.kind === 'caution')).toBe(true);
        const sus = getScaleToneAnalysis(ref, 'sus4')!.tones.find(tone => tone.interval === 5)!;
        expect(sus).toMatchObject({ chordMembership: 'member', chordDegree: '4' });
        expect(sus.interpretations.some(item => item.kind === 'caution')).toBe(false);
    });
    it('allows a Phrygian characteristic and a contextual caution to coexist', () => {
        const tone = getScaleToneAnalysis(createScaleRef('Diatonic Modes', 'Phrygian', 0), 'minor-7')!.tones[1];
        expect(tone.interpretations.map(item => item.kind)).toEqual(['characteristic', 'tension', 'caution']);
    });
    it('preserves Altered structural Eb/Fb separately from dominant D#/E and does not inject the missing fifth', () => {
        const result = getScaleToneAnalysis(createScaleRef('Jazz Minor Modes', 'Altered scale', 0), 'hendrix-7-sharp-9')!;
        expect(result.tones.find(tone => tone.interval === 3)).toMatchObject({ scaleDegree: 'b3', scaleNoteName: 'Eb', chordDegree: '#9', chordNoteName: 'D#', chordMembership: 'member' });
        expect(result.tones.find(tone => tone.interval === 4)).toMatchObject({ scaleDegree: 'b4', scaleNoteName: 'Fb', chordDegree: '3', chordNoteName: 'E', chordMembership: 'member' });
        expect(result.chord?.tonesOutsideScale).toContain('G');
        expect(result.tones.some(tone => tone.interval === 7)).toBe(false);
    });
    it('uses canonical diminished-seventh spelling without overwriting structural sixth', () => {
        const tone = getScaleToneAnalysis(createScaleRef('Symmetric', 'Diminished', 0), 'diminished-7')!.tones.find(item => item.interval === 9)!;
        expect(tone).toMatchObject({ scaleDegree: '6', scaleNoteName: 'A', chordDegree: 'bb7', chordNoteName: 'Bbb', chordMembership: 'member' });
    });
    it('keeps the four dominant fields distinct instead of treating their alterations as interchangeable', () => {
        const altered = getScaleToneAnalysis(createScaleRef('Jazz Minor Modes', 'Altered scale', 0), 'dominant-7-flat-9')!;
        const halfWhole = getScaleToneAnalysis(createScaleRef('Symmetric', 'Half-Whole Diminished', 0), 'dominant-7')!;
        const wholeTone = getScaleToneAnalysis(createScaleRef('Symmetric', 'Whole Tone', 0), 'dominant-7-sharp-5')!;
        const lydian = getScaleToneAnalysis(createScaleRef('Jazz Minor Modes', 'Lydian Dominant', 0), 'dominant-7')!;
        const degrees = (analysis: typeof altered) => analysis.tones.map(tone => tone.chordDegree);
        expect(degrees(altered)).toEqual(['1', 'b9', '#9', '3', '#11', 'b13', 'b7']);
        expect(degrees(halfWhole)).toEqual(['1', 'b9', '#9', '3', '#11', '5', '13', 'b7']);
        expect(degrees(wholeTone)).toEqual(['1', '9', '3', '#11', '#5', 'b7']);
        expect(degrees(lydian)).toEqual(['1', '9', '3', '#11', '5', '13', 'b7']);
    });
    it('does not promote containment to interpreted tensions', () => {
        const analysis = getScaleToneAnalysis(createScaleRef('Diatonic Modes', 'Dorian', 0), 'sus4')!;
        expect(analysis.chord?.basis).toBe('containment');
        for (const tone of analysis.tones) {
            expect(tone.interpretations.every(item => item.kind === 'characteristic')).toBe(true);
            if (tone.chordMembership === 'non-member') expect(tone.chordDegree).toBeNull();
        }
    });
    it('rejects unknown or unselectable chord and scale contexts', () => {
        const ref = createScaleRef('Diatonic Modes', 'Dorian', 0);
        expect(getScaleToneAnalysis(ref, 'missing')).toBeNull();
        expect(getScaleToneAnalysis(ref, 'major-7')).toBeNull();
        expect(getScaleToneAnalysis({ ...ref, scaleId: 'missing' }, null)).toBeNull();
    });
});
