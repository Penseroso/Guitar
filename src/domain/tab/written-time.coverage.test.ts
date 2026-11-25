import { describe, expect, it } from 'vitest';
import { getTabWrittenInspectionPoints, getTabWrittenNotesAt, inspectTabWrittenNotesAt, observeTabWrittenTime, type TabWrittenTimeSnapshot } from './written-time';

const f = (numerator = 1, denominator = 1) => ({ numerator, denominator });
const q = (numerator = 1, denominator = 1) => ({ numerator: String(numerator), denominator: String(denominator) });
const n = (id: string, string = 0, duration?: unknown): Record<string, unknown> => ({ id, string, midi: 64, source: null, ...(duration === undefined ? {} : { duration }) });
const p = (id: string, notes: unknown[], start?: unknown): Record<string, unknown> => ({ id, measure: 1, notes, ...(start === undefined ? {} : { beatOffset: start }) });
const doc = <T>(moments: T[]) => ({ measureCount: 1, moments });
const fixture = () => doc([p('p0', [n('a', 0, f(1))], f(0)), p('p1', [n('b', 1)], f(1, 4))]);
const inspect = (snapshot: TabWrittenTimeSnapshot, numerator = 1, denominator = 8) => inspectTabWrittenNotesAt(snapshot, q(numerator, denominator));
function freeze<T>(input: T): T {
    if (input && typeof input === 'object') { Object.values(input).forEach(freeze); Object.freeze(input); }
    return input;
}

