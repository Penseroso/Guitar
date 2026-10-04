import { describe, expect, it } from 'vitest';
import { analyzeTabSelection } from './analysis';
import { buildTabScoreAnnotations } from './annotations';
import { createEmptyTabDocument, setTabFret } from './editing';
import { parseNoteName } from '@/domain/shared/spelling';
import type { TabAnalysisContext, TabDocument } from './types';

const none: TabAnalysisContext = { frame: null, chord: null, scale: null };
function score(pitches: number[][], measures = pitches.map(() => 1)): TabDocument {
    return { format: 'authored', timing: 'order-only', source: '', capo: 0,
        tuningMidi: [64, 59, 55, 50, 45, 40], measureCount: Math.max(...measures),
        moments: pitches.map((notes, index) => ({ id: `m${index}`, index, measure: measures[index], column: index + 1,
            notes: notes.map((midi, string) => ({ id: `n${index}:${string}`, string, fret: 0,
                midi, pitchClass: midi % 12, source: null })) })) };
}
function analyze(document: TabDocument, context = none) {
    return analyzeTabSelection(document, { start: 0, end: document.moments.length - 1 }, context);
}
const majorCases = [
    { tonic: 'B', sequence: ['C♯m', 'F♯7', 'B'] },
    { tonic: 'F#', sequence: ['G♯m', 'C♯7', 'F♯'] },
    { tonic: 'Db', sequence: ['E♭m', 'A♭7', 'D♭'] },
    { tonic: 'Ab', sequence: ['B♭m', 'E♭7', 'A♭'] },
    { tonic: 'Eb', sequence: ['Fm', 'B♭7', 'E♭'] },
    { tonic: 'C', sequence: ['Dm', 'G7', 'C'] },
];

describe('one contextual chord spelling across TAB interpretations', () => {
    it.each(majorCases)('uses $tonic major roots in labels, Romans and progression evidence', ({ tonic, sequence }) => {
        const root = 60 + parseNoteName(tonic)!.pitchClass;
        const chords = [[2, 5, 9], [7, 11, 14, 17], [0, 4, 7]].map(chord => chord.map(interval => root + interval));
        const context: TabAnalysisContext = { ...none, frame: { tonic, mode: 'major', lens: 'jazz-pop' } };
        for (const broken of [false, true]) {
            const document = broken ? score(chords.flatMap(chord => chord.map(midi => [midi])), chords.flatMap((chord, i) => chord.map(() => i + 1))) : score(chords);
            const result = analyze(document, context), annotations = buildTabScoreAnnotations(result, context);
            expect(result.progressionReadings).toHaveLength(1);
            expect(result.progressionReadings[0].evidence).toContain(sequence.join(' → '));
            expect(result.progressionReadings[0].source).toBe(broken ? 'candidate' : 'observed');
            expect(annotations.filter(item => item.kind === 'roman').map(item => item.label)).toEqual(['ii', 'V7', 'I'].map(label => label + (broken ? '?' : '')));
            const labels = annotations.filter(item => item.kind === (broken ? 'arpeggio' : 'chord'));
            sequence.forEach((name, index) => expect(labels[index].label).toContain(name));
            expect(annotations.find(item => item.kind === 'progression')?.detail).toBe(result.progressionReadings[0].evidence);
            if (!broken) expect(result.chordSequence.map(item => item.candidates.find(candidate => candidate.match === 'exact')?.name)).toEqual(sequence);
        }
    });
    it.each([
        { tonic: 'C#', sequence: 'G♯7 → C♯m' },
        { tonic: 'G#', sequence: 'D♯7 → G♯m' },
        { tonic: 'A', sequence: 'E7 → Am' },
    ])('keeps $tonic minor V–i and major-reference Roman policy consistent', ({ tonic, sequence }) => {
        const root = 60 + parseNoteName(tonic)!.pitchClass;
        const document = score([[7, 11, 14, 17], [0, 3, 7]].map(chord => chord.map(interval => root + interval)));
        const context: TabAnalysisContext = { ...none, frame: { tonic, mode: 'minor', lens: 'jazz-pop' } };
        const result = analyze(document, context), annotations = buildTabScoreAnnotations(result, context);
        expect(result.progressionReadings[0].label).toBe('V–i motion');
        expect(result.progressionReadings[0].evidence).toContain(sequence);
        expect(annotations.filter(item => item.kind === 'chord').map(item => item.label).join(' → ')).toBe(sequence);
        expect(annotations.filter(item => item.kind === 'roman').map(item => item.label)).toEqual(['V7', 'i']);
    });
    it('spells ambiguous C#m7/E6 alternatives under B without forcing ii7–V–I', () => {
        const context: TabAnalysisContext = { ...none, frame: { tonic: 'B', mode: 'major', lens: 'jazz-pop' } };
        const result = analyze(score([[61, 64, 68, 71], [66, 70, 73, 76], [59, 63, 66]]), context);
        const annotations = buildTabScoreAnnotations(result, context);
        expect(annotations.find(item => item.kind === 'chord')?.label).toBe('C♯m7 · E6');
        expect(result.chordSequence[0].candidates.find(candidate => candidate.chord.chordId === 'minor-7')?.name).toBe('C♯m7');
        expect(result.progressionReadings.map(item => item.label)).toEqual(['V–I motion']);
        expect(annotations[0].detail).not.toContain('D♭');
    });
    it('preserves key-free observations, chord/arpeggio/span candidates and all alternatives', () => {
        const document = score([[61], [64], [68], [71], [66, 70, 73, 76], [59, 63, 66]], [1, 1, 1, 1, 2, 2]);
        const unframed = analyze(document), framed = analyze(document, { ...none, frame: { tonic: 'B', mode: 'major', lens: 'jazz-pop' } });
        expect(unframed.notes).toEqual(framed.notes);
        expect(unframed.moments).toEqual(framed.moments);
        expect(unframed.arpeggios).toEqual(framed.arpeggios);
        expect(unframed.harmonicSpans).toEqual(framed.harmonicSpans);
        expect(unframed.arpeggios[0].candidates.map(candidate => candidate.name)).toContain('D♭m7');
        expect(buildTabScoreAnnotations(unframed, none).find(item => item.kind === 'arpeggio')?.label).toContain('D♭m7');
        expect(buildTabScoreAnnotations(unframed, none).some(item => item.kind === 'roman' || item.kind === 'progression')).toBe(false);
    });
    it('keeps scaffold boundaries as candidate grouping, never measured harmonic facts', () => {
        let document = createEmptyTabDocument(16, 4);
        const frets = [10, 13, 17, 10, 15, 19, 22, 15, 8, 12, 15, 8]; // D F A D | G B D G | C E G C
        frets.forEach((fret, index) => { document = setTabFret(document, document.moments[index].id, 0, fret, `n${index}`); });
        const context: TabAnalysisContext = { ...none, frame: { tonic: 'C', mode: 'major', lens: 'jazz-pop' } };
        const scaffold = analyze(document, context);
        expect(scaffold.progressionReadings[0]).toMatchObject({ label: 'ii–V–I pattern?', source: 'candidate' });
        expect(scaffold.progressionReadings[0].evidence).toContain('grouping hypothesis');
        const oneBar = { ...document, measureCount: 1, moments: document.moments.map(moment => ({ ...moment, measure: 1 })) };
        expect(analyze(oneBar, context).harmonicSpans).toEqual([]);
    });
});
