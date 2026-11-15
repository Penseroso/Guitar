import { addExactTimes, compareExactTimes, fromTabFraction, parseExactTime, serializeExactTime, type ExactTime, type TabExactFraction } from './exact-time';
import { isValidTabMeter } from './input-capabilities';

export type TabWrittenJson = null | boolean | number | string | readonly TabWrittenJson[] | { readonly [key: string]: TabWrittenJson };
export interface TabWrittenTimeIssue {
    readonly kind: 'missing' | 'invalid';
    readonly scope: 'population' | 'note' | 'metadata';
    readonly code: string;
    readonly path: string;
}
export interface TabWrittenNoteInterval {
    readonly momentId: string;
    readonly noteId: string;
    readonly momentIndex: number;
    readonly noteIndex: number;
    readonly string: number;
    readonly midi: number;
    readonly start: TabExactFraction;
    readonly duration: TabExactFraction;
    readonly end: TabExactFraction;
}
export interface TabWrittenMarkerFact {
    readonly momentIndex: number;
    readonly kind: 'rest' | 'mutes' | 'sustains' | 'techniques';
    readonly noteIndex?: number;
    readonly value: TabWrittenJson;
}
export type TabWrittenMissingDurationFact = {
    readonly momentIndex: number;
    readonly noteIndex: number;
    readonly kind: 'missing-duration';
    readonly start: TabExactFraction;
};
export type TabWrittenCoverageFact = TabWrittenMissingDurationFact | {
    readonly momentIndex: number;
    readonly noteIndex: number;
    readonly kind: 'unresolved';
};
export interface TabWrittenTimeData {
    readonly scope: {
        readonly measure: number | null;
        readonly population: 'measure-owned-source-notes';
        readonly coordinates: 'bar-relative-quarter-notes';
        readonly interpretation: 'nominal-written-base-midi';
    };
    readonly noteCoverage: 'complete' | 'partial' | 'unreadable';
    /** Count of enumerated owned entries; not a total when the population is unreadable. */
    readonly ownedNoteCount: number;
    readonly sourceFacts: {
        readonly document: { readonly [key: string]: TabWrittenJson };
        readonly positions: readonly { readonly momentIndex: number; readonly value: TabWrittenJson }[];
    };
    readonly markerFacts: readonly TabWrittenMarkerFact[];
    readonly intervals: readonly TabWrittenNoteInterval[];
    /** Optional for compatibility with earlier snapshots; one fact per nonprojected owned note. */
    readonly coverageFacts?: readonly TabWrittenCoverageFact[];
    readonly endpointDeltas: readonly { readonly time: TabExactFraction; readonly starts: readonly string[]; readonly ends: readonly string[] }[];
    /** Extent of known intervals only; never a bar length or a coverage proof. */
    readonly observedRange: { readonly start: TabExactFraction; readonly end: TabExactFraction } | null;
    readonly issues: readonly TabWrittenTimeIssue[];
}
export interface TabWrittenTimeSnapshot {
    /** Caller association only. The query never reads this object again. */
    readonly sourceDocument: unknown;
    readonly data: TabWrittenTimeData;
}
export type TabWrittenNotesQuery =
    | { readonly status: 'invalid-query'; readonly reason: 'invalid-time' }
    | { readonly status: 'unreadable'; readonly reason: 'unreadable-population' }
    | { readonly status: 'partial'; readonly reason: 'incomplete-owned-notes' }
    | { readonly status: 'outside-range'; readonly reason: 'no-observed-range' | 'outside-observed-range' }
    | { readonly status: 'complete'; readonly notes: readonly TabWrittenNoteInterval[] };
export type TabWrittenNotesInspection = Exclude<TabWrittenNotesQuery, { readonly status: 'complete' }> | {
    readonly status: 'complete';
    readonly notes: readonly TabWrittenNoteInterval[];
    readonly proof: {
        readonly basis: 'whole-population' | 'onset-exclusion';
        readonly excluded: readonly TabWrittenMissingDurationFact[];
    };
};

