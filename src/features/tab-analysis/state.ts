import {
    TAB_TUNINGS,
    type TabAnalysisContext, type TabDiagnostic, type TabDocument, type TabParseResult, type TabSelection, type TabFraction, type TabMeter,
} from '@/domain/tab/types';
import { setTabBeatOffset, setTabDuration, setTabMeter, setTabMute, setTabRest, setTabSustain } from '@/domain/tab/input-capabilities';
import { appendTabMeasures, createEmptyTabDocument, deleteTabMoment, deleteTabMoments, insertTabMoment, joinTabMeasure, retuneTabDocument, setTabFret, splitTabMeasure } from '@/domain/tab/editing';
import { analyzeTabSelection, type TabSelectionAnalysis } from '@/domain/tab/analysis';

export interface TabAnalysisSnapshot {
    document: TabDocument;
    context: TabAnalysisContext;
    selection: TabSelection;
    scope: 'all' | 'selection';
    result: TabSelectionAnalysis;
}

export interface TabActiveCell { momentId: string; string: number }
export interface TabEditSnapshot {
    document: TabDocument | null;
    documentName: string;
    tuningId: string;
    capo: number;
    selection: TabSelection | null;
    activeCell: TabActiveCell | null;
    analyzedSource: string | null;
}
export interface TabAnalysisState extends TabEditSnapshot {
    source: string;
    sourceName: string;
    diagnostics: TabDiagnostic[];
    context: TabAnalysisContext;
    editorOpen: boolean;
    nextId: number;
    past: TabEditSnapshot[];
    future: TabEditSnapshot[];
    analysis: TabAnalysisSnapshot | null;
    analysisStatus: 'idle' | 'fresh' | 'stale';
}

export type TabAnalysisAction =
    | { type: 'edit-source'; source: string }
    | { type: 'set-source'; source: string; name: string }
    | { type: 'set-tuning'; id: string }
    | { type: 'set-capo'; capo: number }
    | { type: 'parsed'; result: TabParseResult }
    | { type: 'select'; selection: TabSelection | null }
    | { type: 'set-active-cell'; cell: TabActiveCell }
    | { type: 'set-fret'; momentId: string; string: number; fret: number | null }
    | { type: 'set-meter'; meter: TabMeter | undefined }
    | { type: 'set-beat-offset'; momentId: string; offset: TabFraction | undefined }
    | { type: 'set-duration'; momentId: string; string: number; duration: TabFraction | undefined }
    | { type: 'set-rest'; momentId: string; enabled: boolean }
    | { type: 'set-mute' | 'set-sustain'; momentId: string; string: number; enabled: boolean }
    | { type: 'insert-moment'; afterId: string }
    | { type: 'delete-moment'; momentId: string }
    | { type: 'delete-moments'; momentIds: string[] }
    | { type: 'add-measures'; count: number }
    | { type: 'split-measure'; afterId: string }
    | { type: 'join-measure'; afterId: string }
    | { type: 'analyze'; scope?: 'all' | 'selection' }
    | { type: 'undo' | 'redo' }
    | { type: 'set-scale'; scale: TabAnalysisContext['scale'] }
    | { type: 'set-chord'; chord: TabAnalysisContext['chord'] }
    | { type: 'set-frame'; frame: TabAnalysisContext['frame'] }
    | { type: 'set-editor-open'; open: boolean }
    | { type: 'reset' };

export function createTabAnalysisState(): TabAnalysisState {
    const document = createEmptyTabDocument();
    return {
        source: '', sourceName: '', documentName: '', tuningId: 'standard', capo: 0,
        document, diagnostics: [], selection: { start: 0, end: 0 },
        activeCell: { momentId: document.moments[0].id, string: 0 },
        context: { scale: null, chord: null, frame: null },
        analyzedSource: null, editorOpen: false, nextId: 1, past: [], future: [], analysis: null, analysisStatus: 'idle',
    };
}

