import { describe, expect, it } from 'vitest';
import {
    describeSuppliedChord, parseChordBoundary, resolveSuppliedHarmony, selectedChordPositions,
    type SuppliedChordBinding,
} from '@/domain/tab/supplied-harmony';
import { observeTabAcrossBarsWrittenTime } from '@/domain/tab/written-time-across-bars';
import { parseAsciiTab } from '@/domain/tab/ascii';
import { createTabAnalysisState, reduceTabAnalysis, type TabAnalysisState } from './state';

const ascii = ['e|-0-0-0|', 'B|------|', 'G|------|', 'D|------|', 'A|------|', 'E|------|'].join('\n');
const initial = () => {
    const state = reduceTabAnalysis(createTabAnalysisState(), { type: 'set-source', source: ascii, name: 'Test' });
    return reduceTabAnalysis(state, { type: 'parsed', result: parseAsciiTab(ascii) });
};
const save = (state: TabAnalysisState, binding: SuppliedChordBinding, root = 'C', id = '') =>
    reduceTabAnalysis(state, { type: 'save-supplied-chord', document: state.document!,
        entry: { id, scoreId: state.scoreId, chord: { root, chordId: root === 'A' ? 'minor' : 'major' }, binding } });
const rows = (state: TabAnalysisState) => resolveSuppliedHarmony(state.document!, state.scoreId, state.originsRevision, state.suppliedHarmony);
const noReferences = { scale: null, frame: null };

