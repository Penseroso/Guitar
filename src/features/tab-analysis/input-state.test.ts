import { describe, expect, it } from 'vitest';
import { parseAsciiTab } from '@/domain/tab/ascii';
import { analyzeTabSelection } from '@/domain/tab/analysis';
import { createTabAnalysisState, reduceTabAnalysis, type TabAnalysisAction, type TabAnalysisState } from './state';

const body = '5h7p5-7/9\\7-10~~-5b7r5-x';
const source = ['e', 'B', 'G', 'D', 'A', 'E'].map((label, index) => `${label}|${index ? '-'.repeat(body.length) : body}|`).join('\n');
function imported() {
    const parsed = parseAsciiTab(source);
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.diagnostics));
    return reduceTabAnalysis(reduceTabAnalysis(createTabAnalysisState(), { type: 'set-source', source, name: 'techniques.tab' }), { type: 'parsed', result: parsed });
}
function edit(state: TabAnalysisState, action: TabAnalysisAction) { return reduceTabAnalysis(state, action); }
const quarter = { numerator: 1, denominator: 1 };

describe('input metadata in the canonical TAB session', () => {
    it('retains imported connectors, bend targets and mute events through timing edits and import undo/redo', () => {
        const base = createTabAnalysisState();
        const state = imported();
        const original = state.document!;
        expect(original.moments.flatMap(moment => moment.notes).map(note => note.fret)).toEqual([5, 7, 5, 7, 9, 7, 10, 5]);
        expect(original.moments.at(-1)?.mutes).toHaveLength(1);
        expect(original.moments.at(-2)?.notes[0].techniques?.map(item => item.kind)).toEqual(['bend', 'release']);
        const changed = edit(state, { type: 'set-meter', meter: { numerator: 6, denominator: 8 } });
        expect(changed.document!.moments).toBe(original.moments);
        const undone = edit(changed, { type: 'undo' });
        expect(undone.document).toBe(original);
        const beforeImport = edit(undone, { type: 'undo' });
        expect(beforeImport.document).toEqual(base.document);
        expect(edit(beforeImport, { type: 'redo' }).document).toBe(original);
        expect(edit(edit(beforeImport, { type: 'redo' }), { type: 'redo' }).document).toBe(changed.document);
    });

    it('makes each optional input edit undoable and invalidates the explicit analysis snapshot', () => {
        let state = imported();
        state = edit(state, { type: 'analyze' });
        const id = state.document!.moments[0].id;
        const actions: TabAnalysisAction[] = [
            { type: 'set-meter', meter: { numerator: 3, denominator: 4 } },
            { type: 'set-beat-offset', momentId: id, offset: { numerator: 0, denominator: 1 } },
            { type: 'set-duration', momentId: id, string: 0, duration: quarter },
            { type: 'set-rest', momentId: id, enabled: true },
            { type: 'set-duration', momentId: id, string: 0, duration: { numerator: 3, denominator: 2 } },
            { type: 'set-mute', momentId: id, string: 0, enabled: true },
        ];
        for (const action of actions) {
            const before = state;
            state = edit(before, action);
            expect(state.analysisStatus).toBe('stale');
            expect(state.past.length).toBe(before.past.length + 1);
            expect(state.document?.timing).toBe('order-only');
            expect(edit(state, { type: 'undo' }).document).toBe(before.document);
            expect(edit(edit(state, { type: 'undo' }), { type: 'redo' }).document).toBe(state.document);
        }
        expect(state.document!.moments[0].rest).toBeUndefined();
        expect(state.document!.moments[0].notes).toEqual([]);
        expect(state.document!.moments[0].mutes).toEqual([{ string: 0 }]);
        const empty = edit(state, { type: 'set-fret', momentId: id, string: 0, fret: null });
        expect(empty.document!.moments[0].mutes).toBeUndefined();
        expect(empty.document!.moments[0].rest).toBeUndefined();
    });

    it('preserves separate chord durations and explicit tie continuity without synthesizing an attack', () => {
        let state = createTabAnalysisState();
        const [first, second, third] = state.document!.moments.map(moment => moment.id);
        state = edit(state, { type: 'set-fret', momentId: first, string: 0, fret: 5 });
        state = edit(state, { type: 'set-fret', momentId: first, string: 1, fret: 5 });
        state = edit(state, { type: 'set-duration', momentId: first, string: 0, duration: { numerator: 2, denominator: 1 } });
        state = edit(state, { type: 'set-duration', momentId: first, string: 1, duration: quarter });
        const originalId = state.document!.moments[0].notes[0].id;
        state = edit(state, { type: 'set-sustain', momentId: second, string: 0, enabled: true });
        state = edit(state, { type: 'set-sustain', momentId: third, string: 0, enabled: true });
        expect(state.document!.moments.slice(1, 3).map(moment => moment.sustains)).toEqual([[{ noteId: originalId }], [{ noteId: originalId }]]);
        expect(state.document!.moments.slice(1, 3).flatMap(moment => moment.notes)).toEqual([]);
        const beforeMute = state;
        state = edit(state, { type: 'set-mute', momentId: second, string: 0, enabled: true });
        expect(state.document!.moments[2].sustains).toBeUndefined();
        expect(edit(state, { type: 'undo' }).document).toBe(beforeMute.document);
        expect(beforeMute.document!.moments[0].notes.map(note => note.duration)).toEqual([{ numerator: 2, denominator: 1 }, quarter]);
    });

    it('keeps pitch-only analysis identical after imported timing and technique metadata is cleared or added', () => {
        const state = imported();
        const original = state.document!;
        const plain = { ...original, moments: original.moments.map(moment => ({ ...moment, notes: moment.notes.map(note => {
            const value = { ...note }; delete value.techniques; return value;
        }) })) };
        const decorated = edit(edit(state, { type: 'set-meter', meter: { numerator: 7, denominator: 8 } }), {
            type: 'set-duration', momentId: original.moments[0].id, string: 0, duration: quarter,
        }).document!;
        const summarize = (document: typeof original) => {
            const result = analyzeTabSelection(document, { start: 0, end: document.moments.length - 1 }, { scale: null, chord: null, frame: null });
            return { candidates: result.candidates, roman: result.roman, arpeggios: result.arpeggios,
                melodicRuns: result.melodicRuns, harmonicSpans: result.harmonicSpans, progression: result.progressionReadings };
        };
        expect(summarize(decorated)).toEqual(summarize(plain));
    });
});
