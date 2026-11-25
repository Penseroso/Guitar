import { addExactTimes, compareExactTimes, fromTabFraction, parseExactTime, serializeExactTime, type ExactTime, type TabExactFraction } from './exact-time';
import { isValidTabMeter } from './input-capabilities';
import type { TabWrittenJson, TabWrittenMarkerFact, TabWrittenNoteInterval, TabWrittenTimeIssue } from './written-time';

export interface TabAcrossBarsWrittenNoteInterval extends TabWrittenNoteInterval {
    readonly sourceMeasure: number;
    readonly sourceStart: TabExactFraction;
}
interface SourceReference {
    readonly momentIndex: number;
    readonly noteIndex: number;
    readonly sourceMeasure: number;
}
export type TabAcrossBarsWrittenExclusionFact = SourceReference & (
    | { readonly kind: 'known-global-start'; readonly start: TabExactFraction }
    | { readonly kind: 'bar-origin-lower-bound'; readonly lowerBound: TabExactFraction }
);
export type TabAcrossBarsWrittenCoverageFact = TabAcrossBarsWrittenExclusionFact | {
    readonly momentIndex: number;
    readonly noteIndex: number;
    readonly sourceMeasure: number | null;
    readonly kind: 'unresolved';
};
export type TabAcrossBarsUnavailableReason = 'invalid-model' | 'invalid-document' | 'missing-meter' | 'invalid-meter' | 'invalid-measure-count' | 'invalid-measure';
export interface TabAcrossBarsWrittenTimeData {
    readonly status: 'ready' | 'unavailable';
    readonly reason?: TabAcrossBarsUnavailableReason;
    readonly scope: {
        readonly measure: number | null;
        readonly population: 'all-source-notes';
        readonly coordinates: 'score-relative-quarter-notes';
        readonly interpretation: 'nominal-written-base-midi';
    };
    readonly model: {
        readonly kind: 'regular-bar-origins';
        readonly meter: { readonly numerator: number; readonly denominator: number };
        readonly barLength: TabExactFraction;
        readonly offsetDomain: 'nonnegative-authored-fractions';
    } | null;
    readonly projectionWindow: { readonly start: TabExactFraction; readonly end: TabExactFraction } | null;
    readonly populationCoverage: 'complete' | 'partial' | 'unreadable';
    /** Enumerated entries only; not a total when the population is unreadable. */
    readonly sourceNoteCount: number;
    readonly sourceFacts: {
        readonly document: { readonly [key: string]: TabWrittenJson };
        readonly positions: readonly { readonly momentIndex: number; readonly value: TabWrittenJson }[];
    };
    readonly markerFacts: readonly TabWrittenMarkerFact[];
    readonly intervals: readonly TabAcrossBarsWrittenNoteInterval[];
    readonly coverageFacts: readonly TabAcrossBarsWrittenCoverageFact[];
    readonly endpointDeltas: readonly { readonly time: TabExactFraction; readonly starts: readonly string[]; readonly ends: readonly string[] }[];
    /** Known interval extent, never a claim about actual bar lengths or silence. */
    readonly observedRange: { readonly start: TabExactFraction; readonly end: TabExactFraction } | null;
    readonly issues: readonly TabWrittenTimeIssue[];
    readonly projectionDiagnostics: readonly {
        readonly code: 'offset-outside-projected-bar';
        readonly momentIndex: number;
        readonly momentId: string | null;
        readonly sourceMeasure: number;
        readonly offset: TabExactFraction;
        readonly barLength: TabExactFraction;
    }[];
}
export interface TabAcrossBarsWrittenTimeSnapshot {
    /** Association only; inspection does not reread or freeze the document. */
    readonly sourceDocument: unknown;
    readonly data: TabAcrossBarsWrittenTimeData;
}
export type TabAcrossBarsWrittenNotesInspection =
    | { readonly status: 'invalid-query'; readonly reason: 'invalid-time' }
    | { readonly status: 'unavailable'; readonly reason: TabAcrossBarsUnavailableReason }
    | { readonly status: 'outside-window'; readonly reason: 'outside-projection-window' }
    | { readonly status: 'unreadable'; readonly reason: 'unreadable-population' }
    | { readonly status: 'partial'; readonly reason: 'incomplete-source-notes' }
    | { readonly status: 'outside-range'; readonly reason: 'no-observed-range' | 'outside-observed-range' }
    | {
        readonly status: 'complete';
        readonly notes: readonly TabAcrossBarsWrittenNoteInterval[];
        readonly proof: { readonly basis: 'whole-population' | 'onset-exclusion'; readonly excluded: readonly TabAcrossBarsWrittenExclusionFact[] };
    };

