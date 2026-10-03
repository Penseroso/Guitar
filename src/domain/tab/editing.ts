import { TAB_TUNINGS, type TabDocument, type TabMoment } from './types';

export const MAX_EDITABLE_TAB_MOMENTS = 1_024;

export function createEmptyTabDocument(count = 8, measureCount = 1): TabDocument {
    const length = Number.isInteger(count) ? Math.max(1, Math.min(MAX_EDITABLE_TAB_MOMENTS, count)) : 8;
    const measures = Number.isInteger(measureCount) ? Math.max(1, Math.min(length, measureCount)) : 1;
    return {
        format: 'authored', timing: 'order-only', source: '',
        tuningMidi: [...TAB_TUNINGS[0].midi], capo: 0, measureCount: measures,
        moments: Array.from({ length }, (_, index) => ({
            id: `edit-moment-${index}`, index, measure: Math.floor(index * measures / length) + 1, column: index + 1, notes: [],
        })),
    };
}

function replaceMoments(document: TabDocument, moments: TabMoment[]): TabDocument {
    return {
        ...document, format: 'authored',
        moments: moments.map((moment, index) => moment.index === index ? moment : { ...moment, index }),
        measureCount: Math.max(document.measureCount, 1, ...moments.map(moment => moment.measure)),
    };
}

/** Invalid input and no-op edits return the original document without losing its provenance. */
export function setTabFret(document: TabDocument, momentId: string, string: number, fret: number | null, noteId: string): TabDocument {
    if (!Number.isInteger(string) || string < 0 || string >= 6) return document;
    if (fret !== null && (!Number.isInteger(fret) || fret < 0 || fret > 36)) return document;
    const index = document.moments.findIndex(moment => moment.id === momentId);
    if (index < 0) return document;
    const moment = document.moments[index];
    const old = moment.notes.find(note => note.string === string);
    if ((fret === null && !old) || old?.fret === fret) return document;
    const midi = document.tuningMidi[string] + document.capo + (fret ?? 0);
    if (!Number.isInteger(midi) || midi < 0 || midi > 127) return document;
    if (fret !== null && !old && document.moments.some(item => item.notes.some(note => note.id === noteId))) return document;
    const notes = moment.notes.filter(note => note.string !== string);
    if (fret !== null) notes.push({ id: old?.id ?? noteId, string, fret, midi, pitchClass: midi % 12, source: null });
    notes.sort((a, b) => a.string - b.string);
    return replaceMoments(document, document.moments.map((item, offset) => offset === index ? { ...item, notes } : item));
}

export function insertTabMoment(document: TabDocument, afterId: string, momentId: string): TabDocument {
    if (document.moments.length >= MAX_EDITABLE_TAB_MOMENTS || document.moments.some(moment => moment.id === momentId)) return document;
    const index = document.moments.findIndex(moment => moment.id === afterId);
    if (index < 0) return document;
    const after = document.moments[index];
    const moment: TabMoment = { id: momentId, index: index + 1, measure: after.measure, column: index + 2, notes: [] };
    const moments = [...document.moments];
    moments.splice(index + 1, 0, moment);
    return replaceMoments(document, moments);
}

/** Keep every measure editable: deleting its final position clears that position. */
export function deleteTabMoment(document: TabDocument, momentId: string): TabDocument {
    const moment = document.moments.find(item => item.id === momentId);
    if (!moment) return document;
    if (document.moments.filter(item => item.measure === moment.measure).length === 1) return moment.notes.length
        ? replaceMoments(document, document.moments.map(item => item.id === momentId ? { ...item, notes: [] } : item)) : document;
    return replaceMoments(document, document.moments.filter(item => item.id !== momentId));
}