function snapshot(state: TabAnalysisState): TabEditSnapshot {
    const { document, documentName, tuningId, capo, selection, activeCell, analyzedSource } = state;
    return { document, documentName, tuningId, capo, selection, activeCell, analyzedSource };
}

function commit(state: TabAnalysisState, patch: Partial<TabAnalysisState>): TabAnalysisState {
    return {
        ...state, ...patch, diagnostics: [], context: { ...state.context, chord: null },
        past: [...state.past, snapshot(state)].slice(-100), future: [],
        analysisStatus: state.analysis ? 'stale' : 'idle',
    };
}

/** Keep surviving selected events; deleting an endpoint must not select a previously unselected neighbor. */
function mapSelection(state: TabAnalysisState, document: TabDocument): TabSelection | null {
    if (!state.selection || !state.document) return null;
    const selectedIds = new Set(state.document.moments.slice(state.selection.start, state.selection.end + 1).map(moment => moment.id));
    const retained = document.moments.filter(moment => selectedIds.has(moment.id)).map(moment => moment.index);
    if (retained.length) return { start: Math.min(...retained), end: Math.max(...retained) };
    const nearest = Math.min(state.selection.start, document.moments.length - 1);
    return { start: nearest, end: nearest };
}

function mapCell(state: TabAnalysisState, document: TabDocument): TabActiveCell {
    const current = state.activeCell;
    if (current && document.moments.some(moment => moment.id === current.momentId)) return current;
    const oldIndex = state.document?.moments.findIndex(moment => moment.id === current?.momentId) ?? 0;
    const index = Math.max(0, Math.min(oldIndex, document.moments.length - 1));
    return { momentId: document.moments[index].id, string: current?.string ?? 0 };
}

/** Imported empty measures are editable order positions, never invented rests. */
function normalizeImportedMeasures(document: TabDocument, nextId: number): { document: TabDocument; nextId: number } | null {
    if (!Number.isInteger(document.measureCount) || document.measureCount < 1 || document.measureCount > 1_024
        || document.moments.some(moment => !Number.isInteger(moment.measure) || moment.measure < 1 || moment.measure > document.measureCount)) return null;
    const grouped = new Map<number, TabDocument['moments']>();
    for (const moment of document.moments) {
        const entries = grouped.get(moment.measure) ?? [];
        entries.push(moment);
        grouped.set(moment.measure, entries);
    }
    const missing = document.measureCount - grouped.size;
    if (document.moments.length + missing > 1_024) return null;
    if (!missing) return { document, nextId };
    const ids = new Set(document.moments.map(moment => moment.id));
    const moments: TabDocument['moments'] = [];
    for (let measure = 1; measure <= document.measureCount; measure++) {
        const entries = grouped.get(measure);
        if (entries) moments.push(...entries);
        else {
            let id: string;
            do { id = `edit-moment-${nextId++}`; } while (ids.has(id));
            ids.add(id);
            moments.push({ id, index: moments.length, measure, column: 1, notes: [] });
        }
    }
    return { document: { ...document, moments: moments.map((moment, index) => moment.index === index ? moment : { ...moment, index }) }, nextId };
}

