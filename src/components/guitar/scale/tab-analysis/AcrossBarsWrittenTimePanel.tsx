"use client";

import { useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { getTabAcrossBarsWrittenInspectionPoints, inspectTabAcrossBarsWrittenNotesAt, type TabAcrossBarsWrittenTimeSnapshot } from '@/domain/tab/written-time-across-bars';
import { compareExactTimes, parseExactTime, type TabExactFraction } from '@/domain/tab/exact-time';
import { getNoteName } from '@/domain/shared/notes';
import type { TabWrittenPointReferences } from '@/domain/tab/written-point-analysis';
import { WrittenChordReadings } from './WrittenChordReadings';
import type { TabEvidenceTarget } from './tab-evidence';
import styles from './written-time-panel.module.css';
import acrossStyles from './across-bars-written-time.module.css';

const PAGE_SIZE = 8;
const exactLabel = (time: TabExactFraction) => `${time.numerator}/${time.denominator}`;
const approximate = (time: TabExactFraction) => Number(time.numerator) / Number(time.denominator);
const approximateLabel = (value: number) => `≈ ${Number(value.toFixed(2))}`;
const pitchLabel = (midi: number) => `${getNoteName(midi % 12)}${Math.floor(midi / 12) - 1}`;
const NO_REFERENCES: TabWrittenPointReferences = { scale: null, frame: null };

export function AcrossBarsWrittenTimePanel({ snapshot, onClose, onAction, readingReferences = NO_REFERENCES, onRevealEvidence }: {
    snapshot: TabAcrossBarsWrittenTimeSnapshot;
    onClose: () => void;
    onAction: () => boolean;
    readingReferences?: TabWrittenPointReferences;
    onRevealEvidence?: (target: TabEvidenceTarget, origin: HTMLElement) => void;
}) {
    const data = snapshot.data;
    const referenceKey = JSON.stringify([readingReferences.scale?.group, readingReferences.scale?.scaleId, readingReferences.scale?.tonic,
        readingReferences.frame?.tonic, readingReferences.frame?.mode, readingReferences.frame?.lens]);
    const points = useMemo(() => getTabAcrossBarsWrittenInspectionPoints({ data, sourceDocument: undefined }), [data]);
    const displayNotes = useMemo(() => {
        if (data.status !== 'ready' || !data.projectionWindow) return [];
        const start = parseExactTime(data.projectionWindow.start)!, end = parseExactTime(data.projectionWindow.end)!;
        // Display chronology is a separate copy. Source order and query order stay intact.
        return data.intervals.map(note => ({ note, start: parseExactTime(note.start)!, end: parseExactTime(note.end)! }))
            .filter(entry => compareExactTimes(entry.start, end) < 0 && compareExactTimes(entry.end, start) > 0)
            .sort((left, right) => compareExactTimes(left.start, right.start)
                || left.note.momentIndex - right.note.momentIndex || left.note.noteIndex - right.note.noteIndex)
            .map(entry => entry.note);
    }, [data]);
    const [view, setView] = useState({ data, page: 0, point: 0 });
    const pageCount = Math.max(1, Math.ceil(displayNotes.length / PAGE_SIZE));
    const page = view.data === data ? Math.min(view.page, pageCount - 1) : 0;
    const pointIndex = view.data === data ? Math.min(view.point, Math.max(0, points.length - 1)) : 0;
    const visible = displayNotes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const canQuery = data.status === 'ready' && data.populationCoverage !== 'unreadable' && data.intervals.length > 0 && points.length > 0;
    const time = canQuery ? points[pointIndex] : null;
    const query = useMemo(() => time ? inspectTabAcrossBarsWrittenNotesAt(snapshot, time) : null, [snapshot, time]);
    const active = useMemo(() => query?.status === 'complete' ? new Set(query.notes.map(note => note.noteId)) : null, [query]);
    const previousPage = useRef<HTMLButtonElement>(null), nextPage = useRef<HTMLButtonElement>(null);
    const previousPoint = useRef<HTMLButtonElement>(null), nextPoint = useRef<HTMLButtonElement>(null);
    const pendingFocus = useRef<'previous-page' | 'next-page' | 'previous-point' | 'next-point' | null>(null);
    useLayoutEffect(() => {
        const target = pendingFocus.current;
        if (!target) return;
        const button = target === 'previous-page' ? previousPage.current : target === 'next-page' ? nextPage.current
            : target === 'previous-point' ? previousPoint.current : nextPoint.current;
        button?.focus({ preventScroll: true }); pendingFocus.current = null;
    }, [data, page, pointIndex]);
    const movePage = (next: number) => {
        if (!onAction()) return;
        if (next === 0) pendingFocus.current = 'next-page';
        else if (next === pageCount - 1) pendingFocus.current = 'previous-page';
        setView({ data, page: next, point: pointIndex });
    };
    const movePoint = (next: number) => {
        if (!onAction()) return;
        if (next === 0) pendingFocus.current = 'next-point';
        else if (next === points.length - 1) pendingFocus.current = 'previous-point';
        setView({ data, page, point: next });
    };
    const close = () => { if (onAction()) onClose(); };
    const disclosure = (event: MouseEvent<HTMLElement>) => {
        if (!onAction()) { event.preventDefault(); event.stopPropagation(); }
    };
    const window = data.projectionWindow;
    const lower = window ? approximate(window.start) : 0;
    const length = window ? approximate(window.end) - lower : 0;
    const position = (value: TabExactFraction) => length > 0 ? Math.max(0, Math.min(100, (approximate(value) - lower) / length * 100)) : 0;
    const diagnosticPreview = data.projectionDiagnostics.slice(0, PAGE_SIZE);
    const empty = data.populationCoverage === 'complete' && data.sourceNoteCount === 0;
    const coverage = data.populationCoverage === 'unreadable' ? 'Source timing unreadable'
        : data.populationCoverage === 'partial' ? 'Timing incomplete across score' : empty ? 'No written notes' : 'Source notes across score';

    return <section className={styles.panel} aria-label="Written time" onKeyDown={event => {
        if (event.key === 'Escape' && !event.nativeEvent.isComposing) { event.preventDefault(); event.stopPropagation(); close(); }
    }}>
        <div className={styles.heading}>
            <div className={styles.title}><h3>{data.scope.measure === null ? 'Bar unavailable' : `Bar ${data.scope.measure}`}</h3>
                <p>Across full bars{data.model ? ` · ${data.model.meter.numerator}/${data.model.meter.denominator}` : ''}</p></div>
            <details className={styles.about}>
                <summary onClick={disclosure}>About across bars</summary>
                <p>Regular full bars spaced by the selected meter. All source notes are considered, including earlier bars.
                    Nominal written lengths only; no pickup or performance timing is inferred. Rest, mute, continuation and technique markers are not realized.
                    The drawing is approximate; Details keeps original and projected values.</p>
            </details>
            <button type="button" className={styles.action} aria-label="Close written time" onClick={close}>Close</button>
        </div>
        <p role="status">{data.status === 'unavailable' ? 'Projection unavailable' : coverage}</p>
        {data.status === 'unavailable' && <p className={styles.hint}>{data.reason === 'missing-meter' || data.reason === 'invalid-meter'
            ? 'Set meter to compare bars' : 'Review score data before comparing bars.'}</p>}
        {data.status === 'ready' && data.populationCoverage !== 'unreadable' && !empty && <p className={styles.hint}>{data.intervals.length} of {data.sourceNoteCount} source notes timed</p>}
        {data.status === 'ready' && data.populationCoverage === 'partial' && data.intervals.length === 0 && <p className={styles.hint}>Add starts and lengths in Edit.</p>}
        {canQuery && <div className={styles.cursor} role="group" aria-label="Across-bars time points">
            <button type="button" ref={previousPoint} className={styles.action} aria-label="Previous across-bars time point" disabled={pointIndex === 0} onClick={() => movePoint(pointIndex - 1)}>Previous point</button>
            <span>Point {pointIndex + 1} of {points.length}</span>
            <button type="button" ref={nextPoint} className={styles.action} aria-label="Next across-bars time point" disabled={pointIndex === points.length - 1} onClick={() => movePoint(pointIndex + 1)}>Next point</button>
            {query?.status === 'complete' && <p role="status" className={styles.pointStatus}>Complete at this point</p>}
            <p role="status" className={styles.pointStatus}>{query?.status === 'complete'
                ? query.notes.length ? `${query.notes.length} source ${query.notes.length === 1 ? 'note' : 'notes'} at this point` : 'No source notes at this point'
                : query?.status === 'partial' ? 'More timing needed at this point'
                    : query?.status === 'unreadable' ? 'Timing unreadable at this point'
                        : query?.status === 'invalid-query' ? 'Invalid time point'
                            : query?.status === 'outside-window' ? 'Outside selected bar'
                                : query?.status === 'unavailable' ? 'Projection unavailable' : 'Outside observed range'}</p>
            {onRevealEvidence && query?.status === 'complete' && query.notes.length > 0 && <button type="button" className={styles.action} data-evidence-action
                onClick={event => { if (onAction()) onRevealEvidence({ noteIds: query.notes.map(note => note.noteId) }, event.currentTarget); }}>Show point on tab</button>}
        </div>}
        {query?.status === 'complete' && time && <WrittenChordReadings key={referenceKey} snapshot={snapshot} time={time}
            references={readingReferences} onAction={onAction} onRevealEvidence={onRevealEvidence} />}
        {data.status === 'ready' && data.populationCoverage !== 'unreadable' && displayNotes.length > 0 && <>
            <div className={styles.axis} aria-hidden="true"><span>{approximateLabel(0)}</span><span>Quarter notes in bar</span><span>{approximateLabel(length)}</span></div>
            <ul className={styles.notes} aria-label="Across-bars written notes">
                {visible.map(note => <li key={`${note.momentIndex}:${note.noteIndex}`} data-active={active?.has(note.noteId) || undefined}>
                    <div className={styles.noteLabel}><span>Bar {note.sourceMeasure} · Position {note.momentIndex + 1} · String {note.string + 1}</span>
                        <span>{pitchLabel(note.midi)}{active?.has(note.noteId) && <><span className={styles.activeDot} aria-hidden="true">●</span><span className={styles.srOnly}> · At this point</span></>}</span>
                        {onRevealEvidence && <button type="button" className={styles.action} data-evidence-action
                            aria-label={`Show on tab · ${pitchLabel(note.midi)} · Bar ${note.sourceMeasure} · Position ${note.momentIndex + 1} · String ${note.string + 1}`}
                            onClick={event => { if (onAction()) onRevealEvidence({ noteIds: [note.noteId] }, event.currentTarget); }}>Show on tab</button>}</div>
                    <div className={`${styles.rail} ${acrossStyles.window}`} aria-hidden="true">
                        <span className={styles.interval} style={{ left: `${position(note.start)}%`, width: `${Math.max(0, position(note.end) - position(note.start))}%` }} />
                        {time && <span className={styles.timeCursor} style={{ left: `${position(time)}%` }} />}
                    </div>
                </li>)}
            </ul>
            {pageCount > 1 && <div className={styles.paging} role="group" aria-label="Across-bars note pages">
                <button type="button" ref={previousPage} className={styles.action} aria-label="Previous across-bars notes page" disabled={page === 0} onClick={() => movePage(page - 1)}>Previous</button>
                <span>Page {page + 1} of {pageCount}</span>
                <button type="button" ref={nextPage} className={styles.action} aria-label="Next across-bars notes page" disabled={page === pageCount - 1} onClick={() => movePage(page + 1)}>Next</button>
            </div>}
        </>}
        {data.status === 'ready' && !empty && data.intervals.length > 0 && displayNotes.length === 0 && <p className={styles.hint}>No known intervals in this window</p>}
        <details className={styles.details}>
            <summary onClick={disclosure}>Details</summary>
            <p className={styles.hint}>Nominal source-note intervals under regular full-bar origins. This model does not establish performed sound.</p>
            {data.model && <p>Model · Regular full-bar origins · {data.model.meter.numerator}/{data.model.meter.denominator} · Bar length {exactLabel(data.model.barLength)}</p>}
            {window && <p>Global window · {exactLabel(window.start)} to {exactLabel(window.end)}</p>}
            {time && <p>Current global point · {exactLabel(time)}</p>}
            {query?.status === 'complete' && <><p>Proof · {query.proof.basis === 'whole-population' ? 'All source notes timed' : 'Later source notes excluded'}</p><p>Excluded source notes · {query.proof.excluded.length}</p></>}
            <ul className={styles.exactNotes}>{visible.map(note => <li key={`${note.momentIndex}:${note.noteIndex}`}>
                <p>Bar {note.sourceMeasure} · Position {note.momentIndex + 1} · String {note.string + 1} · {pitchLabel(note.midi)}</p>
                <dl><dt>Note ID</dt><dd>{note.noteId}</dd><dt>Position ID</dt><dd className={acrossStyles.origin}>{note.momentId}</dd>
                    <dt>Original local start</dt><dd>{exactLabel(note.sourceStart)}</dd><dt>Global start</dt><dd>{exactLabel(note.start)}</dd>
                    <dt>Written length</dt><dd>{exactLabel(note.duration)}</dd><dt>Global end</dt><dd>{exactLabel(note.end)}</dd></dl>
            </li>)}</ul>
            {diagnosticPreview.length > 0 && <div className={acrossStyles.diagnostics} role="note" aria-label="Projection diagnostics">
                <p>Outside-bar offsets · {data.projectionDiagnostics.length}</p>
                <ul>{diagnosticPreview.map(diagnostic => <li key={diagnostic.momentIndex}>Bar {diagnostic.sourceMeasure} · Position {diagnostic.momentIndex + 1} · Original offset {exactLabel(diagnostic.offset)}</li>)}</ul>
                {data.projectionDiagnostics.length > PAGE_SIZE && <p>First {PAGE_SIZE} positions shown · Review offsets in Edit.</p>}
            </div>}
        </details>
    </section>;
}
