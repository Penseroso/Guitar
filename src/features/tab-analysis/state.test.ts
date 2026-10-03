import { describe, expect, it } from 'vitest';
import { createScaleRef } from '@/domain/scale/scale-ref';
import { createEmptyTabDocument } from '@/domain/tab/editing';
import { parseAsciiTab } from '@/domain/tab/ascii';
import { TAB_MIXED_EXAMPLE, TAB_TUNINGS, type TabDocument, type TabParseResult } from '@/domain/tab/types';
import { createTabAnalysisState, reduceTabAnalysis, type TabAnalysisState } from './state';

const source = 'original tab';
const document: TabDocument = {
    format: 'ascii', timing: 'order-only', source, tuningMidi: [...TAB_TUNINGS[0].midi], capo: 0,
    moments: [0, 1, 2].map(index => ({ id: `moment-${index}`, index, measure: 1, column: index, notes: [] })),
    measureCount: 1,
};
const parsed: TabParseResult = { ok: true, document, diagnostics: [] };
const scale = createScaleRef('Diatonic Modes', 'Ionian', 0);
const frame = { tonic: 'C', mode: 'major' as const, lens: 'jazz-pop' as const };
const chord = { root: 'C', chordId: 'major' };
function analyzed(): TabAnalysisState {
    let state = reduceTabAnalysis(createTabAnalysisState(), { type: 'set-source', source, name: 'example.txt' });
    state = reduceTabAnalysis(state, { type: 'set-scale', scale });
    state = reduceTabAnalysis(state, { type: 'set-frame', frame });
    state = reduceTabAnalysis(state, { type: 'parsed', result: parsed });
    return reduceTabAnalysis(state, { type: 'set-chord', chord });
}
function put(state: TabAnalysisState, fret: number | null, string = 0, index = 0) {
    return reduceTabAnalysis(state, { type: 'set-fret', momentId: state.document!.moments[index].id, string, fret });
}

