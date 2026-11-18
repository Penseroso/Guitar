"use client";

import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { TabDocument, TabFraction, TabMoment, TabNote, TabSelection } from '@/domain/tab/types';
import type { TabScoreAnnotation } from '@/domain/tab/annotations';
import type { TabAnalysisAction } from '@/features/tab-analysis/state';
import { TabMeasureEditor, TabNotationEditor, type TabNotationDraftState } from './TabNotationEditor';
import { inspectTabTiming, type TabTimingInspection, type TabTimingTarget } from '@/domain/tab/timing-inspection';
import { TimingInspectionPanel } from './TimingInspectionPanel';
import { observeTabWrittenTime, type TabWrittenTimeSnapshot } from '@/domain/tab/written-time';
import { WrittenTimePanel } from './WrittenTimePanel';
import { isValidTabMeter } from '@/domain/tab/input-capabilities';
import { observeTabAcrossBarsWrittenTime, type TabAcrossBarsWrittenTimeSnapshot } from '@/domain/tab/written-time-across-bars';
import { AcrossBarsWrittenTimePanel } from './AcrossBarsWrittenTimePanel';
import type { TabWrittenPointReferences } from '@/domain/tab/written-point-analysis';
import { resolveSuppliedHarmony, type SuppliedTabChord } from '@/domain/tab/supplied-harmony';
import { SuppliedHarmonyPanel } from './SuppliedHarmonyPanel';
import { resolveTabEvidence, type TabEvidenceTarget } from './tab-evidence';
import harmonyStyles from './supplied-harmony.module.css';
import acrossStyles from './across-bars-written-time.module.css';
import timingStyles from './timing-inspection.module.css';
import { getKeyName } from '@/domain/shared/keys';
import styles from './tab-score-editor.module.css';

export interface TabActiveCell { momentId: string; string: number }
export type TabDraftStatus = 'note' | 'mute' | 'empty' | 'invalid' | null;
interface Draft { cell: TabActiveCell; text: string; revision: number }
const cellKey = (cell: TabActiveCell) => `${cell.momentId}:${cell.string}`;
const durationDetail = (duration?: TabFraction) => duration ? `duration ${duration.numerator}/${duration.denominator} quarter notes` : '';

function focusEvidenceElement(element?: HTMLElement | null, block: ScrollLogicalPosition = 'nearest') {
    element?.focus({ preventScroll: true });
    element?.scrollIntoView?.({ block, inline: 'nearest', behavior: 'instant' });
}

function techniquePresentation(note: TabNote, notes: ReadonlyMap<string, TabNote>) {
    return (note.techniques ?? []).map(technique => {
        if (technique.kind === 'vibrato') return { mark: '~', detail: `vibrato ${technique.notation}` };
        if ('targetFret' in technique) return {
            mark: `${technique.kind === 'bend' ? 'b' : 'r'}${technique.targetFret}`,
            detail: `${technique.kind} target fret-equivalent ${technique.targetFret}; not a new attack`,
        };
        const target = notes.get(technique.toNoteId);
        const mark = technique.notation ?? (technique.kind === 'hammer-on' ? 'h' : technique.kind === 'pull-off' ? 'p' : target && target.fret < note.fret ? '\\' : '/');
        return { mark, detail: `${technique.kind}${target ? ` to fret ${target.fret}` : ''}` };
    });
}

