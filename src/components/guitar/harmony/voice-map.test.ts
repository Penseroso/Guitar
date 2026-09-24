import { describe, expect, it } from 'vitest';
import { exploreRelation } from '@/domain/harmony/relations';
import type { RelationExample, RelationKind } from '@/domain/harmony/types';
import { rootMotionLabel, voiceMap } from './voice-map';

const examples = (kind: RelationKind) => exploreRelation({
    kind, frame: { tonic: 'C', mode: 'major', lens: 'jazz-pop' }, target: { root: 'C', chordId: 'major' },
}).examples;

describe('Musical voice map', () => {
    it('keeps common G level while prioritizing the two dominant resolutions', () => {
        const map = voiceMap(examples('dominant')[0]);
        expect(map.lanes[0].get('1')).toBe(map.lanes[1].get('5'));
        expect(map.edges).toEqual(expect.arrayContaining([
            expect.objectContaining({ fromDegree: '3', toDegree: '1', guide: true, held: false }),
            expect.objectContaining({ fromDegree: 'b7', toDegree: '3', guide: true, held: false }),
            expect.objectContaining({ fromDegree: '1', toDegree: '5', guide: false, held: true }),
        ]));
        expect(map.lanes[0].get('3')!).toBeLessThan(map.lanes[0].get('1')!);
        expect(map.lanes[0].get('b7')!).toBeLessThan(map.lanes[0].get('1')!);
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
        const pitchOrder = [...original.steps[0].chord.tones].sort((a, b) => first.lanes[0].get(a.degree)! - first.lanes[0].get(b.degree)!).map(tone => tone.pitchClass);
        const second = voiceMap(substitute, pitchOrder);
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