type RecordValue = Record<string, unknown>;
const record = (v: unknown): v is RecordValue => typeof v === 'object' && v !== null && !Array.isArray(v);
const identifier = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const integer = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

function freezeData<T>(value: T): T {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.values(value).forEach(freezeData);
        Object.freeze(value);
    }
    return value;
}

/**
 * Read existing authored facts. This is not a sounding timeline, score validator or
 * playback policy. Unknown/invalid non-note markers never gate note-only coverage.
 * Input is ordinary JSON-like score data; hostile Proxy behavior is not supported.
 */
export function observeTabWrittenTime(document: unknown, measure: number): TabWrittenTimeSnapshot {
    const issues: TabWrittenTimeIssue[] = [];
    const add = (scope: TabWrittenTimeIssue['scope'], code: string, path: string, kind: TabWrittenTimeIssue['kind'] = 'invalid') => {
        issues.push({ kind, scope, code, path });
    };
    const sourceFacts: { document: Record<string, TabWrittenJson>; positions: { momentIndex: number; value: TabWrittenJson }[] } = { document: {}, positions: [] };
    const markerFacts: TabWrittenMarkerFact[] = [];
    const intervals: TabWrittenNoteInterval[] = [];
    const coverageFacts: TabWrittenCoverageFact[] = [];
    const endpoints = new Map<string, { time: ExactTime; starts: string[]; ends: string[] }>();
    let unreadable = false, partial = false, ownedNoteCount = 0;

    // Copy JSON literals without invoking toJSON/accessors or retaining source aliases.
    // Unserializable metadata is diagnosed and omitted (array slots become null).
    const copy = (value: unknown, path: string, ancestors = new Set<object>(), depth = 0): TabWrittenJson | undefined => {
        if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value !== 'object' || depth > 64 || ancestors.has(value)) {
            add('metadata', 'non-json-metadata', path); return undefined;
        }
        const prototype = Object.getPrototypeOf(value);
        if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
            add('metadata', 'non-json-metadata', path); return undefined;
        }
        ancestors.add(value);
        let result: TabWrittenJson;
        if (Array.isArray(value)) {
            result = Array.from(value, (item, index) => copy(item, `${path}.${index}`, ancestors, depth + 1) ?? null);
        } else {
            const object: Record<string, TabWrittenJson> = Object.create(null);
            for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
                if (!descriptor.enumerable) continue;
                if (!('value' in descriptor)) { add('metadata', 'non-json-metadata', `${path}.${key}`); continue; }
                const item = copy(descriptor.value, `${path}.${key}`, ancestors, depth + 1);
                if (item !== undefined) object[key] = item;
            }
            result = object;
        }
        ancestors.delete(value);
        return result;
    };
    const keepMarker = (kind: TabWrittenMarkerFact['kind'], value: unknown, momentIndex: number, noteIndex?: number) => {
        const path = `moments.${momentIndex}.${noteIndex === undefined ? kind : `notes.${noteIndex}.${kind}`}`;
        const copied = copy(value, path);
        if (copied !== undefined) markerFacts.push({ momentIndex, kind, ...(noteIndex === undefined ? {} : { noteIndex }), value: copied });
        const entries = kind === 'rest' ? [value] : Array.isArray(value) ? value : null;
        if (!entries) { add('metadata', 'marker-shape', path); return; }
        for (const [index, entry] of entries.entries()) {
            const at = kind === 'rest' ? path : `${path}.${index}`;
            if (!record(entry)) { add('metadata', 'marker-shape', at); continue; }
            if ((kind === 'rest' || kind === 'sustains') && entry.duration !== undefined && !fromTabFraction(entry.duration, false)) add('metadata', 'marker-duration', `${at}.duration`);
            if (kind === 'mutes' && !integer(entry.string, 0, 5)) add('metadata', 'marker-string', `${at}.string`);
            if (kind === 'sustains' && !identifier(entry.noteId)) add('metadata', 'marker-reference', `${at}.noteId`);
            if (kind === 'techniques' && typeof entry.kind !== 'string') add('metadata', 'marker-kind', `${at}.kind`);
        }
    };
    const endpoint = (time: ExactTime, noteId: string, side: 'starts' | 'ends') => {
        const key = `${time.numerator}/${time.denominator}`;
        let delta = endpoints.get(key);
        if (!delta) { delta = { time, starts: [], ends: [] }; endpoints.set(key, delta); }
        delta[side].push(noteId);
    };
    const result = (): TabWrittenTimeSnapshot => {
        const sorted = [...endpoints.values()].sort((a, b) => compareExactTimes(a.time, b.time));
        const data: TabWrittenTimeData = {
            scope: { measure: integer(measure, 1, 1024) ? measure : null, population: 'measure-owned-source-notes', coordinates: 'bar-relative-quarter-notes', interpretation: 'nominal-written-base-midi' },
            noteCoverage: unreadable ? 'unreadable' : partial ? 'partial' : 'complete', ownedNoteCount,
            sourceFacts, markerFacts, intervals, coverageFacts,
            endpointDeltas: sorted.map(delta => ({ time: serializeExactTime(delta.time), starts: delta.starts, ends: delta.ends })),
            observedRange: sorted.length ? { start: serializeExactTime(sorted[0].time), end: serializeExactTime(sorted[sorted.length - 1].time) } : null,
            issues,
        };
        return Object.freeze({ sourceDocument: document, data: freezeData(data) });
    };
    if (!record(document)) { unreadable = true; add('population', 'document-shape', 'document'); return result(); }
    for (const key of ['format', 'timing', 'source', 'tuningMidi', 'capo', 'measureCount', 'meter']) {
        if (document[key] !== undefined) {
            const value = copy(document[key], key);
            if (value !== undefined) sourceFacts.document[key] = value;
        }
    }
    if (document.meter !== undefined && (!record(document.meter)
        || !integer(document.meter.numerator, 1, 32) || !integer(document.meter.denominator, 1, 32)
        || !isValidTabMeter({ numerator: document.meter.numerator, denominator: document.meter.denominator }))) {
        add('metadata', 'meter-value', 'meter');
    }
    if (!integer(document.measureCount, 1, 1024)) { unreadable = true; add('population', 'measure-count', 'measureCount'); }
    if (!integer(measure, 1, 1024) || (integer(document.measureCount, 1, 1024) && measure > document.measureCount)) {
        unreadable = true; add('population', 'measure-value', 'measure');
    }
    if (!Array.isArray(document.moments)) { unreadable = true; add('population', 'positions-shape', 'moments'); return result(); }

    const positionCounts = new Map<string, number>(), noteCounts = new Map<string, number>();
    for (const raw of document.moments) {
        if (!record(raw)) continue;
        if (identifier(raw.id)) positionCounts.set(raw.id, (positionCounts.get(raw.id) ?? 0) + 1);
        if (Array.isArray(raw.notes)) for (const note of raw.notes) {
            if (record(note) && identifier(note.id)) noteCounts.set(note.id, (noteCounts.get(note.id) ?? 0) + 1);
        }
    }
    for (const [momentIndex, raw] of document.moments.entries()) {
        const path = `moments.${momentIndex}`;
        if (!record(raw) || !integer(raw.measure, 1, 1024) || (integer(document.measureCount, 1, 1024) && raw.measure > document.measureCount)) {
            unreadable = true; add('population', 'position-ownership', `${path}.measure`); continue;
        }
        if (raw.measure !== measure) continue;
        sourceFacts.positions.push({ momentIndex, value: copy(raw, path) ?? null });
        for (const kind of ['rest', 'mutes', 'sustains'] as const) if (raw[kind] !== undefined) keepMarker(kind, raw[kind], momentIndex);
        if (!Array.isArray(raw.notes)) { unreadable = true; add('population', 'notes-shape', `${path}.notes`); continue; }
        ownedNoteCount += raw.notes.length;
        const validPosition = identifier(raw.id) && positionCounts.get(raw.id) === 1;
        if (!validPosition) {
            add(raw.notes.length ? 'note' : 'metadata', identifier(raw.id) ? 'duplicate-position-id' : 'position-id', `${path}.id`);
            if (raw.notes.length) partial = true;
        }
        if (!raw.notes.length) {
            if (raw.beatOffset !== undefined && !fromTabFraction(raw.beatOffset, true)) add('metadata', 'start-value', `${path}.beatOffset`);
            else if (raw.beatOffset === undefined && ['rest', 'mutes', 'sustains'].some(key => raw[key] !== undefined)) add('metadata', 'missing-start', `${path}.beatOffset`, 'missing');
        }
        for (const [noteIndex, note] of raw.notes.entries()) {
            const notePath = `${path}.notes.${noteIndex}`;
            if (!record(note)) {
                partial = true; add('note', 'note-shape', notePath);
                coverageFacts.push({ momentIndex, noteIndex, kind: 'unresolved' }); continue;
            }
            if (note.techniques !== undefined) keepMarker('techniques', note.techniques, momentIndex, noteIndex);
            let valid = validPosition;
            if (!identifier(note.id) || noteCounts.get(note.id) !== 1) {
                valid = false; add('note', identifier(note.id) ? 'duplicate-note-id' : 'note-id', `${notePath}.id`);
            }
            if (!integer(note.string, 0, 5)) { valid = false; add('note', 'note-string', `${notePath}.string`); }
            if (!integer(note.midi, 0, 127)) { valid = false; add('note', 'note-midi', `${notePath}.midi`); }
            const start = fromTabFraction(raw.beatOffset, true), duration = fromTabFraction(note.duration, false);
            if (!start) { valid = false; add('note', raw.beatOffset === undefined ? 'missing-start' : 'start-value', `${path}.beatOffset`, raw.beatOffset === undefined ? 'missing' : 'invalid'); }
            const onlyDurationCanBeMissing = valid && start !== null;
            if (!duration) { valid = false; add('note', note.duration === undefined ? 'missing-duration' : 'duration-value', `${notePath}.duration`, note.duration === undefined ? 'missing' : 'invalid'); }
            if (!valid || !start || !duration) {
                partial = true;
                coverageFacts.push(onlyDurationCanBeMissing && note.duration === undefined && start
                    ? { momentIndex, noteIndex, kind: 'missing-duration', start: serializeExactTime(start) }
                    : { momentIndex, noteIndex, kind: 'unresolved' });
                continue;
            }
            const end = addExactTimes(start, duration);
            const interval: TabWrittenNoteInterval = {
                momentId: raw.id as string, noteId: note.id as string, momentIndex, noteIndex,
                string: note.string as number, midi: note.midi as number,
                start: serializeExactTime(start), duration: serializeExactTime(duration), end: serializeExactTime(end),
            };
            intervals.push(interval); endpoint(start, interval.noteId, 'starts'); endpoint(end, interval.noteId, 'ends');
        }
    }
    return result();
}

