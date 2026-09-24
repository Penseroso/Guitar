import { describe, expect, it } from 'vitest';
import { exploreRelation } from '@/domain/harmony/relations';
import type { RelationExample, RelationKind } from '@/domain/harmony/types';
import { rootMotionLabel, voiceMap } from './voice-map';

const examples = (kind: RelationKind) => exploreRelation({
    kind, frame: { tonic: 'C', mode: 'major', lens: 'jazz-pop' }, target: { root: 'C', chordId: 'major' },
}).examples;

/** Note names top to bottom; `·` marks a row this chord does not occupy. */
const column = (example: RelationExample, map: ReturnType<typeof voiceMap>, step: number) => {
    const rows: string[] = Array(map.rows).fill('·');
    for (const tone of example.steps[step].chord.tones) rows[map.lanes[step].get(tone.degree)!] = tone.name;
    return rows;
};

describe('Pitch-ordered voice lanes', () => {
    it.each([
        ['fifths', [['G', 'D', 'B'], ['G', 'E', 'C']]],
        ['ii-v', [['·', 'F', 'D', 'C', 'A'], ['G', 'F', 'D', 'B', '·'], ['G', 'E', '·', 'C', '·']]],
        ['leading', [['Ab', 'F', 'D', 'B'], ['G', 'E', '·', 'C']]],
    ] as const)('%s stacks every chord high-to-low with one row per voice line', (kind, expected) => {
        const example = examples(kind)[0], map = voiceMap(example);
        expect(example.steps.map((_, step) => column(example, map, step))).toEqual(expected);
    });

    it('iii7 comparison places Cmaj7 in the Em7 frame without a register collision', () => {
        // Held E/G/B follow Em7 (64/67/71); the unshared C sits nearest them, above B.
        const example = examples('tonic-sub').find(item => item.id === 'iii')!, map = voiceMap(example);
        expect(column(example, map, 0).filter(name => name !== '·')).toEqual(['C', 'B', 'G', 'E']);
    });

    it.each(['C', 'Db', 'E', 'F#', 'Ab', 'B'].flatMap(tonic => (['dominant', 'fifths', 'ii-v', 'predominant', 'tritone', 'leading', 'backdoor', 'common-tone', 'tonic-sub', 'minor-sub'] as RelationKind[]).map(kind => [kind, tonic] as const)))('%s in %s: lanes run high-to-low in one pitch frame and connected lines stay level', (kind, tonic) => {
        for (const example of exploreRelation({ kind, frame: { tonic, mode: 'major', lens: 'jazz-pop' }, target: { root: tonic, chordId: 'major' } }).examples) {
            const map = voiceMap(example);
            example.steps.forEach((step, index) => {
                for (const tone of step.chord.tones) expect(((map.pitches[index].get(tone.degree)! % 12) + 12) % 12).toBe(tone.pitchClass);
                const stacked = [...step.chord.tones].sort((a, b) => map.lanes[index].get(a.degree)! - map.lanes[index].get(b.degree)!).map(tone => map.pitches[index].get(tone.degree)!);
                expect(stacked).toEqual([...stacked].sort((a, b) => b - a));
            });
            for (const lanes of map.lanes) expect(new Set(lanes.values()).size).toBe(lanes.size);
            for (const edge of map.edges.filter(edge => edge.held)) expect(map.lanes[edge.from].get(edge.fromDegree)).toBe(map.lanes[edge.to].get(edge.toDegree));
        }
    });
});

describe('Musical voice map', () => {
    it('keeps common G level while prioritizing the two dominant resolutions', () => {
        const map = voiceMap(examples('dominant')[0]);
        expect(map.lanes[0].get('1')).toBe(map.lanes[1].get('5'));
        expect(map.edges).toEqual(expect.arrayContaining([
            expect.objectContaining({ fromDegree: '3', toDegree: '1', guide: true, held: false }),
            expect.objectContaining({ fromDegree: 'b7', toDegree: '3', guide: true, held: false }),
            expect.objectContaining({ fromDegree: '1', toDegree: '5', guide: false, held: true }),
        ]));
        // Pitch order, highest on top: G7 follows its lines as G / F / D / B above C's G / E / C.
        expect(column(examples('dominant')[0], map, 0)).toEqual(['G', 'F', 'D', 'B']);
        expect(column(examples('dominant')[0], map, 1)).toEqual(['G', 'E', '·', 'C']);
    });

    it('preserves common-tone lanes through each step of ii–V–I', () => {
        const example = examples('ii-v')[0];
        const map = voiceMap(example);
        for (const edge of map.edges.filter(edge => edge.held)) {
            expect(map.lanes[edge.from].get(edge.fromDegree)).toBe(map.lanes[edge.to].get(edge.toDegree));
        }
        for (const lanes of map.lanes) expect(new Set(lanes.values()).size).toBe(lanes.size);
    });

    it('keeps both common-tone diminished neighbors converging on one target fifth', () => {
        const map = voiceMap(examples('common-tone')[0]);
        expect(map.edges.filter(edge => edge.toDegree === '5').map(edge => edge.fromDegree)).toEqual(expect.arrayContaining(['b5', 'bb7']));
        expect(map.lanes[1].has('5')).toBe(true);
        expect(map.lanes[0].get('1')).toBe(map.lanes[1].get('1'));
        expect(new Set(map.lanes[1].values()).size).toBe(map.lanes[1].size);
    });

    it('does not turn unmatched notes in a tonic-family comparison into a progression', () => {
        const example = examples('tonic-sub').find(item => item.id === 'vi')!;
        const map = voiceMap(example);
        expect(map.edges).toHaveLength(3);
        expect(map.edges.every(edge => edge.held && !edge.guide)).toBe(true);
        expect(map.edges.some(edge => edge.fromDegree === '7')).toBe(false);
        for (const edge of map.edges) expect(map.lanes[edge.from].get(edge.fromDegree)).toBe(map.lanes[edge.to].get(edge.toDegree));
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

    it.each(['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'])('aligns enharmonically shared guide tones across original/substitute diagrams in %s', tonic => {
        const [original, substitute] = exploreRelation({ kind: 'tritone', frame: { tonic, mode: 'major', lens: 'jazz-pop' }, target: { root: tonic, chordId: 'major' } }).examples;
        const first = voiceMap(original);
        const second = voiceMap(substitute, first);
        for (const tone of original.steps[0].chord.tones) {
            const same = substitute.steps[0].chord.tones.find(candidate => candidate.pitchClass === tone.pitchClass);
            if (same) expect(second.lanes[0].get(same.degree)).toBe(first.lanes[0].get(tone.degree));
        }
        for (const tone of original.steps[1].chord.tones) expect(second.lanes[1].get(tone.degree)).toBe(first.lanes[1].get(tone.degree));
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
