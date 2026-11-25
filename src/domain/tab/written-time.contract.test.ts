import { describe, expect, it } from 'vitest';
import { inspectTabTiming } from './timing-inspection';
import { getTabWrittenNotesAt, observeTabWrittenTime, type TabWrittenTimeSnapshot } from './written-time';

// Fixtures use current source fields directly. No production rational or observer
// helper constructs the expected memberships below.
const f = (numerator: number, denominator = 1) => ({ numerator, denominator });
const q = (numerator: number | string, denominator: number | string = 1) => ({ numerator: String(numerator), denominator: String(denominator) });
const note = (id: unknown, duration: unknown = f(1), string: unknown = 0, midi: unknown = 64) => ({
    id, string, midi, duration,
    fret: typeof string === 'number' && typeof midi === 'number' ? midi - [64, 59, 55, 50, 45, 40][string] : 0,
    pitchClass: typeof midi === 'number' ? midi % 12 : 4, source: null,
});
const position = (id: unknown, notes: unknown, beatOffset: unknown = f(0), measure: unknown = 1) => ({
    id, notes, beatOffset, measure, index: 0, column: 1,
});
const score = (moments: unknown[], measureCount = 1) => ({
    format: 'authored', timing: 'order-only', source: '', tuningMidi: [64, 59, 55, 50, 45, 40],
    capo: 0, measureCount, moments,
});
const freeze = (value: unknown) => {
    if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
};
function active(snapshot: TabWrittenTimeSnapshot, numerator: number | string, denominator: number | string = 1) {
    const result = getTabWrittenNotesAt(snapshot, q(numerator, denominator));
    expect(result.status).toBe('complete');
    if (result.status !== 'complete') throw new Error(`Expected a complete nominal result, got ${result.status}`);
    return result.notes.map(n => [n.noteId, n.midi, n.string]).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
}

