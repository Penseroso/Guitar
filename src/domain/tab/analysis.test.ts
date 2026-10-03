import { describe, expect, it } from 'vitest';
import { createScaleRef } from '@/domain/scale/scale-ref';
import type { TabAnalysisContext, TabDocument } from './types';
import { analyzeTabSelection } from './analysis';

const emptyContext: TabAnalysisContext = { scale: null, chord: null, frame: null };
const major = createScaleRef('Diatonic Modes', 'Ionian', 0);
const frame = { tonic: 'C', mode: 'major', lens: 'jazz-pop' } as const;

function score(...moments: number[][]): TabDocument {
    return {
        format: 'ascii', timing: 'order-only', source: '', tuningMidi: [64, 59, 55, 50, 45, 40], capo: 0,
        measureCount: 1,
        moments: moments.map((notes, index) => ({
            id: `m${index}`, index, measure: 0, column: index * 3,
            notes: notes.map((midi, string) => ({
                id: `${index}:${string}`, midi, pitchClass: midi % 12, string, fret: 0,
                source: { line: string + 1, column: index * 3 + 1 },
            })),
        })),
    };
}

const single = { start: 0, end: 0 };

describe('analyzeTabSelection', () => {
    it('preserves exact Am7 and C6 alternatives without choosing either', () => {
        const result = analyzeTabSelection(score([57, 60, 64, 67]), single, emptyContext);
        const exact = result.candidates.filter(candidate => candidate.match === 'exact');
        expect(exact.map(candidate => candidate.name)).toEqual(expect.arrayContaining(['Am7', 'C6']));
        expect(result.notes.every(note => note.chordDegree === null && note.chordNoteName === null && note.chordMember === null)).toBe(true);
        expect(result.roman).toBeNull();
        expect(result.candidates.every(candidate => !candidate.chord.bass)).toBe(true);
        expect(result.lowestNote?.name).toBe('A3');
    });

    it.each(Array.from({ length: 12 }, (_, tonic) => tonic))('transposes membership and exact triad identity at tonic %i', tonic => {
        const result = analyzeTabSelection(score([60, 64, 67].map(midi => midi + tonic)), single, {
            ...emptyContext, scale: createScaleRef('Diatonic Modes', 'Ionian', tonic),
        });
        expect(result.notes.map(note => note.scaleDegree)).toEqual(['1', '3', '5']);
        expect(result.notes.every(note => note.inScale)).toBe(true);
        expect(result.candidates.some(candidate => candidate.key === `${tonic}:major` && candidate.match === 'exact')).toBe(true);
    });

    it.each([
        { midi: [62, 65, 69], chord: { root: 'D', chordId: 'minor' }, degrees: ['2', '4', '6'], chordDegrees: ['1', 'b3', '5'], roman: 'ii' },
        { midi: [67, 71, 74, 77], chord: { root: 'G', chordId: 'dominant-7' }, degrees: ['5', '7', '2', '4'], chordDegrees: ['1', '3', '5', 'b7'], roman: 'V7' },
    ])('separates C scale tonic from $chord.root chord root', ({ midi, chord, degrees, chordDegrees, roman }) => {
        const result = analyzeTabSelection(score(midi), single, { scale: major, chord, frame });
        expect(result.notes.map(note => note.scaleDegree)).toEqual(degrees);
        expect(result.notes.map(note => note.chordDegree)).toEqual(chordDegrees);
        expect(result.notes.every(note => note.chordMember && note.inScale)).toBe(true);
        expect(result.roman).toBe(roman);
    });

    it('does not turn Dorian into a major/minor tonal frame', () => {
        const result = analyzeTabSelection(score([62, 65, 69, 71]), single, {
            scale: createScaleRef('Diatonic Modes', 'Dorian', 2), chord: { root: 'D', chordId: 'minor' }, frame: null,
        });
        expect(result.notes.map(note => note.scaleDegree)).toEqual(['1', 'b3', '5', '6']);
        expect(result.notes.at(-1)?.chordMember).toBe(false);
        expect(result.notes.at(-1)?.chordDegree).toBeNull();
        expect(result.notes.at(-1)?.chordNoteName).toBeNull();
        expect(result.roman).toBeNull();
    });

    it('leaves out-of-scale degrees unknown while preserving a selected chord spelling', () => {
        const result = analyzeTabSelection(score([68]), single, {
            scale: createScaleRef('Diatonic Modes', 'Aeolian', 9), chord: { root: 'E', chordId: 'dominant-7' }, frame: null,
        });
        expect(result.notes[0]).toMatchObject({ name: 'G♯4', inScale: false, scaleDegree: null, chordDegree: '3', chordMember: true });
    });

    it('preserves both structural and chord-relative spellings in C Altered', () => {
        const result = analyzeTabSelection(score([63, 64]), single, {
            scale: createScaleRef('Jazz Minor Modes', 'Altered scale', 0),
            chord: { root: 'C', chordId: 'hendrix-7-sharp-9' }, frame: null,
        });
        expect(result.notes[0]).toMatchObject({ name: 'E♭4', scaleDegree: 'b3', chordNoteName: 'D♯4', chordDegree: '#9' });
        expect(result.notes[1]).toMatchObject({ name: 'F♭4', scaleDegree: 'b4', chordNoteName: 'E4', chordDegree: '3' });
    });

    it.each([
        { midi: 59, root: 'Cb', structuralName: 'B3', chordName: 'C♭4' },
        { midi: 60, root: 'B#', structuralName: 'C4', chordName: 'B♯3' },
    ])('keeps contextual written octaves for $root separate from C major spelling', ({ midi, root, structuralName, chordName }) => {
        const result = analyzeTabSelection(score([midi]), single, {
            scale: major, chord: { root, chordId: 'major' }, frame: null,
        });
        expect(result.notes[0]).toMatchObject({ name: structuralName, chordNoteName: chordName, chordDegree: '1' });
    });

    it('does not merge a sequential arpeggio into a chord observation', () => {
        const result = analyzeTabSelection(score([60], [64], [67]), { start: 0, end: 2 }, emptyContext);
        expect(result.selectionKind).toBe('passage');
        expect(result.pitchClasses).toEqual([0, 4, 7]);
        expect(result.candidates).toEqual([]);
        expect(result.diagnostics).toEqual([]);
    });

    it('leaves isolated notes and dyads without chord candidates', () => {
        expect(analyzeTabSelection(score([60]), single, emptyContext)).toMatchObject({ selectionKind: 'single-note', candidates: [] });
        expect(analyzeTabSelection(score([60, 67]), single, emptyContext)).toMatchObject({ selectionKind: 'dyad', candidates: [] });
    });

    it('recognizes an octave-doubled power chord with three sounding notes and two pitch classes', () => {
        const result = analyzeTabSelection(score([43, 50, 55]), single, emptyContext);
        expect(result.selectionKind).toBe('aligned-chord');
        expect(result.pitchClasses).toEqual([2, 7]);
        expect(result.candidates.find(candidate => candidate.key === '7:power-5')).toMatchObject({ name: 'G5', match: 'exact', omitted: [], added: [] });
        expect(result.diagnostics).toEqual([]);
        expect(analyzeTabSelection(score([60, 72, 84]), single, emptyContext).candidates).toEqual([]);
    });

    it('reports omitted formula degrees and additional observed tones independently', () => {
        const shell = analyzeTabSelection(score([60, 64, 70]), single, emptyContext);
        expect(shell.candidates.find(candidate => candidate.key === '0:dominant-7')).toMatchObject({ match: 'incomplete', omitted: ['5'], added: [] });
        const extra = analyzeTabSelection(score([60, 64, 67, 61]), single, emptyContext);
        expect(extra.candidates.find(candidate => candidate.key === '0:major')).toMatchObject({ match: 'added-tone', omitted: [], added: [1] });
        const ranks = { exact: 0, incomplete: 1, 'added-tone': 2 };
        expect(extra.candidates.map(candidate => ranks[candidate.match])).toEqual(extra.candidates.map(candidate => ranks[candidate.match]).sort());
        expect(extra.candidates.every(candidate => candidate.added.length <= 1)).toBe(true);
    });

    it('does not silently replace invalid scale, chord, or modal frame contexts', () => {
        const result = analyzeTabSelection(score([60, 64, 67]), single, {
            scale: { group: 'Diatonic Modes', scaleId: 'unknown', tonic: 0 },
            chord: { root: 'C', chordId: 'unknown' },
            frame: { ...frame, mode: 'dorian' } as unknown as TabAnalysisContext['frame'],
        });
        expect(result.notes.every(note => note.inScale === null && note.chordMember === null)).toBe(true);
        expect(result.roman).toBeNull();
        expect(result.diagnostics.filter(item => item.includes('unsupported'))).toHaveLength(3);
    });

    it('preserves input objects and normalizes reversed inclusive selections', () => {
        const document = score([64], [60], [67]);
        const context = { scale: major, chord: { root: 'C', chordId: 'major' }, frame };
        const snapshot = JSON.stringify({ document, context });
        const result = analyzeTabSelection(document, { start: 2, end: 0 }, context);
        expect(result.notes.map(note => note.midi)).toEqual([64, 60, 67]);
        expect(result.lowestNote?.midi).toBe(60);
        expect(JSON.stringify({ document, context })).toBe(snapshot);
        result.notes[0].source!.line = 999;
        expect(document.moments[0].notes[0].source!.line).toBe(1);
    });

    it('preserves an editor note without inventing an ASCII source location', () => {
        const document = score([60]);
        document.moments[0].notes[0].source = null;
        const result = analyzeTabSelection(document, single, emptyContext);
        expect(result.notes[0].source).toBeNull();
        expect(result.moments[0].notes[0].source).toBeNull();
    });

    it('returns an empty diagnostic result for an unavailable selection', () => {
        const result = analyzeTabSelection(score([60]), { start: -1, end: 0 }, emptyContext);
        expect(result.notes).toEqual([]);
        expect(result.candidates).toEqual([]);
        expect(result.lowestNote).toBeNull();
        expect(result.diagnostics).toContain('Select an available note or passage.');
    });
});
