import { describe, expect, it } from 'vitest';
import { exploreRelation } from './relations';
import { note, resolveChord } from './roman';
import type { RelationQuery, RelationResult, TonalFrame } from './types';

const frame: TonalFrame = { tonic: 'C', mode: 'major', lens: 'jazz-pop' };
const query = (changes: Partial<RelationQuery>): RelationQuery => ({
    frame, target: { root: 'C', chordId: 'major' }, kind: 'dominant', ...changes,
});
const report = (result: RelationResult) => [
    ...result.observations,
    ...(result.interpretations ?? []).map(item => item.label),
].join(' ');

describe('Harmony expansion: scoped approaches and voice leading', () => {
    it.each(['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'])('transposes both backdoor approaches to %s without changing the global frame', tonic => {
        const target = { root: tonic, chordId: 'major' };
        const declaredFrame = { ...frame, tonic };
        const result = exploreRelation(query({ kind: 'backdoor', frame: declaredFrame, target }));
        const root = resolveChord(target).rootPitchClass;
        expect(result.status).toBe('possible');
        expect(result.query.frame).toEqual(declaredFrame);
        expect(result.examples).toHaveLength(2);
        const direct = result.examples.find(example => example.id === 'backdoor')!;
        const prepared = result.examples.find(example => example.id === 'minor-backdoor')!;
        expect(direct.steps.map(step => [step.chord.rootPitchClass, step.chord.chordId])).toEqual([
            [(root + 10) % 12, 'dominant-7'], [root, 'major'],
        ]);
        expect(prepared.steps.map(step => [step.chord.rootPitchClass, step.chord.chordId])).toEqual([
            [(root + 5) % 12, 'minor-7'], [(root + 10) % 12, 'dominant-7'], [root, 'major'],
        ]);
        for (const example of result.examples) {
            expect(example.provenance).toBe('illustration');
            for (const step of example.steps) expect(step.chord).toEqual(resolveChord(step.chord));
        }
    });

    it.each([
        { frame: { ...frame, lens: 'classical' as const } },
        { frame: { ...frame, mode: 'minor' as const }, target: { root: 'C', chordId: 'minor' } },
        { target: { root: 'D', chordId: 'major' } },
        { target: { root: 'C', chordId: 'dominant-7' } },
    ])('does not extend the bounded backdoor rule to $target.chordId / $frame.lens', changes => {
        const result = exploreRelation(query({ kind: 'backdoor', ...changes }));
        expect(result.status).toBe('unsupported');
        expect(result.examples).toEqual([]);
    });

    it('keeps tonic identity separate from an applied approach to the global dominant', () => {
        const tonicRoot = exploreRelation(query({ target: { root: 'C', chordId: 'dominant-7' } }));
        expect(tonicRoot.status).toBe('possible');
        expect(tonicRoot.examples[0].steps[0].roman).not.toMatch(/\/I/);
        const globalDominant = exploreRelation(query({ target: { root: 'G', chordId: 'dominant-7' } }));
        expect(globalDominant.status).toBe('possible');
        expect(globalDominant.examples[0].steps[0].chord.root).toBe('D');
        expect(globalDominant.examples[0].steps[0].roman).toBe('V7/V');
        expect(globalDominant.query.frame).toEqual(frame);
    });

    it.each(['major', 'minor'])('gives common-tone %s an explicit held root and moving voices', chordId => {
        const result = exploreRelation(query({ kind: 'common-tone', target: { root: 'C', chordId } }));
        expect(result.status).toBe('possible');
        const example = result.examples[0];
        const transition = example.transitions?.[0];
        expect(transition).toBeDefined();
        const from = example.steps[transition!.fromStep].chord;
        const to = example.steps[transition!.toStep].chord;
        const voices = transition!.voices.map(voice => ({
            ...voice,
            from: from.tones.find(tone => tone.degree === voice.fromDegree)!,
            to: to.tones.find(tone => tone.degree === voice.toDegree)!,
        }));
        expect(voices.every(voice => voice.from && voice.to)).toBe(true);
        expect(voices.some(voice => voice.kind === 'held' && voice.from.pitchClass === 0 && voice.to.pitchClass === 0)).toBe(true);
        expect(voices.filter(voice => voice.from.pitchClass !== voice.to.pitchClass).length).toBeGreaterThanOrEqual(2);
    });

    it.each(['C', 'Db', 'F#', 'Bb'])('keeps classical CT analysis aliases pitch-equivalent and canonical chord identity intact for %s', tonic => {
        const result = exploreRelation(query({ kind: 'common-tone', frame: { ...frame, tonic, lens: 'classical' }, target: { root: tonic, chordId: 'major' } }));
        const step = result.examples[0].steps[0];
        expect(step.chord).toEqual(resolveChord({ root: tonic, chordId: 'diminished-7' }));
        expect(Object.keys(step.toneLabels ?? {}).length).toBeGreaterThan(0);
        for (const [canonicalDegree, alias] of Object.entries(step.toneLabels ?? {})) {
            expect(note(alias.name).pitchClass).toBe(step.chord.tones.find(tone => tone.degree === canonicalDegree)?.pitchClass);
        }
        if (tonic === 'C') {
            expect(Object.values(step.toneLabels ?? {}).map(alias => alias.name)).toEqual(expect.arrayContaining(['D#', 'F#', 'A']));
        }
    });
});

