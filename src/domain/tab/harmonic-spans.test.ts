import { describe, expect, it } from 'vitest';
import { parseAsciiTab } from './ascii';
import { analyzeTabSelection } from './analysis';
import { buildTabScoreAnnotations } from './annotations';
import { AUDIT_TABS } from './fixtures/audit-tabs';
import { createScaleRef } from '@/domain/scale/scale-ref';
import { getKeyName } from '@/domain/shared/keys';
import type { TabAnalysisContext, TabDocument } from './types';

const none: TabAnalysisContext = { frame: null, chord: null, scale: null };
const major: TabAnalysisContext = { ...none, frame: { tonic: 'C', mode: 'major', lens: 'jazz-pop' } };
const minor: TabAnalysisContext = { ...none, frame: { tonic: 'A', mode: 'minor', lens: 'jazz-pop' } };
function parsed(source: string) {
    const result = parseAsciiTab(source);
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
    return result.document;
}
function read(document: TabDocument, context = major, start = 0, end = document.moments.length - 1) {
    return analyzeTabSelection(document, { start, end }, context);
}
function score(bars: number[][][]): TabDocument {
    const document: TabDocument = { format: 'authored', timing: 'order-only', source: '',
        tuningMidi: [64, 59, 55, 50, 45, 40], capo: 0, measureCount: bars.length, moments: [] };
    bars.forEach((bar, measure) => bar.forEach((pitches, column) => {
        const index = document.moments.length;
        document.moments.push({ id: `m${index}`, index, measure: measure + 1, column,
            notes: pitches.map((midi, string) => ({ id: `n${index}:${string}`, string, fret: 0, midi, pitchClass: midi % 12, source: null })) });
    }));
    return document;
}

describe('realistic TAB evidence pipeline', () => {
    it.each(Object.entries(AUDIT_TABS))('imports %s as order-only with bounded note positions', (_, source) => {
        const document = parsed(source);
        expect(document.timing).toBe('order-only');
        expect(document.moments.length).toBeGreaterThan(0);
        expect(document.moments.every(moment => moment.notes.every(note => note.source !== null))).toBe(true);
    });
    it('does not turn a scalar melody into a harmonic sequence', () => {
        const result = read(parsed(AUDIT_TABS.melody));
        expect(result.harmonicSpans).toEqual([]);
        expect(result.progressionReadings).toEqual([]);
        expect(result.melodicRuns[0].contour).toBe('ascending');
    });
    it('connects complete broken chords only through a candidate grouping', () => {
        const result = read(parsed(AUDIT_TABS.brokenChords));
        expect(result.harmonicSpans.map(span => span.basis)).toEqual(Array(3).fill('whole-bar-collection'));
        expect(result.chordSequence).toEqual([]);
        expect(result.progressionReadings).toEqual([expect.objectContaining({ start: 0, end: 8, label: 'ii–V–I pattern?', source: 'candidate' })]);
        const annotations = buildTabScoreAnnotations(result, major);
        expect(annotations.filter(item => item.kind === 'roman').map(item => item.label)).toEqual(['ii?', 'V?', 'I?']);
        expect(annotations.find(item => item.kind === 'progression')).toMatchObject({ source: 'candidate' });
        expect(result.progressionReadings[0].evidence).toContain('not harmonic duration');
    });
    it('keeps simultaneous chord observations distinct from broken-chord candidates', () => {
        const result = read(parsed(AUDIT_TABS.chords));
        expect(result.progressionReadings[0]).toMatchObject({ label: 'ii–V–I pattern', source: 'observed' });
        expect(result.harmonicSpans.every(span => span.basis === 'simultaneous')).toBe(true);
    });
    it('retains Am7/C6 alternatives without forcing a progression', () => {
        const result = read(parsed(AUDIT_TABS.ambiguous));
        expect(result.harmonicSpans[0].candidates.map(candidate => candidate.name)).toEqual(expect.arrayContaining(['Am7', 'C6']));
        expect(result.progressionReadings).toEqual([]);
        const roman = buildTabScoreAnnotations(result, major).find(item => item.kind === 'roman');
        expect(roman?.label).toContain('vi7'); expect(roman?.label).toContain('I6');
        expect(roman?.source).toBe('candidate');
    });
    it('exposes an omitted-fifth shell without inventing the missing pitch or a progression', () => {
        const result = read(parsed(AUDIT_TABS.omittedFifth));
        expect(result.harmonicSpans[0].candidates).toContainEqual(expect.objectContaining({ name: 'G7', omitted: ['5'], match: 'incomplete' }));
        expect(result.progressionReadings).toEqual([]);
        expect(result.notes).toHaveLength(6);
        expect(buildTabScoreAnnotations(result, major)).toContainEqual(expect.objectContaining({ kind: 'arpeggio', label: 'G7 (no 5)?', source: 'candidate' }));
    });
    it('observes minor V–i under the supplied key; reference scale alone does not supply a key', () => {
        const document = parsed(AUDIT_TABS.minor);
        expect(read(document, minor).progressionReadings[0]).toMatchObject({ label: 'V–i motion', source: 'observed' });
        expect(read(document, { ...none, scale: createScaleRef('Diatonic Modes', 'Aeolian', 9) }).progressionReadings).toEqual([]);
        expect(read(document, major).progressionReadings).toEqual([]);
    });
    it('retains technique endpoints without generating extra pitches', () => {
        const document = parsed(AUDIT_TABS.techniques);
        expect(document.moments.flatMap(moment => moment.notes.map(note => note.fret))).toEqual([5, 7, 5, 7, 9, 7, 10]);
        expect(read(document).progressionReadings).toEqual([]);
    });
    it('treats a supplied key as a reference without changing observed notes or span candidates', () => {
        const document = parsed(AUDIT_TABS.brokenChords);
        const unframed = read(document, none), framed = read(document, major);
        expect(unframed.notes).toEqual(framed.notes);
        expect(unframed.harmonicSpans).toEqual(framed.harmonicSpans);
        expect(unframed.harmonicSpans).toHaveLength(3);
        expect(unframed.progressionReadings).toEqual([]);
    });
    it('does not promote modal scale membership to a tonal center or authentic cadence', () => {
        const context = { ...none, scale: createScaleRef('Diatonic Modes', 'Dorian', 2) };
        const result = read(score([[[60, 64, 67], [62, 65, 69]]]), context);
        expect(result.harmonicSpans).toHaveLength(2);
        expect(result.progressionReadings).toEqual([]);
        expect(buildTabScoreAnnotations(result, context).some(item => item.kind === 'roman')).toBe(false);
    });
    it('does not turn chromatic chords into applied dominants or a local key change', () => {
        const document = score([[[57, 61, 64, 67], [62, 65, 69]]]); // A7 → Dm, under C
        const result = read(document);
        expect(result.progressionReadings).toEqual([]);
        expect(buildTabScoreAnnotations(result, major).filter(item => item.kind === 'roman').map(item => item.label)).toEqual(['VI7', 'ii']);
        expect(read(document, { ...none, frame: { tonic: 'D', mode: 'minor', lens: 'jazz-pop' } }).progressionReadings[0]?.label).toBe('V–i motion');
        expect(result).not.toHaveProperty('localKey');
        expect(result).not.toHaveProperty('modulation');
    });
    it('does not reinterpret D7 → G as a local V–I under C, even before G → C', () => {
        const result = read(score([[[62, 66, 69, 72], [67, 71, 74], [60, 64, 67]]]));
        expect(result.progressionReadings).toEqual([expect.objectContaining({ start: 1, end: 2, label: 'V–I motion' })]);
    });
});

