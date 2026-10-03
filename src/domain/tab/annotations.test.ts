import { describe, expect, it } from 'vitest';
import { createScaleRef } from '@/domain/scale/scale-ref';
import { analyzeTabSelection } from './analysis';
import { buildTabScoreAnnotations } from './annotations';
import type { TabAnalysisContext, TabDocument } from './types';

const noContext: TabAnalysisContext = { scale: null, chord: null, frame: null };
const cFrame: TabAnalysisContext = { ...noContext, frame: { tonic: 'C', mode: 'major', lens: 'jazz-pop' } };

function annotations(pitches: number[][], context = noContext, measures?: number[], start = 0) {
    const document: TabDocument = { format: 'authored', timing: 'order-only', source: '', capo: 0,
        tuningMidi: [64, 59, 55, 50, 45, 40], measureCount: Math.max(...(measures ?? [1])),
        moments: pitches.map((notes, index) => ({ id: `moment-${index}`, index, measure: measures?.[index] ?? 1,
            column: index, notes: notes.map((midi, string) => ({ id: `note-${index}-${string}`, string,
                fret: 0, midi, pitchClass: midi % 12, source: null })) })) };
    return buildTabScoreAnnotations(analyzeTabSelection(document, { start, end: pitches.length - 1 }, context), context);
}

describe('score annotation evidence adapter', () => {
    it('places isolated complete chords at their actual positions even across a melody', () => {
        const result = annotations([[60, 64, 67], [62], [67, 71, 74]], cFrame);
        expect(result.filter(item => item.kind === 'chord').map(item => [item.start, item.end, item.label, item.source])).toEqual([
            [0, 0, 'C', 'observed'], [2, 2, 'G', 'observed'],
        ]);
        expect(result.filter(item => item.kind === 'roman').map(item => item.label)).toEqual(['I', 'V']);
        expect(result.filter(item => item.kind === 'progression')).toEqual([]);
    });

    it('keeps exact alternatives visible rather than silently adopting a familiar chord', () => {
        const result = annotations([[57, 60, 64, 67]], cFrame);
        expect(result.find(item => item.kind === 'chord')).toMatchObject({ source: 'candidate', start: 0, end: 0 });
        expect(result.find(item => item.kind === 'chord')?.label).toContain('Am7');
        expect(result.find(item => item.kind === 'chord')?.label).toContain('C6');
        expect(result.find(item => item.kind === 'roman')?.label).toContain('vi7');
        expect(result.find(item => item.kind === 'roman')?.label).toContain('I6');
    });

    it('requires an explicit valid frame and preserves contextual root spelling', () => {
        expect(annotations([[60, 64, 67]]).some(item => item.kind === 'roman')).toBe(false);
        expect(annotations([[61, 64, 68]], { ...noContext, frame: { tonic: 'B', mode: 'major', lens: 'jazz-pop' } })
            .find(item => item.kind === 'chord')?.label).toBe('C♯m');
        expect(annotations([[61, 65, 68]], cFrame).some(item => item.kind === 'roman')).toBe(false);
        expect(annotations([[60, 64, 67]], { ...noContext, frame: { tonic: 'invalid', mode: 'major', lens: 'jazz-pop' } })
            .some(item => item.kind === 'roman')).toBe(false);
    });

    it('marks incomplete registry readings as candidates without claiming a resolved Roman', () => {
        const result = annotations([[67, 71, 77]], cFrame);
        expect(result.find(item => item.kind === 'chord')).toMatchObject({ label: 'Chord candidate', source: 'candidate' });
        expect(result.find(item => item.kind === 'chord')?.detail).toContain('missing');
        expect(result.some(item => item.kind === 'roman' || item.kind === 'progression')).toBe(false);
    });

    it('labels supplied reference scale distinctly and does not infer a key from it', () => {
        const result = annotations([[], [60], [61], [60, 64, 67], []], {
            ...noContext, scale: createScaleRef('Diatonic Modes', 'Ionian', 0),
        });
        expect(result.find(item => item.kind === 'scale')).toMatchObject({ start: 1, end: 3,
            label: 'C Ionian · reference', source: 'reference', placement: 'above' });
        expect(result.find(item => item.kind === 'scale')?.detail).toContain('1 note occurrence outside');
        expect(result.some(item => item.kind === 'roman')).toBe(false);
        expect(annotations([[]], { ...noContext, scale: createScaleRef('Diatonic Modes', 'Ionian', 0) })).toEqual([]);
    });

    it('uses shared scale presentation names in supplied reference labels', () => {
        const result = annotations([[60], [62]], { ...noContext, scale: createScaleRef('Symmetric', 'Diminished', 0) });
        expect(result.find(item => item.kind === 'scale')?.label).toBe('C Whole–Half Diminished · reference');
    });

    it('shows an ambiguous seventh arpeggio as a candidate and keeps both names', () => {
        const result = annotations([[57], [60], [64], [67]], cFrame);
        const candidate = result.find(item => item.kind === 'arpeggio');
        expect(candidate).toMatchObject({ start: 0, end: 3, source: 'candidate' });
        expect(candidate?.label).toContain('Am7');
        expect(candidate?.label).toContain('C6');
        expect(result.some(item => item.kind === 'chord' || item.kind === 'roman')).toBe(false);
    });

    it('groups equal dyad intervals within a measure and separates bar boundaries', () => {
        const result = annotations([[60, 64], [62, 66], [64, 68], [65, 69]], noContext, [1, 1, 2, 2]);
        expect(result.filter(item => item.kind === 'interval').map(item => [item.start, item.end, item.label])).toEqual([
            [0, 1, '4 st'], [2, 3, '4 st'],
        ]);
        expect(result.some(item => item.kind === 'chord')).toBe(false);
    });

    it('uses stable endpoint IDs and global indices for a selected passage', () => {
        const result = annotations([[65], [60], [64], [67]], noContext, undefined, 1);
        const arpeggio = result.find(item => item.kind === 'arpeggio');
        expect(arpeggio).toMatchObject({ start: 1, end: 3, startMomentId: 'moment-1', endMomentId: 'moment-3', source: 'candidate' });
        expect(arpeggio?.detail).toContain('not an assertion of the actual accompaniment');
        expect(result.every(item => item.start >= 1)).toBe(true);
    });

    it('places bounded strict progression evidence below the score, without a cadence label', () => {
        const result = annotations([[62, 65, 69], [67, 71, 74, 77], [60, 64, 67]], cFrame);
        expect(result.find(item => item.kind === 'progression')).toMatchObject({ start: 0, end: 2,
            label: 'ii–V–I pattern', placement: 'below', source: 'observed' });
        expect(result.find(item => item.kind === 'progression')?.detail).toContain('Phrase ending and harmonic function are not established');
    });

    it('keeps melodic and repetition evidence independent of inferred harmony', () => {
        const result = annotations([[60], [62], [64], [65], [67], [69]]);
        expect(result.find(item => item.kind === 'melody')?.label).toBe('Ascending line');
        expect(result.filter(item => item.kind === 'repeat')).toHaveLength(2);
        expect(result.filter(item => item.kind === 'repeat').every(item => item.detail.includes('not a confirmed rhythmic motif'))).toBe(true);
        expect(result.some(item => item.kind === 'chord' || item.kind === 'roman')).toBe(false);
    });
});
