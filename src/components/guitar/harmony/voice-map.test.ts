import { describe, expect, it } from 'vitest';
import { exploreRelation } from '@/domain/harmony/relations';
import { degreeNumber } from '@/domain/harmony/roman';
import type { ChordRef, RelationExample, RelationKind } from '@/domain/harmony/types';
import { motionLabel, rootMotionLabel, voiceMap } from './voice-map';

const explore = (kind: RelationKind, tonic = 'C', mode: 'major' | 'minor' = 'major', target: ChordRef = { root: tonic, chordId: mode }) =>
    exploreRelation({ kind, frame: { tonic, mode, lens: 'jazz-pop' }, target }).examples;
const examples = (kind: RelationKind) => explore(kind);

/** Formula degrees top to bottom; `·` marks a row this chord does not use. */
const column = (example: RelationExample, map: ReturnType<typeof voiceMap>, step: number) => {
    const rows: string[] = Array(map.rows).fill('·');
    for (const tone of example.steps[step].chord.tones) rows[map.lanes[step].get(tone.degree)!] = tone.degree;
    return rows;
};
const KINDS: RelationKind[] = ['dominant', 'fifths', 'ii-v', 'predominant', 'tritone', 'leading', 'backdoor', 'common-tone', 'tonic-sub', 'minor-sub'];
const TONICS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

describe('Formula-role lanes', () => {
    it.each([
        ['G → C', explore('fifths')[0], [['5', '3', '1'], ['5', '3', '1']]],
        ['G7 → C', explore('dominant')[0], [['b7', '5', '3', '1'], ['·', '5', '3', '1']]],
        ['Dm7 → G7 → C', explore('ii-v')[0], [['b7', '5', 'b3', '1'], ['b7', '5', '3', '1'], ['·', '5', '3', '1']]],
        ['D♭7 → C', explore('tritone').find(e => e.id === 'substitute')!, [['b7', '5', '3', '1'], ['·', '5', '3', '1']]],
        ['V7 → i', explore('dominant', 'C', 'minor')[0], [['b7', '5', '3', '1'], ['·', '5', 'b3', '1']]],
        ['vii°7 → I', explore('leading').find(e => e.id === 'leading')!, [['bb7', 'b5', 'b3', '1'], ['·', '5', '3', '1']]],
        ['vii°7 → i', explore('leading', 'C', 'minor').find(e => e.id === 'leading')!, [['bb7', 'b5', 'b3', '1'], ['·', '5', 'b3', '1']]],
        ['CT°7 → I', explore('common-tone')[0], [['bb7', 'b5', 'b3', '1'], ['·', '5', '3', '1']]],
        ['iv7 → ♭VII7 → I', explore('backdoor').find(e => e.id === 'minor-backdoor')!, [['b7', '5', 'b3', '1'], ['b7', '5', '3', '1'], ['·', '5', '3', '1']]],
    ] as const)('%s stacks each chord by its own roles, root at the bottom', (_, example, expected) => {
        const map = voiceMap(example);
        expect(example.steps.map((__, step) => column(example, map, step))).toEqual(expected);
    });

    it.each(KINDS.flatMap(kind => TONICS.map(tonic => [kind, tonic] as const)))('%s in %s: root on the bottom row, roles ascending, shape identical to C', (kind, tonic) => {
        const reference = explore(kind);
        explore(kind, tonic).forEach((example, index) => {
            const map = voiceMap(example), refMap = voiceMap(reference[index]);
            example.steps.forEach((step, i) => {
                expect(map.lanes[i].get('1')).toBe(map.rows - 1);
                const ordered = [...step.chord.tones].sort((a, b) => map.lanes[i].get(b.degree)! - map.lanes[i].get(a.degree)!).map(t => degreeNumber(t.degree));
                expect(ordered).toEqual([...ordered].sort((a, b) => a - b));
                expect(new Set(map.lanes[i].values()).size).toBe(map.lanes[i].size);
                // 12-key shape invariance: the degree → lane map depends on roles, never on key.
                expect([...map.lanes[i]]).toEqual([...refMap.lanes[i]]);
            });
        });
    });

    it('never moves a source tone to straighten a line: lanes are independent of edges', () => {
        for (const example of [...examples('dominant'), ...examples('ii-v'), ...examples('common-tone')]) {
            const bare = { ...example, transitions: example.transitions!.map(t => ({ ...t, voices: [] })) };
            expect(voiceMap(example).lanes).toEqual(voiceMap(bare).lanes);
        }
    });

    it.each(TONICS)('tritone A/B in %s share the destination rows and keep each dominant in its own role order', tonic => {
        const [original, substitute] = explore('tritone', tonic);
        const a = voiceMap(original), b = voiceMap(substitute);
        expect(b.lanes[1]).toEqual(a.lanes[1]);
        expect(column(substitute, b, 0)).toEqual(column(original, a, 0));
    });

    it.each([
        [11, 0, '½ step up'], [5, 4, '½ step down'], [2, 4, 'whole step up'], [5, 3, 'whole step down'],
        [7, 7, 'Common tone'], [0, 3, '3 semitones up'], [2, 11, '3 semitones down'],
    ])('labels %i → %i as %s', (from, to, label) => {
        expect(motionLabel(from, to)).toBe(label);
    });
});