describe('supplied TAB harmony', () => {
    it('uses explicit positions, rejects a shared inclusive endpoint and does not fill a gap', () => {
        const base = initial(), doc = base.document!;
        const left = save(base, selectedChordPositions(doc, { start: 0, end: 0 })!);
        const result = save(left, selectedChordPositions(doc, { start: 2, end: 2 })!, 'A');
        expect(rows(result).map(row => row.placement)).toEqual([
            { kind: 'positions', first: 0, last: 0 }, { kind: 'positions', first: 2, last: 2 },
        ]);
        expect(save(result, selectedChordPositions(doc, { start: 1, end: 2 })!)).toBe(result);
        expect(describeSuppliedChord(doc, rows(result)[0], noReferences)?.notes).toMatchObject([{ midi: 64, chordDegree: '3', position: 1 }]);
        expect(describeSuppliedChord(doc, rows(result)[1], noReferences)?.notes).toMatchObject([{ midi: 64, chordDegree: '5', position: 3 }]);
        const withCapo = reduceTabAnalysis(result, { type: 'set-capo', capo: 2 });
        expect(withCapo.suppliedHarmony).toBe(result.suppliedHarmony);
        expect(describeSuppliedChord(withCapo.document!, rows(withCapo)[0], noReferences)?.notes)
            .toMatchObject([{ midi: 66, chordMember: false, chordDegree: null }]);
    });

    it('restores exact source bindings through history and never attaches them to a replacement import', () => {
        const base = initial(), document = base.document!;
        const saved = save(base, selectedChordPositions(document, { start: 0, end: 2 })!);
        const inserted = reduceTabAnalysis(saved, { type: 'insert-moment', afterId: document.moments[0].id });
        expect(rows(inserted)[0].placement).toEqual({ kind: 'positions', first: 0, last: 3 });
        const removed = reduceTabAnalysis(inserted, { type: 'delete-moment', momentId: document.moments[0].id });
        expect(removed.suppliedHarmony).toEqual(saved.suppliedHarmony);
        expect(rows(removed)[0].placement).toBeNull();
        const replacement = reduceTabAnalysis(removed, { type: 'parsed', result: parseAsciiTab(ascii) });
        expect(replacement.scoreId).not.toBe(removed.scoreId);
        expect(replacement.suppliedHarmony).toEqual([]);
        const undoImport = reduceTabAnalysis(replacement, { type: 'undo' });
        expect(undoImport.scoreId).toBe(removed.scoreId);
        expect(undoImport.suppliedHarmony).toBe(removed.suppliedHarmony);
        expect(rows(reduceTabAnalysis(undoImport, { type: 'undo' }))[0].placement).toEqual({ kind: 'positions', first: 0, last: 3 });
        expect(reduceTabAnalysis(undoImport, { type: 'reset' })).toMatchObject({ suppliedHarmony: [], past: [], future: [] });
    });

    it('joins one partially timed occurrence to adjacent time chords with exact overlap and source identity', () => {
        const initialState = initial();
        const document = initialState.document!;
        const note = document.moments[0].notes[0];
        let state: TabAnalysisState = { ...initialState, document: {
            ...document,
            meter: { numerator: 4, denominator: 4 },
            moments: document.moments.map((moment, i) => i === 0 ? {
                ...moment, beatOffset: { numerator: 1, denominator: 3 },
                notes: [{ ...note, pitchClass: 1, duration: { numerator: 4, denominator: 3 } }],
            } : moment),
        } };
        const time = (start: string, end: string) => ({
            kind: 'written-time' as const, originsRevision: state.originsRevision,
            start: parseChordBoundary(start)!, end: parseChordBoundary(end)!,
        });
        state = save(state, time('0', '2/3'));
        state = save(state, time('2/3', '5/3'), 'A');
        expect(save(state, time('1/3', '1'))).toBe(state);
        const current = state.document!;
        const written = observeTabAcrossBarsWrittenTime(current, 1, { model: 'regular-bar-origins' });
        const [left, right] = rows(state).map(row => describeSuppliedChord(current, row, noReferences, written)!);
        expect(left.timing).toBe('partial');
        expect(left.notes).toMatchObject([{ noteId: note.id, chordDegree: '3', written: { overlap: { start: parseChordBoundary('1/3'), end: parseChordBoundary('2/3') } } }]);
        expect(right.notes).toMatchObject([{ noteId: note.id, chordDegree: '5', written: { overlap: { start: parseChordBoundary('2/3'), end: parseChordBoundary('5/3') } } }]);
        expect(left.notes[0].written?.interval).toBe(right.notes[0].written?.interval);
        const meter = reduceTabAnalysis(state, { type: 'set-meter', meter: { numerator: 3, denominator: 4 } });
        expect(rows(meter).every(row => !row.placement)).toBe(true);
        expect(rows(reduceTabAnalysis(meter, { type: 'undo' })).every(row => row.placement)).toBe(true);
    });

    it('keeps chord and key reference independent and excludes notes exactly outside a time region', () => {
        const base = initial();
        const document = base.document!;
        const chorded = save(base, selectedChordPositions(document, { start: 0, end: 0 })!, 'A');
        const framed = reduceTabAnalysis(chorded, { type: 'set-frame', frame: { tonic: 'C', mode: 'major', lens: 'jazz-pop' } });
        expect(framed.suppliedHarmony).toBe(chorded.suppliedHarmony);
        expect(describeSuppliedChord(document, rows(framed)[0], framed.context)?.roman).toBe('vi');

        const timed = { ...base, document: {
            ...document, meter: { numerator: 4, denominator: 4 },
            moments: document.moments.map((moment, index) => ({
                ...moment, beatOffset: { numerator: index, denominator: 1 },
                notes: moment.notes.map(note => ({ ...note, duration: { numerator: 1, denominator: 1 } })),
            })),
        } };
        const timedChord = save(timed, {
            kind: 'written-time', originsRevision: timed.originsRevision,
            start: parseChordBoundary('1')!, end: parseChordBoundary('2')!,
        });
        const written = observeTabAcrossBarsWrittenTime(timed.document, 1, { model: 'regular-bar-origins' });
        expect(describeSuppliedChord(timed.document, rows(timedChord)[0], noReferences, written)?.notes)
            .toMatchObject([{ position: 2 }]);
    });
});