describe('Harmony expansion: observations do not overclaim endings', () => {
    const minorFrame: TonalFrame = { ...frame, mode: 'minor', lens: 'classical' };

    it('recognizes the bounded V–VI deceptive pattern but excludes a dominant-quality destination', () => {
        const context = { before: { root: 'G', chordId: 'dominant-7' }, phraseEnding: true, bassConfirmed: true, soprano: 'Ab' };
        const valid = exploreRelation(query({ kind: 'cadence', frame: minorFrame, target: { root: 'Ab', chordId: 'major' }, context }));
        expect(report(valid)).toMatch(/deceptive/i);
        const dominantQuality = exploreRelation(query({ kind: 'cadence', frame: minorFrame, target: { root: 'Ab', chordId: 'dominant-7' }, context }));
        expect(report(dominantQuality)).not.toMatch(/deceptive/i);
    });

    it('identifies a Picardy ending without changing a declared minor key to major', () => {
        const result = exploreRelation(query({ kind: 'cadence', frame: minorFrame, context: {
            before: { root: 'G', chordId: 'dominant-7' }, phraseEnding: true, bassConfirmed: true, soprano: 'C',
        } }));
        expect(report(result)).toMatch(/Picardy/i);
        expect(result.query.frame).toEqual(minorFrame);
        expect(result.examples[0].steps.at(-1)!.chord.chordId).toBe('major');
    });

    it('uses the supplied first-inversion minor iv bass for a Phrygian half cadence', () => {
        const base = query({ kind: 'cadence', frame: minorFrame, target: { root: 'G', chordId: 'major' }, context: {
            before: { root: 'F', chordId: 'minor', bass: 'Ab' }, phraseEnding: true, bassConfirmed: true, soprano: 'B',
        } });
        expect(report(exploreRelation(base))).toMatch(/Phrygian/i);
        const rootPosition = exploreRelation({ ...base, context: { ...base.context, before: { root: 'F', chordId: 'minor' } } });
        expect(report(rootPosition)).not.toMatch(/Phrygian/i);
        const unverified = exploreRelation({ ...base, context: { ...base.context, bassConfirmed: false } });
        expect(unverified.status).not.toBe('matched');
        expect(unverified.missing.length + (unverified.interpretations ?? []).reduce((count, item) => count + item.missing.length, 0)).toBeGreaterThan(0);
    });

    it.each([
        { target: { root: 'C', chordId: 'major' }, before: { root: 'F', chordId: 'minor' }, expected: 'plagal' },
        { target: { root: 'A', chordId: 'minor' }, before: { root: 'G', chordId: 'dominant-7' }, expected: 'deceptive' },
    ])('keeps $expected motion observable when phrase ending is explicitly false', ({ target, before, expected }) => {
        const result = exploreRelation(query({ kind: 'cadence', target, context: { before, phraseEnding: false } }));
        expect(result.status).toBe('possible');
        expect(result.interpretations?.some(item => item.id === expected)).toBe(true);
        expect(result.examples[0].label).toBe('Observed motion');
        expect(report(result)).toMatch(/motion/i);
        expect((result.interpretations ?? []).filter(item => item.status === 'matched').map(item => item.label).join(' ')).not.toMatch(/cadence|ending/i);
    });

    it('does not mark an illustrative cadence pair as observed evidence', () => {
        const result = exploreRelation(query({ kind: 'cadence' }));
        expect(result.status).toBe('insufficient-context');
        expect(result.checks?.find(check => check.id === 'ending-pair')?.state).toBe('unknown');
        expect(result.checks?.find(check => check.id === 'preceding-chord')?.state).toBe('unknown');
        expect(result.examples[0].provenance).toBe('illustration');
    });

    it('downgrades an authentic-cadence claim when final soprano evidence is absent', () => {
        const result = exploreRelation(query({ kind: 'cadence', context: {
            before: { root: 'G', chordId: 'dominant-7' }, phraseEnding: true, bassConfirmed: true,
        } }));
        expect(result.status).not.toBe('matched');
        expect(result.missing.length + (result.interpretations ?? []).reduce((count, item) => count + item.missing.length, 0)).toBeGreaterThan(0);
        expect((result.interpretations ?? []).filter(item => item.status === 'matched').map(item => item.label).join(' ')).not.toMatch(/perfect authentic/i);
    });
});