describe('Musical voice map', () => {
    it('draws the dominant resolutions and the common G as domain edges', () => {
        expect(voiceMap(examples('dominant')[0]).edges).toEqual(expect.arrayContaining([
            expect.objectContaining({ fromDegree: '3', toDegree: '1', guide: true, held: false }),
            expect.objectContaining({ fromDegree: 'b7', toDegree: '3', guide: true, held: false }),
            expect.objectContaining({ fromDegree: '1', toDegree: '5', guide: false, held: true }),
        ]));
    });

    it('keeps both common-tone diminished neighbors converging on one target fifth', () => {
        const map = voiceMap(examples('common-tone')[0]);
        expect(map.edges.filter(edge => edge.toDegree === '5').map(edge => edge.fromDegree)).toEqual(expect.arrayContaining(['b5', 'bb7']));
        expect(map.lanes[0].get('1')).toBe(map.lanes[1].get('1'));
    });

    it('does not turn unmatched notes in a tonic-family comparison into a progression', () => {
        const example = examples('tonic-sub').find(item => item.id === 'vi')!;
        const map = voiceMap(example);
        expect(map.edges).toHaveLength(3);
        expect(map.edges.every(edge => edge.held && !edge.guide)).toBe(true);
        expect(map.edges.some(edge => edge.fromDegree === '7')).toBe(false);
    });

    it('shows the two unambiguous chromatic changes in parallel-minor comparison without guide arrows', () => {
        const example = examples('minor-sub').find(item => item.id === 'mixture')!;
        const changed = voiceMap(example).edges.filter(edge => !edge.held);
        expect(changed.map(edge => [edge.fromDegree, edge.toDegree])).toEqual([['3', 'b3'], ['7', 'b7']]);
        expect(changed.every(edge => !edge.guide)).toBe(true);
    });

    it('does not mutate canonical chord order when laying out a musical correspondence', () => {
        const example: RelationExample = examples('backdoor')[1];
        const before = structuredClone(example);
        voiceMap(example);
        expect(example).toEqual(before);
    });
});

describe('Spelled musical root intervals', () => {
    it.each([
        ['G', 'C', 5, 'P5 down / P4 up'],
        ['Bb', 'C', 2, 'M2 up'],
        ['Db', 'C', 11, 'm2 down'],
        ['C', 'F#', 6, 'A4 up'],
        ['C', 'Gb', 6, 'd5 up'],
        ['F#', 'Gb', 0, 'Same pitch, respelled root'],
        ['C', 'C', 0, 'Same root'],
    ])('%s to %s respects letter spelling', (from, to, semitones, label) => {
        expect(rootMotionLabel(from, to, semitones)).toBe(label);
    });
});
