import { describe, expect, it } from 'vitest';
import { observeTabWrittenTime, getTabWrittenNotesAt } from './written-time';
import { inspectTabTiming } from './timing-inspection';

const f = (numerator = 1, denominator = 1) => ({ numerator, denominator });
const t = (numerator = 1, denominator = 1) => ({ numerator: String(numerator), denominator: String(denominator) });
const note = (id: string, string = 0, duration: unknown = f()) => ({ id, string, fret: 5, midi: 69 - string * 5, pitchClass: (69 - string * 5) % 12, source: null, ...(duration === undefined ? {} : { duration }) });
const moment = (id: string, notes: unknown[], beatOffset: unknown = f(0), measure = 1) => ({ id, measure, index: 0, column: 1, notes, ...(beatOffset === undefined ? {} : { beatOffset }) });
const score = (moments: unknown[], measureCount = 1) => ({ format: 'authored', timing: 'order-only', source: '', tuningMidi: [64, 59, 55, 50, 45, 40], capo: 0, measureCount, moments });
function freeze<T>(value: T): T {
    if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
}

describe('measure-owned written note observation', () => {
    it('accepts local explicit time without a meter and owns immutable JSON-safe facts', () => {
        const input = score([moment('p', [note('a', 0, f(6, 8))], f(0, 9))]);
        expect(inspectTabTiming(input).summary.missing).toBe(1);
        const before = structuredClone(input); freeze(input);
        const snapshot = observeTabWrittenTime(input, 1);
        expect(snapshot.sourceDocument).toBe(input);
        expect(snapshot.data.noteCoverage).toBe('complete');
        expect(snapshot.data.intervals).toEqual([{ momentId: 'p', noteId: 'a', momentIndex: 0, noteIndex: 0, string: 0, midi: 69, start: t(0), duration: t(3, 4), end: t(3, 4) }]);
        expect(input).toEqual(before);
        expect(Object.isFrozen(snapshot.data.sourceFacts.positions[0].value)).toBe(true);
        expect(JSON.parse(JSON.stringify(snapshot.data))).toEqual(snapshot.data);
        expect(getTabWrittenNotesAt(snapshot, t(0))).toMatchObject({ status: 'complete', notes: [{ noteId: 'a' }] });
    });

    it('independently marks untimed notes partial even when P2 reports no issues', () => {
        const input = score([{ id: 'p', measure: 1, notes: [{ id: 'a', string: 0, midi: 69 }] }]);
        expect(inspectTabTiming(input)).toMatchObject({ timingInput: 'none', issues: [] });
        const snapshot = observeTabWrittenTime(input, 1);
        expect(snapshot.data.noteCoverage).toBe('partial');
        expect(snapshot.data.issues.map(i => i.code)).toEqual(['missing-start', 'missing-duration']);
        expect(getTabWrittenNotesAt(snapshot, t(100))).toEqual({ status: 'partial', reason: 'incomplete-owned-notes' });
    });

    it('allows an empty owned population despite metadata errors and does not infer silence', () => {
        const input = { ...score([{ id: null, measure: 1, notes: [], beatOffset: f(-1), rest: { duration: f(1, 0) }, mutes: 'bad', sustains: [{ noteId: 'missing' }] }]), meter: null };
        const snapshot = observeTabWrittenTime(input, 1);
        expect(snapshot.data.noteCoverage).toBe('complete');
        expect(snapshot.data.ownedNoteCount).toBe(0);
        expect(snapshot.data.intervals).toEqual([]);
        expect(snapshot.data.endpointDeltas).toEqual([]);
        expect(snapshot.data.observedRange).toBeNull();
        expect(snapshot.data.issues.every(i => i.scope === 'metadata')).toBe(true);
        expect(getTabWrittenNotesAt(snapshot, t(0))).toEqual({ status: 'outside-range', reason: 'no-observed-range' });
        expect(getTabWrittenNotesAt(snapshot, t(0))).not.toHaveProperty('notes');
    });

    it('allows a declared empty measure with no matching positions', () => {
        for (const input of [score([], 2), score([moment('elsewhere', [note('untimed', 0, null)], undefined, 1)], 2)]) {
            const snapshot = observeTabWrittenTime(input, 2);
            expect(snapshot.data.noteCoverage).toBe('complete');
            expect(snapshot.data.observedRange).toBeNull();
            expect(getTabWrittenNotesAt(snapshot, t(1))).toMatchObject({ status: 'outside-range' });
        }
    });

    it.each([null, undefined, [], 3, {}, { measureCount: 1, moments: null }])('returns unreadable ordinary malformed document %j without throwing', input => {
        const snapshot = observeTabWrittenTime(input, 1);
        expect(snapshot.data.noteCoverage).toBe('unreadable');
        expect(() => JSON.stringify(snapshot.data)).not.toThrow();
        expect(getTabWrittenNotesAt(snapshot, t())).toEqual({ status: 'unreadable', reason: 'unreadable-population' });
        expect(getTabWrittenNotesAt(snapshot, '1/2')).toMatchObject({ status: 'invalid-query' });
    });

    it('retains known intervals when ownership or a selected note list is unreadable', () => {
        for (const broken of [null, { id: 'bad', measure: '1', notes: [] }, { id: 'bad', measure: 1, notes: null }]) {
            const snapshot = observeTabWrittenTime(score([moment('good', [note('a')]), broken]), 1);
            expect(snapshot.data.noteCoverage).toBe('unreadable');
            expect(snapshot.data.intervals.map(i => i.noteId)).toEqual(['a']);
            expect(getTabWrittenNotesAt(snapshot, t(0))).toMatchObject({ status: 'unreadable' });
        }
    });

    it('retains known facts in partial coverage but never returns a query note array', () => {
        const input = score([moment('known', [note('a')]), moment('unknown', [note('b', 1, null)], f(2))]);
        const snapshot = observeTabWrittenTime(input, 1);
        expect(snapshot.data.noteCoverage).toBe('partial');
        expect(snapshot.data.observedRange).toEqual({ start: t(0), end: t(1) });
        expect(snapshot.data.intervals.map(i => i.noteId)).toEqual(['a']);
        for (const at of [t(-1), t(0), t(1, 2), t(5)]) {
            expect(getTabWrittenNotesAt(snapshot, at)).toEqual({ status: 'partial', reason: 'incomplete-owned-notes' });
        }
    });

    it('uses exact unique endpoint deltas and half-open boundaries in deterministic source order', () => {
        const snapshot = observeTabWrittenTime(score([
            moment('later', [note('b', 1, f(1, 10))], f(3, 10)),
            moment('earlier', [note('a', 0, f(1, 5))], f(1, 10)),
        ]), 1);
        expect(snapshot.data.intervals.map(i => i.noteId)).toEqual(['b', 'a']);
        expect(snapshot.data.endpointDeltas).toEqual([
            { time: t(1, 10), starts: ['a'], ends: [] },
            { time: t(3, 10), starts: ['b'], ends: ['a'] },
            { time: t(2, 5), starts: [], ends: ['b'] },
        ]);
        expect(getTabWrittenNotesAt(snapshot, t(3, 10))).toMatchObject({ status: 'complete', notes: [{ noteId: 'b' }] });
        expect(getTabWrittenNotesAt(snapshot, t(2, 5))).toEqual({ status: 'outside-range', reason: 'outside-observed-range' });
    });

    it('returns an empty nominal set in an internal gap but no rest or silence event', () => {
        const snapshot = observeTabWrittenTime(score([moment('p0', [note('a')]), moment('p1', [note('b', 1)], f(2))]), 1);
        expect(getTabWrittenNotesAt(snapshot, t(3, 2))).toEqual({ status: 'complete', notes: [] });
        expect(snapshot.data.markerFacts).toEqual([]);
        expect(getTabWrittenNotesAt(snapshot, t(-1))).not.toHaveProperty('notes');
    });

    it('does not gate valid owned notes on unrelated invalid notes or meter metadata', () => {
        const input = { ...score([moment('selected', [note('a')]), { id: 'bad', measure: 2, notes: null }, moment('duplicate', [{ id: 'x' }], null, 2), moment('duplicate', [{ id: 'x' }], null, 2)], 2), meter: { numerator: 0, denominator: 0 } };
        expect(inspectTabTiming(input).summary.invalid).toBeGreaterThan(0);
        const snapshot = observeTabWrittenTime(input, 1);
        expect(snapshot.data.noteCoverage).toBe('complete');
        expect(snapshot.data.intervals.map(i => i.noteId)).toEqual(['a']);
    });

    it('blocks ambiguous owned IDs but preserves an independent valid note', () => {
        const snapshot = observeTabWrittenTime(score([moment('p0', [note('x')]), moment('p1', [note('x', 1)]), moment('p2', [note('good', 2)])]), 1);
        expect(snapshot.data.noteCoverage).toBe('partial');
        expect(snapshot.data.intervals.map(i => i.noteId)).toEqual(['good']);
        expect(snapshot.data.issues.filter(i => i.code === 'duplicate-note-id')).toHaveLength(2);
    });

    it('preserves non-JSON marker failures as diagnostics rather than breaking serialization', () => {
        const cycle: Record<string, unknown> = {}; cycle.self = cycle;
        const input = score([{ ...moment('p', [note('a')]), rest: cycle, mutes: [() => 1], sustains: [{ noteId: 'a', extra: 1n }], extra: Infinity }]);
        const snapshot = observeTabWrittenTime(input, 1);
        expect(snapshot.data.noteCoverage).toBe('complete');
        expect(snapshot.data.issues.some(i => i.code === 'non-json-metadata')).toBe(true);
        expect(() => JSON.stringify(snapshot.data)).not.toThrow();
        expect(cycle.self).toBe(cycle);
    });

    it('preserves cross-bar written ends and copies metadata without using a realization policy', () => {
        const authoredNote = note('a', 0, f(2));
        const input = { ...score([{ ...moment('p', [authoredNote], f(3)), rest: { duration: f(1) } }]), meter: { numerator: 4, denominator: 4 } };
        const snapshot = observeTabWrittenTime(input, 1);
        expect(snapshot.data.noteCoverage).toBe('complete');
        expect(snapshot.data.intervals[0].end).toEqual(t(5));
        expect(snapshot.data.sourceFacts.positions[0].value).not.toBe(input.moments[0]);
        authoredNote.duration = f(1);
        expect(snapshot.data.intervals[0].duration).toEqual(t(2));
        expect(getTabWrittenNotesAt(snapshot, t(9, 2))).toMatchObject({ status: 'complete', notes: [{ noteId: 'a' }] });
    });
});
