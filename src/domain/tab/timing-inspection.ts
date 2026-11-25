import { isValidTabMeter, normalizeTabFraction } from './input-capabilities';

export interface TabTimingTarget { momentId: string; noteId?: string; string?: number }
export interface TabTimingIssue {
    kind: 'missing' | 'invalid';
    code: string;
    message: string;
    target?: TabTimingTarget;
}
export interface TabTimingInspection {
    timingInput: 'none' | 'some' | 'unreadable';
    issues: TabTimingIssue[];
    summary: { missing: number; invalid: number };
}
type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => typeof value === 'object' && value !== null && !Array.isArray(value);
const id = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const stringIndex = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 0 && Number(value) < 6;
const fraction = (value: unknown, zero: boolean) => record(value)
    && typeof value.numerator === 'number' && typeof value.denominator === 'number'
    && normalizeTabFraction({ numerator: value.numerator, denominator: value.denominator }, zero) !== null;

/** Inspect ordinary JSON-like input without repairs, inference, normalization or mutation. */
export function inspectTabTiming(input: unknown): TabTimingInspection {
    const issues: TabTimingIssue[] = [];
    const result = (timingInput: TabTimingInspection['timingInput']): TabTimingInspection => ({
        timingInput, issues, summary: {
            missing: issues.filter(issue => issue.kind === 'missing').length,
            invalid: issues.filter(issue => issue.kind === 'invalid').length,
        },
    });
    const add = (code: string, message: string, target?: TabTimingTarget, kind: TabTimingIssue['kind'] = 'invalid') => {
        issues.push({ code, message, ...(target ? { target } : {}), kind });
    };
    if (!record(input)) { add('document-shape', 'The score cannot be inspected.'); return result('unreadable'); }
    if (input.meter !== undefined && (!record(input.meter)
        || typeof input.meter.numerator !== 'number' || typeof input.meter.denominator !== 'number'
        || !isValidTabMeter({ numerator: input.meter.numerator, denominator: input.meter.denominator }))) {
        add('meter-value', 'Check the written time signature.');
    }
    if (!Array.isArray(input.moments)) { add('positions-shape', 'The score positions cannot be read.'); return result('unreadable'); }
    const moments = input.moments;
    const momentCounts = new Map<string, number>();
    const notes = new Map<string, { note: RecordValue; index: number }[]>();
    // Prefix counts make even many long-range links linear to inspect. Only authored
    // rests, valid-string attacks and mutes count; blanks and unreadable events do not.
    const interruptions = Array.from({ length: 6 }, () => [0]);
    let supplied = input.meter !== undefined;
    let eventCount = 0;
    for (const [index, moment] of moments.entries()) {
        const interrupted = new Set<number>();
        if (record(moment)) {
            if (id(moment.id)) momentCounts.set(moment.id, (momentCounts.get(moment.id) ?? 0) + 1);
            supplied ||= moment.beatOffset !== undefined;
            if (record(moment.rest)) for (let string = 0; string < 6; string++) interrupted.add(string);
            if (Array.isArray(moment.notes)) for (const note of moment.notes) {
                if (!record(note)) continue;
                supplied ||= note.duration !== undefined;
                if (stringIndex(note.string)) interrupted.add(note.string);
                if (id(note.id)) { const entries = notes.get(note.id) ?? []; entries.push({ note, index }); notes.set(note.id, entries); }
            }
            if (Array.isArray(moment.mutes)) for (const mute of moment.mutes) {
                if (record(mute) && stringIndex(mute.string)) interrupted.add(mute.string);
            }
            if (record(moment.rest)) supplied ||= moment.rest.duration !== undefined;
            if (Array.isArray(moment.sustains)) for (const sustain of moment.sustains) {
                if (record(sustain)) supplied ||= sustain.duration !== undefined;
            }
        }
        for (let string = 0; string < 6; string++) {
            interruptions[string].push(interruptions[string][index] + Number(interrupted.has(string)));
        }
    }
    const interruptedBetween = (start: number, end: number, string: unknown) => stringIndex(string)
        && interruptions[string][end] > interruptions[string][start + 1];
    const targetFor = (moment: RecordValue, note?: RecordValue, string?: unknown): TabTimingTarget | undefined => {
        if (!id(moment.id) || momentCounts.get(moment.id) !== 1) return undefined;
        if (note && (!id(note.id) || notes.get(note.id)?.length !== 1)) return undefined;
        return { momentId: moment.id, ...(note && id(note.id) ? { noteId: note.id } : {}),
            ...(stringIndex(string) ? { string } : {}) };
    };
    const length = (entry: RecordValue, target?: TabTimingTarget) => {
        if (entry.duration === undefined) {
            if (supplied) add('missing-duration', 'Duration is not supplied.', target, 'missing');
        } else if (!fraction(entry.duration, false)) add('duration-value', 'Check the written duration.', target);
    };
    const list = (value: unknown, code: string, target?: TabTimingTarget): unknown[] => {
        if (value === undefined) return [];
        if (Array.isArray(value)) return value;
        add(code, 'This event list cannot be read.', target); return [];
    };
    for (const [index, raw] of moments.entries()) {
        if (!record(raw)) { add('position-shape', `Position ${index + 1} cannot be read.`); continue; }
        const moment = raw, target = targetFor(moment);
        if (!id(moment.id)) add('position-id', `Position ${index + 1} needs an identifier.`);
        else if (momentCounts.get(moment.id)! > 1) add('duplicate-position-id', `Position ${index + 1} has a repeated identifier.`);
        const attacks = list(moment.notes, 'notes-shape', target);
        if (moment.notes === undefined) add('notes-shape', 'The position note list is missing.', target);
        const mutes = list(moment.mutes, 'mutes-shape', target);
        const sustains = list(moment.sustains, 'sustains-shape', target);
        const hasRest = moment.rest !== undefined;
        const eventful = attacks.length > 0 || mutes.length > 0 || sustains.length > 0 || hasRest;
        if (eventful) eventCount++;
        if (moment.beatOffset !== undefined) {
            if (!fraction(moment.beatOffset, true)) add('offset-value', 'Check the written start position.', target);
        } else if (eventful && supplied) add('missing-start', 'Start position is not supplied.', target, 'missing');
        if (hasRest) {
            if (!record(moment.rest)) add('rest-shape', 'The written rest cannot be read.', target);
            else length(moment.rest, target);
            if (attacks.length || mutes.length || sustains.length) add('rest-conflict', 'A whole-position rest also contains another event.', target);
        }
        const occupied = new Set<number>();
        const claim = (string: unknown, location?: TabTimingTarget) => {
            if (!stringIndex(string)) { add('string-value', 'Check the event string.', location); return; }
            if (occupied.has(string)) add('duplicate-string-event', 'More than one event occupies this string at the same position.', location);
            occupied.add(string);
        };
        for (const rawNote of attacks) {
            if (!record(rawNote)) { add('note-shape', 'A note cannot be read.', target); continue; }
            const note = rawNote, location = targetFor(moment, note, note.string);
            if (!id(note.id)) add('note-id', 'A note needs an identifier.', target);
            else if (notes.get(note.id)!.length > 1) add('duplicate-note-id', 'A note identifier is repeated.');
            claim(note.string, location ?? target); length(note, location ?? target);
            for (const technique of list(note.techniques, 'techniques-shape', location ?? target)) {
                if (!record(technique)) { add('technique-shape', 'A technique cannot be read.', location ?? target); continue; }
                if (typeof technique.kind !== 'string') { add('technique-shape', 'The technique kind cannot be read.', location ?? target); continue; }
                if (!['hammer-on', 'pull-off', 'slide'].includes(technique.kind)) continue;
                const endpoints = id(technique.toNoteId) ? notes.get(technique.toNoteId) : undefined;
                if (!endpoints || endpoints.length !== 1) add('technique-reference', 'The technique endpoint is missing or ambiguous.', location ?? target);
                else if (technique.toNoteId === note.id) add('technique-self-reference', 'A technique points to its own note.', location ?? target);
                else if (endpoints[0].index <= index) add('technique-order', 'The technique endpoint must be a later note.', location ?? target);
                else if (endpoints[0].note.string !== note.string) add('technique-string', 'The technique endpoint is on another string.', location ?? target);
                else if (interruptedBetween(index, endpoints[0].index, note.string)) add('technique-interrupted', 'An explicit rest, mute or new note interrupts this technique.', location ?? target);
            }
        }
        for (const mute of mutes) {
            if (!record(mute)) add('mute-shape', 'A mute cannot be read.', target);
            else claim(mute.string, targetFor(moment, undefined, mute.string));
        }
        for (const sustain of sustains) {
            if (!record(sustain)) { add('sustain-shape', 'A continuation cannot be read.', target); continue; }
            const origins = id(sustain.noteId) ? notes.get(sustain.noteId) : undefined;
            const origin = origins?.length === 1 ? origins[0] : undefined;
            const location = targetFor(moment, undefined, origin?.note.string);
            length(sustain, location);
            if (!origin) add('sustain-reference', 'The continuation origin is missing or ambiguous.', location);
            else {
                if (origin.index === index) add('sustain-self-reference', 'A continuation references a note at its own position.', location);
                else if (origin.index > index) add('sustain-future-reference', 'A continuation references a future note.', location);
                else if (interruptedBetween(origin.index, index, origin.note.string)) add('sustain-interrupted', 'An explicit rest, mute or new note interrupts this continuation.', location);
                claim(origin.note.string, location);
            }
        }
    }
    if (supplied && eventCount && input.meter === undefined) add('missing-meter', 'Time signature is not supplied.', undefined, 'missing');
    return result(supplied ? 'some' : 'none');
}
