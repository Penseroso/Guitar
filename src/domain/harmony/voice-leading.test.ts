import { describe, expect, it } from 'vitest';
import { buildAudition } from './audition';
import { auditionLines, completeCommonTones, connectChords, exampleTransitions, toneLabel } from './connections';
import { exploreRelation } from './relations';
import { resolveChord } from './roman';
import type { ChordRef, RelationExample, RelationKind, ToneConnection } from './types';

const relation = (kind: RelationKind, mode: 'major' | 'minor' = 'major', target: ChordRef = { root: 'C', chordId: mode }) =>
    exploreRelation({ kind, frame: { tonic: 'C', mode, lens: 'jazz-pop' }, target });
/** Readable edge list: `=` held, `→` moving, `*` guide tone. */
const lines = (example: RelationExample) => exampleTransitions(example).map(t => t.voices.map(v =>
    `${toneLabel(example.steps[t.fromStep], v.fromDegree).name}${v.kind === 'held' ? '=' : '→'}${toneLabel(example.steps[t.toStep], v.toDegree).name}${v.guide ? '*' : ''}`).sort());
const connect = (from: ChordRef, to: ChordRef, mode?: 'nearest') => connectChords(resolveChord(from), resolveChord(to), mode).voices;

describe('Tone correspondence fixtures', () => {
    it('G → C is triad voice leading: G held once, D not dropped, no guide tones', () => {
        const [example] = relation('fifths').examples;
        expect(lines(example)).toEqual([['B→C', 'D→E', 'G=G']]);
        expect(exampleTransitions(example)[0].basis).toBe('nearest');
    });

    it('G7 → C resolves the 3rd/7th guide tones and keeps G as a separate common tone', () => {
        expect(lines(relation('dominant').examples[0])).toEqual([['B→C*', 'F→E*', 'G=G']]);
    });

    it('Dm7 → G7 → C holds the 3rd into the 7th and resolves each 7th down', () => {
        expect(lines(relation('ii-v').examples[0])).toEqual([['C→B*', 'D=D', 'F=F*'], ['B→C*', 'F→E*', 'G=G']]);
    });

    it('D♭7 → C shares the tritone: 3rd falls to the 3rd, enharmonic leading tone rises to the root', () => {
        const substitute = relation('tritone').examples.find(item => item.id === 'substitute')!;
        expect(lines(substitute)).toEqual([['Cb→C*', 'F→E*']]);
    });

    it('minor V7 → i resolves ♭7 to ♭3 by whole step', () => {
        expect(lines(relation('dominant', 'minor').examples[0])).toEqual([['B→C*', 'F→Eb*', 'G=G']]);
    });

    it.each([['major', 'E'], ['minor', 'Eb']] as const)('vii°7 → %s tonic: tendency tones only, doubling-dependent 3rd unconnected', (mode, third) => {
        const example = relation('leading', mode).examples.find(item => item.id === 'leading')!;
        expect(lines(example)).toEqual([['Ab→G', 'B→C', `F→${third}`]]);
        expect(exampleTransitions(example)[0].voices.some(v => v.fromDegree === 'b3' || v.guide)).toBe(false);
    });

    it('inversion or slash bass of the destination does not change pitch-class correspondence', () => {
        expect(lines(relation('dominant', 'major', { root: 'C', chordId: 'major', bass: 'E' }).examples[0])).toEqual([['B→C*', 'F→E*', 'G=G']]);
        expect(lines(relation('fifths', 'major', { root: 'C', chordId: 'major', bass: 'G' }).examples[0])).toEqual([['B→C', 'D→E', 'G=G']]);
    });

    it('IV–V shares no guide-tone mapping with fifth motion; the chordal 7th still falls', () => {
        const example = relation('predominant').examples.find(item => item.id === 'iv-v')!;
        expect(lines(example)[0]).toEqual(['E→D', 'F=F']);
    });
});

const KINDS: RelationKind[] = ['dominant', 'fifths', 'ii-v', 'predominant', 'tritone', 'leading', 'backdoor', 'common-tone', 'cadence'];
const TARGETS: ChordRef[] = [{ root: 'C', chordId: 'major' }, { root: 'C', chordId: 'minor' }, { root: 'D', chordId: 'minor' }, { root: 'C', chordId: 'major-7' }, { root: 'A', chordId: 'minor-7' }, { root: 'C', chordId: 'major', bass: 'E' }];

describe('Correspondence invariants across relations and targets', () => {
    for (const kind of KINDS) for (const target of TARGETS) for (const mode of ['major', 'minor'] as const) {
        const examples = relation(kind, mode, target).examples.filter(item => item.kind === 'motion');
        if (!examples.length) continue;
        it(`${kind} → ${target.root}${target.chordId}${target.bass ? '/' + target.bass : ''} (${mode})`, () => {
            for (const example of examples) for (const transition of exampleTransitions(example)) {
                const from = example.steps[transition.fromStep], to = example.steps[transition.toStep];
                const sources = transition.voices.map(v => v.fromDegree);
                expect(new Set(sources).size, 'a source tone never forks').toBe(sources.length);
                for (const voice of transition.voices) {
                    const same = toneLabel(from, voice.fromDegree).pitchClass === toneLabel(to, voice.toDegree).pitchClass;
                    expect(voice.kind === 'held', 'held exactly when the pitch is retained').toBe(same);
                    if (voice.guide) {
                        expect(from.chord.tones.some(t => ['7', 'b7', 'bb7'].includes(t.degree)), 'guide tones need a seventh chord').toBe(true);
                        expect(['3', 'b3', '7', 'b7', 'bb7']).toContain(voice.fromDegree);
                    }
                }
            }
        });
    }
});