/** Complete means only the snapshot's declared nominal owned-note population. */
export function getTabWrittenNotesAt(snapshot: TabWrittenTimeSnapshot, time: unknown): TabWrittenNotesQuery {
    const query = parseExactTime(time);
    if (!query) return { status: 'invalid-query', reason: 'invalid-time' };
    const data = snapshot.data;
    if (data.noteCoverage === 'unreadable') return { status: 'unreadable', reason: 'unreadable-population' };
    if (data.noteCoverage === 'partial') return { status: 'partial', reason: 'incomplete-owned-notes' };
    if (!data.observedRange) return { status: 'outside-range', reason: 'no-observed-range' };
    const first = parseExactTime(data.observedRange.start)!, last = parseExactTime(data.observedRange.end)!;
    if (compareExactTimes(query, first) < 0 || compareExactTimes(query, last) >= 0) return { status: 'outside-range', reason: 'outside-observed-range' };
    const notes = data.intervals.filter(note => compareExactTimes(parseExactTime(note.start)!, query) <= 0 && compareExactTimes(query, parseExactTime(note.end)!) < 0);
    return Object.freeze({ status: 'complete', notes: Object.freeze(notes) });
}

/**
 * Inspect one point without changing conservative legacy query semantics. A note
 * with a known onset cannot contribute strictly before that onset, regardless of
 * its missing positive length. No other missing/invalid fact earns this proof.
 */
