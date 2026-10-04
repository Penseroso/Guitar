import type { TabDocument, TabFraction, TabMeter, TabMoment, TabNote } from './types';

const validString = (string: number) => Number.isInteger(string) && string >= 0 && string < 6;
const equalFraction = (left: TabFraction | undefined, right: TabFraction | undefined) => left?.numerator === right?.numerator && left?.denominator === right?.denominator;

export function normalizeTabFraction(value: TabFraction, allowZero = false): TabFraction | null {
    if (!value || !Number.isInteger(value.numerator) || !Number.isInteger(value.denominator)
        || value.numerator < (allowZero ? 0 : 1) || value.numerator > 1024 || value.denominator < 1 || value.denominator > 1024) return null;
    let a = value.numerator, b = value.denominator;
    while (b) [a, b] = [b, a % b];
    return { numerator: value.numerator / a, denominator: value.denominator / a };
}

export function isValidTabMeter(meter: TabMeter): boolean {
    return Boolean(meter && Number.isInteger(meter.numerator) && meter.numerator >= 1 && meter.numerator <= 32
        && [1, 2, 4, 8, 16, 32].includes(meter.denominator));
}

/** A blank placeholder is unknown input, not evidence that an earlier note continues. */
const isBlank = (moment: TabMoment) => !moment.notes.length && !moment.mutes?.length && !moment.sustains?.length && !moment.rest;

/** Remove broken links after edits. IDs identify authored relations; order never supplies duration. */
export function sanitizeTabLinks(moments: TabMoment[], invalidated: ReadonlySet<string> = new Set()): TabMoment[] {
    const notes = new Map<string, { note: TabNote; index: number }>();
    moments.forEach((moment, index) => moment.notes.forEach(note => notes.set(note.id, { note, index })));
    const active = new Map<number, string>();
    return moments.map((moment, index) => {
        // Unknown placeholders cannot revoke a user's explicit continuation.
        // Only an authored interruption disproves the existing relation.
        if (moment.rest) active.clear();
        const sustains = moment.sustains?.filter(sustain => {
            const origin = notes.get(sustain.noteId);
            return origin && origin.index < index && !invalidated.has(sustain.noteId)
                && active.get(origin.note.string) === sustain.noteId
                && !moment.notes.some(note => note.string === origin.note.string)
                && !moment.mutes?.some(mute => mute.string === origin.note.string) && !moment.rest;
        });
        for (const mute of moment.mutes ?? []) active.delete(mute.string);
        const cleanedNotes = moment.notes.map(note => {
            if (!note.techniques) return note;
            const techniques = note.techniques.filter(technique => {
                if (!('toNoteId' in technique)) return !invalidated.has(note.id);
                const target = notes.get(technique.toNoteId);
                if (invalidated.has(note.id) || invalidated.has(technique.toNoteId) || !target
                    || target.index <= index || target.note.string !== note.string) return false;
                return !moments.slice(index + 1, target.index).some(between => between.rest
                    || between.notes.some(item => item.string === note.string)
                    || between.mutes?.some(mute => mute.string === note.string));
            });
            if (techniques.length === note.techniques.length) return note;
            const cleaned = { ...note };
            if (techniques.length) cleaned.techniques = techniques;
            else delete cleaned.techniques;
            return cleaned;
        });
        cleanedNotes.forEach(note => active.set(note.string, note.id));
        const notesChanged = cleanedNotes.some((note, offset) => note !== moment.notes[offset]);
        const sustainsChanged = Boolean(moment.sustains && sustains?.length !== moment.sustains.length);
        if (!notesChanged && !sustainsChanged) return moment;
        const cleaned = { ...moment, notes: notesChanged ? cleanedNotes : moment.notes };
        if (sustainsChanged) {
            if (sustains?.length) cleaned.sustains = sustains;
            else delete cleaned.sustains;
        }
        return cleaned;
    });
}

function updateMoment(document: TabDocument, momentId: string, change: (moment: TabMoment, index: number) => TabMoment): TabDocument {
    const index = document.moments.findIndex(moment => moment.id === momentId);
    if (index < 0) return document;
    const changed = change(document.moments[index], index);
    if (changed === document.moments[index]) return document;
    return { ...document, format: 'authored', moments: sanitizeTabLinks(document.moments.map((moment, offset) => offset === index ? changed : moment)) };
}

export function setTabMeter(document: TabDocument, meter: TabMeter | undefined): TabDocument {
    if (meter && !isValidTabMeter(meter)) return document;
    if (equalFraction(document.meter, meter)) return document;
    const changed = { ...document, format: 'authored' as const };
    if (meter) changed.meter = { ...meter };
    else delete changed.meter;
    return changed;
}

export function setTabBeatOffset(document: TabDocument, momentId: string, value: TabFraction | undefined): TabDocument {
    const offset = value && normalizeTabFraction(value, true);
    if (value && !offset) return document;
    return updateMoment(document, momentId, moment => {
        if (equalFraction(moment.beatOffset, offset || undefined)) return moment;
        const changed = { ...moment };
        if (offset) changed.beatOffset = offset;
        else delete changed.beatOffset;
        return changed;
    });
}