describe('harmonic-span false-positive boundaries', () => {
    it('does not treat a partial selection as a whole measure', () => {
        const document = parsed(AUDIT_TABS.brokenChords);
        expect(read(document, major, 1).harmonicSpans.map(span => span.start)).toEqual([3, 6]);
        expect(read(document, major, 0, 7).harmonicSpans.map(span => span.start)).toEqual([0, 3]);
    });
    it.each([
        [[67], [71], [], [74]], // empty position
        [[67], [71, 74], [74]], // dyad interrupts
        [[67], [71], [74], [75], [76]], // fifth distinct pitch
        [[67], [71]], // root/third alone
        Array.from({ length: 17 }, (_, i) => [[67], [71], [74]][i % 3]), // bounded cost
    ].map(bar => ({ bar })))('does not promote unsupported whole-bar grouping %#', ({ bar }) => {
        const result = read(score([bar, [[60], [64], [67]]]));
        expect(result.harmonicSpans.some(span => span.start === 0)).toBe(false);
        expect(result.progressionReadings).toEqual([]);
    });
    it('does not use overlapping local windows as harmonic segmentation', () => {
        const result = read(score([[[62], [65], [69], [67], [71], [74], [60], [64], [67]]]));
        expect(result.arpeggios.length).toBeGreaterThan(0);
        expect(result.harmonicSpans).toEqual([]);
        expect(result.progressionReadings).toEqual([]);
    });
    it('does not bridge an uninterpreted bar or empty position', () => {
        for (const gap of [[[61]], [[]]]) {
            expect(read(score([[[67], [71], [74]], gap, [[60], [64], [67]]])).progressionReadings).toEqual([]);
        }
        const source = AUDIT_TABS.brokenChords.split('\n').map(line => line.split('|').toSpliced(3, 0, '---------').join('|')).join('\n');
        expect(read(parsed(source)).progressionReadings).toEqual([]);
    });
    it('marks mixed simultaneous/sequential motion as candidate', () => {
        expect(read(score([[[67, 71, 74]], [[60], [64], [67]]])).progressionReadings[0]).toMatchObject({ source: 'candidate', label: 'V–I motion?' });
    });
    it('does not convert natural-minor v into V or major IV into iv', () => {
        expect(read(score([[[64, 67, 71], [57, 60, 64]]]), minor).progressionReadings).toEqual([]);
        expect(read(score([[[62, 66, 69], [57, 60, 64]]]), minor).progressionReadings).toEqual([]);
        expect(read(score([[[62, 65, 69], [57, 60, 64]]]), minor).progressionReadings[0]?.label).toBe('iv–i motion');
    });
    it.each(Array.from({ length: 12 }, (_, i) => i))('preserves candidate status under transposition %i', transpose => {
        const bars = [[[62], [65], [69]], [[67], [71], [74]], [[60], [64], [67]]];
        const document = score(bars.map(bar => bar.map(notes => notes.map(midi => midi + transpose))));
        const context: TabAnalysisContext = { ...none, frame: { tonic: getKeyName(transpose), mode: 'major', lens: 'jazz-pop' } };
        expect(read(document, context).progressionReadings[0]).toMatchObject({ label: 'ii–V–I pattern?', source: 'candidate' });
    });
});