describe('written-time independent semantic contract', () => {
    it('does not promote a clean free-timing P2 check into note completeness', () => {
        const raw = score([position('p', [note('a', undefined)], undefined)]);
        // Explicitly remove the helper defaults: these are genuinely absent fields.
        delete (raw.moments[0] as Record<string, unknown>).beatOffset;
        delete ((raw.moments[0] as { notes: Record<string, unknown>[] }).notes[0]).duration;
        expect(inspectTabTiming(raw)).toMatchObject({ timingInput: 'none', issues: [] });
        const snapshot = observeTabWrittenTime(raw, 1);
        expect(snapshot.data.noteCoverage).toBe('partial');
        expect(snapshot.data.intervals).toEqual([]);
        expect(snapshot.data.observedRange).toBeNull();
        expect(getTabWrittenNotesAt(snapshot, q(0))).toEqual({ status: 'partial', reason: 'incomplete-owned-notes' });
    });

    it('observes fully supplied local note fields despite P2 missing-meter information', () => {
        const raw = score([position('p', [note('a', f(1))], f(0))]);
        expect(inspectTabTiming(raw).issues.map(i => i.code)).toEqual(['missing-meter']);
        const snapshot = observeTabWrittenTime(raw, 1);
        expect(snapshot.data.noteCoverage).toBe('complete');
        expect(active(snapshot, 0)).toEqual([['a', 64, 0]]);
    });

    it('does not let invalid global meter gate independent local note coverage', () => {
        const raw = { ...score([position('p', [note('a')])]), meter: { numerator: 0, denominator: 3 } };
        expect(inspectTabTiming(raw).issues.map(i => i.code)).toEqual(['meter-value']);
        const snapshot = observeTabWrittenTime(raw, 1);
        expect(snapshot.data.noteCoverage).toBe('complete');
        expect(active(snapshot, 1, 2)).toEqual([['a', 64, 0]]);
    });

    it('ignores known other-bar malformed note data rather than using global P2 issue counts', () => {
        const raw = score([position('p1', [note('a')]), position('p2', null, { bad: 'start' }, 2)], 2);
        expect(inspectTabTiming(raw).summary.invalid).toBeGreaterThan(0);
        const snapshot = observeTabWrittenTime(raw, 1);
        expect(snapshot.data.noteCoverage).toBe('complete');
        expect(snapshot.data.ownedNoteCount).toBe(1);
        expect(active(snapshot, 0)).toEqual([['a', 64, 0]]);
    });

    it('keeps an empty owned-note population complete without claiming timed silence', () => {
        const raw = score([{
            ...position('p', [], { nonsense: true }), rest: { duration: { numerator: 1, denominator: 0 } },
            mutes: null, sustains: [{ noteId: 'outside-scope' }],
        }]);
        expect(inspectTabTiming(raw).summary.invalid).toBeGreaterThan(0);
        const snapshot = observeTabWrittenTime(raw, 1);
        expect(snapshot.data.noteCoverage).toBe('complete');
        expect(snapshot.data.ownedNoteCount).toBe(0);
        expect(snapshot.data.intervals).toEqual([]);
        expect(snapshot.data.observedRange).toBeNull();
        expect(snapshot.data.markerFacts.map(m => m.kind)).toEqual(['rest', 'mutes', 'sustains']);
        expect(getTabWrittenNotesAt(snapshot, q(0))).toEqual({ status: 'outside-range', reason: 'no-observed-range' });
    });

    it('withholds every complete query on partial coverage while preserving all known intervals', () => {
        const incomplete = note('b'); delete (incomplete as Record<string, unknown>).duration;
        const raw = score([position('p1', [note('a')]), position('p2', [incomplete], f(1, 4))]);
        const snapshot = observeTabWrittenTime(raw, 1);
        expect(snapshot.data.noteCoverage).toBe('partial');
        expect(snapshot.data.intervals.map(n => n.noteId)).toEqual(['a']);
        expect(snapshot.data.observedRange).toEqual({ start: q(0), end: q(1) });
        // Includes before b's known start, the known end, and outside that range.
        // Conservative completeness never tries to prove per-query isolation.
        for (const time of [q(-1), q(0), q(1, 8), q(1, 2), q(1), q(10)]) {
            const result = getTabWrittenNotesAt(snapshot, time);
            expect(result).toEqual({ status: 'partial', reason: 'incomplete-owned-notes' });
            expect('notes' in result).toBe(false);
        }
    });

    it('retains readable intervals when another position has unknown ownership', () => {
        const raw = score([position('known', [note('a')]), position('unknown', [], f(0), null)]);
        const snapshot = observeTabWrittenTime(raw, 1);
        expect(snapshot.data.noteCoverage).toBe('unreadable');
        expect(snapshot.data.intervals.map(n => n.noteId)).toEqual(['a']);
        for (const time of [q(0), q(1), q(100)]) {
            const result = getTabWrittenNotesAt(snapshot, time);
            expect(result).toEqual({ status: 'unreadable', reason: 'unreadable-population' });
            expect('notes' in result).toBe(false);
        }
    });

    it('diagnoses identity, onset, and length independently and continues to a later valid note', () => {
        const raw = score([position('', [note('', f(1, 0))], f(-1)), position('valid', [note('good')], f(2))]);
        const snapshot = observeTabWrittenTime(raw, 1);
        expect(snapshot.data.noteCoverage).toBe('partial');
        expect(snapshot.data.issues.map(i => i.code)).toEqual(expect.arrayContaining(['position-id', 'note-id', 'start-value', 'duration-value']));
        expect(snapshot.data.intervals.map(n => n.noteId)).toEqual(['good']);
    });

    it('keeps actual selected-note ID collisions from being mistaken for a complete source association', () => {
        const raw = score([position('p1', [note('same')]), position('p2', [note('same')], f(0), 2)], 2);
        const snapshot = observeTabWrittenTime(raw, 1);
        expect(snapshot.data.noteCoverage).toBe('partial');
        expect(snapshot.data.issues.some(i => i.code === 'duplicate-note-id')).toBe(true);
        expect(getTabWrittenNotesAt(snapshot, q(0)).status).toBe('partial');
    });

    it('preserves multiplicity and separate source occurrences at the same nominal pitch', () => {
        const raw = score([
            position('first', [note('a', f(1), 0, 64), note('unison', f(2), 1, 64)]),
            position('next', [note('repeat', f(1), 0, 64)], f(1)),
        ]);
        const snapshot = observeTabWrittenTime(raw, 1);
        expect(active(snapshot, 0)).toEqual([['a', 64, 0], ['unison', 64, 1]]);
        expect(active(snapshot, 1)).toEqual([['repeat', 64, 0], ['unison', 64, 1]]);
        expect(snapshot.data.endpointDeltas.find(e => e.time.numerator === '1' && e.time.denominator === '1')).toEqual({ time: q(1), starts: ['repeat'], ends: ['a'] });
    });

    it('returns complete empty interior gaps only within the finite nominal range', () => {
        const snapshot = observeTabWrittenTime(score([
            position('p1', [note('a')]), position('p2', [note('b')], f(2)),
        ]), 1);
        expect(active(snapshot, 1)).toEqual([]);
        expect(active(snapshot, 3, 2)).toEqual([]);
        expect(getTabWrittenNotesAt(snapshot, q(3))).toEqual({ status: 'outside-range', reason: 'outside-observed-range' });
        expect(getTabWrittenNotesAt(snapshot, q(6, 2)).status).toBe('outside-range');
    });

    it('retains a bar-crossing authored end and literal markers without cutoff or continuation merge', () => {
        const a = { ...note('a', f(2)), techniques: [{ kind: 'bend', targetFret: 12, notation: 'b' }] };
        const raw = { ...score([
            position('p1', [a], f(3)),
            { ...position('p2', [], f(4)), rest: { duration: f(1) }, mutes: [{ string: 0 }], sustains: [{ noteId: 'a', duration: f(1) }] },
        ]), meter: { numerator: 4, denominator: 4 } };
        const before = structuredClone(raw); freeze(raw);
        const snapshot = observeTabWrittenTime(raw, 1);
        expect(snapshot.data.noteCoverage).toBe('complete');
        expect(snapshot.data.intervals).toHaveLength(1);
        expect(snapshot.data.intervals[0]).toMatchObject({ noteId: 'a', start: q(3), duration: q(2), end: q(5) });
        expect(active(snapshot, 9, 2)).toEqual([['a', 64, 0]]);
        expect(snapshot.data.markerFacts.map(m => m.kind)).toEqual(['techniques', 'rest', 'mutes', 'sustains']);
        expect(raw).toEqual(before);
    });

    it('keeps a product-valid narrow overlap exact without floating tolerance', () => {
        const snapshot = observeTabWrittenTime(score([
            position('p1', [note('a', f(601, 1002), 0, 64)], f(167, 1001)),
            position('p2', [note('b', f(1, 4), 1, 67)], f(772, 1007)),
        ]), 1);
        expect(snapshot.data.noteCoverage).toBe('complete');
        expect(snapshot.data.intervals[0].end).toEqual(q('768935', '1003002'));
        // Independently calculated overlap duration is 1/1010023014.
        expect(active(snapshot, 772, 1007)).toEqual([['a', 64, 0], ['b', 67, 1]]);
        expect(active(snapshot, '768935', '1003002')).toEqual([['b', 67, 1]]);
        expect(() => JSON.stringify(snapshot.data)).not.toThrow();
    });

    it('owns JSON-safe copies and does not reread the source document when queried', () => {
        const a = { ...note('a'), techniques: [{ kind: 'vibrato', notation: '~' }] };
        const p = position('p', [a]);
        const raw = score([p]);
        const snapshot = observeTabWrittenTime(raw, 1);
        const serialized = JSON.stringify(snapshot.data);
        expect(snapshot.sourceDocument).toBe(raw);
        a.midi = 100; a.duration = f(3); a.techniques[0].notation = 'changed'; p.beatOffset = f(2);
        raw.moments.length = 0;
        expect(JSON.stringify(snapshot.data)).toBe(serialized);
        expect(active(snapshot, 1, 2)).toEqual([['a', 64, 0]]);
        expect(active(snapshot, 0)).toEqual([['a', 64, 0]]);
    });

    it.each([q(1, 0), q('1.5'), q('1e3'), q(1, '-2')])('invalid queries precede every population status: %j', time => {
        const partialNote = note('a'); delete (partialNote as Record<string, unknown>).duration;
        const snapshots = [
            observeTabWrittenTime(score([position('p', [note('a')])]), 1),
            observeTabWrittenTime(score([position('p', [partialNote])]), 1),
            observeTabWrittenTime(null, 1), observeTabWrittenTime(score([]), 1),
        ];
        for (const snapshot of snapshots) {
            expect(getTabWrittenNotesAt(snapshot, time)).toEqual({ status: 'invalid-query', reason: 'invalid-time' });
        }
    });

    it('matches an independent small integer-grid oracle across shared and repeated endpoints', () => {
        let seed = 0x4517;
        const random = (max: number) => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed % max; };
        let queriesChecked = 0;
        for (let caseIndex = 0; caseIndex < 24; caseIndex++) {
            // Integer quarter-grid ticks are the oracle; production arithmetic helpers
            // never calculate expectations or construct the queried rational values.
            const events = Array.from({ length: 6 }, (_, string) => ({
                id: `c${caseIndex}-n${string}`, string, midi: [64, 59, 55, 50, 45, 40][string] + 5,
                startTick: random(13), lengthTick: 1 + random(8),
            }));
            const raw = score(events.map(e => position(`p-${e.id}`, [note(e.id, f(e.lengthTick, 4), e.string, e.midi)], f(e.startTick, 4))));
            const before = structuredClone(raw); freeze(raw);
            const snapshot = observeTabWrittenTime(raw, 1);
            expect(snapshot.data.noteCoverage).toBe('complete');
            const first = Math.min(...events.map(e => e.startTick));
            const last = Math.max(...events.map(e => e.startTick + e.lengthTick));
            for (let tick = -1; tick <= 21; tick++) {
                const result = getTabWrittenNotesAt(snapshot, q(tick, 4));
                if (tick < first || tick >= last) {
                    expect(result.status).toBe('outside-range');
                    expect('notes' in result).toBe(false);
                } else {
                    const expected = events.filter(e => e.startTick <= tick && tick < e.startTick + e.lengthTick)
                        .map(e => [e.id, e.midi, e.string]).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
                    expect(active(snapshot, tick, 4)).toEqual(expected);
                }
                queriesChecked++;
            }
            expect(raw).toEqual(before);
        }
        expect(queriesChecked).toBe(552);
    });
});