export function setTabDuration(document: TabDocument, momentId: string, string: number, value: TabFraction | undefined): TabDocument {
    if (!validString(string)) return document;
    const duration = value && normalizeTabFraction(value);
    if (value && !duration) return document;
    const apply = <T extends { duration?: TabFraction }>(entry: T): T => {
        if (equalFraction(entry.duration, duration || undefined)) return entry;
        const changed = { ...entry };
        if (duration) changed.duration = duration;
        else delete changed.duration;
        return changed;
    };
    return updateMoment(document, momentId, moment => {
        if (moment.rest) {
            const rest = apply(moment.rest);
            return rest === moment.rest ? moment : { ...moment, rest };
        }
        const note = moment.notes.find(note => note.string === string);
        if (note) {
            const changed = apply(note);
            return changed === note ? moment : { ...moment, notes: moment.notes.map(item => item === note ? changed : item) };
        }
        const sustain = moment.sustains?.find(sustain => document.moments.some(item => item.notes.some(note => note.id === sustain.noteId && note.string === string)));
        if (!sustain) return moment;
        const changed = apply(sustain);
        return changed === sustain ? moment : { ...moment, sustains: moment.sustains!.map(item => item === sustain ? changed : item) };
    });
}

export function setTabRest(document: TabDocument, momentId: string, enabled: boolean): TabDocument {
    return updateMoment(document, momentId, moment => {
        if (Boolean(moment.rest) === enabled) return moment;
        const changed = { ...moment };
        if (enabled) {
            changed.notes = []; changed.rest = {};
            delete changed.mutes; delete changed.sustains;
        } else delete changed.rest;
        return changed;
    });
}

export function setTabMute(document: TabDocument, momentId: string, string: number, enabled: boolean): TabDocument {
    if (!validString(string)) return document;
    const sourceString = (noteId: string) => document.moments.flatMap(moment => moment.notes).find(note => note.id === noteId)?.string;
    return updateMoment(document, momentId, moment => {
        if (Boolean(moment.mutes?.some(mute => mute.string === string)) === enabled) return moment;
        const changed = { ...moment };
        const mutes = (moment.mutes ?? []).filter(mute => mute.string !== string);
        if (enabled) {
            mutes.push({ string }); mutes.sort((a, b) => a.string - b.string);
            changed.notes = moment.notes.filter(note => note.string !== string);
            const sustains = moment.sustains?.filter(sustain => sourceString(sustain.noteId) !== string);
            if (sustains?.length) changed.sustains = sustains; else delete changed.sustains;
            delete changed.rest;
        }
        if (mutes.length) changed.mutes = mutes; else delete changed.mutes;
        return changed;
    });
}

function previousSustainNote(document: TabDocument, index: number, string: number): TabNote | undefined {
    const noteLookup = new Map(document.moments.flatMap(moment => moment.notes).map(note => [note.id, note]));
    for (let before = index - 1; before >= 0; before--) {
        const previous = document.moments[before];
        if (previous.rest || isBlank(previous) || previous.mutes?.some(mute => mute.string === string)) return undefined;
        const origin = previous.notes.find(note => note.string === string)
            ?? noteLookup.get(previous.sustains?.find(sustain => noteLookup.get(sustain.noteId)?.string === string)?.noteId ?? '');
        if (origin) return origin;
    }
    return undefined;
}

export function canSustainFromPrevious(document: TabDocument, momentId: string, string: number): boolean {
    if (!validString(string)) return false;
    const index = document.moments.findIndex(moment => moment.id === momentId);
    if (index < 0) return false;
    const origin = previousSustainNote(document, index, string);
    const current = document.moments[index].notes.find(note => note.string === string);
    return Boolean(origin && (!current || current.midi === origin.midi));
}

export function setTabSustain(document: TabDocument, momentId: string, string: number, enabled: boolean): TabDocument {
    if (!validString(string)) return document;
    const noteLookup = new Map(document.moments.flatMap(moment => moment.notes).map(note => [note.id, note]));
    return updateMoment(document, momentId, (moment, index) => {
        const existing = moment.sustains?.find(sustain => noteLookup.get(sustain.noteId)?.string === string);
        if (Boolean(existing) === enabled) return moment;
        let origin: TabNote | undefined;
        if (enabled) {
            origin = previousSustainNote(document, index, string);
            if (!origin) return moment;
            const current = moment.notes.find(note => note.string === string);
            if (current && current.midi !== origin.midi) return moment;
        }
        const changed = { ...moment };
        const sustains = (moment.sustains ?? []).filter(sustain => noteLookup.get(sustain.noteId)?.string !== string);
        if (origin) {
            const current = moment.notes.find(note => note.string === string);
            sustains.push({ noteId: origin.id, ...(current?.duration ? { duration: current.duration } : {}) });
            changed.notes = moment.notes.filter(note => note.string !== string);
            const mutes = moment.mutes?.filter(mute => mute.string !== string);
            if (mutes?.length) changed.mutes = mutes; else delete changed.mutes;
            delete changed.rest;
        }
        if (sustains.length) changed.sustains = sustains; else delete changed.sustains;
        return changed;
    });
}
