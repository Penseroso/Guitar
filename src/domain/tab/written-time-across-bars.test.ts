import { describe, expect, it } from 'vitest';
import { getTabAcrossBarsWrittenInspectionPoints, inspectTabAcrossBarsWrittenNotesAt, observeTabAcrossBarsWrittenTime } from './written-time-across-bars';

const f = (numerator: number, denominator = 1) => ({ numerator, denominator });
const q = (numerator: number | string, denominator: number | string = 1) => ({ numerator: String(numerator), denominator: String(denominator) });
const options = { model: 'regular-bar-origins' as const };
const note = (id = 'n', duration: unknown = f(1), midi = 60) => ({ id, string: 0, midi, duration });
const position = (id: string, measure: number, beatOffset: unknown = f(0), notes: unknown[] = [note(id)]) => ({ id, measure, index: 0, column: 0, beatOffset, notes });
const document = (moments: unknown[] = [], meter: unknown = { numerator: 4, denominator: 4 }) => ({ format: 'authored', timing: 'order-only', source: '', tuningMidi: [64, 59, 55, 50, 45, 40], capo: 0, measureCount: 3, meter, moments });

describe('explicit across-bar written projection', () => {
    it('requires the explicit model and a valid shared meter without changing local source data', () => {
        const source = document([position('a', 1)]);
        expect(observeTabAcrossBarsWrittenTime(source, 1, undefined as never).data.reason).toBe('invalid-model');
        // The fixture helper default applies to undefined; explicitly remove the signature.
        const noMeter = { ...source, meter: undefined };
        expect(observeTabAcrossBarsWrittenTime(noMeter, 1, options).data.reason).toBe('missing-meter');
        expect(observeTabAcrossBarsWrittenTime(document([], { numerator: 4, denominator: 3 }), 1, options).data.reason).toBe('invalid-meter');
        expect(observeTabAcrossBarsWrittenTime(source, 4, options).data.reason).toBe('invalid-measure');
        expect(source.moments[0]).toEqual(position('a', 1));
    });

    it('projects exact regular origins with fractional quarter-note lengths', () => {
        const snapshot = observeTabAcrossBarsWrittenTime(document([position('a', 2, f(1, 3), [note('n', f(2, 7))])], { numerator: 3, denominator: 8 }), 2, options);
        expect(snapshot.data.model).toEqual({ kind: 'regular-bar-origins', meter: { numerator: 3, denominator: 8 }, barLength: q(3, 2), offsetDomain: 'nonnegative-authored-fractions' });
        expect(snapshot.data.projectionWindow).toEqual({ start: q(3, 2), end: q(3) });
        expect(snapshot.data.intervals[0]).toMatchObject({ sourceMeasure: 2, sourceStart: q(1, 3), start: q(11, 6), duration: q(2, 7), end: q(89, 42) });
        expect(inspectTabAcrossBarsWrittenNotesAt(snapshot, q(11, 6)).status).toBe('complete');
        expect(inspectTabAcrossBarsWrittenNotesAt(snapshot, q(89, 42)).status).toBe('outside-range');
    });

    it('connects a prior written interval through a source-empty selected bar', () => {
        const snapshot = observeTabAcrossBarsWrittenTime(document([position('a', 1, f(3), [note('n', f(6))])]), 2, options);
        expect(snapshot.data.scope.population).toBe('all-source-notes');
        expect(inspectTabAcrossBarsWrittenNotesAt(snapshot, q(4))).toMatchObject({ status: 'complete', notes: [{ noteId: 'n', sourceMeasure: 1 }], proof: { basis: 'whole-population' } });
        expect(getTabAcrossBarsWrittenInspectionPoints(snapshot)).toEqual([q(4), q(8)]);
        expect(inspectTabAcrossBarsWrittenNotesAt(snapshot, q(8)).status).toBe('outside-window');
    });

    it('preserves offset equal to and beyond bar length without rehoming or blocking coverage', () => {
        const source = document([position('a', 1, f(4)), position('b', 1, f(9), [note('b', f(1))])]);
        const snapshot = observeTabAcrossBarsWrittenTime(source, 3, options);
        expect(snapshot.data.populationCoverage).toBe('complete');
        expect(snapshot.data.intervals.map(n => [n.sourceMeasure, n.sourceStart, n.start, n.end])).toEqual([[1, q(4), q(4), q(5)], [1, q(9), q(9), q(10)]]);
        expect(snapshot.data.projectionDiagnostics).toEqual([
            { code: 'offset-outside-projected-bar', momentIndex: 0, momentId: 'a', sourceMeasure: 1, offset: q(4), barLength: q(4) },
            { code: 'offset-outside-projected-bar', momentIndex: 1, momentId: 'b', sourceMeasure: 1, offset: q(9), barLength: q(4) },
        ]);
        expect(inspectTabAcrossBarsWrittenNotesAt(snapshot, q(9))).toMatchObject({ status: 'complete', notes: [{ noteId: 'b', sourceMeasure: 1 }] });
        expect(snapshot.data.issues).toEqual([]);
    });

    it('emits one diagnostic per position and never cuts a cross-bar end', () => {
        const snapshot = observeTabAcrossBarsWrittenTime(document([position('a', 1, f(4), [note('a'), note('b')]), position('c', 2, f(3), [note('c', f(2))])]), 2, options);
        expect(snapshot.data.projectionDiagnostics).toHaveLength(1);
        expect(snapshot.data.intervals[2].end).toEqual(q(9));
    });

    it('retains multiplicity and source order despite chronological differences', () => {
        const snapshot = observeTabAcrossBarsWrittenTime(document([position('later', 2, f(1), [note('b', f(2)), note('c', f(2))]), position('earlier', 1, f(3), [note('a', f(4))])]), 2, options);
        const result = inspectTabAcrossBarsWrittenNotesAt(snapshot, q(5));
        expect(result.status).toBe('complete');
        if (result.status === 'complete') expect(result.notes.map(n => n.noteId)).toEqual(['b', 'c', 'a']);
        expect(snapshot.data.endpointDeltas.map(d => d.time)).toEqual([q(3), q(5), q(7)]);
        expect(snapshot.data.endpointDeltas.reduce((count, d) => count + d.starts.length + d.ends.length, 0)).toBe(6);
    });

    it('allows nominal gaps inside known extent without claiming silence', () => {
        const snapshot = observeTabAcrossBarsWrittenTime(document([position('a', 1), position('b', 1, f(3))]), 1, options);
        expect(inspectTabAcrossBarsWrittenNotesAt(snapshot, q(2))).toMatchObject({ status: 'complete', notes: [] });
        expect(inspectTabAcrossBarsWrittenNotesAt(snapshot, q(4)).status).toBe('outside-window');
    });

    it('empty populations keep null extent and do not create complete-empty results', () => {
        const snapshot = observeTabAcrossBarsWrittenTime(document(), 2, options);
        expect(snapshot.data.populationCoverage).toBe('complete');
        expect(snapshot.data.observedRange).toBeNull();
        expect(inspectTabAcrossBarsWrittenNotesAt(snapshot, q(4))).toEqual({ status: 'outside-range', reason: 'no-observed-range' });
        expect(getTabAcrossBarsWrittenInspectionPoints(snapshot)).toEqual([]);
    });

    it('keeps marker facts literal and outside note coverage', () => {
        const raw = { ...position('', 2, null, []), rest: { duration: 'bad' }, sustains: [{ noteId: 'missing', duration: f(9) }], mutes: [{ string: 99 }] };
        const snapshot = observeTabAcrossBarsWrittenTime(document([raw]), 2, options);
        expect(snapshot.data.populationCoverage).toBe('complete');
        expect(snapshot.data.markerFacts).toHaveLength(3);
        expect(snapshot.data.sourceFacts.positions[0].value).toEqual(raw);
        expect(snapshot.data.intervals).toEqual([]);
        expect(snapshot.data.issues.length).toBeGreaterThan(0);
    });
});