const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const identifier = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const integer = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
const zero: ExactTime = { numerator: 0n, denominator: 1n };
const multiply = (value: ExactTime, factor: number): ExactTime => addExactTimes(zero, { numerator: value.numerator * BigInt(factor), denominator: value.denominator });
function freezeData<T>(value: T): T {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.values(value).forEach(freezeData);
        Object.freeze(value);
    }
    return value;
}

/**
 * Explicit regular-origin projection of all nominal source-note occurrences.
 * Origin spacing is a model, not observed bar length. Offsets are never clipped,
 * reassigned or realized as sounding time. Ordinary JSON-like input is supported;
 * hostile proxies/accessors in core score fields are outside this contract.
 */
export function observeTabAcrossBarsWrittenTime(document: unknown, measure: number, options: { readonly model: 'regular-bar-origins' }): TabAcrossBarsWrittenTimeSnapshot {
    const issues: TabWrittenTimeIssue[] = [];
    const add = (scope: TabWrittenTimeIssue['scope'], code: string, path: string, kind: TabWrittenTimeIssue['kind'] = 'invalid') => issues.push({ scope, code, path, kind });
    const sourceFacts: { document: Record<string, TabWrittenJson>; positions: { momentIndex: number; value: TabWrittenJson }[] } = { document: {}, positions: [] };
    const markerFacts: TabWrittenMarkerFact[] = [];
    const intervals: TabAcrossBarsWrittenNoteInterval[] = [];
    const coverageFacts: TabAcrossBarsWrittenCoverageFact[] = [];
    const projectionDiagnostics: { code: 'offset-outside-projected-bar'; momentIndex: number; momentId: string | null; sourceMeasure: number; offset: TabExactFraction; barLength: TabExactFraction }[] = [];
    const endpoints = new Map<string, { time: ExactTime; starts: string[]; ends: string[] }>();
    let reason: TabAcrossBarsUnavailableReason | undefined;
    let model: TabAcrossBarsWrittenTimeData['model'] = null;
    let projectionWindow: TabAcrossBarsWrittenTimeData['projectionWindow'] = null;
    let barLength: ExactTime | null = null;
    let unreadable = false, sourceNoteCount = 0;

    const copy = (value: unknown, path: string, ancestors = new Set<object>(), depth = 0): TabWrittenJson | undefined => {
        if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value !== 'object' || depth > 64 || ancestors.has(value)) { add('metadata', 'non-json-metadata', path); return undefined; }
        const prototype = Object.getPrototypeOf(value);
        if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) { add('metadata', 'non-json-metadata', path); return undefined; }
        ancestors.add(value);
        let result: TabWrittenJson;
        if (Array.isArray(value)) result = Array.from(value, (item, index) => copy(item, `${path}.${index}`, ancestors, depth + 1) ?? null);
        else {
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
    const endpoint = (time: ExactTime, id: string, side: 'starts' | 'ends') => {
        const key = `${time.numerator}/${time.denominator}`;
        let delta = endpoints.get(key);
        if (!delta) { delta = { time, starts: [], ends: [] }; endpoints.set(key, delta); }
        delta[side].push(id);
    };
    const result = (): TabAcrossBarsWrittenTimeSnapshot => {
        const sorted = [...endpoints.values()].sort((a, b) => compareExactTimes(a.time, b.time));
        return Object.freeze({ sourceDocument: document, data: freezeData({
            status: reason ? 'unavailable' : 'ready', ...(reason ? { reason } : {}),
            scope: { measure: integer(measure, 1, 1024) ? measure : null, population: 'all-source-notes', coordinates: 'score-relative-quarter-notes', interpretation: 'nominal-written-base-midi' },
            model, projectionWindow, populationCoverage: unreadable ? 'unreadable' : coverageFacts.length ? 'partial' : 'complete', sourceNoteCount,
            sourceFacts, markerFacts, intervals, coverageFacts, projectionDiagnostics,
            endpointDeltas: sorted.map(delta => ({ time: serializeExactTime(delta.time), starts: delta.starts, ends: delta.ends })),
            observedRange: sorted.length ? { start: serializeExactTime(sorted[0].time), end: serializeExactTime(sorted[sorted.length - 1].time) } : null,
            issues,
        } satisfies TabAcrossBarsWrittenTimeData) });
    };
    if (!options || options.model !== 'regular-bar-origins') reason = 'invalid-model';
    if (!record(document)) { reason ??= 'invalid-document'; unreadable = true; add('population', 'document-shape', 'document'); return result(); }
    for (const key of ['format', 'timing', 'source', 'tuningMidi', 'capo', 'measureCount', 'meter']) if (document[key] !== undefined) {
        const value = copy(document[key], key);
        if (value !== undefined) sourceFacts.document[key] = value;
    }
    if (document.meter === undefined) { reason ??= 'missing-meter'; add('metadata', 'missing-meter', 'meter', 'missing'); }
    else if (!record(document.meter) || !integer(document.meter.numerator, 1, 32) || !integer(document.meter.denominator, 1, 32)
        || !isValidTabMeter({ numerator: document.meter.numerator, denominator: document.meter.denominator })) {
        reason ??= 'invalid-meter'; add('metadata', 'meter-value', 'meter');
    } else {
        barLength = fromTabFraction({ numerator: 4 * document.meter.numerator, denominator: document.meter.denominator }, false)!;
        model = { kind: 'regular-bar-origins', meter: { numerator: document.meter.numerator, denominator: document.meter.denominator }, barLength: serializeExactTime(barLength), offsetDomain: 'nonnegative-authored-fractions' };
    }
    if (!integer(document.measureCount, 1, 1024)) { reason ??= 'invalid-measure-count'; unreadable = true; add('population', 'measure-count', 'measureCount'); }
    if (!integer(measure, 1, 1024) || (integer(document.measureCount, 1, 1024) && measure > document.measureCount)) {
        reason ??= 'invalid-measure'; add('population', 'measure-value', 'measure');
    }
    if (!reason && barLength) projectionWindow = { start: serializeExactTime(multiply(barLength, measure - 1)), end: serializeExactTime(multiply(barLength, measure)) };
    if (!Array.isArray(document.moments)) { unreadable = true; add('population', 'positions-shape', 'moments'); return result(); }
    const positionCounts = new Map<string, number>(), noteCounts = new Map<string, number>();
    for (const raw of document.moments) {
        if (!record(raw)) continue;
        if (identifier(raw.id)) positionCounts.set(raw.id, (positionCounts.get(raw.id) ?? 0) + 1);
        if (Array.isArray(raw.notes)) for (const note of raw.notes) if (record(note) && identifier(note.id)) noteCounts.set(note.id, (noteCounts.get(note.id) ?? 0) + 1);
    }
    for (const [momentIndex, raw] of document.moments.entries()) {
        const path = `moments.${momentIndex}`;
        sourceFacts.positions.push({ momentIndex, value: copy(raw, path) ?? null });
        if (!record(raw)) { unreadable = true; add('population', 'position-ownership', `${path}.measure`); continue; }
        const sourceMeasure = integer(raw.measure, 1, 1024) && integer(document.measureCount, 1, 1024) && raw.measure <= document.measureCount ? raw.measure : null;
        if (sourceMeasure === null) { unreadable = true; add('population', 'position-ownership', `${path}.measure`); }
        for (const kind of ['rest', 'mutes', 'sustains'] as const) if (raw[kind] !== undefined) keepMarker(kind, raw[kind], momentIndex);
        if (!Array.isArray(raw.notes)) { unreadable = true; add('population', 'notes-shape', `${path}.notes`); continue; }
        sourceNoteCount += raw.notes.length;
        const validPosition = identifier(raw.id) && positionCounts.get(raw.id) === 1;
        if (!validPosition) add(raw.notes.length ? 'note' : 'metadata', identifier(raw.id) ? 'duplicate-position-id' : 'position-id', `${path}.id`);
        const localStart = fromTabFraction(raw.beatOffset, true);
        const origin = sourceMeasure !== null && barLength ? multiply(barLength, sourceMeasure - 1) : null;
        if (localStart && barLength && sourceMeasure !== null && compareExactTimes(localStart, barLength) >= 0) {
            projectionDiagnostics.push({ code: 'offset-outside-projected-bar', momentIndex, momentId: identifier(raw.id) ? raw.id : null, sourceMeasure, offset: serializeExactTime(localStart), barLength: serializeExactTime(barLength) });
        }
        if (!raw.notes.length && raw.beatOffset !== undefined && !localStart) add('metadata', 'start-value', `${path}.beatOffset`);
        for (const [noteIndex, note] of raw.notes.entries()) {
            const notePath = `${path}.notes.${noteIndex}`;
            const unresolved: TabAcrossBarsWrittenCoverageFact = { momentIndex, noteIndex, sourceMeasure, kind: 'unresolved' };
            if (!record(note)) { add('note', 'note-shape', notePath); coverageFacts.push(unresolved); continue; }
            if (note.techniques !== undefined) keepMarker('techniques', note.techniques, momentIndex, noteIndex);
            let valid = validPosition && sourceMeasure !== null;
            if (!identifier(note.id) || noteCounts.get(note.id) !== 1) { valid = false; add('note', identifier(note.id) ? 'duplicate-note-id' : 'note-id', `${notePath}.id`); }
            if (!integer(note.string, 0, 5)) { valid = false; add('note', 'note-string', `${notePath}.string`); }
            if (!integer(note.midi, 0, 127)) { valid = false; add('note', 'note-midi', `${notePath}.midi`); }
            const duration = fromTabFraction(note.duration, false);
            if (!localStart) add('note', raw.beatOffset === undefined ? 'missing-start' : 'start-value', `${path}.beatOffset`, raw.beatOffset === undefined ? 'missing' : 'invalid');
            if (!duration) add('note', note.duration === undefined ? 'missing-duration' : 'duration-value', `${notePath}.duration`, note.duration === undefined ? 'missing' : 'invalid');
            const start = localStart && origin ? addExactTimes(origin, localStart) : null;
            if (valid && !reason && origin && sourceMeasure !== null) {
                if (start && duration) {
                    const end = addExactTimes(start, duration);
                    const interval: TabAcrossBarsWrittenNoteInterval = { momentId: raw.id as string, noteId: note.id as string, momentIndex, noteIndex, sourceMeasure, sourceStart: serializeExactTime(localStart!), string: note.string as number, midi: note.midi as number, start: serializeExactTime(start), duration: serializeExactTime(duration), end: serializeExactTime(end) };
                    intervals.push(interval); endpoint(start, interval.noteId, 'starts'); endpoint(end, interval.noteId, 'ends'); continue;
                }
                if (start && note.duration === undefined) { coverageFacts.push({ momentIndex, noteIndex, sourceMeasure, kind: 'known-global-start', start: serializeExactTime(start) }); continue; }
                if (raw.beatOffset === undefined && (duration || note.duration === undefined)) {
                    coverageFacts.push({ momentIndex, noteIndex, sourceMeasure, kind: 'bar-origin-lower-bound', lowerBound: serializeExactTime(origin) }); continue;
                }
            }
            coverageFacts.push(unresolved);
        }
    }
    return result();
}

