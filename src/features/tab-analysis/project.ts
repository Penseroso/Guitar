import { z } from 'zod';
import { resolveChord, validateFrame } from '@/domain/harmony/roman';
import { resolveScaleRef } from '@/domain/scale/scale-ref';
import { MAX_EDITABLE_TAB_MOMENTS } from '@/domain/tab/editing';
import { compareExactTimes, parseExactTime } from '@/domain/tab/exact-time';
import { isValidTabMeter, sanitizeTabLinks } from '@/domain/tab/input-capabilities';
import { resolveSuppliedHarmony } from '@/domain/tab/supplied-harmony';
import { TAB_TUNINGS } from '@/domain/tab/types';
import type { TabAnalysisState } from './state';

export const PROJECT_EXTENSION = '.modus.json';
export const MAX_PROJECT_BYTES = 8 * 1024 * 1024;
const identifier = z.string().min(1).max(160);
const integer = (min: number, max = Number.MAX_SAFE_INTEGER) => z.int().min(min).max(max);
const revision = integer(0, Number.MAX_SAFE_INTEGER - 100_000);
const coord = z.object({ line: integer(1), column: integer(1) });
const fraction = (min: number) => z.object({ numerator: integer(min, 1024), denominator: integer(1, 1024) });
const exact = z.object({ numerator: z.string().max(64), denominator: z.string().max(64) });
const stringIndex = integer(0, 5);
const technique = z.discriminatedUnion('kind', [
    z.object({ kind: z.enum(['hammer-on', 'pull-off', 'slide']), toNoteId: identifier, notation: z.string().optional(), source: coord.optional() }),
    z.object({ kind: z.literal('vibrato'), notation: z.string(), source: coord.optional() }),
    z.object({ kind: z.enum(['bend', 'release']), targetFret: integer(0, 99), notation: z.string(), source: coord.optional() }),
]);
const note = z.object({
    id: identifier, string: stringIndex, fret: integer(0, 36), midi: integer(0, 127), pitchClass: integer(0, 11), source: coord.nullable(),
    duration: fraction(1).optional(), techniques: z.array(technique).optional(),
});
const moment = z.object({
    id: identifier, index: integer(0), measure: integer(1), column: integer(1), notes: z.array(note).max(6),
    beatOffset: fraction(0).optional(), rest: z.object({ duration: fraction(1).optional() }).optional(),
    mutes: z.array(z.object({ string: stringIndex, source: coord.optional() })).max(6).optional(),
    sustains: z.array(z.object({ noteId: identifier, duration: fraction(1).optional() })).max(6).optional(),
});
const chord = z.object({ root: identifier, chordId: identifier, bass: identifier.optional() });
const binding = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('positions'), firstId: identifier, lastId: identifier }),
    z.object({ kind: z.literal('written-time'), start: exact, end: exact, originsRevision: revision }),
]);
const schema = z.object({
    document: z.object({
        format: z.enum(['authored', 'ascii']), timing: z.literal('order-only'), source: z.string(), tuningMidi: z.array(integer(0, 127)).length(6),
        capo: integer(0, 12), moments: z.array(moment).min(1).max(MAX_EDITABLE_TAB_MOMENTS), measureCount: integer(1, MAX_EDITABLE_TAB_MOMENTS),
        meter: z.object({ numerator: integer(1), denominator: integer(1) }).refine(isValidTabMeter).optional(),
    }),
    documentName: z.string(), source: z.string(), sourceName: z.string(), tuningId: identifier,
    selection: z.object({ start: integer(0), end: integer(0) }).nullable(),
    activeCell: z.object({ momentId: identifier, string: stringIndex }).nullable(),
    context: z.object({
        scale: z.object({ group: identifier, scaleId: identifier, tonic: integer(0, 11) }).nullable(), chord: chord.nullable(),
        frame: z.object({ tonic: identifier, mode: z.enum(['major', 'minor']), lens: z.enum(['jazz-pop', 'classical']) }).nullable(),
    }),
    scoreId: revision, originsRevision: revision, nextId: revision,
    suppliedHarmony: z.array(z.object({ id: identifier, scoreId: revision, chord, binding })),
    reading: z.object({ mode: z.enum(['positions', 'written-time']), ids: z.array(identifier).max(6 * MAX_EDITABLE_TAB_MOMENTS) }),
});
export type TabProject = z.infer<typeof schema>;
export type ProjectReading = TabProject['reading'];