describe('global exclusion proofs and query precedence', () => {
    const future = (start: unknown = undefined, duration: unknown = undefined) => document([position('known', 1, f(0), [note('known', f(9))]), position('future', 3, start, [{ ...note('future'), duration }])]);

    it('uses a future bar origin only as a strict lower-bound proof, never as a fabricated onset', () => {
        const source = future();
        // Explicit undefined is absent in the authored model (avoid helper defaults).
        (source.moments[1] as ReturnType<typeof position>).beatOffset = undefined;
        const snapshot = observeTabAcrossBarsWrittenTime(source, 2, options);
        expect(snapshot.data.coverageFacts).toEqual([{ kind: 'bar-origin-lower-bound', momentIndex: 1, noteIndex: 0, sourceMeasure: 3, lowerBound: q(8) }]);
        expect(snapshot.data.intervals).toHaveLength(1);
        expect(snapshot.data.endpointDeltas.map(d => d.time)).toEqual([q(0), q(9)]);
        expect(inspectTabAcrossBarsWrittenNotesAt(snapshot, q(7))).toMatchObject({ status: 'complete', proof: { basis: 'onset-exclusion', excluded: snapshot.data.coverageFacts } });
        expect(inspectTabAcrossBarsWrittenNotesAt(snapshot, q(8)).status).toBe('outside-window');
        const next = observeTabAcrossBarsWrittenTime(source, 3, options);
        expect(inspectTabAcrossBarsWrittenNotesAt(next, q(8)).status).toBe('partial');
        expect(getTabAcrossBarsWrittenInspectionPoints(snapshot)).toEqual([q(4), q(8)]);
    });

    it.each([undefined, f(1)])('allows absent onset with valid or absent length (%j)', duration => {
        const source = future(undefined, duration);
        (source.moments[1] as ReturnType<typeof position>).beatOffset = undefined;
        const snapshot = observeTabAcrossBarsWrittenTime(source, 1, options);
        expect(snapshot.data.coverageFacts[0].kind).toBe('bar-origin-lower-bound');
        expect(inspectTabAcrossBarsWrittenNotesAt(snapshot, q(0)).status).toBe('complete');
    });

    it('maps an authored known onset for missing duration and preserves strict equality', () => {
        const source = future(f(1, 4));
        const before = observeTabAcrossBarsWrittenTime(source, 3, options);
        expect(before.data.coverageFacts).toEqual([{ kind: 'known-global-start', momentIndex: 1, noteIndex: 0, sourceMeasure: 3, start: q(33, 4) }]);
        expect(inspectTabAcrossBarsWrittenNotesAt(before, q(8)).status).toBe('complete');
        expect(inspectTabAcrossBarsWrittenNotesAt(before, q(33, 4)).status).toBe('partial');
        expect(getTabAcrossBarsWrittenInspectionPoints(before)).toEqual([q(8), q(33, 4), q(9), q(12)]);
    });

    it.each([null, f(-1), f(1, 0), { numerator: 0.5, denominator: 1 }])('never earns exclusion from explicit invalid onset %j', start => {
        const snapshot = observeTabAcrossBarsWrittenTime(future(start), 1, options);
        expect(snapshot.data.coverageFacts[0].kind).toBe('unresolved');
        expect(inspectTabAcrossBarsWrittenNotesAt(snapshot, q(0)).status).toBe('partial');
    });

    it.each([null, f(0), f(-1), f(1, 0)])('never earns exclusion from explicit invalid length %j', duration => {
        const source = future(undefined, duration);
        (source.moments[1] as ReturnType<typeof position>).beatOffset = undefined;
        const snapshot = observeTabAcrossBarsWrittenTime(source, 1, options);
        expect(snapshot.data.coverageFacts[0].kind).toBe('unresolved');
        expect(inspectTabAcrossBarsWrittenNotesAt(snapshot, q(0)).status).toBe('partial');
    });

    it.each([{ id: '' }, { id: 'known' }, { string: 6 }, { midi: 128 }])('invalid identity/pitch fields cannot earn a bound: %j', patch => {
        const source = future();
        const raw = source.moments[1] as ReturnType<typeof position>;
        raw.beatOffset = undefined;
        Object.assign(raw.notes[0] as object, patch);
        const snapshot = observeTabAcrossBarsWrittenTime(source, 1, options);
        expect(snapshot.data.coverageFacts.some(fact => fact.kind === 'unresolved')).toBe(true);
        expect(inspectTabAcrossBarsWrittenNotesAt(snapshot, q(0)).status).toBe('partial');
    });

    it('unknown ownership is unreadable but retains valid neighbors and raw facts', () => {
        const source = document([position('a', 1), position('bad', 0)]);
        const snapshot = observeTabAcrossBarsWrittenTime(source, 1, options);
        expect(snapshot.data.populationCoverage).toBe('unreadable');
        expect(snapshot.data.intervals).toHaveLength(1);
        expect(snapshot.data.sourceFacts.positions).toHaveLength(2);
        expect(inspectTabAcrossBarsWrittenNotesAt(snapshot, q(0)).status).toBe('unreadable');
        expect(inspectTabAcrossBarsWrittenNotesAt(snapshot, q(4)).status).toBe('outside-window');
        expect(inspectTabAcrossBarsWrittenNotesAt(snapshot, '0')).toEqual({ status: 'invalid-query', reason: 'invalid-time' });
        expect(getTabAcrossBarsWrittenInspectionPoints(snapshot)).toEqual([]);
    });

    it('unreadable notes list anywhere gates the all-source population, not just selected ownership', () => {
        const source = document([position('a', 1), { ...position('b', 3), notes: null }]);
        const snapshot = observeTabAcrossBarsWrittenTime(source, 1, options);
        expect(snapshot.data.intervals).toHaveLength(1);
        expect(inspectTabAcrossBarsWrittenNotesAt(snapshot, q(0)).status).toBe('unreadable');
    });

    it('checks unresolved facts before known range but after the selected window', () => {
        const snapshot = observeTabAcrossBarsWrittenTime(document([position('a', 1), position('bad', 1, null)]), 1, options);
        expect(inspectTabAcrossBarsWrittenNotesAt(snapshot, q(1)).status).toBe('partial');
        expect(inspectTabAcrossBarsWrittenNotesAt(snapshot, q(4)).status).toBe('outside-window');
        const unavailable = observeTabAcrossBarsWrittenTime({ ...document(), meter: undefined }, 1, options);
        expect(inspectTabAcrossBarsWrittenNotesAt(unavailable, q(100)).status).toBe('unavailable');
        expect(inspectTabAcrossBarsWrittenNotesAt(unavailable, null).status).toBe('invalid-query');
    });

    it('resolves uncertainty before checking the final known end without extending observed range', () => {
        const source = document([position('known', 1), { ...position('future', 2), beatOffset: undefined, notes: [{ ...note('future'), duration: undefined }] }]);
        const first = observeTabAcrossBarsWrittenTime(source, 1, options);
        expect(inspectTabAcrossBarsWrittenNotesAt(first, q(1))).toEqual({ status: 'outside-range', reason: 'outside-observed-range' });
        const second = observeTabAcrossBarsWrittenTime(source, 2, options);
        expect(inspectTabAcrossBarsWrittenNotesAt(second, q(4)).status).toBe('partial');
        const onlyUnknown = observeTabAcrossBarsWrittenTime(document([source.moments[1]]), 1, options);
        expect(onlyUnknown.data.observedRange).toBeNull();
        expect(inspectTabAcrossBarsWrittenNotesAt(onlyUnknown, q(0))).toEqual({ status: 'outside-range', reason: 'no-observed-range' });
        expect(getTabAcrossBarsWrittenInspectionPoints(onlyUnknown)).toEqual([]);
    });

    it('duplicate position IDs and primitive note entries remain unresolved without arbitrary repair', () => {
        const source = document([position('same', 1), position('same', 2, undefined, [null])]);
        const snapshot = observeTabAcrossBarsWrittenTime(source, 1, options);
        expect(snapshot.data.intervals).toEqual([]);
        expect(snapshot.data.coverageFacts).toHaveLength(2);
        expect(snapshot.data.coverageFacts.every(fact => fact.kind === 'unresolved')).toBe(true);
        expect(snapshot.data.sourceNoteCount).toBe(2);
        expect(inspectTabAcrossBarsWrittenNotesAt(snapshot, q(0)).status).toBe('partial');
    });
});