export function inspectTabWrittenNotesAt(snapshot: TabWrittenTimeSnapshot, time: unknown): TabWrittenNotesInspection {
    const query = parseExactTime(time);
    if (!query) return { status: 'invalid-query', reason: 'invalid-time' };
    const data = snapshot.data;
    if (data.noteCoverage !== 'partial') {
        const result = getTabWrittenNotesAt(snapshot, time);
        return result.status === 'complete'
            ? freezeData({ ...result, proof: { basis: 'whole-population' as const, excluded: [] } })
            : result;
    }
    const facts = data.coverageFacts;
    if (!Array.isArray(facts) || !facts.length || data.intervals.length + facts.length !== data.ownedNoteCount) {
        return { status: 'partial', reason: 'incomplete-owned-notes' };
    }
    const excluded: TabWrittenMissingDurationFact[] = [];
    for (const fact of facts) {
        const start = fact.kind === 'missing-duration' ? parseExactTime(fact.start) : null;
        if (!start || compareExactTimes(query, start) >= 0) return { status: 'partial', reason: 'incomplete-owned-notes' };
        excluded.push({ momentIndex: fact.momentIndex, noteIndex: fact.noteIndex, kind: 'missing-duration', start: serializeExactTime(start) });
    }
    // Resolve every population uncertainty before considering the known extent.
    if (!data.observedRange) return { status: 'outside-range', reason: 'no-observed-range' };
    const first = parseExactTime(data.observedRange.start)!, last = parseExactTime(data.observedRange.end)!;
    if (compareExactTimes(query, first) < 0 || compareExactTimes(query, last) >= 0) return { status: 'outside-range', reason: 'outside-observed-range' };
    const notes = data.intervals.filter(note => compareExactTimes(parseExactTime(note.start)!, query) <= 0 && compareExactTimes(query, parseExactTime(note.end)!) < 0);
    return freezeData({ status: 'complete', notes, proof: { basis: 'onset-exclusion', excluded } });
}

/** Finite inspection choices; unknown ends are never manufactured as endpoints. */
export function getTabWrittenInspectionPoints(snapshot: TabWrittenTimeSnapshot): readonly TabExactFraction[] {
    const data = snapshot.data;
    if (data.noteCoverage === 'unreadable' || !data.observedRange) return Object.freeze([]);
    const first = parseExactTime(data.observedRange.start)!, last = parseExactTime(data.observedRange.end)!;
    const points = new Map<string, ExactTime>();
    const add = (value: TabExactFraction) => {
        const time = parseExactTime(value);
        if (!time || compareExactTimes(time, first) < 0 || compareExactTimes(time, last) > 0) return;
        points.set(`${time.numerator}/${time.denominator}`, time);
    };
    data.endpointDeltas.forEach(delta => add(delta.time));
    data.coverageFacts?.forEach(fact => { if (fact.kind === 'missing-duration') add(fact.start); });
    return freezeData([...points.values()].sort(compareExactTimes).map(serializeExactTime));
}
