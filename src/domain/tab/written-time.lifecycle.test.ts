import { describe, expect, it } from 'vitest';
import { analyzeTabSelection } from './analysis';
import { parseAsciiTab } from './ascii';
import { createEmptyTabDocument, retuneTabDocument, setTabFret } from './editing';
import { setTabBeatOffset, setTabDuration, setTabMeter, setTabMute, setTabRest, setTabSustain } from './input-capabilities';
import { TAB_TUNINGS, type TabDocument } from './types';
import { createTabAnalysisState, reduceTabAnalysis } from '@/features/tab-analysis/state';
import { getTabWrittenNotesAt, observeTabWrittenTime } from './written-time';

const f = (numerator: number, denominator = 1) => ({ numerator, denominator });
function freeze(value: unknown): void {
    if (!value || typeof value !== 'object') return;
    Object.values(value).forEach(freeze);
    Object.freeze(value);
}
function timed(count = 3, measures = 1): TabDocument {
    let document = setTabMeter(createEmptyTabDocument(count, measures), { numerator: 4, denominator: 4 });
    document = setTabFret(document, document.moments[0].id, 0, 5, 'origin');
    document = setTabDuration(document, document.moments[0].id, 0, f(4));
    for (let i = 0; i < count; i++) document = setTabBeatOffset(document, document.moments[i].id, f(i));
    return document;
}
function imported(fret: string): TabDocument {
    const parsed = parseAsciiTab([`e|${fret}|`, 'B|-|', 'G|-|', 'D|-|', 'A|-|', 'E|-|'].join('\n'));
    if (!parsed.ok) throw new Error('Invalid lifecycle fixture');
    let document = setTabBeatOffset(parsed.document, parsed.document.moments[0].id, f(0));
    document = setTabDuration(document, document.moments[0].id, 0, f(1));
    return document;
}
const at = (numerator: string, denominator = '1') => ({ numerator, denominator });
function completeNotes(snapshot: ReturnType<typeof observeTabWrittenTime>, numerator: string, denominator = '1') {
    const result = getTabWrittenNotesAt(snapshot, at(numerator, denominator));
    expect(result.status).toBe('complete');
    if (result.status !== 'complete') throw new Error('Expected a complete owned-note query');
    return result.notes;
}
function expectFrozen(value: unknown): void {
    if (!value || typeof value !== 'object') return;
    expect(Object.isFrozen(value)).toBe(true);
    Object.values(value).forEach(expectFrozen);
}
function expectNoAliases(copied: unknown, source: unknown): void {
    if (!copied || !source || typeof copied !== 'object' || typeof source !== 'object') return;
    expect(copied).not.toBe(source);
    for (const [key, value] of Object.entries(source)) {
        expectNoAliases((copied as Record<string, unknown>)[key], value);
    }
}