describe('editable tab session', () => {
    it('starts with four editable measures and no musical context or analysis', () => {
        const state = createTabAnalysisState();
        expect(state.context).toEqual({ scale: null, chord: null, frame: null });
        expect(state.document?.moments).toHaveLength(16);
        expect(state.document?.measureCount).toBe(4);
        expect(state.analysisStatus).toBe('idle');
        expect(state.analysis).toBeNull();
        expect(state.selection).toEqual({ start: 0, end: 0 });
        expect(state.activeCell).toEqual({ momentId: state.document!.moments[0].id, string: 0 });
        expect(state.editorOpen).toBe(false);
        expect(state.past).toEqual([]);
    });

    it('commits a parsed source and records an undoable document replacement', () => {
        const input = reduceTabAnalysis(createTabAnalysisState(), { type: 'set-source', source, name: 'test.txt' });
        const state = reduceTabAnalysis(input, { type: 'parsed', result: parsed });
        expect(state.document).toBe(document);
        expect(state.documentName).toBe('test.txt');
        expect(state.selection).toEqual({ start: 0, end: 0 });
        expect(state.activeCell).toEqual({ momentId: 'moment-0', string: 0 });
        expect(state.analyzedSource).toBe(source);
        expect(state.editorOpen).toBe(false);
        expect(state.context).toEqual({ scale: null, chord: null, frame: null });
        expect(reduceTabAnalysis(state, { type: 'undo' }).document).toBe(input.document);
    });

    it.each([
        { type: 'edit-source' as const, source: 'changed tab' },
        { type: 'set-source' as const, source: 'replacement tab', name: 'replacement.txt' },
    ])('keeps the canonical score and its title while editing an import draft: $type', action => {
        const original = analyzed();
        const state = reduceTabAnalysis(original, action);
        expect(state.document).toBe(original.document);
        expect(state.documentName).toBe('example.txt');
        expect(state.selection).toEqual(original.selection);
        expect(state.context).toEqual(original.context);
        expect(state.editorOpen).toBe(true);
        expect(state.past).toEqual(original.past);
    });

    it('changes tuning and capo without losing frets and undoes each instrument change', () => {
        const original = put(createTabAnalysisState(), 3, 5);
        const tuned = reduceTabAnalysis(original, { type: 'set-tuning', id: 'drop-d' });
        expect(tuned.document!.moments[0].notes[0].midi).toBe(41);
        expect(tuned.document!.moments[0].notes[0].fret).toBe(3);
        const capo = reduceTabAnalysis(tuned, { type: 'set-capo', capo: 2 });
        expect(capo.document!.moments[0].notes[0].midi).toBe(43);
        const undone = reduceTabAnalysis(capo, { type: 'undo' });
        expect(undone.capo).toBe(0);
        expect(undone.document).toBe(tuned.document);
        const restored = reduceTabAnalysis(undone, { type: 'undo' });
        expect(restored.tuningId).toBe('standard');
        expect(restored.document).toBe(original.document);
    });

    it('keeps context for focus moves but clears the chord for different ranges or edits', () => {
        const original = analyzed();
        const focused = reduceTabAnalysis(original, { type: 'set-active-cell', cell: { momentId: 'moment-1', string: 4 } });
        expect(focused.context.chord).toEqual(chord);
        expect(focused.past).toEqual(original.past);
        const selected = reduceTabAnalysis(focused, { type: 'select', selection: { start: 2, end: 1 } });
        expect(selected.selection).toEqual({ start: 1, end: 2 });
        expect(selected.context).toEqual({ scale, frame, chord: null });
        expect(put(original, 12).context).toEqual({ scale, frame, chord: null });
        expect(reduceTabAnalysis(original, { type: 'select', selection: { start: 0, end: 0 } })).toBe(original);
        expect(reduceTabAnalysis(original, { type: 'select', selection: { start: 0, end: 4 } })).toBe(original);
    });

    it('refuses successful parse results from another source, tuning, or capo snapshot', () => {
        const state = analyzed();
        for (const changed of [{ source: 'old source' }, { capo: 3 }, { tuningMidi: [...TAB_TUNINGS[1].midi] }]) {
            expect(reduceTabAnalysis(state, { type: 'parsed', result: { ...parsed, document: { ...document, ...changed } } })).toBe(state);
        }
    });

    it('shows import failure while retaining edited score, selection and context', () => {
        const original = put(analyzed(), 12);
        const diagnostics = [{ severity: 'error' as const, message: 'Incomplete block', line: 2 }];
        const state = reduceTabAnalysis(original, { type: 'parsed', result: { ok: false, diagnostics } });
        expect(state.document).toBe(original.document);
        expect(state.context).toEqual(original.context);
        expect(state.selection).toEqual(original.selection);
        expect(state.diagnostics).toEqual(diagnostics);
        expect(state.editorOpen).toBe(true);
    });

    it('undoes and redoes complete fret values, and a new edit removes the redo branch', () => {
        const initial = createTabAnalysisState();
        const first = put(initial, 10);
        const second = put(first, 24);
        expect(first.past).toHaveLength(1);
        const undo = reduceTabAnalysis(second, { type: 'undo' });
        expect(undo.document!.moments[0].notes[0].fret).toBe(10);
        const redo = reduceTabAnalysis(undo, { type: 'redo' });
        expect(redo.document!.moments[0].notes[0].fret).toBe(24);
        const branched = put(undo, 12);
        expect(branched.future).toEqual([]);
        expect(reduceTabAnalysis(branched, { type: 'redo' })).toBe(branched);
        expect(put(branched, 12)).toBe(branched);
        expect(put(branched, 37)).toBe(branched);
    });

    it('preserves selected and active IDs across insertion/deletion before them', () => {
        let state = createTabAnalysisState();
        const selectedId = state.document!.moments[3].id;
        const firstId = state.document!.moments[0].id;
        state = reduceTabAnalysis(state, { type: 'select', selection: { start: 3, end: 4 } });
        state = reduceTabAnalysis(state, { type: 'set-active-cell', cell: { momentId: selectedId, string: 2 } });
        state = reduceTabAnalysis(state, { type: 'insert-moment', afterId: firstId });
        expect(state.selection).toEqual({ start: 4, end: 5 });
        expect(state.activeCell).toEqual({ momentId: selectedId, string: 2 });
        const insertedId = state.document!.moments[1].id;
        state = reduceTabAnalysis(state, { type: 'delete-moment', momentId: insertedId });
        expect(state.selection).toEqual({ start: 3, end: 4 });
        expect(state.activeCell?.momentId).toBe(selectedId);
        state = reduceTabAnalysis(state, { type: 'delete-moment', momentId: selectedId });
        expect(state.selection).toEqual({ start: 3, end: 3 });
        expect(state.activeCell?.momentId).toBe(state.document!.moments[3].id);
    });

    it('retains the last empty column, and undo restores deleted notes', () => {
        const initial = createTabAnalysisState();
        const document = createEmptyTabDocument(1);
        let state: TabAnalysisState = { ...initial, document, activeCell: { momentId: document.moments[0].id, string: 0 } };
        state = put(state, 3);
        const withNote = state;
        state = reduceTabAnalysis(state, { type: 'delete-moment', momentId: document.moments[0].id });
        expect(state.document!.moments).toHaveLength(1);
        expect(state.document!.moments[0].notes).toHaveLength(0);
        expect(reduceTabAnalysis(state, { type: 'undo' }).document).toBe(withNote.document);
    });

    it('deletes a selected batch in one history step and restores the score, cursor and selection with undo', () => {
        let state = put(createTabAnalysisState(), 12, 0, 4);
        state = reduceTabAnalysis(state, { type: 'select', selection: { start: 2, end: 7 } });
        state = reduceTabAnalysis(state, { type: 'set-active-cell', cell: { momentId: state.document!.moments[3].id, string: 2 } });
        state = reduceTabAnalysis(state, { type: 'analyze' });
        const original = state;
        const ids = state.document!.moments.slice(2, 8).map(moment => moment.id);
        const changed = reduceTabAnalysis(state, { type: 'delete-moments', momentIds: ids });
        expect(changed.document!.moments).toHaveLength(11);
        expect(changed.document!.measureCount).toBe(4);
        expect(changed.document!.moments[2]).toMatchObject({ id: original.document!.moments[4].id, measure: 2, notes: [] });
        expect(changed.selection).toEqual({ start: 2, end: 2 });
        expect(changed.activeCell).toEqual({ momentId: original.document!.moments[4].id, string: 2 });
        expect(changed.past).toHaveLength(original.past.length + 1);
        expect(changed.analysisStatus).toBe('stale');
        expect(changed.analysis).toBe(original.analysis);
        expect(changed.nextId).toBe(original.nextId);
        const undone = reduceTabAnalysis(changed, { type: 'undo' });
        expect(undone.document).toBe(original.document);
        expect(undone.selection).toEqual(original.selection);
        expect(undone.activeCell).toEqual(original.activeCell);
        const redone = reduceTabAnalysis(undone, { type: 'redo' });
        expect(redone.document).toBe(changed.document);
        expect(redone.selection).toEqual(changed.selection);
        expect(redone.activeCell).toEqual(changed.activeCell);
    });

    it('maps surviving selections through a batch and ignores deletions that cannot change the score', () => {
        let state = createTabAnalysisState();
        state = reduceTabAnalysis(state, { type: 'select', selection: { start: 2, end: 6 } });
        const activeId = state.document!.moments[4].id;
        state = reduceTabAnalysis(state, { type: 'set-active-cell', cell: { momentId: activeId, string: 5 } });
        const changed = reduceTabAnalysis(state, { type: 'delete-moments', momentIds: [0, 2, 6].map(index => state.document!.moments[index].id) });
        expect(changed.selection).toEqual({ start: 1, end: 3 });
        expect(changed.activeCell).toEqual({ momentId: activeId, string: 5 });
        expect(reduceTabAnalysis(changed, { type: 'delete-moments', momentIds: ['unknown'] })).toBe(changed);
        const cleared = reduceTabAnalysis(state, { type: 'delete-moments', momentIds: state.document!.moments.map(moment => moment.id) });
        expect(cleared.document!.moments).toHaveLength(4);
        expect(cleared.selection).toEqual({ start: 1, end: 1 });
        expect(cleared.activeCell).toEqual({ momentId: activeId, string: 5 });
        expect(reduceTabAnalysis(cleared, { type: 'delete-moments', momentIds: cleared.document!.moments.map(moment => moment.id) })).toBe(cleared);
    });

    it('keeps the cursor on the selected empty position after deleting a whole measure and repeating Delete', () => {
        let state = put(createTabAnalysisState(), 9, 0, 0);
        state = reduceTabAnalysis(state, { type: 'select', selection: { start: 0, end: 3 } });
        state = reduceTabAnalysis(state, { type: 'set-active-cell', cell: { momentId: state.document!.moments[3].id, string: 4 } });
        const retainedId = state.document!.moments[0].id;
        const changed = reduceTabAnalysis(state, { type: 'delete-moments', momentIds: state.document!.moments.slice(0, 4).map(moment => moment.id) });
        expect(changed.selection).toEqual({ start: 0, end: 0 });
        expect(changed.activeCell).toEqual({ momentId: retainedId, string: 4 });
        expect(changed.document!.moments[0]).toMatchObject({ id: retainedId, measure: 1, notes: [] });
        const selectedIds = changed.document!.moments.slice(changed.selection!.start, changed.selection!.end + 1).map(moment => moment.id);
        expect(selectedIds).toContain(changed.activeCell!.momentId);
        const repeated = reduceTabAnalysis(changed, { type: 'delete-moments', momentIds: selectedIds });
        expect(repeated).toBe(changed);
        expect(repeated.document!.moments.filter(moment => moment.measure === 2)).toHaveLength(4);
        expect(repeated.past).toHaveLength(state.past.length + 1);
    });

    it('shrinks a range when its final column is deleted without selecting the following column', () => {
        let state = createTabAnalysisState();
        state = reduceTabAnalysis(state, { type: 'select', selection: { start: 1, end: 3 } });
        const deletedId = state.document!.moments[3].id;
        state = reduceTabAnalysis(state, { type: 'delete-moment', momentId: deletedId });
        expect(state.selection).toEqual({ start: 1, end: 2 });
    });

    it('restores the prior authored score and committed title when undoing import', () => {
        const authored = put(createTabAnalysisState(), 24);
        const draft = reduceTabAnalysis(authored, { type: 'set-source', source: TAB_MIXED_EXAMPLE, name: 'mixed.txt' });
        const imported = reduceTabAnalysis(draft, { type: 'parsed', result: parseAsciiTab(TAB_MIXED_EXAMPLE) });
        expect(imported.documentName).toBe('mixed.txt');
        const undone = reduceTabAnalysis(imported, { type: 'undo' });
        expect(undone.document).toBe(authored.document);
        expect(undone.documentName).toBe('');
        expect(undone.source).toBe(TAB_MIXED_EXAMPLE);
        expect(reduceTabAnalysis(undone, { type: 'redo' }).document).toBe(imported.document);
    });

    it('bounds history and keeps generated IDs unique across undo and branches', () => {
        let state = createTabAnalysisState();
        for (let index = 0; index < 105; index++) state = put(state, index % 37);
        expect(state.past).toHaveLength(100);
        const nextId = state.nextId;
        state = reduceTabAnalysis(state, { type: 'undo' });
        state = reduceTabAnalysis(state, { type: 'insert-moment', afterId: state.document!.moments[0].id });
        expect(state.document!.moments[1].id).toBe(`edit-moment-${nextId}`);
        expect(new Set(state.document!.moments.map(moment => moment.id)).size).toBe(state.document!.moments.length);
    });

    it('rejects invalid active cells, tunings and capos without losing results', () => {
        const state = analyzed();
        expect(reduceTabAnalysis(state, { type: 'set-tuning', id: 'unknown' })).toBe(state);
        for (const capo of [-1, 13, 24, 1.5, NaN]) expect(reduceTabAnalysis(state, { type: 'set-capo', capo })).toBe(state);
        expect(reduceTabAnalysis(state, { type: 'set-capo', capo: 12 }).capo).toBe(12);
        expect(reduceTabAnalysis(state, { type: 'set-active-cell', cell: { momentId: 'missing', string: 0 } })).toBe(state);
        expect(reduceTabAnalysis(state, { type: 'set-active-cell', cell: { momentId: 'moment-0', string: 6 } })).toBe(state);
    });

    it('copies context without synchronizing scale/key and resets to a fresh editable score', () => {
        const initial = createTabAnalysisState();
        const state = reduceTabAnalysis(initial, { type: 'set-scale', scale });
        expect(state.context.scale).toEqual(scale);
        expect(state.context.scale).not.toBe(scale);
        expect(state.context.frame).toBeNull();
        expect(initial.context.scale).toBeNull();
        expect(reduceTabAnalysis(analyzed(), { type: 'reset' })).toEqual(initial);
    });

    it('runs analysis explicitly and keeps all-score results stable during cursor and range changes', () => {
        const initial = put(createTabAnalysisState(), 0);
        expect(initial.analysis).toBeNull();
        const analyzed = reduceTabAnalysis(initial, { type: 'analyze' });
        expect(analyzed.analysisStatus).toBe('fresh');
        expect(analyzed.analysis?.scope).toBe('all');
        expect(analyzed.analysis?.selection).toEqual({ start: 0, end: 15 });
        expect(analyzed.analysis?.result.notes).toHaveLength(1);
        const moved = reduceTabAnalysis(analyzed, { type: 'set-active-cell', cell: { momentId: analyzed.document!.moments[2].id, string: 1 } });
        const selected = reduceTabAnalysis(moved, { type: 'select', selection: { start: 3, end: 5 } });
        expect(selected.analysisStatus).toBe('fresh');
        expect(selected.analysis).toBe(analyzed.analysis);
        expect(selected.past).toBe(analyzed.past);
        const edited = put(selected, 12);
        expect(edited.analysisStatus).toBe('stale');
        expect(edited.analysis).toBe(analyzed.analysis);
        const refreshed = reduceTabAnalysis(edited, { type: 'analyze' });
        expect(refreshed.analysisStatus).toBe('fresh');
        expect(refreshed.analysis?.result.notes[0].fret).toBe(12);
        expect(reduceTabAnalysis(refreshed, { type: 'undo' }).analysisStatus).toBe('stale');
    });

    it('analyzes the explicit selected range with its own context snapshot and marks changed context stale', () => {
        let state = put(createTabAnalysisState(), 0);
        state = put(state, 3, 0, 1);
        state = reduceTabAnalysis(state, { type: 'set-scale', scale });
        state = reduceTabAnalysis(state, { type: 'set-frame', frame });
        state = reduceTabAnalysis(state, { type: 'set-chord', chord });
        state = reduceTabAnalysis(state, { type: 'analyze', scope: 'selection' });
        expect(state.analysis?.result.notes).toHaveLength(1);
        expect(state.analysis?.context).toEqual({ scale, frame, chord });
        expect(reduceTabAnalysis(state, { type: 'set-scale', scale: { ...scale! } })).toBe(state);
        const changed = reduceTabAnalysis(state, { type: 'set-frame', frame: null });
        expect(changed.analysisStatus).toBe('stale');
        expect(changed.analysis?.context.frame).toEqual(frame);
        expect(reduceTabAnalysis(state, { type: 'select', selection: { start: 1, end: 1 } }).analysisStatus).toBe('stale');
        const all = reduceTabAnalysis(state, { type: 'analyze' });
        expect(all.analysis?.context.chord).toBeNull();
        expect(all.analysis?.result.notes).toHaveLength(2);
        expect(reduceTabAnalysis(all, { type: 'select', selection: { start: 1, end: 1 } }).analysisStatus).toBe('fresh');
    });

    it('adds and splits explicit measures with undoable flexible position counts', () => {
        const initial = createTabAnalysisState();
        const appended = reduceTabAnalysis(initial, { type: 'add-measures', count: 4 });
        expect(appended.document?.measureCount).toBe(8);
        expect(appended.document?.moments).toHaveLength(32);
        const split = reduceTabAnalysis(appended, { type: 'split-measure', afterId: appended.document!.moments[1].id });
        expect(split.document?.measureCount).toBe(9);
        expect(split.document?.moments.filter(moment => moment.measure === 1)).toHaveLength(2);
        expect(split.document?.moments.filter(moment => moment.measure === 2)).toHaveLength(2);
        expect(reduceTabAnalysis(split, { type: 'undo' }).document).toBe(appended.document);
        expect(reduceTabAnalysis(appended, { type: 'add-measures', count: 0 })).toBe(appended);
    });

    it('keeps fresh annotations while editing an import draft, but hides them for committed score changes', () => {
        const input = reduceTabAnalysis(put(createTabAnalysisState(), 0), { type: 'analyze' });
        const draft = reduceTabAnalysis(input, { type: 'set-source', source: TAB_MIXED_EXAMPLE, name: 'next.txt' });
        expect(draft.analysisStatus).toBe('fresh');
        const failed = reduceTabAnalysis(draft, { type: 'parsed', result: { ok: false, diagnostics: [] } });
        expect(failed.analysisStatus).toBe('fresh');
        const imported = reduceTabAnalysis(draft, { type: 'parsed', result: parseAsciiTab(TAB_MIXED_EXAMPLE) });
        expect(imported.analysisStatus).toBe('stale');
        for (const action of [
            { type: 'set-tuning' as const, id: 'drop-d' },
            { type: 'set-capo' as const, capo: 1 },
            { type: 'insert-moment' as const, afterId: input.document!.moments[0].id },
            { type: 'delete-moment' as const, momentId: input.document!.moments[0].id },
            { type: 'add-measures' as const, count: 1 },
            { type: 'split-measure' as const, afterId: input.document!.moments[0].id },
        ]) expect(reduceTabAnalysis(input, action).analysisStatus).toBe('stale');
    });

    it('makes imported leading, middle and trailing empty measures keyboard editable with stable identities', () => {
        const source = ['e|--|0-|--|2-|--|', ...['B', 'G', 'D', 'A', 'E'].map(label => `${label}|--|--|--|--|--|`)].join('\n');
        const result = parseAsciiTab(source);
        if (!result.ok) throw new Error('Invalid empty measure example');
        const input = reduceTabAnalysis(createTabAnalysisState(), { type: 'set-source', source, name: 'empty-bars.tab' });
        const imported = reduceTabAnalysis(input, { type: 'parsed', result });
        expect(imported.document?.measureCount).toBe(5);
        expect(imported.document?.moments.map(moment => moment.measure)).toEqual([1, 2, 3, 4, 5]);
        expect(imported.document?.moments.map(moment => moment.index)).toEqual([0, 1, 2, 3, 4]);
        expect(imported.document?.moments[1].notes[0]).toBe(result.document.moments[0].notes[0]);
        expect(imported.document?.moments[3].notes[0]).toBe(result.document.moments[1].notes[0]);
        expect(imported.activeCell?.momentId).toBe(imported.document?.moments[0].id);
        expect(imported.selection).toEqual({ start: 0, end: 0 });
        const restored = reduceTabAnalysis(reduceTabAnalysis(imported, { type: 'undo' }), { type: 'redo' });
        expect(restored.document).toBe(imported.document);
        const edited = put(imported, 12);
        expect(edited.document?.moments[0].notes[0].source).toBeNull();
        expect(edited.document?.moments[1].notes[0].source).not.toBeNull();
        expect(reduceTabAnalysis(input, { type: 'parsed', result: { ...result, document: { ...result.document, measureCount: 1_025 } } })).toBe(input);
    });
});