/** Delete positions atomically, retaining one empty stable position in every explicit measure. */
export function deleteTabMoments(document: TabDocument, momentIds: readonly string[]): TabDocument {
    const selectedIds = new Set(momentIds);
    if (!document.moments.some(moment => selectedIds.has(moment.id))) return document;
    const measures = new Map<number, TabMoment[]>();
    for (const moment of document.moments) {
        const entries = measures.get(moment.measure) ?? [];
        entries.push(moment);
        measures.set(moment.measure, entries);
    }
    const retainedIds = new Set([...measures.values()]
        .filter(entries => entries.every(moment => selectedIds.has(moment.id)))
        .map(entries => entries[0].id));
    let changed = false;
    const moments = document.moments.flatMap(moment => {
        if (!selectedIds.has(moment.id)) return [moment];
        if (!retainedIds.has(moment.id)) {
            changed = true;
            return [];
        }
        if (!moment.notes.length) return [moment];
        changed = true;
        return [{ ...moment, notes: [] }];
    });
    if (!changed) return document;
    const columns = new Map<number, number>();
    return replaceMoments(document, moments.map(moment => {
        const column = (columns.get(moment.measure) ?? 0) + 1;
        columns.set(moment.measure, column);
        return moment.column === column ? moment : { ...moment, column };
    }));
}

/** Append explicitly authored measures. Positions establish order, never meter or duration. */
export function appendTabMeasures(document: TabDocument, count: number, momentIds: string[], positionsPerMeasure = 4): TabDocument {
    if (!Number.isInteger(count) || count < 1 || !Number.isInteger(positionsPerMeasure) || positionsPerMeasure < 1
        || momentIds.length !== count * positionsPerMeasure || document.moments.length + momentIds.length > MAX_EDITABLE_TAB_MOMENTS
        || document.measureCount + count > MAX_EDITABLE_TAB_MOMENTS
        || new Set(momentIds).size !== momentIds.length || momentIds.some(id => document.moments.some(moment => moment.id === id))) return document;
    const added = momentIds.map((id, offset): TabMoment => ({
        id, index: document.moments.length + offset, column: offset % positionsPerMeasure + 1,
        measure: document.measureCount + Math.floor(offset / positionsPerMeasure) + 1, notes: [],
    }));
    return replaceMoments({ ...document, measureCount: document.measureCount + count }, [...document.moments, ...added]);
}

/** Insert a barline after a position; splitting at a measure end creates an editable empty measure. */
export function splitTabMeasure(document: TabDocument, afterId: string, emptyMomentId: string): TabDocument {
    const index = document.moments.findIndex(moment => moment.id === afterId);
    if (index < 0 || document.measureCount >= MAX_EDITABLE_TAB_MOMENTS) return document;
    const measure = document.moments[index].measure;
    const hasTrailing = document.moments[index + 1]?.measure === measure;
    if (!hasTrailing && (document.moments.length >= MAX_EDITABLE_TAB_MOMENTS || document.moments.some(moment => moment.id === emptyMomentId))) return document;
    const moments = document.moments.map((moment, offset) => moment.measure > measure || (moment.measure === measure && offset > index)
        ? { ...moment, measure: moment.measure + 1 } : moment);
    if (!hasTrailing) moments.splice(index + 1, 0, { id: emptyMomentId, index: index + 1, measure: measure + 1, column: 1, notes: [] });
    return replaceMoments({ ...document, measureCount: document.measureCount + 1 }, moments);
}

export function retuneTabDocument(document: TabDocument, tuningMidi: readonly number[], capo: number): TabDocument {
    if (tuningMidi.length !== 6 || tuningMidi.some(midi => !Number.isInteger(midi) || midi < 0 || midi > 127)
        || !Number.isInteger(capo) || capo < 0 || capo > 12) return document;
    if (document.capo === capo && document.tuningMidi.every((midi, index) => midi === tuningMidi[index])) return document;
    if (document.moments.some(moment => moment.notes.some(note => tuningMidi[note.string] + capo + note.fret > 127))) return document;
    return {
        ...document, format: 'authored', tuningMidi: [...tuningMidi], capo,
        moments: document.moments.map(moment => ({ ...moment, notes: moment.notes.map(note => {
            const midi = tuningMidi[note.string] + capo + note.fret;
            return { ...note, midi, pitchClass: midi % 12 };
        }) })),
    };
}