export function TabScoreView({ document, selection, onSelect, extend, focusedNoteId,
    activeCell, onActiveCellChange, onSetFret, onUndo, onRedo,
    annotations = [], onInsertMoment, onDeleteMoments, onDraftStatusChange, onSetMute, onEdit, readingReferences, harmony, patternActions, scoreFooter,
}: {
    document: TabDocument;
    selection: TabSelection;
    onSelect: (selection: TabSelection) => void;
    extend: boolean;
    focusedNoteId: string | null;
    activeCell: TabActiveCell | null;
    onActiveCellChange: (cell: TabActiveCell) => void;
    onSetFret: (change: TabActiveCell & { fret: number | null }) => void;
    onSetMute?: (change: TabActiveCell & { enabled: boolean }) => void;
    onUndo: () => void;
    onRedo: () => void;
    annotations?: readonly TabScoreAnnotation[];
    onInsertMoment?: (afterId: string) => void;
    onDeleteMoments?: (momentIds: string[]) => void;
    onDraftStatusChange?: (status: TabDraftStatus) => void;
    onEdit?: (action: TabAnalysisAction) => void;
    readingReferences?: TabWrittenPointReferences;
    harmony?: { scoreId: number; originsRevision: number; suppliedHarmony: readonly SuppliedTabChord[] };
    patternActions?: React.ReactNode;
    scoreFooter?: React.ReactNode;
}) {
    const buttons = useRef(new Map<string, HTMLButtonElement>());
    const headers = useRef(new Map<string, HTMLButtonElement>());
    const insertionButtons = useRef(new Map<string, HTMLButtonElement>());
    const drag = useRef<{ pointerId: number; startId: string; moved: boolean; longPressed?: boolean } | null>(null);
    const hold = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number; pointerId: number } | null>(null);
    const skipHeaderClick = useRef(false);
    const pendingHeader = useRef<string | null>(null);
    const pendingInsertion = useRef<{ document: TabDocument; afterId: string; successorId: string | undefined; string: number } | null>(null);
    const pendingBar = useRef<TabDocument | null>(null);
    const pendingHistory = useRef<{ document: TabDocument; columns: boolean } | null>(null);
    const input = useRef<HTMLInputElement>(null);
    const notationDraft = useRef<TabNotationDraftState>({ dirty: false, composing: false });
    const [timingReport, setTimingReport] = useState<{ document: TabDocument; result: TabTimingInspection; serial: number } | null>(null);
    const [timingOpen, setTimingOpen] = useState(false);
    const [timingStale, setTimingStale] = useState(false);
    const [timingNotice, setTimingNotice] = useState<string | null>(null);
    const [writtenReport, setWrittenReport] = useState<
        | { kind: 'local'; snapshot: TabWrittenTimeSnapshot; serial: number }
        | { kind: 'across'; snapshot: TabAcrossBarsWrittenTimeSnapshot; serial: number }
        | null>(null);
    const [writtenStale, setWrittenStale] = useState<'score' | 'bar' | null>(null);
    const reportNotationDraft = useCallback((state: TabNotationDraftState) => {
        notationDraft.current = state;
        if (!state.dirty && !state.composing) setTimingNotice(null);
    }, []);
    const timingSerial = useRef(0);
    const checkButton = useRef<HTMLButtonElement>(null);
    const writtenButton = useRef<HTMLButtonElement>(null);
    const writtenSerial = useRef(0);
    const timingReturn = useRef<{ document: TabDocument; origin: HTMLButtonElement } | null>(null);
    const meterEditor = useRef<HTMLDivElement>(null);
    const positionEditor = useRef<HTMLDivElement>(null);
    const positionTriggers = useRef(new Map<string, HTMLButtonElement>());
    const anchor = useRef(selection.start);
    const emittedSelection = useRef(selection);
    const pendingFocus = useRef<string | null>(null);
    const inputSelection = useRef<'all' | 'end'>('end');
    const composing = useRef(false);
    const revision = useRef(0);
    const draftRef = useRef<Draft | null>(null);
    const [draft, setDraftState] = useState<Draft | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [openAnnotation, setOpenAnnotation] = useState<string | null>(null);
    const [columnMode, setColumnMode] = useState(false);
    const [insertionCursor, setInsertionCursor] = useState<string | null>(null);
    const [touchActions, setTouchActions] = useState<string | null>(null);
    const [meterBar, setMeterBar] = useState<number | null>(null);
    const [positionPopup, setPositionPopup] = useState<{ key: string; left: number; top: number } | null>(null);
    const harmonyControls = useRef<HTMLDivElement>(null);
    const writtenDetails = useRef<HTMLDivElement>(null);
    const timingDetails = useRef<HTMLDivElement>(null);
    const showDetails = useRef<'written' | 'timing' | null>(null);
    const chordRequestSerial = useRef(0);
    const [chordRequest, setChordRequest] = useState<{
        document: TabDocument; rows: ReturnType<typeof resolveSuppliedHarmony>;
        id: string; request: number; origin: HTMLButtonElement;
    } | null>(null);
    const [evidence, setEvidence] = useState<{
        document: TabDocument; from: 'harmony' | 'written';
        source: object | null; references: TabWrittenPointReferences | undefined;
        target: NonNullable<ReturnType<typeof resolveTabEvidence>>; origin: HTMLElement;
    } | null>(null);
    const [evidenceNotice, setEvidenceNotice] = useState<string | null>(null);
    const errorId = useId();
    const current = useMemo(() => activeCell && document.moments.some(moment => moment.id === activeCell.momentId)
        && activeCell.string >= 0 && activeCell.string < 6 ? activeCell
        : document.moments[0] ? { momentId: document.moments[0].id, string: 0 } : null, [activeCell, document]);
    const writtenMeasure = document.moments.find(moment => moment.id === current?.momentId)?.measure ?? document.moments[0]?.measure ?? 1;
    const writtenCurrent = writtenReport?.snapshot.sourceDocument === document && writtenReport.snapshot.data.scope.measure === writtenMeasure;
    const lower = Math.min(selection.start, selection.end), upper = Math.max(selection.start, selection.end);
    const insertionStop = document.moments.some(moment => moment.id === insertionCursor) ? insertionCursor : current?.momentId;
    const notesById = useMemo(() =>
        new Map(document.moments.flatMap(moment => moment.notes.map(note => [note.id, note] as const))), [document]);
    const sustainedAt = (moment: TabMoment, string: number) => moment.sustains?.find(sustain => notesById.get(sustain.noteId)?.string === string);
    const suppliedRows = useMemo(() => harmony?.suppliedHarmony.length
        ? resolveSuppliedHarmony(document, harmony.scoreId, harmony.originsRevision, harmony.suppliedHarmony) : [],
    [document, harmony?.scoreId, harmony?.originsRevision, harmony?.suppliedHarmony]);
    const currentEvidence = evidence?.document === document && evidence.references === readingReferences
        && (evidence.from === 'harmony' ? evidence.source === suppliedRows : writtenCurrent && evidence.source === writtenReport)
        ? evidence : null;
    const currentChordRequest = chordRequest?.document === document && chordRequest.rows === suppliedRows ? chordRequest : undefined;

    useLayoutEffect(() => {
        if (chordRequest && !currentChordRequest) setChordRequest(null);
    }, [chordRequest, currentChordRequest]);
    useLayoutEffect(() => {
        if (!evidence) return;
        if (!currentEvidence) {
            setEvidence(null);
            return;
        }
        const first = currentEvidence.target.notes[0];
        const firstMomentId = currentEvidence.target.firstMomentId;
        focusEvidenceElement(first ? buttons.current.get(cellKey(first)) : firstMomentId ? headers.current.get(firstMomentId) : undefined);
    }, [currentEvidence, evidence]);

    useLayoutEffect(() => {
        if (timingReport && timingReport.document !== document) {
            setTimingReport(null); setTimingOpen(false); setTimingStale(true); setTimingNotice(null); timingReturn.current = null;
        }
    }, [document, timingReport]);
    useLayoutEffect(() => {
        if (!writtenReport || writtenCurrent) return;
        setWrittenStale(writtenReport.snapshot.sourceDocument !== document ? 'score' : 'bar');
        setWrittenReport(null);
    }, [document, writtenCurrent, writtenReport]);
    useLayoutEffect(() => {
        const target = showDetails.current;
        showDetails.current = null;
        if (target === 'written') focusEvidenceElement(writtenDetails.current, 'start');
        if (target === 'timing') focusEvidenceElement(timingDetails.current, 'start');
    }, [writtenReport, timingReport]);
    const timingBlocked = () => {
        const edit = draftRef.current;
        const original = edit && document.moments.find(moment => moment.id === edit.cell.momentId);
        const originalText = original?.mutes?.some(mute => mute.string === edit?.cell.string) ? 'x'
            : original?.notes.find(note => note.string === edit?.cell.string)?.fret.toString() ?? '';
        return composing.current || notationDraft.current.composing || notationDraft.current.dirty
            || Boolean(edit && edit.text !== originalText);
    };
    const guardTiming = () => {
        if (!timingBlocked()) return true;
        setTimingNotice('Finish or cancel this input first.');
        return false;
    };
    const revealEvidence = (from: 'harmony' | 'written', target: TabEvidenceTarget, origin: HTMLElement) => {
        if (!guardTiming()) return;
        if (!origin.isConnected || (from === 'written' && !writtenCurrent)) return;
        const resolved = resolveTabEvidence(document, target);
        if (!resolved) {
            setEvidence(null);
            setEvidenceNotice('Source unavailable. Check the current score.');
            return;
        }
        if (draftRef.current) setDraft(null);
        setTimingNotice(null); setEvidenceNotice(null); timingReturn.current = null;
        setEvidence({
            document, from, source: from === 'harmony' ? suppliedRows : writtenReport,
            references: readingReferences, target: resolved, origin,
        });
    };
    const guardReadClick = (event: React.MouseEvent, from: 'harmony' | 'written') => {
        if (!guardTiming()) {
            event.preventDefault(); event.stopPropagation();
            return;
        }
        const control = event.target instanceof Element ? event.target.closest('button, summary') : null;
        if (control && !control.hasAttribute('data-evidence-action') && currentEvidence?.from === from) setEvidence(null);
    };
    const readControls = (from: 'harmony' | 'written') => ({
        'data-timing-controls': true,
        onPointerDownCapture: (event: React.PointerEvent) => {
            if (!guardTiming()) { event.preventDefault(); if (from === 'harmony') event.stopPropagation(); }
        },
        onKeyDownCapture: (event: React.KeyboardEvent) => {
            const activation = from === 'harmony' ? event.key !== 'Tab' : event.key === 'Enter' || event.key === ' ';
            if (activation && !guardTiming()) { event.preventDefault(); event.stopPropagation(); }
        },
        onClickCapture: (event: React.MouseEvent) => guardReadClick(event, from),
    });
    const hasProjectionMeter = Boolean(document.meter && isValidTabMeter(document.meter));
    const showWrittenTime = (kind: 'local' | 'across', focusDetails = false) => {
        if (!guardTiming() || (kind === 'across' && !hasProjectionMeter)) return;
        setPositionPopup(null); setMeterBar(null);
        // The shared guard permits closing only an unchanged fret draft.
        if (draftRef.current) setDraft(null);
        if (focusDetails) showDetails.current = 'written';
        const serial = ++writtenSerial.current;
        setWrittenReport(kind === 'local'
            ? { kind, snapshot: observeTabWrittenTime(document, writtenMeasure), serial }
            : { kind, snapshot: observeTabAcrossBarsWrittenTime(document, writtenMeasure, { model: 'regular-bar-origins' }), serial });
        setWrittenStale(null); setTimingNotice(null);
    };
    const closeWrittenTime = () => {
        if (!guardTiming()) return;
        setWrittenReport(null); setWrittenStale(null); focusEvidenceElement(writtenButton.current);
    };
    const closeTiming = () => {
        if (!guardTiming()) return;
        setTimingOpen(false); timingReturn.current = null; focusEvidenceElement(checkButton.current);
    };
    const navigateTiming = (target: TabTimingTarget, origin: HTMLButtonElement) => {
        if (!guardTiming() || timingReport?.document !== document) return;
        const matches = document.moments.filter(moment => moment.id === target.momentId);
        if (matches.length !== 1 || (target.noteId && document.moments.flatMap(moment => moment.notes).filter(note => note.id === target.noteId).length !== 1)) return;
        const cell = { momentId: target.momentId, string: target.string ?? 0 };
        // A clean, unchanged fret input may be closed without writing the score.
        if (draftRef.current) setDraft(null);
        setEvidence(null); setEvidenceNotice(null);
        choose(cell, false, target.string === undefined);
        timingReturn.current = { document, origin };
        if (target.string === undefined) pendingHeader.current = target.momentId;
        else focusCell(cell);
        setTimingNotice(null);
    };

    useLayoutEffect(() => {
        if (meterBar === null) return;
        meterEditor.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        meterEditor.current?.querySelector<HTMLElement>('[role="spinbutton"]')?.focus({ preventScroll: true });
    }, [meterBar]);
    useLayoutEffect(() => {
        if (!positionPopup) return;
        positionEditor.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        positionEditor.current?.querySelector<HTMLElement>('button[aria-pressed]')?.focus({ preventScroll: true });
    }, [positionPopup]);
    useLayoutEffect(() => {
        if (!current || positionPopup?.key !== cellKey(current)) return;
        const trigger = positionTriggers.current.get(cellKey(current));
        const system = trigger?.closest('section');
        if (!trigger || !system) return;
        const anchor = trigger.getBoundingClientRect(), bounds = system.getBoundingClientRect();
        const left = Math.max(0, Math.min(anchor.left - bounds.left, bounds.width - Math.min(420, bounds.width)));
        const top = anchor.bottom - bounds.top;
        if (left !== positionPopup.left || top !== positionPopup.top) setPositionPopup({ ...positionPopup, left, top });
    }, [document, current, positionPopup]);
    const closePositionEditor = () => {
        setPositionPopup(null);
        if (current) positionTriggers.current.get(cellKey(current))?.focus({ preventScroll: true });
    };

    const cancelHold = () => { if (hold.current) clearTimeout(hold.current.timer); hold.current = null; };
    useEffect(() => {
        const dismiss = () => { cancelHold(); setTouchActions(null); };
        const dismissPosition = () => {
            if (!notationDraft.current.dirty && !notationDraft.current.composing) setPositionPopup(null);
        };
        const dismissScroll = (event: Event) => {
            dismiss();
            if (event.target instanceof Element && event.target.getAttribute('aria-label')?.startsWith('Tab score — bars')) dismissPosition();
        };
        const dismissOutside = (event: PointerEvent) => {
            // These controls have their own guard, before blur can commit or unmount a draft.
            if (event.target instanceof Element && event.target.closest('[data-timing-controls]')) return;
            if (!(event.target instanceof Element) || !event.target.closest('[data-position-editor], [data-position-trigger]')) setPositionPopup(null);
            if (event.target instanceof Element && event.target.closest('[data-column-header], [data-column-actions]')) return;
            skipHeaderClick.current = false;
            dismiss();
        };
        window.addEventListener('scroll', dismissScroll, true);
        window.addEventListener('resize', dismissPosition);
        window.addEventListener('pointerdown', dismissOutside, true);
        return () => { cancelHold(); window.removeEventListener('scroll', dismissScroll, true); window.removeEventListener('resize', dismissPosition); window.removeEventListener('pointerdown', dismissOutside, true); };
    }, []);

    useLayoutEffect(() => {
        const emitted = emittedSelection.current;
        if (Math.min(emitted.start, emitted.end) !== lower || Math.max(emitted.start, emitted.end) !== upper) anchor.current = selection.start;
    }, [lower, upper, selection.start]);
    useLayoutEffect(() => {
        if (draft) {
            input.current?.focus({ preventScroll: true });
            if (inputSelection.current === 'all') input.current?.select();
            else input.current?.setSelectionRange(input.current.value.length, input.current.value.length);
        }
        // Typing must preserve the native caret; only a newly opened editor requests focus.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draft?.revision]);
    useLayoutEffect(() => {
        if (pendingHistory.current && pendingHistory.current.document !== document) {
            if (pendingHistory.current.columns) pendingHeader.current = '';
            else if (current) pendingFocus.current = cellKey(current);
            pendingHistory.current = null;
        }
        if (pendingBar.current && pendingBar.current !== document) {
            pendingBar.current = null;
            if (current) pendingFocus.current = cellKey(current);
        }
        if (!draft && pendingHeader.current !== null) {
            const header = headers.current.get(pendingHeader.current)
                ?? (current ? headers.current.get(current.momentId) : undefined);
            header?.focus({ preventScroll: true });
            header?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
            pendingHeader.current = null;
        }
        if (draft || pendingFocus.current === null) return;
        const button = buttons.current.get(pendingFocus.current);
        button?.focus({ preventScroll: true });
        button?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
        pendingFocus.current = null;
    });

    const setDraft = (value: Draft | null) => {
        draftRef.current = value; setDraftState(value);
        if (value === null) setTimingNotice(null);
        onDraftStatusChange?.(value === null ? null : value.text === '' ? 'empty'
            : onSetMute && /^[xX]$/.test(value.text) ? 'mute'
                : /^\d{1,2}$/.test(value.text) && Number(value.text) <= 36 ? 'note' : 'invalid');
    };
    const fretAt = (cell: TabActiveCell) => document.moments.find(moment => moment.id === cell.momentId)?.notes.find(note => note.string === cell.string)?.fret ?? null;
    const textAt = (cell: TabActiveCell) => {
        const moment = document.moments.find(moment => moment.id === cell.momentId);
        return moment?.mutes?.some(mute => mute.string === cell.string) ? 'x' : fretAt(cell)?.toString() ?? '';
    };
    const writeFret = (cell: TabActiveCell, fret: number | null) => {
        const moment = document.moments.find(moment => moment.id === cell.momentId);
        if (fretAt(cell) !== fret || moment?.rest || moment?.mutes?.some(mute => mute.string === cell.string)
            || (moment && sustainedAt(moment, cell.string))) onSetFret({ ...cell, fret });
    };
    const commit = (keepInputUntilBlur = false) => {
        const edit = draftRef.current;
        if (!edit) return true;
        const mute = Boolean(onSetMute && /^[xX]$/.test(edit.text));
        if (!mute && edit.text !== '' && (!/^\d{1,2}$/.test(edit.text) || Number(edit.text) > 36)) {
            setError(`Enter a fret from 0–36${onSetMute ? ', x for mute' : ''}, or leave the cell empty.`);
            return false;
        }
        if (!keepInputUntilBlur) setDraft(null);
        setError(null); setTimingNotice(null);
        // Opening a rest/sustain cell for inspection must not erase its metadata on blur.
        // Delete explicitly clears it; typing a fret or x explicitly replaces it.
        if (edit.text === '' && textAt(edit.cell) === '') return true;
        if (mute) onSetMute?.({ ...edit.cell, enabled: true });
        else writeFret(edit.cell, edit.text === '' ? null : Number(edit.text));
        return true;
    };
    const focusCell = (cell: TabActiveCell) => {
        pendingFocus.current = cellKey(cell);
        if (!draftRef.current) {
            const button = buttons.current.get(cellKey(cell));
            button?.focus({ preventScroll: true });
            button?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
        }
    };
    const choose = (cell: TabActiveCell, extending: boolean, columns = false) => {
        const index = document.moments.findIndex(moment => moment.id === cell.momentId);
        if (index < 0) return;
        if (!extending) anchor.current = index;
        const next = { start: extending ? anchor.current : index, end: index };
        emittedSelection.current = next;
        setTouchActions(null);
        setPositionPopup(null);
        setInsertionCursor(null);
        setColumnMode(columns);
        onActiveCellChange(cell);
        onSelect(next);
    };
    const begin = (cell: TabActiveCell, text: string, select: 'all' | 'end') => {
        inputSelection.current = select;
        pendingFocus.current = null;
        setError(null);
        setDraft({ cell, text, revision: ++revision.current });
    };
    const cancel = (cell: TabActiveCell) => { setDraft(null); setError(null); focusCell(cell); };
    const clear = (cell: TabActiveCell) => { setDraft(null); setError(null); writeFret(cell, null); focusCell(cell); };
    const insertAt = (cell: TabActiveCell) => {
        if (!onInsertMoment || document.moments.length >= 1024 || !commit()) { input.current?.focus(); return; }
        const index = document.moments.findIndex(moment => moment.id === cell.momentId);
        if (index < 0) return;
        setTouchActions(null);
        pendingInsertion.current = { document, afterId: cell.momentId, successorId: document.moments[index + 1]?.id, string: cell.string };
        onInsertMoment(cell.momentId);
    };
    const onInsertionKey = (event: React.KeyboardEvent<HTMLButtonElement>, momentId: string) => {
        if (event.ctrlKey || event.metaKey) {
            if (event.key.toLowerCase() === 'z' || event.key.toLowerCase() === 'y') {
                event.preventDefault();
                pendingHistory.current = { document, columns: false };
                if (event.shiftKey || event.key.toLowerCase() === 'y') onRedo(); else onUndo();
            }
            return;
        }
        if (event.key === 'Escape' && current) { event.preventDefault(); focusCell(current); return; }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            const cell = { momentId, string: current?.string ?? 0 };
            choose(cell, false); focusCell(cell); return;
        }
        const index = document.moments.findIndex(moment => moment.id === momentId);
        const nextIndex = event.key === 'ArrowLeft' ? Math.max(0, index - 1)
            : event.key === 'ArrowRight' ? Math.min(document.moments.length - 1, index + 1)
                : event.key === 'Home' ? 0 : event.key === 'End' ? document.moments.length - 1 : null;
        if (nextIndex === null) return;
        event.preventDefault();
        const button = insertionButtons.current.get(document.moments[nextIndex].id);
        button?.focus({ preventScroll: true });
        button?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    };
    const focusHeader = (momentId: string) => {
        pendingFocus.current = null;
        pendingHeader.current = momentId;
        headers.current.get(momentId)?.focus({ preventScroll: true });
    };
    const chooseHeader = (momentId: string, extending: boolean) => {
        choose({ momentId, string: current?.string ?? 0 }, extending, true);
        focusHeader(momentId);
    };
    const deleteSelectedColumns = () => {
        if (!onDeleteMoments || !commit()) return;
        cancelHold(); setTouchActions(null);
        pendingHeader.current = '';
        onDeleteMoments(document.moments.slice(lower, upper + 1).map(moment => moment.id));
    };
    const onHeaderKey = (event: React.KeyboardEvent<HTMLButtonElement>, momentId: string) => {
        if (event.nativeEvent.isComposing || composing.current) return;
        if (event.ctrlKey || event.metaKey) {
            if (event.key.toLowerCase() === 'z' || event.key.toLowerCase() === 'y') {
                event.preventDefault();
                pendingHistory.current = { document, columns: true };
                if (event.shiftKey || event.key.toLowerCase() === 'y') onRedo(); else onUndo();
            }
            return;
        }
        const index = document.moments.findIndex(moment => moment.id === momentId);
        if (index < 0) return;
        if (event.key === 'Delete' || event.key === 'Backspace') {
            event.preventDefault();
            deleteSelectedColumns();
            return;
        }
        if (event.key === 'Insert' && onInsertMoment) {
            event.preventDefault(); insertAt({ momentId, string: current?.string ?? 0 }); return;
        }
        if (event.key === 'Enter' || event.key === 'ArrowDown' || event.key === 'Escape') {
            event.preventDefault();
            const cell = { momentId, string: current?.string ?? 0 };
            choose(cell, false); focusCell(cell); return;
        }
        const nextIndex = event.key === 'ArrowLeft' ? Math.max(0, index - 1)
            : event.key === 'ArrowRight' ? Math.min(document.moments.length - 1, index + 1)
                : event.key === 'Home' ? 0 : event.key === 'End' ? document.moments.length - 1 : null;
        if (nextIndex !== null) { event.preventDefault(); chooseHeader(document.moments[nextIndex].id, event.shiftKey); }
    };
    const startHeaderDrag = (event: React.PointerEvent<HTMLButtonElement>, momentId: string) => {
        if (event.button !== 0 || composing.current) return;
        if (!commit()) { input.current?.focus(); return; }
        const index = document.moments.findIndex(moment => moment.id === momentId);
        // A long press inside a touch-selected range offers deletion of that whole range.
        if (event.pointerType === 'touch' && columnMode && lower < upper && index >= lower && index <= upper) {
            setTouchActions(null); anchor.current = index;
            onActiveCellChange({ momentId, string: current?.string ?? 0 }); focusHeader(momentId);
        } else chooseHeader(momentId, event.shiftKey);
        drag.current = { pointerId: event.pointerId, startId: momentId, moved: false };
        cancelHold();
        if (event.pointerType === 'touch' && onDeleteMoments) {
            const pointerId = event.pointerId;
            hold.current = { x: event.clientX, y: event.clientY, pointerId, timer: setTimeout(() => {
                hold.current = null;
                if (drag.current?.pointerId !== pointerId || drag.current.moved) return;
                drag.current.longPressed = true;
                skipHeaderClick.current = true;
                setTouchActions(momentId);
            }, 550) };
        }
        event.currentTarget.setPointerCapture?.(event.pointerId);
    };
    const moveHeaderDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
        const gesture = drag.current;
        if (!gesture || gesture.pointerId !== event.pointerId) return;
        if (hold.current && Math.hypot(event.clientX - hold.current.x, event.clientY - hold.current.y) > 9) cancelHold();
        if (gesture.longPressed) return;
        let closest: { id: string; distance: number } | null = null;
        for (const [id, header] of headers.current) {
            const bounds = header.getBoundingClientRect();
            if (event.clientY < bounds.top || event.clientY > bounds.bottom || bounds.width === 0) continue;
            const distance = Math.abs(event.clientX - (bounds.left + bounds.right) / 2);
            if (!closest || distance < closest.distance) closest = { id, distance };
        }
        if (closest && closest.id !== gesture.startId) { gesture.moved = true; cancelHold(); }
        if (closest && closest.id !== current?.momentId) chooseHeader(closest.id, true);
    };
    const endHeaderDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (drag.current?.pointerId !== event.pointerId) return;
        cancelHold();
        skipHeaderClick.current = drag.current.moved || Boolean(drag.current.longPressed);
        drag.current = null;
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    };
    const navigate = (event: React.KeyboardEvent, cell: TabActiveCell) => {
        const index = document.moments.findIndex(moment => moment.id === cell.momentId);
        let nextIndex = index, nextString = cell.string;
        switch (event.key) {
            case 'ArrowLeft': nextIndex = Math.max(0, index - 1); break;
            case 'ArrowRight': nextIndex = Math.min(document.moments.length - 1, index + 1); break;
            case 'ArrowUp': nextString = Math.max(0, cell.string - 1); break;
            case 'ArrowDown': nextString = Math.min(5, cell.string + 1); break;
            case 'Home': nextIndex = 0; break;
            case 'End': nextIndex = document.moments.length - 1; break;
            default: return false;
        }
        event.preventDefault();
        if (!commit()) return true;
        const next = { momentId: document.moments[nextIndex].id, string: nextString };
        choose(next, event.shiftKey || extend);
        focusCell(next);
        return true;
    };
    const onCellKey = (event: React.KeyboardEvent<HTMLButtonElement>, cell: TabActiveCell) => {
        if (event.nativeEvent.isComposing || composing.current) return;
        if (event.ctrlKey || event.metaKey) {
            if (event.key.toLowerCase() === 'z' || event.key.toLowerCase() === 'y') {
                event.preventDefault();
                pendingHistory.current = { document, columns: false };
                if (event.shiftKey || event.key.toLowerCase() === 'y') onRedo(); else onUndo();
            }
            return;
        }
        if (event.key === 'ArrowUp' && cell.string === 0 && !event.shiftKey) {
            event.preventDefault(); chooseHeader(cell.momentId, false); return;
        }
        if (navigate(event, cell)) return;
        if (event.key === 'Insert' && onInsertMoment) { event.preventDefault(); insertAt(cell); return; }
        if (/^\d$/.test(event.key)) { event.preventDefault(); begin(cell, event.key, 'end'); }
        else if (onSetMute && /^[xX]$/.test(event.key)) { event.preventDefault(); begin(cell, 'x', 'end'); }
        else if (event.key === 'Enter' || event.key === 'F2') { event.preventDefault(); begin(cell, textAt(cell), 'all'); }
        else if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); clear(cell); }
    };
    const onInputKey = (event: React.KeyboardEvent<HTMLInputElement>, cell: TabActiveCell) => {
        if (event.nativeEvent.isComposing || composing.current) return;
        if (event.ctrlKey || event.metaKey) return; // Native draft undo, redo, paste and selection.
        if (event.key === 'Insert' && onInsertMoment) { event.preventDefault(); insertAt(cell); return; }
        if (navigate(event, cell)) return;
        if (event.key === 'Enter') {
            event.preventDefault();
            if (commit()) {
                const index = document.moments.findIndex(moment => moment.id === cell.momentId);
                const next = { momentId: document.moments[Math.min(index + 1, document.moments.length - 1)].id, string: cell.string };
                choose(next, false); focusCell(next);
            }
        }
        else if (event.key === 'Escape') { event.preventDefault(); cancel(cell); }
        else if (event.key === 'Delete') { event.preventDefault(); clear(cell); }
        // Keep this DOM input until native focus has moved out of the grid.
        else if (event.key === 'Tab' && !commit(true)) event.preventDefault();
    };

    useLayoutEffect(() => {
        const pending = pendingInsertion.current;
        if (!pending || pending.document === document) return;
        const index = document.moments.findIndex(moment => moment.id === pending.afterId);
        const inserted = document.moments[index + 1];
        pendingInsertion.current = null;
        if (index < 0 || !inserted || inserted.id === pending.successorId || document.moments.length <= pending.document.moments.length) return;
        const cell = { momentId: inserted.id, string: pending.string };
        choose(cell, false);
        begin(cell, '', 'end');
    });

    const systems = useMemo(() => {
        const moments = document.moments.map((moment, index) => ({ moment, index }));
        const measures = Array.from({ length: Math.max(1, document.measureCount) }, (_, index) => ({
            number: index + 1,
            moments: moments.filter(item => item.moment.measure === index + 1),
        }));
        return Array.from({ length: Math.ceil(measures.length / 4) }, (_, index) => measures.slice(index * 4, index * 4 + 4));
    }, [document]);

    const timingTools = <div className={timingStyles.toolbar} {...readControls('written')}>
            <button type="button" ref={checkButton} className={timingStyles.action} aria-expanded={timingOpen && timingReport?.document === document}
                onClick={() => {
                    if (!guardTiming()) return;
                    setPositionPopup(null); setMeterBar(null);
                    showDetails.current = 'timing';
                    setTimingReport({ document, result: inspectTabTiming(document), serial: ++timingSerial.current });
                    setTimingOpen(true); setTimingStale(false); setTimingNotice(null); timingReturn.current = null;
                }}>Check timing</button>
            <button type="button" ref={writtenButton} className={timingStyles.action} aria-expanded={writtenCurrent}
                onClick={() => showWrittenTime('local', true)}>View written time</button>
        </div>;
    const timeReadings = <div className={timingStyles.detailsShelf} {...readControls('written')}>
            {writtenCurrent && writtenReport && <div ref={writtenDetails} tabIndex={-1} aria-label="Written time details" className={timingStyles.focusTarget}
                onKeyDown={event => {
                    if (event.key === 'Escape' && event.target === event.currentTarget && !event.nativeEvent.isComposing) closeWrittenTime();
                }}>
                <div className={timingStyles.toolbar} role="group" aria-label="Written time scope" onKeyDown={event => {
                    if (event.key === 'Escape' && !event.nativeEvent.isComposing) { event.preventDefault(); event.stopPropagation(); closeWrittenTime(); }
                }}>
                    <button type="button" className={`${timingStyles.action} ${acrossStyles.scopeAction}`} aria-pressed={writtenReport.kind === 'local'}
                        onClick={() => showWrittenTime('local')}>This bar</button>
                    <button type="button" className={`${timingStyles.action} ${acrossStyles.scopeAction}`} aria-pressed={writtenReport.kind === 'across'} disabled={!hasProjectionMeter}
                        onClick={() => showWrittenTime('across')}>Across full bars{hasProjectionMeter && document.meter ? ` · ${document.meter.numerator}/${document.meter.denominator}` : ''}</button>
                    {!hasProjectionMeter && <p>Set meter to compare bars</p>}
                </div>
                {writtenReport.kind === 'local'
                    ? <WrittenTimePanel key={writtenReport.serial} snapshot={writtenReport.snapshot}
                        onAction={guardTiming} onClose={closeWrittenTime}
                        onRevealEvidence={(target, origin) => revealEvidence('written', target, origin)} />
                    : <AcrossBarsWrittenTimePanel key={writtenReport.serial} snapshot={writtenReport.snapshot}
                        readingReferences={readingReferences} onAction={guardTiming} onClose={closeWrittenTime}
                        onRevealEvidence={(target, origin) => revealEvidence('written', target, origin)} />}
            </div>}
            {timingOpen && timingReport?.document === document && <div ref={timingDetails} tabIndex={-1} aria-label="Timing check details" className={timingStyles.focusTarget}
                onKeyDown={event => {
                    if (event.key === 'Escape' && event.target === event.currentTarget && !event.nativeEvent.isComposing) closeTiming();
                }}>
                <TimingInspectionPanel key={timingReport.serial} document={document} report={timingReport.result} onNavigate={navigateTiming}
                    onClose={closeTiming} />
            </div>}
        </div>;
    const scoreSystems = systems.map((system, systemIndex) => {
            const slots = system.flatMap<{ moment: TabMoment | null; index: number; measure: number }>(measure => measure.moments.length ? measure.moments.map(item => ({ ...item, measure: measure.number })) : [{ moment: null, index: -1, measure: measure.number }]);
            const template = `44px repeat(${slots.length}, minmax(44px, 1fr))`;
            const sheetStyle = { minWidth: 44 + slots.length * 44 + (onInsertMoment ? 22 : 0), paddingRight: onInsertMoment ? 22 : 0, '--score-columns': template } as React.CSSProperties;
            const firstIndex = slots.find(item => item.index >= 0)?.index ?? -1;
            const lastIndex = slots.findLast(item => item.index >= 0)?.index ?? -1;
            const visibleAnnotations = annotations.filter(annotation => firstIndex >= 0 && annotation.start <= lastIndex && annotation.end >= firstIndex);
            const selectedAnnotation = visibleAnnotations.find(annotation => annotation.id === openAnnotation);
            const visibleChords = suppliedRows.flatMap(({ entry, chord, placement }) => {
                if (!chord || placement?.kind !== 'positions' || placement.first > lastIndex || placement.last < firstIndex) return [];
                const start = slots.findIndex(item => item.index >= placement.first && item.index <= placement.last);
                const end = slots.findLastIndex(item => item.index >= placement.first && item.index <= placement.last);
                return start < 0 ? [] : [{ id: entry.id, name: chord.name, start, end }];
            });
            const annotationRows = (placement: 'above' | 'below') => {
                const placed: { annotation: TabScoreAnnotation; start: number; end: number; lane: number }[] = [];
                const laneEnds: number[] = [];
                // Pack in score order, independently of the engine's annotation-kind order.
                const ordered = visibleAnnotations.filter(item => item.placement === placement)
                    .sort((a, b) => a.start - b.start || b.end - a.end || a.id.localeCompare(b.id));
                for (const annotation of ordered) {
                    const start = Math.max(0, slots.findIndex(item => item.index >= Math.max(firstIndex, annotation.start)));
                    const lastSlot = slots.findLastIndex(item => item.index >= 0 && item.index <= Math.min(lastIndex, annotation.end));
                    const end = Math.max(start, lastSlot);
                    let lane = laneEnds.findIndex(value => value < start);
                    if (lane < 0) lane = laneEnds.length;
                    laneEnds[lane] = end;
                    placed.push({ annotation, start, end, lane });
                }
                return placed.length > 0 && <div className={styles.annotations} data-placement={placement}>
                    {placed.map(({ annotation, start, end, lane }) => <button key={annotation.id} type="button"
                        className={styles.annotation} style={{ gridColumn: `${start + 2} / span ${end - start + 1}`, gridRow: lane + 1 }}
                        data-span={end > start} data-source={annotation.source} data-kind={annotation.kind}
                        aria-label={`${annotation.label}, ${annotation.kind} annotation`} title={annotation.label} aria-expanded={openAnnotation === annotation.id}
                        onClick={() => { if (commit()) setOpenAnnotation(previous => previous === annotation.id ? null : annotation.id); }}>
                        <span>{annotation.source === 'candidate' ? annotation.label.replace(/\s*\?$/, '') : annotation.label}</span>{annotation.source === 'candidate' && <small aria-label="Candidate">?</small>}
                    </button>)}
                </div>;
            };
            return <section className={styles.system} key={system[0].number} aria-label={`Bars ${system[0].number}–${system.at(-1)!.number}`}>
                <div className={styles.viewport} role="region" tabIndex={onEdit ? 0 : undefined} aria-label={`Tab score — bars ${system[0].number}–${system.at(-1)!.number}`}>
                    <div className={styles.sheet} style={sheetStyle}>
                        {onEdit && <div className={styles.measureLane}>
                            <span aria-hidden="true" />
                            {system.map(measure => <button key={measure.number} type="button" className={styles.measureControl}
                                style={{ gridColumn: `span ${Math.max(1, measure.moments.length)}` }}
                                aria-label={`Bar ${measure.number} meter: ${document.meter ? `${document.meter.numerator}/${document.meter.denominator}` : 'unspecified'}`}
                                aria-expanded={meterBar === measure.number}
                                onClick={() => { if (commit()) setMeterBar(previous => previous === measure.number ? null : measure.number); }}>
                                Bar {measure.number} <span>{document.meter ? `${document.meter.numerator}/${document.meter.denominator}` : 'Meter +'}</span>
                            </button>)}
                        </div>}
                        {visibleChords.length > 0 && <div className={harmonyStyles.scoreLabels} role="group" aria-label="Supplied chord labels"
                            data-timing-controls onPointerDownCapture={event => {
                                if (event.target instanceof Element && event.target.closest('button') && !guardTiming()) event.preventDefault();
                            }}
                            onKeyDownCapture={event => {
                                if ((event.key === 'Enter' || event.key === ' ') && !guardTiming()) { event.preventDefault(); event.stopPropagation(); }
                            }}>
                            {visibleChords.map(chord => <button type="button" key={chord.id} className={`${harmonyStyles.scoreLabel} ${styles.suppliedLabel}`}
                                aria-label={`${chord.name}, supplied chord`} title={chord.name}
                                style={{ gridColumn: `${chord.start + 2} / span ${chord.end - chord.start + 1}` }}
                                onClick={event => {
                                    if (!guardTiming()) return;
                                    setEvidence(null); setEvidenceNotice(null);
                                    setChordRequest({ document, rows: suppliedRows, id: chord.id,
                                        request: ++chordRequestSerial.current, origin: event.currentTarget });
                                }}>{chord.name}</button>)}
                        </div>}
                        {annotationRows('above')}
                        <div className={styles.headers}>
                            <span className={styles.corner} aria-hidden="true" />
                            {system.map(measure => <div key={measure.number} className={styles.measureHeader} data-measure={measure.number}
                                style={{ gridColumn: `span ${Math.max(1, measure.moments.length)}` }}>
                                {!onEdit && <span className={styles.measureNumber} aria-hidden="true">{measure.number}</span>}
                                {measure.moments.map(({ moment, index }) => {
                                    const description = [
                                        moment.rest ? ['rest', durationDetail(moment.rest.duration)].filter(Boolean).join(', ') : '',
                                        ...moment.notes.map(note => `string ${note.string + 1}, fret ${note.fret}${note.duration ? `, ${durationDetail(note.duration)}` : ''}`),
                                        ...(moment.mutes ?? []).map(mute => `string ${mute.string + 1}, muted x`),
                                        ...(moment.sustains ?? []).map(sustain => { const note = notesById.get(sustain.noteId); return note ? `string ${note.string + 1}, tied fret ${note.fret}` : 'sustain'; }),
                                    ].filter(Boolean).join('; ') || 'empty';
                                    return <button key={moment.id} ref={element => { if (element) headers.current.set(moment.id, element); else headers.current.delete(moment.id); }}
                                        type="button" tabIndex={columnMode && current?.momentId === moment.id ? 0 : -1} className={styles.header}
                                        data-column-header="true"
                                        data-evidence={currentEvidence?.target.momentIds.has(moment.id) || undefined}
                                        aria-label={`Onset ${index + 1}, bar ${moment.measure}: ${description}`} aria-pressed={index >= lower && index <= upper}
                                        title="Select column · drag to select · Delete to remove"
                                        onPointerDown={event => startHeaderDrag(event, moment.id)} onPointerMove={moveHeaderDrag}
                                        onContextMenu={event => { if (touchActions || hold.current) event.preventDefault(); }}
                                        onPointerUp={endHeaderDrag} onPointerCancel={() => { cancelHold(); drag.current = null; skipHeaderClick.current = false; setTouchActions(null); }}
                                        onKeyDown={event => onHeaderKey(event, moment.id)}
                                        onClick={event => {
                                            if (skipHeaderClick.current) { skipHeaderClick.current = false; return; }
                                            if (!commit()) { input.current?.focus(); return; }
                                            chooseHeader(moment.id, event.shiftKey || extend);
                                        }}><span className={styles.onsetDot} aria-hidden="true" /></button>;
                                })}
                                {touchActions && measure.moments.some(item => item.moment.id === touchActions) && <div role="group" aria-label="Column actions" data-column-actions="true"
                                    className={styles.touchActions} style={{ left: `clamp(0px, calc(${(measure.moments.findIndex(item => item.moment.id === touchActions) + .5) * 100 / measure.moments.length}% - 26px), calc(100% - 52px))` }}
                                    onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setTouchActions(null); focusHeader(touchActions); } }}>
                                    <button type="button" aria-label="Delete selected columns" onClick={deleteSelectedColumns}><Trash2 size={19} aria-hidden="true" /></button>
                                </div>}
                            </div>)}
                        </div>
                        {onEdit && <div className={styles.positionLane}>
                            <span aria-hidden="true" />
                            {slots.map(({ moment, index }, slotIndex) => <div key={moment?.id ?? `position-${slotIndex}`}>
                                {moment && current?.momentId === moment.id && <button type="button" className={styles.positionTrigger}
                                    ref={element => { const key = cellKey(current); if (element) positionTriggers.current.set(key, element); else positionTriggers.current.delete(key); }}
                                    data-position-trigger="true" aria-label={`Edit position ${index + 1}, bar ${moment.measure}, string ${current.string + 1}`}
                                    aria-controls={`${errorId}-position-editor`}
                                    aria-expanded={positionPopup?.key === cellKey(current)}
                                    onClick={event => {
                                        if (!commit()) { input.current?.focus(); return; }
                                        const trigger = event.currentTarget.getBoundingClientRect();
                                        const bounds = event.currentTarget.closest('section')!.getBoundingClientRect();
                                        const width = Math.min(420, bounds.width);
                                        setPositionPopup(previous => previous?.key === cellKey(current) ? null : {
                                            key: cellKey(current), left: Math.max(0, Math.min(trigger.left - bounds.left, bounds.width - width)), top: trigger.bottom - bounds.top,
                                        });
                                    }}>Edit</button>}
                            </div>)}
                        </div>}
                        <div className={styles.scoreBody}>
                        <div role="grid" aria-label={systemIndex === 0 ? 'Editable tab' : `Editable tab, bars ${system[0].number}–${system.at(-1)!.number}`} aria-rowcount={6} aria-colcount={slots.length + 1} className={styles.grid}>
                            <div className={styles.barlines} aria-hidden="true">
                                <span />
                                {system.map(measure => <span key={measure.number} className={styles.measureRule}
                                    style={{ gridColumn: `span ${Math.max(1, measure.moments.length)}` }} />)}
                            </div>
                            {document.tuningMidi.map((midi, string) => <div role="row" aria-rowindex={string + 1} className={styles.row} key={string}>
                                <span role="rowheader" aria-colindex={1} className={styles.stringLabel} aria-label={`String ${string + 1}, ${getKeyName(midi % 12)}`}>{getKeyName(midi % 12)}</span>
                                {slots.map(({ moment, index, measure }, slotIndex) => {
                                    const startsBar = slotIndex === 0 || slots[slotIndex - 1].measure !== measure;
                                    if (!moment) return <div key={`empty-${measure}`} role="gridcell" aria-colindex={slotIndex + 2}
                                        aria-label={`Empty bar ${measure}`} className={styles.cell} data-bar-start={startsBar} />;
                            const cell = { momentId: moment.id, string }, key = cellKey(cell);
                            const note = moment.notes.find(item => item.string === string);
                            const mute = moment.mutes?.some(item => item.string === string);
                            const sustain = sustainedAt(moment, string);
                            const tiedNote = sustain && notesById.get(sustain.noteId);
                            const techniques = note ? techniquePresentation(note, notesById) : [];
                            const duration = note?.duration ?? sustain?.duration ?? moment.rest?.duration;
                            const detail = [durationDetail(duration), ...techniques.map(technique => technique.detail)].filter(Boolean).join('; ');
                            const isActive = current !== null && cellKey(current) === key;
                            const isEditing = draft !== null && cellKey(draft.cell) === key;
                            const valueLabel = note ? `fret ${note.fret}` : mute ? 'muted x' : tiedNote ? `tied fret ${tiedNote.fret}` : moment.rest ? 'rest' : 'empty';
                            const label = `String ${string + 1}, onset ${index + 1}, ${valueLabel}${detail ? `; ${detail}` : ''}`;
                            return <div role="gridcell" aria-colindex={slotIndex + 2} aria-selected={isActive} className={styles.cell} key={key}
                                data-active={isActive} data-selected={index >= lower && index <= upper} data-bar-start={startsBar}
                                data-evidence={Boolean(note && currentEvidence?.target.noteIds.has(note.id)) || undefined}>
                                <button ref={element => { if (element) buttons.current.set(key, element); else buttons.current.delete(key); }} type="button"
                                    className={styles.cellButton} tabIndex={isActive && !isEditing && !columnMode ? 0 : -1} aria-label={label} title={detail || undefined}
                                    aria-hidden={isEditing || undefined} data-editing={isEditing}
                                    onClick={event => {
                                        if (!commit()) { input.current?.focus(); return; }
                                        choose(cell, event.shiftKey || extend);
                                        begin(cell, textAt(cell), 'all');
                                    }} onKeyDown={event => onCellKey(event, cell)}
                                    onPaste={event => { event.preventDefault(); begin(cell, event.clipboardData.getData('text/plain'), 'all'); }}>
                                    {note ? <span className={styles.fret} data-focused={note.id === focusedNoteId}>{note.fret}
                                        {techniques.length > 0 && <sup className={styles.technique} aria-hidden="true">{techniques.map(technique => technique.mark).join('')}</sup>}</span>
                                        : mute ? <span className={styles.fret}>x</span>
                                            : tiedNote ? <span className={`${styles.fret} ${styles.sustain}`} aria-hidden="true">⌒{tiedNote.fret}</span>
                                                : moment.rest && string === 0 ? <span className={`${styles.fret} ${styles.rest}`} aria-hidden="true">R</span>
                                                    : <span className={styles.empty} aria-hidden="true">·</span>}
                                </button>
                                {isEditing && <input ref={input} type="text" inputMode="numeric" autoComplete="off" spellCheck={false}
                                    className={styles.editor} value={draft.text} data-empty={draft.text === ''} aria-label={`Fret for string ${string + 1}, onset ${index + 1}`}
                                    aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined}
                                    onChange={event => { setDraft({ ...draft, text: event.target.value }); setError(null); }}
                                    onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
                                    onKeyDown={event => onInputKey(event, cell)}
                                    onBlur={event => {
                                        if (event.relatedTarget instanceof Element && event.relatedTarget.closest('[data-timing-controls]') && timingBlocked()) return;
                                        if (!composing.current && !commit()) input.current?.focus({ preventScroll: true });
                                    }} />}
                            </div>;
                                })}
                            </div>)}
                        </div>
                        </div>
                        {onInsertMoment && <div className={styles.insertions} role="group" aria-label="Insert positions">
                            <span className={styles.insertionLabel} aria-hidden="true">Position</span>
                            {slots.map(({ moment, index }, slotIndex) => <div key={moment?.id ?? `empty-insert-${slotIndex}`}
                                className={styles.insertionSlot} data-current={moment?.id === current?.momentId}>
                                {moment && <button type="button" tabIndex={insertionStop === moment.id ? 0 : -1} className={styles.insertPosition}
                                    ref={element => { if (element) insertionButtons.current.set(moment.id, element); else insertionButtons.current.delete(moment.id); }}
                                    aria-label={`Insert position after onset ${index + 1}`} title={`Insert position in bar ${moment.measure}`}
                                    aria-describedby={`${errorId}-insert-bar-${moment.measure}`}
                                    disabled={document.moments.length >= 1024}
                                    onFocus={() => setInsertionCursor(moment.id)} onKeyDown={event => onInsertionKey(event, moment.id)}
                                    onClick={() => insertAt({ momentId: moment.id, string: current?.string ?? 0 })}><span aria-hidden="true">+</span></button>}
                            </div>)}
                            {system.map(measure => <span key={measure.number} hidden id={`${errorId}-insert-bar-${measure.number}`}>Adds an empty position in bar {measure.number}.</span>)}
                        </div>}
                        {annotationRows('below')}
                    </div>
                </div>
                {onEdit && meterBar !== null && system.some(measure => measure.number === meterBar) &&
                    <div ref={meterEditor}><TabMeasureEditor document={document} measure={meterBar} dispatch={onEdit} /></div>}
                {onEdit && current && positionPopup?.key === cellKey(current) && system.some(measure => measure.moments.some(item => item.moment.id === current.momentId)) &&
                    <div ref={positionEditor} id={`${errorId}-position-editor`} data-position-editor="true" className={styles.positionPopup}
                        style={{ left: positionPopup.left, top: positionPopup.top }}
                        onBlur={event => {
                            if (event.relatedTarget instanceof Element && event.relatedTarget.closest('[data-timing-controls]')) return;
                            // Tab may pass through other controls before reaching Check timing.
                            // Keep unapplied text mounted until explicit cancel/apply or score selection.
                            if (notationDraft.current.dirty || notationDraft.current.composing) return;
                            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPositionPopup(null);
                        }}
                        onKeyDown={event => { if (event.key === 'Escape' && !event.nativeEvent.isComposing && !notationDraft.current.composing) { event.preventDefault(); closePositionEditor(); } }}>
                        <TabNotationEditor document={document} cell={current} dispatch={onEdit} onClose={closePositionEditor} onDraftStateChange={reportNotationDraft} />
                    </div>}
                {onEdit && systemIndex === systems.length - 1 && <button type="button" className={styles.addBar}
                    disabled={document.moments.length >= 1024 || document.measureCount >= 1024}
                    onClick={() => { if (commit()) { setColumnMode(false); pendingBar.current = document; onEdit({ type: 'add-measures', count: 1 }); } }}>+ Add bar</button>}
                {selectedAnnotation && <div className={styles.annotationDetail} role="note" aria-label="Annotation detail">
                    <div><strong>{selectedAnnotation.label}</strong><p>{selectedAnnotation.detail}</p></div>
                    <button type="button" onClick={() => setOpenAnnotation(null)} aria-label="Close annotation detail">×</button>
                </div>}
            </section>;
        });
    const layout = (chordTrigger?: React.ReactNode, chordBody?: React.ReactNode) => <>
        <div className={timingStyles.readingTools} role="group" aria-label="TAB analysis tools">
            {patternActions}
            {chordTrigger && <div ref={harmonyControls} {...readControls('harmony')}>{chordTrigger}</div>}
            {timingTools}
        </div>
        {(timingNotice || evidenceNotice || timingStale || writtenStale) && <div className={timingStyles.notices}>
            {timingNotice && <p role="status">{timingNotice}</p>}
            {evidenceNotice && <p role="status">{evidenceNotice}</p>}
            {timingStale && <p role="status">Score changed · Check again</p>}
            {writtenStale && <p role="status">{writtenStale === 'score' ? 'Score changed · View again' : 'Bar changed · View again'}</p>}
        </div>}
        {scoreSystems}
        {scoreFooter}
        {chordBody && <div {...readControls('harmony')}>{chordBody}</div>}
        {timeReadings}
    </>;
    return <div className={styles.score} role="region" aria-label="Tab score — onsets in order"
        onKeyDownCapture={event => {
            if (event.key !== 'Escape' || event.nativeEvent.isComposing || draftRef.current || timingBlocked()) return;
            // Editors and contextual controls retain their own Escape behavior.
            if (!(event.target instanceof Element) || !event.target.closest('[role="gridcell"] button, [data-column-header], [data-position-trigger]')) return;
            if (currentEvidence) {
                event.preventDefault(); event.stopPropagation();
                const origin = currentEvidence.origin;
                focusEvidenceElement(origin.isConnected ? origin : currentEvidence.from === 'written'
                    ? writtenButton.current : harmonyControls.current?.querySelector('button'));
                setEvidence(null);
                return;
            }
            const destination = timingReturn.current;
            if (destination?.document !== document || !destination.origin.isConnected) return;
            event.preventDefault(); event.stopPropagation();
            focusEvidenceElement(destination.origin);
            timingReturn.current = null;
        }}>
        {harmony && onEdit
            ? <SuppliedHarmonyPanel document={document} selection={selection} harmony={harmony} onEdit={onEdit}
                rows={suppliedRows} references={readingReferences} requestedChord={currentChordRequest} renderLayout={layout}
                onSetKeyReference={frame => onEdit({ type: 'set-frame', frame })}
                onRevealEvidence={(target, origin) => revealEvidence('harmony', target, origin)} />
            : layout()}
        {error && <p className={styles.error} id={errorId} role="alert">{error}</p>}
    </div>;
}