describe('written-time source identity and existing-analysis lifecycle', () => {
    it('copies literal note metadata into immutable data without normalizing source facts or changing Analyze', () => {
        const document = timed();
        document.moments[0].notes[0].duration = f(6, 8);
        document.moments[0].notes[0].source = { line: 2, column: 7 };
        document.moments[0].notes[0].techniques = [{ kind: 'bend', targetFret: 12, notation: 'b12', source: { line: 2, column: 8 } }];
        const before = structuredClone(document);
        const context = { scale: null, chord: null, frame: null };
        const analysisBefore = analyzeTabSelection(document, { start: 0, end: 2 }, context);
        freeze(document);
        const snapshot = observeTabWrittenTime(document, 1);
        expect(snapshot.sourceDocument).toBe(document);
        expect(Object.isFrozen(snapshot)).toBe(true);
        expectFrozen(snapshot.data);
        expect(snapshot.data.sourceFacts.positions[0].value).toEqual(before.moments[0]);
        expectNoAliases(snapshot.data.sourceFacts.positions[0].value, document.moments[0]);
        expectNoAliases(snapshot.data.sourceFacts.document, document);
        expect(snapshot.data.intervals[0].duration).toEqual(at('3', '4'));
        expect(snapshot.data.intervals[0].midi).toBe(69);
        expect(completeNotes(snapshot, '1', '2').map(note => note.noteId)).toEqual(['origin']);
        expect(document).toEqual(before);
        expect(analyzeTabSelection(document, { start: 0, end: 2 }, context)).toEqual(analysisBefore);
        expect(Reflect.set(snapshot.data.intervals[0], 'midi', 1)).toBe(false);
    });

    it('queries copied data without re-reading or freezing the source document reference', () => {
        const document = timed();
        document.moments[0].notes[0].source = { line: 1, column: 3 };
        document.moments[0].notes[0].techniques = [{ kind: 'bend', targetFret: 12, notation: 'b12', source: { line: 1, column: 4 } }];
        const before = structuredClone(document);
        const snapshot = observeTabWrittenTime(document, 1);
        expect(Object.isFrozen(document)).toBe(false);
        expect(Object.isFrozen(document.moments[0].notes[0])).toBe(false);
        // Production callers associate a snapshot with an immutable document reference.
        // Deliberately breaking that assumption here verifies the query's data isolation,
        // not permission to reuse a snapshot as current after an in-place source edit.
        document.moments[0].notes[0].midi = 1;
        document.moments[0].notes[0].duration!.numerator = 1;
        document.moments[0].notes[0].source!.column = 99;
        document.moments[0].notes[0].techniques![0].source!.column = 100;
        document.tuningMidi[0] = 1;
        Object.defineProperty(document, 'moments', { get: () => { throw new Error('Query re-read source moments'); } });
        expect(completeNotes(snapshot, '3').map(note => ({ id: note.noteId, midi: note.midi, end: note.end })))
            .toEqual([{ id: 'origin', midi: 69, end: at('4') }]);
        expect(snapshot.data.sourceFacts.positions[0].value).toEqual(before.moments[0]);
        expect(snapshot.data.sourceFacts.document.tuningMidi).toEqual(before.tuningMidi);
    });

    it('uses effective MIDI from retuning and capo exactly once, keeping the earlier snapshot independent', () => {
        let original = timed();
        original = setTabFret(original, original.moments[0].id, 5, 5, 'low');
        original = setTabDuration(original, original.moments[0].id, 5, f(4));
        const changed = retuneTabDocument(original, TAB_TUNINGS[1].midi, 3);
        const oldData = structuredClone(original);
        freeze(original); freeze(changed);
        const oldSnapshot = observeTabWrittenTime(original, 1);
        const newSnapshot = observeTabWrittenTime(changed, 1);
        expect(oldSnapshot.sourceDocument).not.toBe(newSnapshot.sourceDocument);
        expect(completeNotes(oldSnapshot, '1').map(note => [note.noteId, note.midi])).toEqual([['origin', 69], ['low', 45]]);
        expect(completeNotes(newSnapshot, '1').map(note => [note.noteId, note.midi])).toEqual([['origin', 72], ['low', 46]]);
        expect(original).toEqual(oldData);
        expect(changed.moments[0].notes.map(note => note.fret)).toEqual([5, 5]);
    });

    it('qualifies reused imported IDs by source snapshot rather than mixing their copied note values', () => {
        const first = imported('5'), replacement = imported('7');
        expect(first.moments[0].id).toBe(replacement.moments[0].id);
        expect(first.moments[0].notes[0].id).toBe(replacement.moments[0].notes[0].id);
        freeze(first); freeze(replacement);
        const oldSnapshot = observeTabWrittenTime(first, 1), currentSnapshot = observeTabWrittenTime(replacement, 1);
        // Consumers can only associate the new document with its new snapshot.
        expect(oldSnapshot.sourceDocument).not.toBe(replacement);
        expect(currentSnapshot.sourceDocument).toBe(replacement);
        expect(completeNotes(oldSnapshot, '0').map(note => note.midi)).toEqual([69]);
        expect(completeNotes(currentSnapshot, '0').map(note => note.midi)).toEqual([71]);
        expect(oldSnapshot.data.sourceFacts.document.source).not.toBe(currentSnapshot.data.sourceFacts.document.source);
    });

    it('keeps explicit historical queries pure without making existing Analyze fresh after Undo', () => {
        const document = timed();
        let state: ReturnType<typeof createTabAnalysisState> = { ...createTabAnalysisState(), document };
        state = reduceTabAnalysis(state, { type: 'analyze', scope: 'all' });
        const originalAnalysis = state.analysis;
        const historical = observeTabWrittenTime(state.document!, 1);
        state = reduceTabAnalysis(state, { type: 'set-fret', momentId: document.moments[0].id, string: 0, fret: 7 });
        const edited = observeTabWrittenTime(state.document!, 1);
        expect(edited.sourceDocument).not.toBe(historical.sourceDocument);
        state = reduceTabAnalysis(state, { type: 'undo' });
        expect(state.document).toBe(historical.sourceDocument);
        expect(state.analysisStatus).toBe('stale');
        const before = structuredClone(state);
        // Undo may restore the exact old immutable object. A pure historical query
        // remains legal; it does not mount UI or revive an analysis automatically.
        expect(completeNotes(historical, '1').map(note => note.midi)).toEqual([69]);
        expect(completeNotes(edited, '1').map(note => note.midi)).toEqual([71]);
        expect(state).toEqual(before);
        expect(state.analysis).toBe(originalAnalysis);
        expect(state.analysisStatus).toBe('stale');
    });

    it('keeps simultaneous unisons and adjacent same-pitch occurrences as distinct source IDs', () => {
        let document = timed();
        const firstId = document.moments[0].id, nextId = document.moments[1].id;
        document = setTabFret(document, firstId, 1, 10, 'unison');
        document = setTabDuration(document, firstId, 1, f(1));
        document = setTabFret(document, nextId, 0, 5, 'reattack');
        document = setTabDuration(document, nextId, 0, f(1));
        freeze(document);
        const snapshot = observeTabWrittenTime(document, 1);
        expect(snapshot.data.ownedNoteCount).toBe(3);
        expect(completeNotes(snapshot, '1', '2').map(note => [note.noteId, note.string, note.midi]))
            .toEqual([['origin', 0, 69], ['unison', 1, 69]]);
        expect(completeNotes(snapshot, '1').map(note => [note.noteId, note.midi]))
            .toEqual([['origin', 69], ['reattack', 69]]);
        expect(snapshot.data.endpointDeltas.find(delta => delta.time.numerator === '1'))
            .toEqual({ time: at('1'), starts: ['reattack'], ends: ['unison'] });
    });

    it.each(['rest', 'mute', 'reattack'] as const)('preserves %s as literal metadata without cutting an earlier written interval', kind => {
        let document = timed();
        const second = document.moments[1].id;
        if (kind === 'rest') document = setTabDuration(setTabRest(document, second, true), second, 0, f(1));
        else if (kind === 'mute') document = setTabMute(document, second, 0, true);
        else document = setTabDuration(setTabFret(document, second, 0, 7, 'new-note'), second, 0, f(1));
        const before = structuredClone(document); freeze(document);
        const snapshot = observeTabWrittenTime(document, 1);
        expect(completeNotes(snapshot, '3').map(note => note.noteId)).toEqual(['origin']);
        expect(snapshot.data.intervals.find(note => note.noteId === 'origin')?.end).toEqual(at('4'));
        if (kind !== 'reattack') {
            expect(snapshot.data.markerFacts).toContainEqual({ momentIndex: 1, kind: kind === 'rest' ? 'rest' : 'mutes', value: kind === 'rest' ? { duration: f(1) } : [{ string: 0 }] });
        }
        expect(document).toEqual(before);
    });

    it('preserves origin4 plus continuation1 without adding, merging, or inventing a new note', () => {
        let document = timed();
        const second = document.moments[1].id;
        document = setTabDuration(setTabFret(document, second, 0, 5, 'consumed'), second, 0, f(1));
        document = setTabSustain(document, second, 0, true);
        freeze(document);
        const snapshot = observeTabWrittenTime(document, 1);
        expect(snapshot.data.ownedNoteCount).toBe(1);
        expect(snapshot.data.intervals).toHaveLength(1);
        expect(snapshot.data.intervals[0]).toMatchObject({ noteId: 'origin', duration: at('4'), end: at('4') });
        expect(snapshot.data.markerFacts).toContainEqual({ momentIndex: 1, kind: 'sustains', value: [{ noteId: 'origin', duration: f(1) }] });
        expect(completeNotes(snapshot, '3').map(note => note.noteId)).toEqual(['origin']);
        expect(getTabWrittenNotesAt(snapshot, at('4'))).toEqual({ status: 'outside-range', reason: 'outside-observed-range' });
        expect(analyzeTabSelection(document, { start: 0, end: 2 }, { scale: null, chord: null, frame: null }).notes.map(note => note.id)).toEqual(['origin']);
    });

    it.each(['hammer-on', 'pull-off', 'slide'] as const)('keeps %s endpoints as separate written note occurrences and preserves the literal relation', kind => {
        let document = timed();
        const second = document.moments[1].id, fret = kind === 'pull-off' ? 3 : 7;
        document = setTabDuration(setTabFret(document, second, 0, fret, 'endpoint'), second, 0, f(1));
        const techniques = [{ kind, toNoteId: 'endpoint' }];
        document.moments[0].notes[0].techniques = techniques;
        const before = structuredClone(document); freeze(document);
        const snapshot = observeTabWrittenTime(document, 1);
        expect(snapshot.data.ownedNoteCount).toBe(2);
        expect(completeNotes(snapshot, '1').map(note => [note.noteId, note.midi]))
            .toEqual([['origin', 69], ['endpoint', 64 + fret]]);
        expect(snapshot.data.intervals.map(note => note.end)).toEqual([at('4'), at('2')]);
        expect(snapshot.data.markerFacts).toContainEqual({ momentIndex: 0, noteIndex: 0, kind: 'techniques', value: techniques });
        expect(snapshot.data.scope.interpretation).toBe('nominal-written-base-midi');
        expect(document).toEqual(before);
    });

    it('retains technique literals and a local end beyond the bar without asserting performed pitch or picking', () => {
        let document = timed();
        document = setTabBeatOffset(document, document.moments[0].id, f(3));
        document = setTabDuration(document, document.moments[0].id, 0, f(2));
        const techniques = [{ kind: 'bend' as const, targetFret: 12, notation: 'b12' }, { kind: 'vibrato' as const, notation: '~' }];
        document.moments[0].notes[0].techniques = techniques;
        const before = structuredClone(document); freeze(document);
        const snapshot = observeTabWrittenTime(document, 1);
        expect(snapshot.data.scope.interpretation).toBe('nominal-written-base-midi');
        expect(snapshot.data.intervals).toHaveLength(1);
        expect(snapshot.data.intervals[0]).toMatchObject({ noteId: 'origin', midi: 69, start: at('3'), duration: at('2'), end: at('5') });
        expect(completeNotes(snapshot, '9', '2').map(note => note.midi)).toEqual([69]);
        expect(snapshot.data.markerFacts).toContainEqual({ momentIndex: 0, noteIndex: 0, kind: 'techniques', value: techniques });
        expectNoAliases(snapshot.data.markerFacts[0].value, techniques);
        expect(document).toEqual(before);
    });
});