describe('Connection contract', () => {
    it('never pairs by array position: a motion example must declare its edges', () => {
        const [example] = relation('dominant').examples;
        expect(() => exampleTransitions({ ...example, transitions: undefined })).toThrow('explicit tone connections');
    });

    it('rejects a source connected twice, a false hold, an unmarked hold and a triad guide tone', () => {
        const [example] = relation('fifths').examples;
        const at = (voices: ToneConnection[]) => ({ ...example, transitions: [{ fromStep: 0, toStep: 1, voices }] });
        expect(() => exampleTransitions(at([{ fromDegree: '1', toDegree: '5', kind: 'held' }, { fromDegree: '1', toDegree: '3', kind: 'resolution' }]))).toThrow('only one connection');
        expect(() => exampleTransitions(at([{ fromDegree: '1', toDegree: '3', kind: 'held' }]))).toThrow('held tone');
        expect(() => exampleTransitions(at([{ fromDegree: '1', toDegree: '5', kind: 'resolution' }]))).toThrow('held tone');
        expect(() => exampleTransitions(at([{ fromDegree: '3', toDegree: '1', kind: 'resolution', guide: true }]))).toThrow('seventh chord');
    });

    it('leaves ambiguous triad moves unconnected instead of picking one', () => {
        // G → Cmaj7: D is a whole step from both C and E.
        expect(connect({ root: 'G', chordId: 'major' }, { root: 'C', chordId: 'major-7' }, 'nearest').map(v => v.fromDegree).sort()).toEqual(['1', '3']);
    });
});

describe('Audition derives from the drawn correspondence', () => {
    it('guide-tone playback is exactly the guide edges', () => {
        const example = relation('dominant').examples[0];
        const { guide, transitions } = auditionLines(example);
        expect(guide).toBe(true);
        expect(transitions[0].voices.every(v => v.guide)).toBe(true);
        expect(buildAudition(example, true).map(frame => frame.midi)).toEqual([[59, 65], [60, 64]]);
    });

    it('triad voice-line playback plays every drawn line, not an extra guessed voice', () => {
        const example = relation('fifths').examples[0];
        expect(auditionLines(example).guide).toBe(false);
        expect(buildAudition(example, true).map(frame => frame.midi)).toEqual([[55, 59, 62], [55, 60, 64]]);
    });
});

describe('The same chord pair keeps the same correspondence across relations', () => {
    const cadence = (mode: 'major' | 'minor', target: ChordRef, before: ChordRef) => exploreRelation({
        kind: 'cadence', frame: { tonic: 'C', mode, lens: 'jazz-pop' }, target, context: { before, phraseEnding: true },
    }).examples[0];

    it.each([
        ['G7 → C (authentic)', 'major', { root: 'C', chordId: 'major' }],
        ['G7 → Cm (minor authentic)', 'minor', { root: 'C', chordId: 'minor' }],
        ['G7 → C in minor (Picardy)', 'minor', { root: 'C', chordId: 'major' }],
    ] as const)('%s: cadence edges equal the dominant relation, common G included', (_, mode, target) => {
        const dominant = relation('dominant', mode, target).examples[0];
        const ending = cadence(mode, target, { root: 'G', chordId: 'dominant-7' });
        expect(lines(ending)).toEqual(lines(dominant));
        expect(lines(ending)[0]).toContain('G=G');
    });

    it.each([
        ['authentic', 'major', { root: 'C', chordId: 'major' }, { root: 'G', chordId: 'dominant-7' }],
        ['deceptive', 'major', { root: 'A', chordId: 'minor' }, { root: 'G', chordId: 'dominant-7' }],
        ['plagal', 'major', { root: 'C', chordId: 'major' }, { root: 'F', chordId: 'major' }],
        ['minor plagal', 'major', { root: 'C', chordId: 'major' }, { root: 'F', chordId: 'minor' }],
        ['Phrygian', 'minor', { root: 'G', chordId: 'major' }, { root: 'F', chordId: 'minor', bass: 'Ab' }],
    ] as const)('%s ending holds every shared pitch class as a common tone', (_, mode, target, before) => {
        const ending = cadence(mode, target, before);
        const [from, to] = ending.steps.map(step => step.chord);
        const voices = exampleTransitions(ending)[0].voices;
        for (const tone of from.tones.filter(t => to.tones.some(u => u.pitchClass === t.pitchClass))) {
            expect(voices.find(v => v.fromDegree === tone.degree)?.kind).toBe('held');
        }
    });
});

describe('Common-tone completion for curated edges', () => {
    it('keeps a real common tone even when its destination already receives a resolution', () => {
        const from = resolveChord({ root: 'G', chordId: 'dominant-7' }), to = resolveChord({ root: 'C', chordId: 'major' });
        const voices = completeCommonTones(from, to, [{ fromDegree: 'b7', toDegree: '5', kind: 'resolution' }]);
        expect(voices).toEqual([{ fromDegree: 'b7', toDegree: '5', kind: 'resolution' }, { fromDegree: '1', toDegree: '5', kind: 'held' }]);
    });

    it('never forks a source that already has an edge', () => {
        const from = resolveChord({ root: 'G', chordId: 'dominant-7' }), to = resolveChord({ root: 'C', chordId: 'major' });
        expect(completeCommonTones(from, to, [{ fromDegree: '1', toDegree: '1', kind: 'resolution' }]).filter(v => v.fromDegree === '1')).toHaveLength(1);
    });
});