describe('bounded written-note onset exclusion', () => {
    it('stores the one permitted uncertainty as a frozen, JSON-safe coverage fact', () => {
        const input = fixture(), before = structuredClone(input); freeze(input);
        const snapshot = observeTabWrittenTime(input, 1);
        expect(snapshot.sourceDocument).toBe(input);
        expect(snapshot.data.noteCoverage).toBe('partial');
        expect(snapshot.data.coverageFacts).toEqual([{ momentIndex: 1, noteIndex: 0, kind: 'missing-duration', start: q(1, 4) }]);
        expect(snapshot.data.intervals.map(note => note.noteId)).toEqual(['a']);
        expect(snapshot.data.endpointDeltas).toEqual([{ time: q(0), starts: ['a'], ends: [] }, { time: q(1), starts: [], ends: ['a'] }]);
        expect(snapshot.data.observedRange).toEqual({ start: q(0), end: q(1) });
        expect(Object.isFrozen(snapshot.data.coverageFacts)).toBe(true);
        expect(Object.isFrozen(snapshot.data.coverageFacts?.[0])).toBe(true);
        expect(JSON.parse(JSON.stringify(snapshot.data))).toEqual(snapshot.data);
        expect(input).toEqual(before);
    });

    it('proves only points strictly before the unknown-duration onset while legacy queries remain partial', () => {
        const snapshot = observeTabWrittenTime(fixture(), 1);
        expect(getTabWrittenNotesAt(snapshot, q(1, 8))).toEqual({ status: 'partial', reason: 'incomplete-owned-notes' });
        const result = inspect(snapshot);
        expect(result).toMatchObject({ status: 'complete', notes: [{ noteId: 'a' }], proof: { basis: 'onset-exclusion', excluded: [{ momentIndex: 1, noteIndex: 0, kind: 'missing-duration', start: q(1, 4) }] } });
        expect(Object.isFrozen(result)).toBe(true);
        if (result.status !== 'complete') throw new Error('Expected bounded proof');
        expect(Object.isFrozen(result.notes)).toBe(true);
        expect(Object.isFrozen(result.proof)).toBe(true);
        expect(Object.isFrozen(result.proof.excluded)).toBe(true);
        expect(Object.isFrozen(result.proof.excluded[0].start)).toBe(true);
        expect(snapshot.data.noteCoverage).toBe('partial');
        for (const time of [q(1, 4), q(1, 2), q(1), q(2)]) {
            expect(inspectTabWrittenNotesAt(snapshot, time)).toEqual({ status: 'partial', reason: 'incomplete-owned-notes' });
        }
    });

    it('checks every eligible onset with exact arithmetic, including values rounded to the same float', () => {
        const snapshot = observeTabWrittenTime(doc([
            p('p0', [n('a', 0, f())], f(0)), p('p1', [n('b', 1)], f(1, 3)), p('p2', [n('c', 2)], f(1, 2)),
        ]), 1);
        const closeBefore = { numerator: '1000000000000000000000000000000000', denominator: '3000000000000000000000000000000001' };
        expect(inspectTabWrittenNotesAt(snapshot, closeBefore)).toMatchObject({ status: 'complete', proof: { excluded: [{ start: q(1, 3) }, { start: q(1, 2) }] } });
        expect(inspect(snapshot, 1, 3)).toMatchObject({ status: 'partial' });
        expect(inspect(snapshot, 1, 2)).toMatchObject({ status: 'partial' });
    });

    it.each([null, false, 0, 'unknown', {}, f(0), f(-1), f(1, 0), f(1.5), f(1025)])('never treats invalid duration %j as eligible missing duration', duration => {
        const input = fixture(); input.moments[1].notes = [n('b', 1, duration)];
        const snapshot = observeTabWrittenTime(input, 1);
        expect(snapshot.data.coverageFacts).toEqual([{ momentIndex: 1, noteIndex: 0, kind: 'unresolved' }]);
        for (const time of [q(-1), q(1, 8), q(5)]) expect(inspectTabWrittenNotesAt(snapshot, time)).toEqual({ status: 'partial', reason: 'incomplete-owned-notes' });
    });

    it.each([
        ['missing ID', { string: 1, midi: 64 }], ['duplicate ID', n('a', 1)],
        ['invalid string', { ...n('b', 1), string: 6 }], ['invalid MIDI', { ...n('b', 1), midi: 128 }],
        ['primitive note', null],
    ] as const)('records %s as unresolved rather than proving exclusion', (_name, bad) => {
        const input = fixture(); input.moments[1].notes = [bad];
        const snapshot = observeTabWrittenTime(input, 1);
        expect(snapshot.data.coverageFacts?.every(fact => fact.kind === 'unresolved')).toBe(true);
        expect(inspect(snapshot)).toMatchObject({ status: 'partial' });
        expect(inspect(snapshot)).not.toHaveProperty('notes');
    });

    it.each([undefined, null, f(-1), f(1, 0)])('records unknown/invalid onset %j as unresolved', start => {
        const input = fixture();
        if (start === undefined) delete input.moments[1].beatOffset; else input.moments[1].beatOffset = start;
        const snapshot = observeTabWrittenTime(input, 1);
        expect(snapshot.data.coverageFacts).toEqual([{ momentIndex: 1, noteIndex: 0, kind: 'unresolved' }]);
        expect(inspect(snapshot)).toMatchObject({ status: 'partial' });
    });

    it('keeps position identity failures and mixed uncertainties unresolved', () => {
        const input = fixture(); input.moments[1].id = 'p0';
        const snapshot = observeTabWrittenTime(input, 1);
        expect(snapshot.data.coverageFacts?.map(fact => fact.kind)).toEqual(['unresolved', 'unresolved']);
        expect(inspect(snapshot)).toMatchObject({ status: 'partial' });
        const mixed = observeTabWrittenTime(doc([p('p0', [n('a', 0, f())], f(0)), p('p1', [n('b', 1)], f(1, 4)), p('p2', [n('c', 2, null)], f(3, 4))]), 1);
        expect(mixed.data.coverageFacts?.map(fact => fact.kind)).toEqual(['missing-duration', 'unresolved']);
        expect(inspect(mixed)).toMatchObject({ status: 'partial' });
    });

    it('fails closed for legacy partial snapshots and incomplete population accounting', () => {
        const snapshot = observeTabWrittenTime(fixture(), 1);
        const { coverageFacts: _facts, ...legacyData } = snapshot.data;
        expect(_facts).toHaveLength(1);
        const legacy = { sourceDocument: snapshot.sourceDocument, data: legacyData };
        expect(inspect(legacy)).toEqual({ status: 'partial', reason: 'incomplete-owned-notes' });
        expect(getTabWrittenNotesAt(legacy, q(1, 8))).toMatchObject({ status: 'partial' });
        for (const broken of [[], [...snapshot.data.coverageFacts!, ...snapshot.data.coverageFacts!]]) {
            const incomplete = { sourceDocument: snapshot.sourceDocument, data: { ...snapshot.data, coverageFacts: broken } };
            expect(inspect(incomplete)).toEqual({ status: 'partial', reason: 'incomplete-owned-notes' });
        }
    });

    it('preserves complete whole-population and empty-range legacy behavior', () => {
        const snapshot = observeTabWrittenTime(doc([p('p0', [n('a', 0, f())], f(0))]), 1);
        const { coverageFacts: _facts, ...oldData } = snapshot.data;
        expect(_facts).toEqual([]);
        expect(inspect({ ...snapshot, data: oldData })).toMatchObject({ status: 'complete', notes: [{ noteId: 'a' }], proof: { basis: 'whole-population', excluded: [] } });
        expect(inspect(snapshot, 1, 1)).toEqual(getTabWrittenNotesAt(snapshot, q(1)));
        const empty = observeTabWrittenTime(doc([]), 1);
        expect(empty.data.noteCoverage).toBe('complete');
        expect(inspect(empty)).toEqual({ status: 'outside-range', reason: 'no-observed-range' });
        expect(getTabWrittenInspectionPoints(empty)).toEqual([]);
    });

    it('resolves unreadability and invalid query before any exclusion or range decision', () => {
        const input = fixture(); input.moments.push({ measure: 'unknown' });
        const snapshot = observeTabWrittenTime(input, 1);
        expect(snapshot.data.intervals).toHaveLength(1);
        expect(snapshot.data.noteCoverage).toBe('unreadable');
        expect(inspect(snapshot)).toEqual({ status: 'unreadable', reason: 'unreadable-population' });
        expect(inspectTabWrittenNotesAt(snapshot, '1/8')).toEqual({ status: 'invalid-query', reason: 'invalid-time' });
        expect(getTabWrittenInspectionPoints(snapshot)).toEqual([]);
    });

    it('never creates a complete empty set outside known observations or with no known interval', () => {
        const snapshot = observeTabWrittenTime(fixture(), 1);
        expect(inspect(snapshot, -1)).toEqual({ status: 'outside-range', reason: 'outside-observed-range' });
        const noRange = observeTabWrittenTime(doc([p('p1', [n('b')], f(1, 4))]), 1);
        expect(noRange.data.observedRange).toBeNull();
        expect(inspect(noRange, 0)).toEqual({ status: 'outside-range', reason: 'no-observed-range' });
        expect(inspect(noRange, 1, 4)).toEqual({ status: 'partial', reason: 'incomplete-owned-notes' });
        expect(getTabWrittenInspectionPoints(noRange)).toEqual([]);
    });

    it('merges only exact inspection choices, never endpoints or the coverage state', () => {
        const snapshot = observeTabWrittenTime(doc([
            p('known', [n('a', 0, f())], f(0)), p('same-start', [n('b', 1)], f(0)),
            p('inside', [n('c', 2)], f(2, 8)), p('same-inside', [n('d', 3)], f(1, 4)),
            p('at-end', [n('e', 4)], f(1)), p('beyond', [n('f', 5)], f(3, 2)),
        ]), 1);
        const points = getTabWrittenInspectionPoints(snapshot);
        expect(points).toEqual([q(0), q(1, 4), q(1)]);
        expect(Object.isFrozen(points)).toBe(true);
        expect(points.every(Object.isFrozen)).toBe(true);
        expect(snapshot.data.endpointDeltas.map(delta => delta.time)).toEqual([q(0), q(1)]);
        expect(snapshot.data.noteCoverage).toBe('partial');
        expect(inspect(snapshot, 0)).toMatchObject({ status: 'partial' });
    });

    it('preserves multiplicity/source order and ignores marker diagnostics for the onset proof', () => {
        const input = { ...doc([
            { ...p('known', [n('a', 0, f()), n('same-midi', 1, f())], f(0)), rest: { duration: null }, sustains: [{ noteId: 'broken' }] },
            p('unknown', [n('future', 2)], f(1, 4)),
        ]), meter: null };
        const snapshot = observeTabWrittenTime(input, 1);
        expect(snapshot.data.issues.some(issue => issue.scope === 'metadata')).toBe(true);
        const result = inspect(snapshot);
        expect(result.status).toBe('complete');
        if (result.status !== 'complete') throw new Error('Expected bounded proof');
        expect(result.notes.map(note => [note.noteId, note.midi])).toEqual([['a', 64], ['same-midi', 64]]);
        expect(result.proof.excluded).toHaveLength(1);
    });

    it('queries and inspection choices read only the copied snapshot data', () => {
        const input = fixture(); const snapshot = observeTabWrittenTime(input, 1);
        const before = JSON.stringify(snapshot.data);
        input.moments[1].beatOffset = f(0);
        Object.defineProperty(input, 'moments', { get() { throw new Error('Source must not be read'); } });
        expect(snapshot.sourceDocument).toBe(input);
        expect(inspect(snapshot)).toMatchObject({ status: 'complete', proof: { basis: 'onset-exclusion' } });
        expect(getTabWrittenInspectionPoints(snapshot)).toEqual([q(0), q(1, 4), q(1)]);
        expect(getTabWrittenNotesAt(snapshot, q(1, 8))).toMatchObject({ status: 'partial' });
        expect(JSON.stringify(snapshot.data)).toBe(before);
    });
});
