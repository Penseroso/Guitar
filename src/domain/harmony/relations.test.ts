import { describe, expect, it } from 'vitest';
import { exploreRelation } from './relations';
import { resolveChord } from './roman';
import type { ObservationContext, RelationKind, RelationQuery, TonalFrame } from './types';

const frame: TonalFrame = { tonic: 'C', mode: 'major', lens: 'jazz-pop' };
const query = (kind: RelationKind, changes: Partial<RelationQuery> = {}): RelationQuery => ({
    frame, target: { root: 'C', chordId: 'major' }, kind, ...changes,
});

describe('Harmony relation conditions', () => {
    it('keeps E7 as V7/vi when C major has the local target Am', () => {
        const result = exploreRelation(query('dominant', { target: { root: 'A', chordId: 'minor' } }));
        expect(result.status).toBe('matched');
        const steps = result.examples.flatMap(example => example.steps);
        expect(steps.some(step => step.chord.root === 'E' && step.chord.chordId === 'dominant-7' && step.roman === 'V7/vi')).toBe(true);
        expect(result.query.frame).toEqual(frame);
    });

    it.each(['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'])('transposes major and minor preparations from %s with resolved formula tones', tonic => {
        for (const mode of ['major', 'minor'] as const) {
            const target = { root: tonic, chordId: mode };
            const result = exploreRelation(query('ii-v', { frame: { ...frame, tonic, mode }, target }));
            expect(result.status).toBe('matched');
            expect(result.examples.length).toBeGreaterThan(0);
            const steps = result.examples[0].steps;
            expect(steps.map(step => step.chord.chordId)).toEqual([mode === 'major' ? 'minor-7' : 'half-diminished-7', 'dominant-7', mode]);
            expect(steps.map(step => step.chord.rootPitchClass)).toEqual([
                (resolveChord(target).rootPitchClass + 2) % 12,
                (resolveChord(target).rootPitchClass + 7) % 12,
                resolveChord(target).rootPitchClass,
            ]);
            for (const step of steps) expect(step.chord).toEqual(resolveChord(step.chord));
        }
    });

    it('compares G7 and Db7 as different actual chords resolving to C', () => {
        const result = exploreRelation(query('tritone'));
        expect(result.status).toBe('possible');
        const steps = result.examples.flatMap(example => example.steps);
        const substitute = steps.find(step => step.chord.root === 'Db')!;
        const dominant = steps.find(step => step.chord.root === 'G')!;
        expect(substitute.chord.chordId).toBe('dominant-7');
        expect(substitute.chord.tones.map(tone => tone.name)).toEqual(['Db', 'F', 'Ab', 'Cb']);
        expect(dominant.chord.tones.map(tone => tone.name)).toEqual(['G', 'B', 'D', 'F']);
        expect(substitute.chord.tones.map(tone => tone.pitchClass)).not.toEqual(dominant.chord.tones.map(tone => tone.pitchClass));
    });

    it('retains the minor destination in a tonic tritone-substitute label', () => {
        const result = exploreRelation(query('tritone', { frame: { ...frame, mode: 'minor' }, target: { root: 'C', chordId: 'minor' } }));
        expect(result.examples.find(example => example.id === 'substitute')!.steps[0].roman).toBe('subV7/i');
    });

    it('does not present jazz substitution families as implemented classical rules', () => {
        for (const kind of ['tritone', 'minor-sub'] as const) {
            const classical = exploreRelation(query(kind, { frame: { ...frame, lens: 'classical' } }));
            expect(classical.status).toBe('unsupported');
            expect(classical.examples).toEqual([]);
            expect(classical.scaleLinks).toEqual([]);
            expect(classical.observations.join(' ')).toContain('jazz/pop');
            expect(exploreRelation(query(kind)).status).toBe('possible');
        }
    });

    it('labels tonic collections as references even when the target has different scale tones', () => {
        const dominant = exploreRelation(query('dominant', { target: { root: 'C', chordId: 'dominant-7' } }));
        const minorMajor = exploreRelation(query('dominant', { target: { root: 'C', chordId: 'minor-major-7' } }));
        expect(dominant.scaleLinks[0].label).toBe('C Ionian · tonic reference');
        expect(minorMajor.scaleLinks[0].label).toBe('C Aeolian · tonic reference');
        expect(dominant.examples[0].steps.at(-1)!.chord.tones.map(tone => tone.name)).toContain('Bb');
        expect(minorMajor.examples[0].steps.at(-1)!.chord.tones.map(tone => tone.name)).toContain('B');
    });

    it.each([
        query('tonic-sub', { frame: { ...frame, lens: 'classical' } }),
        query('tonic-sub', { target: { root: 'D', chordId: 'minor' } }),
        query('minor-sub', { frame: { ...frame, mode: 'minor' }, target: { root: 'C', chordId: 'minor' } }),
        query('minor-sub', { target: { root: 'A', chordId: 'minor' } }),
        query('dominant', { target: { root: 'C', chordId: 'augmented' } }),
        query('dominant', { target: { root: 'C', chordId: 'major', bass: 'Db' } }),
    ])('reports out-of-scope cases without invented examples: $kind $target.chordId', request => {
        const result = exploreRelation(request);
        expect(result.status).toBe('unsupported');
        expect(result.examples).toEqual([]);
    });

    it('requires both observed neighbors for passing diminished and stays a contextual possibility', () => {
        const before = { root: 'C', chordId: 'major' };
        const middle = { root: 'C#', chordId: 'diminished-7' };
        const target = { root: 'D', chordId: 'minor' };
        for (const context of [undefined, { before }, { middle }]) {
            const result = exploreRelation(query('passing', { target, context }));
            expect(result.status).toBe('insufficient-context');
            expect(result.missing.length).toBeGreaterThan(0);
        }
        const result = exploreRelation(query('passing', { target, context: { before, middle } }));
        expect(result.status).toBe('possible');
        expect(result.examples[0].steps.map(step => step.chord.root)).toEqual(['C', 'C#', 'D']);
    });

    it('does not promote a V-I pair to a cadence without phrase, bass, and soprano evidence', () => {
        const complete = { before: { root: 'G', chordId: 'dominant-7' }, phraseEnding: true, bassConfirmed: true, soprano: 'C' };
        for (const key of ['before', 'phraseEnding', 'bassConfirmed', 'soprano'] as const) {
            const incomplete: ObservationContext = { ...complete };
            delete incomplete[key];
            const result = exploreRelation(query('cadence', { context: incomplete }));
            expect(result.status).toBe('insufficient-context');
            expect(result.missing.length).toBeGreaterThan(0);
        }
        const result = exploreRelation(query('cadence', { context: complete }));
        expect(['matched', 'possible']).toContain(result.status);
        expect(result.examples.length).toBeGreaterThan(0);
    });

    it.each([
        [{ root: 'C', chordId: 'major' }, 'C', 'Perfect authentic'],
        [{ root: 'C', chordId: 'major' }, 'E', 'Imperfect authentic'],
        [{ root: 'C', chordId: 'major', bass: 'E' }, 'C', 'Imperfect authentic'],
        [{ root: 'A', chordId: 'minor' }, 'A', 'Deceptive'],
    ])('uses final soprano and actual inversion for an observed ending: $root $bass / %s', (target, soprano, label) => {
        const result = exploreRelation(query('cadence', {
            target, context: { before: { root: 'G', chordId: 'dominant-7' }, phraseEnding: true, bassConfirmed: true, soprano },
        }));
        expect(result.observations.join(' ')).toContain(label);
    });

    it('leaves unresolved non-chord soprano evidence unclassified', () => {
        const result = exploreRelation(query('cadence', {
            context: { before: { root: 'G', chordId: 'dominant-7' }, phraseEnding: true, bassConfirmed: true, soprano: 'F#' },
        }));
        expect(result.status).toBe('insufficient-context');
        expect(result.missing.join(' ')).toContain('resolution');
    });

    it.each([
        [{ root: 'G', chordId: 'major-7' }, { root: 'C', chordId: 'major' }],
        [{ root: 'G', chordId: 'dominant-7' }, { root: 'C', chordId: 'major-7' }],
    ])('does not classify extended or non-dominant harmonies as an authentic cadence', (before, target) => {
        const result = exploreRelation(query('cadence', {
            target, context: { before, phraseEnding: true, bassConfirmed: true, soprano: 'C' },
        }));
        expect(result.status).toBe('possible');
        expect(result.observations.join(' ')).not.toContain('authentic cadence');
    });
});
