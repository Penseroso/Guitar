import { describe, expect, it } from 'vitest';
import { createScaleRef } from '@/domain/scale/scale-ref';
import type { RelationQuery } from '@/domain/harmony/types';
import type { ChordReading } from '@/domain/chord/reverse/readings';
import { chordRefBassTone, chordRefFromReading, frameForScaleRef, linkChordToHarmony, linkScaleToHarmony } from './links';

const query: RelationQuery = {
    frame: { tonic: 'Eb', mode: 'minor', lens: 'classical' },
    target: { root: 'Eb', chordId: 'minor' },
    kind: 'dominant',
};

describe('explicit cross-workspace Harmony links', () => {
    it('changes only the local chord target when Chord opens Harmony', () => {
        const chord = { root: 'D', chordId: 'minor-7', bass: 'F' };
        const linked = linkChordToHarmony(query, chord);
        expect(linked).toEqual({ ...query, target: chord });
        expect(query.target).toEqual({ root: 'Eb', chordId: 'minor' });
    });

    it('clears observations tied to a previous target and keeps them for the same target', () => {
        const observed: RelationQuery = {
            ...query,
            kind: 'cadence',
            context: { before: { root: 'Bb', chordId: 'dominant-7' }, phraseEnding: true, bassConfirmed: true },
        };
        expect(linkChordToHarmony(observed, { root: 'F', chordId: 'major' }).context).toBeUndefined();
        expect(linkChordToHarmony(observed, observed.target).context).toEqual(observed.context);
    });

    it('maps a formula slash bass into the Chord workspace bass filter', () => {
        expect(chordRefBassTone({ root: 'C', chordId: 'major', bass: 'E' })).toBe('3');
        expect(chordRefBassTone({ root: 'C', chordId: 'major', bass: 'G' })).toBe('5');
        expect(chordRefBassTone({ root: 'C', chordId: 'major' })).toBeNull();
        expect(chordRefBassTone({ root: 'C', chordId: 'major', bass: 'D' })).toBeNull();
    });

    it('preserves the full user-focused Reverse reading, including an outside bass', () => {
        const reading: ChordReading = {
            key: 'major@0', chordId: 'major', rootPitchClass: 0, bassPitchClass: 2,
            tier: 'added-tone', bass: { relation: 'outside', degree: null, inversion: null },
            tones: [], omitted: [], added: 2, sameNotesAs: [],
        };
        expect(chordRefFromReading(reading)).toEqual({ root: 'C', chordId: 'major', bass: 'D' });
    });

    it.each([
        ['Diatonic Modes', 'Dorian'],
        ['Diatonic Modes', 'Aeolian'],
        ['Symmetric', 'Half-Whole Diminished'],
    ])('retains the exact source ScaleRef for %s / %s without replacing the frame', (group, name) => {
        const scaleRef = createScaleRef(group, name, 6);
        const chord = { root: 'F#', chordId: 'minor-7' };
        const linked = linkScaleToHarmony(query, { scaleRef, chord });
        expect(linked).toEqual({ query: { ...query, target: chord }, sourceScaleRef: scaleRef });
        expect(linked.sourceScaleRef).not.toBe(scaleRef);
    });

    it('requires an explicit compatible collection to propose a tonal frame', () => {
        expect(frameForScaleRef(createScaleRef('Diatonic Modes', 'Ionian', 7), query.frame))
            .toEqual({ tonic: 'G', mode: 'major', lens: 'classical' });
        expect(frameForScaleRef(createScaleRef('Diatonic Modes', 'Aeolian', 9), query.frame))
            .toEqual({ tonic: 'A', mode: 'minor', lens: 'classical' });
        expect(frameForScaleRef(createScaleRef('Diatonic Modes', 'Dorian', 2), query.frame)).toBeNull();
        expect(frameForScaleRef(createScaleRef('Symmetric', 'Half-Whole Diminished', 6), query.frame)).toBeNull();
        expect(frameForScaleRef({ group: 'Diatonic Modes', scaleId: 'missing', tonic: 0 }, query.frame)).toBeNull();
        expect(query.frame).toEqual({ tonic: 'Eb', mode: 'minor', lens: 'classical' });
    });
});