export function reduceTabAnalysis(state: TabAnalysisState, action: TabAnalysisAction): TabAnalysisState {
    switch (action.type) {
        case 'edit-source':
            return action.source === state.source ? state : { ...state, source: action.source, diagnostics: [], editorOpen: true };
        case 'set-source':
            return { ...state, source: action.source, sourceName: action.name, diagnostics: [], editorOpen: true };
        case 'set-tuning': {
            const tuning = TAB_TUNINGS.find(item => item.id === action.id);
            if (!tuning || action.id === state.tuningId || !state.document) return state;
            const document = retuneTabDocument(state.document, tuning.midi, state.capo);
            return document === state.document ? state : commit(state, { document, tuningId: action.id, analyzedSource: null });
        }
        case 'set-capo': {
            if (!state.document || action.capo === state.capo) return state;
            const document = retuneTabDocument(state.document, state.document.tuningMidi, action.capo);
            return document === state.document ? state : commit(state, { document, capo: action.capo, analyzedSource: null });
        }
        case 'parsed': {
            if (!action.result.ok) return { ...state, diagnostics: action.result.diagnostics, editorOpen: true };
            const { document: imported, diagnostics } = action.result;
            const tuning = TAB_TUNINGS.find(candidate => candidate.id === state.tuningId)!;
            if (imported.source !== state.source || imported.capo !== state.capo
                || imported.tuningMidi.length !== tuning.midi.length
                || imported.tuningMidi.some((pitch, index) => pitch !== tuning.midi[index])
                || imported.moments.length === 0 || imported.moments.length > 1_024) return state;
            const normalized = normalizeImportedMeasures(imported, state.nextId);
            if (!normalized) return state;
            const { document, nextId } = normalized;
            const first = document.moments[0];
            return {
                ...commit(state, { document, documentName: state.sourceName,
                    selection: { start: 0, end: 0 }, activeCell: { momentId: first.id, string: 0 },
                    analyzedSource: state.source, editorOpen: false, nextId }), diagnostics,
            };
        }
        case 'set-fret': {
            if (!state.document) return state;
            const document = setTabFret(state.document, action.momentId, action.string, action.fret, `edit-note-${state.nextId}`);
            return document === state.document ? state : commit(state, { document, analyzedSource: null, nextId: state.nextId + 1 });
        }
        case 'set-meter':
        case 'set-beat-offset':
        case 'set-duration':
        case 'set-rest':
        case 'set-mute':
        case 'set-sustain': {
            if (!state.document) return state;
            const document = action.type === 'set-meter' ? setTabMeter(state.document, action.meter)
                : action.type === 'set-beat-offset' ? setTabBeatOffset(state.document, action.momentId, action.offset)
                    : action.type === 'set-duration' ? setTabDuration(state.document, action.momentId, action.string, action.duration)
                        : action.type === 'set-rest' ? setTabRest(state.document, action.momentId, action.enabled)
                            : action.type === 'set-mute' ? setTabMute(state.document, action.momentId, action.string, action.enabled)
                                : setTabSustain(state.document, action.momentId, action.string, action.enabled);
            return document === state.document ? state : commit(state, { document, analyzedSource: null });
        }
        case 'insert-moment': {
            if (!state.document) return state;
            const document = insertTabMoment(state.document, action.afterId, `edit-moment-${state.nextId}`);
            return document === state.document ? state : commit(state, {
                document, selection: mapSelection(state, document), activeCell: mapCell(state, document),
                analyzedSource: null, nextId: state.nextId + 1,
            });
        }
        case 'delete-moment': {
            if (!state.document) return state;
            const document = deleteTabMoment(state.document, action.momentId);
            return document === state.document ? state : commit(state, {
                document, selection: mapSelection(state, document), activeCell: mapCell(state, document), analyzedSource: null,
            });
        }
        case 'delete-moments': {
            if (!state.document) return state;
            const document = deleteTabMoments(state.document, action.momentIds);
            if (document === state.document) return state;
            const selection = mapSelection(state, document);
            const mappedCell = mapCell(state, document);
            const activeIndex = document.moments.findIndex(moment => moment.id === mappedCell.momentId);
            const activeCell = selection && (activeIndex < selection.start || activeIndex > selection.end)
                ? { ...mappedCell, momentId: document.moments[selection.end].id } : mappedCell;
            return commit(state, {
                document, selection, activeCell, analyzedSource: null,
            });
        }
        case 'add-measures': {
            if (!state.document || !Number.isInteger(action.count) || action.count < 1 || action.count > 256) return state;
            const ids = Array.from({ length: action.count }, (_, offset) => `edit-moment-${state.nextId + offset}`);
            const document = appendTabMeasures(state.document, action.count, ids);
            const index = state.document.moments.length;
            return document === state.document ? state : commit(state, { document, analyzedSource: null, nextId: state.nextId + ids.length,
                selection: { start: index, end: index }, activeCell: { momentId: ids[0], string: state.activeCell?.string ?? 0 } });
        }
        case 'join-measure':
        case 'split-measure': {
            if (!state.document) return state;
            const document = action.type === 'join-measure' ? joinTabMeasure(state.document, action.afterId)
                : splitTabMeasure(state.document, action.afterId, `edit-moment-${state.nextId}`);
            return document === state.document ? state : commit(state, {
                document, selection: mapSelection(state, document), activeCell: mapCell(state, document),
                analyzedSource: null, nextId: state.nextId + 1,
            });
        }
        case 'analyze': {
            if (!state.document) return state;
            const scope = action.scope ?? 'all';
            const selection = scope === 'selection' ? state.selection : { start: 0, end: state.document.moments.length - 1 };
            if (!selection) return state;
            // A selection-scoped reference chord cannot be silently applied to the whole score.
            const context = { ...state.context, chord: scope === 'all' ? null : state.context.chord };
            return { ...state, analysis: { document: state.document, context, selection: { ...selection }, scope,
                result: analyzeTabSelection(state.document, selection, context) }, analysisStatus: 'fresh' };
        }
        case 'set-active-cell':
            if (!state.document || !Number.isInteger(action.cell.string) || action.cell.string < 0 || action.cell.string >= 6
                || !state.document.moments.some(moment => moment.id === action.cell.momentId)) return state;
            return { ...state, activeCell: { ...action.cell } };
        case 'undo': {
            const previous = state.past.at(-1);
            return previous ? { ...state, ...previous, diagnostics: [], context: { ...state.context, chord: null },
                analysisStatus: state.analysis ? 'stale' : 'idle',
                past: state.past.slice(0, -1), future: [snapshot(state), ...state.future].slice(0, 100) } : state;
        }
        case 'redo': {
            const next = state.future[0];
            return next ? { ...state, ...next, diagnostics: [], context: { ...state.context, chord: null },
                analysisStatus: state.analysis ? 'stale' : 'idle',
                past: [...state.past, snapshot(state)].slice(-100), future: state.future.slice(1) } : state;
        }
        case 'select': {
            const analysisStatus = state.analysis?.scope === 'selection' && state.context.chord
                ? 'stale' : state.analysisStatus;
            if (action.selection === null) return { ...state, selection: null, analysisStatus, context: { ...state.context, chord: null } };
            if (!state.document || !Number.isInteger(action.selection.start) || !Number.isInteger(action.selection.end)) return state;
            const start = Math.min(action.selection.start, action.selection.end), end = Math.max(action.selection.start, action.selection.end);
            if (start < 0 || end >= state.document.moments.length) return state;
            if (state.selection?.start === start && state.selection.end === end) return state;
            return { ...state, selection: { start, end }, analysisStatus, context: { ...state.context, chord: null } };
        }
        case 'set-scale':
            if (JSON.stringify(state.context.scale) === JSON.stringify(action.scale)) return state;
            return { ...state, analysisStatus: state.analysis ? 'stale' : 'idle', context: { ...state.context, scale: action.scale ? { ...action.scale } : null } };
        case 'set-chord':
            if (action.chord !== null && (!state.document || !state.selection)) return state;
            if (JSON.stringify(state.context.chord) === JSON.stringify(action.chord)) return state;
            return { ...state, analysisStatus: state.analysis ? 'stale' : 'idle', context: { ...state.context, chord: action.chord ? { ...action.chord } : null } };
        case 'set-frame':
            if (JSON.stringify(state.context.frame) === JSON.stringify(action.frame)) return state;
            return { ...state, analysisStatus: state.analysis ? 'stale' : 'idle', context: { ...state.context, frame: action.frame ? { ...action.frame } : null } };
        case 'set-editor-open':
            return { ...state, editorOpen: action.open };
        case 'reset':
            return createTabAnalysisState();
    }
}
