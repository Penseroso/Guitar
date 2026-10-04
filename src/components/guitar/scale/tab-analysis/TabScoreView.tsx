"use client";

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { TabDocument, TabMoment, TabSelection } from '@/domain/tab/types';
import type { TabScoreAnnotation } from '@/domain/tab/annotations';
import { getKeyName } from '@/domain/shared/keys';
import styles from './tab-score-editor.module.css';

export interface TabActiveCell { momentId: string; string: number }
export type TabDraftStatus = 'note' | 'empty' | 'invalid' | null;
interface Draft { cell: TabActiveCell; text: string; revision: number }
const cellKey = (cell: TabActiveCell) => `${cell.momentId}:${cell.string}`;

export function TabScoreView({ document, selection, onSelect, extend, focusedNoteId,
    activeCell, onActiveCellChange, onSetFret, onUndo, onRedo,
    annotations = [], onInsertMoment, onDeleteMoments, onDraftStatusChange,
}: {
    document: TabDocument;
    selection: TabSelection;
    onSelect: (selection: TabSelection) => void;
    extend: boolean;
    focusedNoteId: string | null;
    activeCell: TabActiveCell | null;
    onActiveCellChange: (cell: TabActiveCell) => void;
    onSetFret: (change: TabActiveCell & { fret: number | null }) => void;
    onUndo: () => void;
    onRedo: () => void;
    annotations?: readonly TabScoreAnnotation[];
    onInsertMoment?: (afterId: string) => void;
    onDeleteMoments?: (momentIds: string[]) => void;
    onDraftStatusChange?: (status: TabDraftStatus) => void;
}) {
    const buttons = useRef(new Map<string, HTMLButtonElement>());
    const headers = useRef(new Map<string, HTMLButtonElement>());
    const drag = useRef<{ pointerId: number; startId: string; moved: boolean; longPressed?: boolean } | null>(null);
    const hold = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number; pointerId: number } | null>(null);
    const skipHeaderClick = useRef(false);
    const pendingHeader = useRef<string | null>(null);
    const pendingInsertion = useRef<{ document: TabDocument; afterId: string; successorId: string | undefined; string: number } | null>(null);
    const input = useRef<HTMLInputElement>(null);
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
    const [touchActions, setTouchActions] = useState<string | null>(null);
    const errorId = useId();
    const current = activeCell && document.moments.some(moment => moment.id === activeCell.momentId)
        && activeCell.string >= 0 && activeCell.string < 6 ? activeCell
        : document.moments[0] ? { momentId: document.moments[0].id, string: 0 } : null;
    const lower = Math.min(selection.start, selection.end), upper = Math.max(selection.start, selection.end);

    const cancelHold = () => { if (hold.current) clearTimeout(hold.current.timer); hold.current = null; };
    useEffect(() => {
        const dismiss = () => { cancelHold(); setTouchActions(null); };
        const dismissOutside = (event: PointerEvent) => {
            if (event.target instanceof Element && event.target.closest('[data-column-header], [data-column-actions]')) return;
            skipHeaderClick.current = false;
            dismiss();
        };
        window.addEventListener('scroll', dismiss, true);
        window.addEventListener('pointerdown', dismissOutside, true);
        return () => { cancelHold(); window.removeEventListener('scroll', dismiss, true); window.removeEventListener('pointerdown', dismissOutside, true); };
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
        onDraftStatusChange?.(value === null ? null : value.text === '' ? 'empty'
            : /^\d{1,2}$/.test(value.text) && Number(value.text) <= 36 ? 'note' : 'invalid');
    };
    const fretAt = (cell: TabActiveCell) => document.moments.find(moment => moment.id === cell.momentId)?.notes.find(note => note.string === cell.string)?.fret ?? null;
    const writeFret = (cell: TabActiveCell, fret: number | null) => {
        if (fretAt(cell) !== fret) onSetFret({ ...cell, fret });
    };
    const commit = (keepInputUntilBlur = false) => {
        const edit = draftRef.current;
        if (!edit) return true;
        if (edit.text !== '' && (!/^\d{1,2}$/.test(edit.text) || Number(edit.text) > 36)) {
            setError('Enter a fret from 0–36, or leave the cell empty.');
            return false;
        }
        if (!keepInputUntilBlur) setDraft(null);
        setError(null);
        writeFret(edit.cell, edit.text === '' ? null : Number(edit.text));
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
        else if (event.key === 'Enter' || event.key === 'F2') { event.preventDefault(); begin(cell, fretAt(cell)?.toString() ?? '', 'all'); }
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

    const measures = Array.from({ length: Math.max(1, document.measureCount) }, (_, index) => ({
        number: index + 1,
        moments: document.moments.map((moment, position) => ({ moment, index: position })).filter(item => item.moment.measure === index + 1),
    }));
    const systems = Array.from({ length: Math.ceil(measures.length / 4) }, (_, index) => measures.slice(index * 4, index * 4 + 4));

    return <div className={styles.score} role="region" aria-label="Tab score — onsets in order">
        {systems.map((system, systemIndex) => {
            const slots = system.flatMap<{ moment: TabMoment | null; index: number; measure: number }>(measure => measure.moments.length ? measure.moments.map(item => ({ ...item, measure: measure.number })) : [{ moment: null, index: -1, measure: measure.number }]);
            const template = `44px repeat(${slots.length}, minmax(44px, 1fr))`;
            const sheetStyle = { minWidth: 44 + slots.length * 44 + (onInsertMoment ? 22 : 0), paddingRight: onInsertMoment ? 22 : 0, '--score-columns': template } as React.CSSProperties;
            const firstIndex = slots.find(item => item.index >= 0)?.index ?? -1;
            const lastIndex = slots.findLast(item => item.index >= 0)?.index ?? -1;
            const visibleAnnotations = annotations.filter(annotation => firstIndex >= 0 && annotation.start <= lastIndex && annotation.end >= firstIndex);
            const selectedAnnotation = visibleAnnotations.find(annotation => annotation.id === openAnnotation);
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
                <div className={styles.viewport} role="region" aria-label={`Tab score — bars ${system[0].number}–${system.at(-1)!.number}`}>
                    <div className={styles.sheet} style={sheetStyle}>
                        {annotationRows('above')}
                        <div className={styles.headers}>
                            <span className={styles.corner} aria-hidden="true" />
                            {system.map(measure => <div key={measure.number} className={styles.measureHeader} data-measure={measure.number}
                                style={{ gridColumn: `span ${Math.max(1, measure.moments.length)}` }}>
                                <span className={styles.measureNumber} aria-hidden="true">{measure.number}</span>
                                {measure.moments.map(({ moment, index }) => {
                                    const description = moment.notes.map(note => `string ${note.string + 1}, fret ${note.fret}`).join('; ') || 'empty';
                                    return <button key={moment.id} ref={element => { if (element) headers.current.set(moment.id, element); else headers.current.delete(moment.id); }}
                                        type="button" tabIndex={columnMode && current?.momentId === moment.id ? 0 : -1} className={styles.header}
                                        data-column-header="true"
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
                        <div className={styles.scoreBody}>
                        {onInsertMoment && <div className={styles.insertions}>
                            <span aria-hidden="true" />
                            {slots.map(({ moment, index }, slotIndex) => <div key={moment?.id ?? `empty-insert-${slotIndex}`}
                                className={styles.insertionSlot} data-current={moment?.id === current?.momentId}>
                                {moment && <button type="button" tabIndex={-1} className={styles.insertPosition}
                                    aria-label={`Insert position after onset ${index + 1}`} title="Insert position"
                                    disabled={document.moments.length >= 1024}
                                    onClick={() => insertAt({ momentId: moment.id, string: current?.string ?? 0 })}><span aria-hidden="true">+</span></button>}
                            </div>)}
                        </div>}
                        <div role="grid" aria-label={systemIndex === 0 ? 'Editable tab' : `Editable tab, bars ${system[0].number}–${system.at(-1)!.number}`} aria-rowcount={6} aria-colcount={slots.length + 1} className={styles.grid}>
                            {document.tuningMidi.map((midi, string) => <div role="row" aria-rowindex={string + 1} className={styles.row} key={string}>
                                <span role="rowheader" aria-colindex={1} className={styles.stringLabel} aria-label={`String ${string + 1}, ${getKeyName(midi % 12)}`}>{getKeyName(midi % 12)}</span>
                                {slots.map(({ moment, index, measure }, slotIndex) => {
                                    const startsBar = slotIndex === 0 || slots[slotIndex - 1].measure !== measure;
                                    if (!moment) return <div key={`empty-${measure}`} role="gridcell" aria-colindex={slotIndex + 2}
                                        aria-label={`Empty bar ${measure}`} className={styles.cell} data-bar-start={startsBar} />;
                            const cell = { momentId: moment.id, string }, key = cellKey(cell);
                            const note = moment.notes.find(item => item.string === string);
                            const isActive = current !== null && cellKey(current) === key;
                            const isEditing = draft !== null && cellKey(draft.cell) === key;
                            const label = `String ${string + 1}, onset ${index + 1}, ${note ? `fret ${note.fret}` : 'empty'}`;
                            return <div role="gridcell" aria-colindex={slotIndex + 2} aria-selected={isActive} className={styles.cell} key={key}
                                data-active={isActive} data-selected={index >= lower && index <= upper} data-bar-start={startsBar}>
                                <button ref={element => { if (element) buttons.current.set(key, element); else buttons.current.delete(key); }} type="button"
                                    className={styles.cellButton} tabIndex={isActive && !isEditing && !columnMode ? 0 : -1} aria-label={label}
                                    aria-hidden={isEditing || undefined} data-editing={isEditing}
                                    onClick={event => {
                                        if (!commit()) { input.current?.focus(); return; }
                                        choose(cell, event.shiftKey || extend);
                                        begin(cell, note?.fret.toString() ?? '', 'all');
                                    }} onKeyDown={event => onCellKey(event, cell)}
                                    onPaste={event => { event.preventDefault(); begin(cell, event.clipboardData.getData('text/plain'), 'all'); }}>
                                    {note ? <span className={styles.fret} data-focused={note.id === focusedNoteId}>{note.fret}</span>
                                        : <span className={styles.empty} aria-hidden="true">·</span>}
                                </button>
                                {isEditing && <input ref={input} type="text" inputMode="numeric" autoComplete="off" spellCheck={false}
                                    className={styles.editor} value={draft.text} aria-label={`Fret for string ${string + 1}, onset ${index + 1}`}
                                    aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined}
                                    onChange={event => { setDraft({ ...draft, text: event.target.value }); setError(null); }}
                                    onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
                                    onKeyDown={event => onInputKey(event, cell)}
                                    onBlur={() => { if (!composing.current && !commit()) input.current?.focus({ preventScroll: true }); }} />}
                            </div>;
                                })}
                            </div>)}
                        </div>
                        </div>
                        {annotationRows('below')}
                    </div>
                </div>
                {selectedAnnotation && <div className={styles.annotationDetail} role="note" aria-label="Annotation detail">
                    <div><strong>{selectedAnnotation.label}</strong><p>{selectedAnnotation.detail}</p></div>
                    <button type="button" onClick={() => setOpenAnnotation(null)} aria-label="Close annotation detail">×</button>
                </div>}
            </section>;
        })}
        {error && <p className={styles.error} id={errorId} role="alert">{error}</p>}
    </div>;
}