function verify(project: TabProject) {
    const { document, selection, context, reading, nextId } = project;
    const bad = () => { throw new Error('The project contains inconsistent score or analysis data.'); };
    const tuning = TAB_TUNINGS.find(item => item.id === project.tuningId);
    if (!tuning || document.tuningMidi.some((midi, i) => midi !== tuning.midi[i])) bad();
    const ids = new Set<string>(), notes = new Set<string>(), positions = new Set<string>();
    // Include missing position endpoints: a later edit must never reclaim a deleted endpoint.
    const checkAllocation = (id: string) => {
        const generated = /^(?:edit-note|edit-moment|supplied-chord)-(\d+)$/.exec(id);
        if (generated && Number(generated[1]) >= nextId) bad();
    };
    const register = (id: string) => {
        if (ids.has(id)) bad();
        ids.add(id);
        checkAllocation(id);
    };
    let measure = 0;
    for (const [i, m] of document.moments.entries()) {
        if (m.index !== i || m.measure < measure || m.measure > measure + 1) bad();
        measure = m.measure;
        register(m.id);
        positions.add(m.id);
        const strings = [...m.notes, ...(m.mutes ?? [])].map(event => event.string);
        if (new Set(strings).size !== strings.length || (m.rest && (strings.length || m.sustains?.length))) bad();
        if (m.sustains && new Set(m.sustains.map(s => s.noteId)).size !== m.sustains.length) bad();
        for (const n of m.notes) {
            register(n.id);
            notes.add(n.id);
            if (n.midi !== document.tuningMidi[n.string] + document.capo + n.fret || n.pitchClass !== n.midi % 12) bad();
        }
    }
    if (measure !== document.measureCount || sanitizeTabLinks(document.moments).some((m, i) => m !== document.moments[i])) bad();
    if (selection && (selection.start > selection.end || selection.end >= document.moments.length)) bad();
    if (project.activeCell && !positions.has(project.activeCell.momentId)) bad();
    if (context.scale && !resolveScaleRef(context.scale)) bad();
    if (context.chord) { if (!selection) bad(); resolveChord(context.chord); }
    if (context.frame) validateFrame(context.frame);
    if (reading.ids.some(id => !notes.has(id)) || new Set(reading.ids).size !== reading.ids.length) bad();
    if (Math.max(project.originsRevision, project.scoreId) >= nextId) bad();
    for (const entry of project.suppliedHarmony) {
        register(entry.id);
        if (entry.scoreId !== project.scoreId) bad();
        const b = entry.binding;
        if (b.kind === 'positions') { checkAllocation(b.firstId); checkAllocation(b.lastId); }
        else {
            const start = parseExactTime(b.start), end = parseExactTime(b.end);
            if (!start || !end || start.numerator < 0n || compareExactTimes(start, end) >= 0 || b.originsRevision >= nextId) bad();
        }
    }
    // Unresolved rows are legitimate after deleting a boundary or changing the meter.
    const rows = resolveSuppliedHarmony(document, project.scoreId, project.originsRevision, project.suppliedHarmony);
    if (rows.some(row => !row.chord)) bad();
    const ranges = rows.flatMap(row => row.placement?.kind === 'positions' ? [row.placement] : []).sort((a, b) => a.first - b.first);
    if (ranges.some((row, i) => i > 0 && ranges[i - 1].last >= row.first)) bad();
    const times = rows.flatMap(row => row.placement?.kind === 'written-time' ? [row.placement] : []).sort((a, b) => compareExactTimes(a.start, b.start));
    if (times.some((row, i) => i > 0 && compareExactTimes(times[i - 1].end, row.start) > 0)) bad();
}

export function encodeTabProject(state: TabAnalysisState): string {
    const { document, documentName, source, sourceName, tuningId, selection, activeCell, context, scoreId, originsRevision, nextId, suppliedHarmony, reading } = state;
    if (!document) throw new Error('Open or create a score first.');
    const text = JSON.stringify({ format: 'the-modus-tab', version: 1, project: {
        document, documentName, source, sourceName, tuningId, selection, activeCell, context, scoreId, originsRevision, nextId, suppliedHarmony, reading,
    } });
    if (new TextEncoder().encode(text).length > MAX_PROJECT_BYTES) throw new Error('The project exceeds the 8 MB file limit.');
    return text;
}

export function decodeTabProject(text: string): TabProject {
    if (new TextEncoder().encode(text).length > MAX_PROJECT_BYTES) throw new Error('The project exceeds the 8 MB file limit.');
    let file;
    try { file = JSON.parse(text); } catch { throw new Error('The file is not valid project JSON.'); }
    if (file?.format !== 'the-modus-tab') throw new Error('Choose a THE MODUS project file.');
    if (file.version !== 1) throw new Error('This project version is not supported.');
    const result = schema.safeParse(file.project);
    if (!result.success) throw new Error('The project is missing required data or contains invalid values.');
    verify(result.data);
    return result.data;
}