describe('Harmony expansion: independent diminished interpretations', () => {
    it('retains an enharmonic leading-tone reading alongside an observed chromatic bass passage', () => {
        const result = exploreRelation(query({ kind: 'passing', target: { root: 'D', chordId: 'minor' }, context: {
            before: { root: 'C', chordId: 'major' },
            middle: { root: 'E', chordId: 'diminished-7', bass: 'C#' },
            bassConfirmed: true, rhythmConfirmed: true,
        } }));
        expect(result.status).toBe('possible');
        expect(result.interpretations?.find(item => item.id === 'passing')?.status).toBe('possible');
        const leading = result.interpretations?.find(item => item.id === 'applied-leading');
        expect(leading?.status).toBe('possible');
        expect(leading?.evidence.join(' ')).toMatch(/enharmonic/i);
        expect(result.examples[0].steps[1].chord.root).toBe('E');
        expect(result.examples[0].provenance).toBe('observation');
    });

    it('does not substitute chromatic roots for verified nonchromatic bass movement', () => {
        const result = exploreRelation(query({ kind: 'passing', target: { root: 'D', chordId: 'minor', bass: 'F' }, context: {
            before: { root: 'C', chordId: 'major', bass: 'E' },
            middle: { root: 'C#', chordId: 'diminished-7', bass: 'G' },
            bassConfirmed: true, rhythmConfirmed: true,
        } }));
        expect(result.interpretations?.find(item => item.id === 'passing')?.status).toBe('unsupported');
        expect(result.checks?.find(check => check.id === 'passing-bass-path')?.state).toBe('fail');
        expect(result.interpretations?.find(item => item.id === 'applied-leading')?.status).toBe('possible');
    });

    it('does not confirm passing function from bass observations without rhythmic context', () => {
        const result = exploreRelation(query({ kind: 'passing', target: { root: 'D', chordId: 'minor' }, context: {
            before: { root: 'C', chordId: 'major' }, middle: { root: 'C#', chordId: 'diminished-7' }, bassConfirmed: true,
        } }));
        const passing = result.interpretations?.find(item => item.id === 'passing');
        expect(passing?.status).toBe('insufficient-context');
        expect(passing?.missing.join(' ')).toMatch(/rhythmic/i);
    });
});
