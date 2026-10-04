import { describe, expect, it } from 'vitest';
import { analyzeTabSelection } from './analysis';
import { buildTabScoreAnnotations } from './annotations';
import { parseAsciiTab } from './ascii';
import { AUDIT_TABS } from './fixtures/audit-tabs';
import { setTabBeatOffset, setTabDuration, setTabMeter } from './input-capabilities';
import type { TabAnalysisContext, TabDocument } from './types';

// Original six-string examples. Dashes and barlines supply order and grouping only.
const FIXTURES = [
    { name: 'pure melody', tab: AUDIT_TABS.melody },
    { name: 'broken C major triad', tab: `e|---0-----|
B|1--------|
G|------0--|
D|---------|
A|---------|
E|---------|` },
    { name: 'simultaneous Dm G7 C progression', tab: AUDIT_TABS.chords },
    { name: 'ambiguous C E G A collection', tab: `e|---0--------|
B|1-----------|
G|------0--2--|
D|------------|
A|------------|
E|------------|` },
    { name: 'omitted-fifth G7 shell', tab: `e|------1--|
B|---0-----|
G|0--------|
D|---------|
A|---------|
E|---------|` },
    { name: 'broken E major to A minor', tab: `e|0--------|------0--|
B|------0--|---1-----|
G|---1-----|2--------|
D|---------|---------|
A|---------|---------|
E|---------|---------|` },
    { name: 'h p slide vibrato and bend/release', tab: String.raw`e|5h7p5--7/9\7--10~~--5b7r5--7--|
B|------------------------------|
G|------------------------------|
D|------------------------------|
A|------------------------------|
E|------------------------------|` },
] as const;

const CONTEXTS: { name: string; context: TabAnalysisContext }[] = [
    { name: 'no key', context: { scale: null, chord: null, frame: null } },
    { name: 'C major', context: { scale: null, chord: null, frame: { tonic: 'C', mode: 'major', lens: 'jazz-pop' } } },
    { name: 'A minor', context: { scale: null, chord: null, frame: { tonic: 'A', mode: 'minor', lens: 'jazz-pop' } } },
];

function addTiming(document: TabDocument): TabDocument {
    let changed = setTabMeter(document, { numerator: 7, denominator: 8 });
    for (const moment of document.moments) {
        // Irregular optional bar-relative offsets are input, not automatically assigned beats.
        changed = setTabBeatOffset(changed, moment.id, { numerator: moment.index * 3, denominator: 7 });
        for (const note of moment.notes) {
            // Independent chord-string durations deliberately imply potential overlap.
            changed = setTabDuration(changed, moment.id, note.string, { numerator: 1 + note.string + moment.index % 3, denominator: 4 });
        }
    }
    return changed;
}

describe('input metadata remains outside order-only inference', () => {
    it('covers melody, ambiguous and omitted-tone spans, and major/minor progression branches', () => {
        const analyze = (index: number, context: TabAnalysisContext) => {
            const parsed = parseAsciiTab(FIXTURES[index].tab);
            if (!parsed.ok) throw new Error(JSON.stringify(parsed.diagnostics));
            return analyzeTabSelection(parsed.document, { start: 0, end: parsed.document.moments.length - 1 }, context);
        };
        expect(analyze(0, CONTEXTS[0].context).melodicRuns.length).toBeGreaterThan(0);
        expect(analyze(1, CONTEXTS[0].context).arpeggios.length).toBeGreaterThan(0);
        expect(analyze(2, CONTEXTS[1].context).progressionReadings.map(reading => reading.label)).toContain('ii–V–I pattern');
        expect(analyze(3, CONTEXTS[0].context).harmonicSpans[0].candidates.length).toBeGreaterThan(1);
        expect(analyze(4, CONTEXTS[0].context).harmonicSpans[0].candidates.some(candidate => candidate.match === 'incomplete' && candidate.omitted.includes('5'))).toBe(true);
        expect(analyze(5, CONTEXTS[2].context).progressionReadings.map(reading => reading.label)).toContain('V–i motion?');
    });

    it.each(FIXTURES)('$name preserves pitch and harmonic evidence under all supplied contexts', ({ tab }) => {
        const parsed = parseAsciiTab(tab);
        expect(parsed.ok, JSON.stringify(parsed.diagnostics)).toBe(true);
        if (!parsed.ok) throw new Error('Regression fixture must parse');
        const document = parsed.document;
        const timed = addTiming(document);
        expect(timed.timing).toBe('order-only');
        expect(timed.meter).toEqual({ numerator: 7, denominator: 8 });
        expect(timed.moments.every(moment => Boolean(moment.beatOffset))).toBe(true);
        expect(timed.moments.flatMap(moment => moment.notes).every(note => Boolean(note.duration))).toBe(true);
        expect(document).not.toHaveProperty('meter');
        expect(document.moments.every(moment => !moment.beatOffset && moment.notes.every(note => !note.duration))).toBe(true);
        expect(timed.moments.flatMap(moment => moment.notes).map(note => note.techniques)).toEqual(document.moments.flatMap(moment => moment.notes).map(note => note.techniques));
        const selection = { start: 0, end: document.moments.length - 1 };
        for (const { name, context } of CONTEXTS) {
            const before = analyzeTabSelection(document, selection, context);
            const after = analyzeTabSelection(timed, selection, context);
            for (const field of ['selectionKind', 'texture', 'candidates', 'pitchClasses', 'roman', 'diagnostics', 'melodicRuns', 'repeatedPatterns', 'dyadMotions', 'arpeggios', 'harmonicSpans', 'chordSequence', 'progressionReadings'] as const) {
                expect(after[field], `${name}: ${field}`).toEqual(before[field]);
            }
            expect(after.notes.map(note => ({ id: note.id, midi: note.midi, pitchClass: note.pitchClass, name: note.name, scaleDegree: note.scaleDegree, chordDegree: note.chordDegree }))).toEqual(before.notes.map(note => ({ id: note.id, midi: note.midi, pitchClass: note.pitchClass, name: note.name, scaleDegree: note.scaleDegree, chordDegree: note.chordDegree })));
            expect(buildTabScoreAnnotations(after, context), `${name}: annotations including labels and evidence`).toEqual(buildTabScoreAnnotations(before, context));
        }
    });

    it('bend target numbers never enter the observation set or become harmonic events', () => {
        const parsed = parseAsciiTab(FIXTURES[6].tab);
        if (!parsed.ok) throw new Error(JSON.stringify(parsed.diagnostics));
        const notes = parsed.document.moments.flatMap(moment => moment.notes);
        expect(notes.map(note => note.fret)).toEqual([5, 7, 5, 7, 9, 7, 10, 5, 7]);
        const base = notes.find(note => note.techniques?.some(technique => technique.kind === 'bend'))!;
        expect(base.fret).toBe(5);
        expect(base.techniques).toEqual([
            expect.objectContaining({ kind: 'bend', targetFret: 7, notation: 'b7' }),
            expect.objectContaining({ kind: 'release', targetFret: 5, notation: 'r5' }),
        ]);
        const context = CONTEXTS[0].context;
        const result = analyzeTabSelection(addTiming(parsed.document), { start: 0, end: parsed.document.moments.length - 1 }, context);
        expect(result.notes.map(note => note.fret)).toEqual(notes.map(note => note.fret));
        expect(result.harmonicSpans).toEqual([]);
        expect(result.progressionReadings).toEqual([]);
    });
});