/** Complete is relative to the explicit model and all nominal source occurrences. */
export function inspectTabAcrossBarsWrittenNotesAt(snapshot: TabAcrossBarsWrittenTimeSnapshot, globalTime: unknown): TabAcrossBarsWrittenNotesInspection {
    const query = parseExactTime(globalTime);
    if (!query) return { status: 'invalid-query', reason: 'invalid-time' };
    const data = snapshot.data;
    if (data.status === 'unavailable') return { status: 'unavailable', reason: data.reason! };
    const window = data.projectionWindow!;
    if (compareExactTimes(query, parseExactTime(window.start)!) < 0 || compareExactTimes(query, parseExactTime(window.end)!) >= 0) return { status: 'outside-window', reason: 'outside-projection-window' };
    if (data.populationCoverage === 'unreadable') return { status: 'unreadable', reason: 'unreadable-population' };
    const excluded: TabAcrossBarsWrittenExclusionFact[] = [];
    if (data.populationCoverage === 'partial') {
        if (!data.coverageFacts.length || data.intervals.length + data.coverageFacts.length !== data.sourceNoteCount) return { status: 'partial', reason: 'incomplete-source-notes' };
        for (const fact of data.coverageFacts) {
            const boundary = fact.kind === 'known-global-start' ? parseExactTime(fact.start) : fact.kind === 'bar-origin-lower-bound' ? parseExactTime(fact.lowerBound) : null;
            if (!boundary || compareExactTimes(query, boundary) >= 0) return { status: 'partial', reason: 'incomplete-source-notes' };
            if (fact.kind !== 'unresolved') excluded.push(fact);
        }
    }
    if (!data.observedRange) return { status: 'outside-range', reason: 'no-observed-range' };
    if (compareExactTimes(query, parseExactTime(data.observedRange.start)!) < 0 || compareExactTimes(query, parseExactTime(data.observedRange.end)!) >= 0) return { status: 'outside-range', reason: 'outside-observed-range' };
    const notes = data.intervals.filter(note => compareExactTimes(parseExactTime(note.start)!, query) <= 0 && compareExactTimes(query, parseExactTime(note.end)!) < 0);
    return freezeData({ status: 'complete', notes, proof: { basis: data.populationCoverage === 'complete' ? 'whole-population' as const : 'onset-exclusion' as const, excluded } });
}

/** Window edges and proof boundaries are inspection choices, never note onsets. */
export function getTabAcrossBarsWrittenInspectionPoints(snapshot: TabAcrossBarsWrittenTimeSnapshot): readonly TabExactFraction[] {
    const data = snapshot.data;
    if (data.status === 'unavailable' || data.populationCoverage === 'unreadable' || !data.observedRange || !data.projectionWindow) return Object.freeze([]);
    const start = parseExactTime(data.projectionWindow.start)!, end = parseExactTime(data.projectionWindow.end)!;
    const points = new Map<string, ExactTime>();
    const add = (value: TabExactFraction) => {
        const time = parseExactTime(value);
        if (!time || compareExactTimes(time, start) < 0 || compareExactTimes(time, end) > 0) return;
        points.set(`${time.numerator}/${time.denominator}`, time);
    };
    data.endpointDeltas.forEach(delta => add(delta.time));
    data.coverageFacts.forEach(fact => { if (fact.kind === 'known-global-start') add(fact.start); else if (fact.kind === 'bar-origin-lower-bound') add(fact.lowerBound); });
    add(data.projectionWindow.start); add(data.projectionWindow.end);
    return freezeData([...points.values()].sort(compareExactTimes).map(serializeExactTime));
}
