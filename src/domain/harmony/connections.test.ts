import { describe, expect, it } from 'vitest';
import { buildAudition } from './audition';
import { exampleTransitions, toneLabel } from './connections';
import { resolveChord } from './roman';
import type { RelationExample, RelationStep } from './types';

const step = (root: string, chordId: string): RelationStep => ({ chord: resolveChord({ root, chordId }), roman: '', role: '' });
const commonTone = (minor = false): RelationExample => ({
    id: 'neighbors', label: 'Neighbor motion', kind: 'motion', provenance: 'illustration', facts: [],
    steps: [
        { ...step('C', 'diminished-7'), toneLabels: { b3: { name: minor ? 'Eb' : 'D#', degree: minor ? 'b3' : '#2' }, b5: { name: 'F#', degree: '#4' }, bb7: { name: 'A', degree: '6' } } },
        step('C', minor ? 'minor' : 'major'),
    ],
    transitions: [{ fromStep: 0, toStep: 1, voices: [
        { fromDegree: '1', toDegree: '1', kind: 'held' },
        { fromDegree: 'b3', toDegree: minor ? 'b3' : '3', kind: minor ? 'held' : 'neighbor' },
        { fromDegree: 'b5', toDegree: '5', kind: 'neighbor' },
        { fromDegree: 'bb7', toDegree: '5', kind: 'neighbor' },
    ] }],
});

describe('Explicit Harmony tone connections', () => {
    it('preserves canonical identity while rendering classical neighbor spelling', () => {
        const example = commonTone();
        expect(toneLabel(example.steps[0], 'b3')).toEqual({ name: 'D#', degree: '#2', pitchClass: 3 });
        expect(example.steps[0].chord.tones.find(t => t.degree === 'b3')!.name).toBe('Eb');
        expect(exampleTransitions(example)[0].voices).toHaveLength(4);
        expect(buildAudition(example, true).map(frame => frame.midi)).toEqual([[48, 51, 54, 57], [48, 52, 55]]);
    });

    it('auditions moving neighbors as well as the held C/Eb in a minor target', () => {
        expect(buildAudition(commonTone(true), true).map(frame => frame.midi)).toEqual([[48, 51, 54, 57], [48, 51, 55]]);
    });

    it('supports a middle chord with different incoming and outgoing selected degrees', () => {
        const example: RelationExample = {
            id: 'edges', label: 'Edges', kind: 'motion', facts: [],
            steps: [step('D', 'minor-7'), step('G', 'dominant-7'), step('C', 'major')],
            transitions: [
                { fromStep: 0, toStep: 1, voices: [{ fromDegree: 'b7', toDegree: '3', kind: 'resolution' }] },
                { fromStep: 1, toStep: 2, voices: [{ fromDegree: 'b7', toDegree: '3', kind: 'resolution' }] },
            ],
        };
        expect(buildAudition(example, true).map(frame => frame.midi)).toEqual([[60], [59, 65], [64]]);
    });

    it('does not fabricate edges when a rule supplies an explicitly empty list', () => {
        const example = { ...commonTone(), transitions: [] };
        expect(exampleTransitions(example)).toEqual([]);
        expect(buildAudition(example, true).every(frame => frame.midi.length === 0)).toBe(true);
    });

    it('rejects missing tones, pitch-changing aliases, false holds and invalid edge indices', () => {
        const example = commonTone();
        expect(() => toneLabel(example.steps[0], '9')).toThrow('absent');
        expect(() => toneLabel({ ...example.steps[0], toneLabels: { b3: { name: 'D', degree: '2' } } }, 'b3')).toThrow('sounding pitch');
        expect(() => exampleTransitions({ ...example, transitions: [{ fromStep: 0, toStep: 1, voices: [{ fromDegree: 'b3', toDegree: '3', kind: 'held' }] }] })).toThrow('held tone');
        expect(() => exampleTransitions({ ...example, transitions: [{ fromStep: 0, toStep: 3, voices: [] }] })).toThrow('Invalid');
    });

    it('validates the same edges before display and before guide audition', () => {
        const example = commonTone();
        example.steps[0].toneLabels!.b3.name = 'D';
        expect(() => exampleTransitions(example)).toThrow('sounding pitch');
        expect(() => buildAudition(example, true)).toThrow('sounding pitch');
    });
});
