import { describe, expect, it } from 'vitest';
import { createScaleRef } from '@/domain/scale/scale-ref';
import { resolveSuppliedHarmony } from '@/domain/tab/supplied-harmony';
import { parseAsciiTab } from '@/domain/tab/ascii';
import { createTabAnalysisState, reduceTabAnalysis } from './state';
import { decodeTabProject, encodeTabProject } from './project';

function study() {
    const source = ['e|0h2-|3-|', 'B|----|--|', 'G|----|--|', 'D|----|--|', 'A|----|--|', 'E|----|--|'].join('\n');
    let state = reduceTabAnalysis(createTabAnalysisState(), { type: 'set-source', source, name: 'Study' });
    state = reduceTabAnalysis(state, { type: 'parsed', result: parseAsciiTab(source) });
    const [first, second] = state.document!.moments;
    state = reduceTabAnalysis(state, { type: 'set-meter', meter: { numerator: 4, denominator: 4 } });
    state = reduceTabAnalysis(state, { type: 'set-beat-offset', momentId: first.id, offset: { numerator: 1, denominator: 3 } });
    state = reduceTabAnalysis(state, { type: 'set-duration', momentId: first.id, string: 0, duration: { numerator: 2, denominator: 3 } });
    state = reduceTabAnalysis(state, { type: 'save-supplied-chord', document: state.document!, entry: {
        id: '', scoreId: state.scoreId, chord: { root: 'C', chordId: 'major', bass: 'E' },
        binding: { kind: 'positions', firstId: first.id, lastId: second.id },
    } });
    state = reduceTabAnalysis(state, { type: 'save-supplied-chord', document: state.document!, entry: {
        id: '', scoreId: state.scoreId, chord: { root: 'G', chordId: 'dominant-7' }, binding: { kind: 'written-time',
            originsRevision: state.originsRevision, start: { numerator: '1', denominator: '3' }, end: { numerator: '4', denominator: '1' } },
    } });
    state = reduceTabAnalysis(state, { type: 'set-frame', frame: { tonic: 'C', mode: 'major', lens: 'jazz-pop' } });
    state = reduceTabAnalysis(state, { type: 'set-scale', scale: createScaleRef('Diatonic Modes', 'Ionian', 0) });
    state = reduceTabAnalysis(state, { type: 'set-project-reading', document: state.document!, reading: { mode: 'written-time', ids: [first.notes[0].id] } });
    state = reduceTabAnalysis(state, { type: 'edit-source', source: 'another unimported text' });
    return reduceTabAnalysis(state, { type: 'analyze' });
}

describe('portable TAB project v1', () => {
    it('restores authored facts, references and the selected melody independently of text and cached analysis', () => {
        const original = study();
        const text = encodeTabProject(original);
        const loaded = reduceTabAnalysis(original, { type: 'open-project', project: decodeTabProject(text) });
        expect(loaded.document).toEqual(original.document);
        expect(loaded.context).toEqual(original.context);
        expect(loaded.reading).toEqual(original.reading);
        expect(loaded.source).toBe('another unimported text');
        expect(loaded.suppliedHarmony).toHaveLength(2);
        expect(loaded.suppliedHarmony.every(chord => chord.scoreId === loaded.scoreId)).toBe(true);
        expect(loaded.suppliedHarmony.map(chord => chord.binding)).toEqual(original.suppliedHarmony.map(chord => chord.binding));
        expect(loaded).toMatchObject({ past: [], future: [], analysis: null, analysisStatus: 'idle' });
        expect(reduceTabAnalysis(loaded, { type: 'analyze' }).analysis?.result).toEqual(original.analysis?.result);
        const edited = reduceTabAnalysis(loaded, { type: 'insert-moment', afterId: loaded.document!.moments[0].id });
        expect(edited.document!.moments).toHaveLength(4);
        expect(reduceTabAnalysis(edited, { type: 'undo' }).document).toEqual(loaded.document);
    });
    it('recovers missing editor navigation from portable projects while preserving supplied positions', () => {
        const state = study();
        const [first, second, third] = state.document!.moments;
        const range = { start: 1, end: 2 };
        const cursor = { momentId: third.id, string: 4 };
        for (const [selection, activeCell, expectedRange, expectedCell] of [
            [null, null, { start: 0, end: 0 }, { momentId: first.id, string: 0 }],
            [null, cursor, { start: 2, end: 2 }, cursor],
            [range, null, range, { momentId: second.id, string: 0 }],
            [range, cursor, range, cursor],
        ] as const) {
            const project = decodeTabProject(encodeTabProject({ ...state, selection, activeCell }));
            const loaded = reduceTabAnalysis(state, { type: 'open-project', project });
            expect(loaded.selection).toEqual(expectedRange);
            expect(loaded.activeCell).toEqual(expectedCell);
            expect(loaded.document).toEqual(state.document);
            const edited = reduceTabAnalysis(loaded, { type: 'set-fret', ...expectedCell, fret: 8 });
            expect(edited.document).not.toBe(loaded.document);
            expect(reduceTabAnalysis(edited, { type: 'undo' }).activeCell).toEqual(expectedCell);
        }
    });

    it('keeps unresolved position and obsolete written bindings unresolved across reopen and later edits', () => {
        let state = study();
        state = reduceTabAnalysis(state, { type: 'delete-moment', momentId: state.document!.moments[1].id });
        state = reduceTabAnalysis(state, { type: 'set-meter', meter: { numerator: 3, denominator: 4 } });
        const loaded = reduceTabAnalysis(state, { type: 'open-project', project: decodeTabProject(encodeTabProject(state)) });
        const rows = resolveSuppliedHarmony(loaded.document!, loaded.scoreId, loaded.originsRevision, loaded.suppliedHarmony);
        expect(rows.map(row => row.placement)).toEqual([null, null]);
    });
    it('rejects malformed, oversized, unsupported, duplicate or internally inconsistent files', () => {
        const text = encodeTabProject(study());
        expect(() => decodeTabProject('{')).toThrow();
        expect(() => decodeTabProject(' '.repeat(8 * 1024 * 1024 + 1))).toThrow(/limit/);
        expect(() => decodeTabProject(text.replace('"version":1', '"version":2'))).toThrow(/version/);
        const file = JSON.parse(text);
        const first = file.project.document.moments[0];
        first.notes[0].midi += 1;
        expect(() => decodeTabProject(JSON.stringify(file))).toThrow();
        first.notes[0].midi -= 1;
        first.id = file.project.document.moments[1].id;
        expect(() => decodeTabProject(JSON.stringify(file))).toThrow();
    });
});