describe('snapshot ownership and exact inspection choices', () => {
    it('copies/freeze facts, proof arrays and points without freezing or rereading source', () => {
        const source = document([position('a', 1, f(0), [note('a', f(6))]), { ...position('b', 3), beatOffset: undefined, notes: [{ ...note('b'), duration: undefined }] }]);
        const before = JSON.stringify(source);
        const snapshot = observeTabAcrossBarsWrittenTime(source, 2, options);
        expect(snapshot.sourceDocument).toBe(source);
        expect(JSON.stringify(source)).toBe(before);
        expect(Object.isFrozen(source)).toBe(false);
        expect(Object.isFrozen(snapshot.data.sourceFacts.positions[0].value)).toBe(true);
        const result = inspectTabAcrossBarsWrittenNotesAt(snapshot, q(4));
        expect(result.status).toBe('complete');
        if (result.status === 'complete') {
            expect(Object.isFrozen(result)).toBe(true);
            expect(Object.isFrozen(result.notes)).toBe(true);
            expect(Object.isFrozen(result.proof.excluded[0])).toBe(true);
        }
        expect(Object.isFrozen(getTabAcrossBarsWrittenInspectionPoints(snapshot))).toBe(true);
        source.moments.length = 0;
        Object.defineProperty(source, 'moments', { get: () => { throw Error('do not reread'); } });
        expect(inspectTabAcrossBarsWrittenNotesAt(snapshot, q(4))).toEqual(result);
        expect(JSON.stringify(snapshot.data)).toContain('regular-bar-origins');
    });

    it('deduplicates and sorts exact rational choices without inventing note events', () => {
        const snapshot = observeTabAcrossBarsWrittenTime(document([position('a', 1, f(1, 3), [note('a', f(1, 3))]), position('b', 1, f(2, 6), [note('b', f(2, 6))])]), 1, options);
        expect(getTabAcrossBarsWrittenInspectionPoints(snapshot)).toEqual([q(0), q(1, 3), q(2, 3), q(4)]);
        expect(snapshot.data.endpointDeltas).toHaveLength(2);
    });

    it('diagnoses non-JSON metadata while keeping data serializable and nominal coverage complete', () => {
        const source = document([position('a', 1)]);
        const cyclic: Record<string, unknown> = {};
        cyclic.self = cyclic;
        Object.assign(source.moments[0] as object, { extra: cyclic, unwanted: 4n });
        const snapshot = observeTabAcrossBarsWrittenTime(source, 1, options);
        expect(snapshot.data.populationCoverage).toBe('complete');
        expect(snapshot.data.issues.some(issue => issue.code === 'non-json-metadata')).toBe(true);
        expect(() => JSON.stringify(snapshot.data)).not.toThrow();
    });
});
