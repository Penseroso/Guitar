"use client";

import { useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { getTabWrittenInspectionPoints, inspectTabWrittenNotesAt, type TabWrittenTimeSnapshot } from '@/domain/tab/written-time';
import type { TabExactFraction } from '@/domain/tab/exact-time';
import { getNoteName } from '@/domain/shared/notes';
import type { TabEvidenceTarget } from './tab-evidence';
import styles from './written-time-panel.module.css';

const PAGE_SIZE = 8;
const exactLabel = (time: TabExactFraction) => `${time.numerator}/${time.denominator}`;
// Geometry and its labels are approximate. Queries use the original exact endpoint.
const approximate = (time: TabExactFraction) => Number(time.numerator) / Number(time.denominator);
const approximateLabel = (time: TabExactFraction) => `≈ ${Number(approximate(time).toFixed(2)).toString()}`;
const pitchLabel = (midi: number) => `${getNoteName(midi % 12)}${Math.floor(midi / 12) - 1}`;

export function WrittenTimePanel({ snapshot, onClose, onAction, onRevealEvidence }: {
    snapshot: TabWrittenTimeSnapshot;
    onClose: () => void;
    onAction: () => boolean;
    onRevealEvidence?: (target: TabEvidenceTarget, origin: HTMLElement) => void;
}) {
    const data = snapshot.data;
    // Candidate positions depend on the frozen data, never the caller's document token.
    const points = useMemo(() => getTabWrittenInspectionPoints({ data, sourceDocument: undefined }), [data]);
    const [view, setView] = useState({ data, page: 0, point: 0 });
    const pageCount = Math.max(1, Math.ceil(data.intervals.length / PAGE_SIZE));
    const page = view.data === data ? Math.min(view.page, pageCount - 1) : 0;
    const pointIndex = view.data === data ? Math.min(view.point, Math.max(0, points.length - 1)) : 0;
    const visible = data.intervals.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const canQuery = data.noteCoverage !== 'unreadable' && data.intervals.length > 0 && points.length > 0;
    const time = canQuery ? points[pointIndex] : null;
    const query = useMemo(() => time ? inspectTabWrittenNotesAt(snapshot, time) : null, [snapshot, time]);
    const active = useMemo(() => query?.status === 'complete' ? new Set(query.notes.map(note => note.noteId)) : null, [query]);
    const previousPage = useRef<HTMLButtonElement>(null), nextPage = useRef<HTMLButtonElement>(null);
    const previousPoint = useRef<HTMLButtonElement>(null), nextPoint = useRef<HTMLButtonElement>(null);
    const focusAfterChange = useRef<'previous-page' | 'next-page' | 'previous-point' | 'next-point' | null>(null);
    useLayoutEffect(() => {
        const target = focusAfterChange.current;
        if (!target) return;
        const button = target === 'previous-page' ? previousPage.current : target === 'next-page' ? nextPage.current
            : target === 'previous-point' ? previousPoint.current : nextPoint.current;
        button?.focus({ preventScroll: true });
        focusAfterChange.current = null;
    }, [data, page, pointIndex]);
    const movePage = (next: number) => {
        if (!onAction()) return;
        if (next === 0) focusAfterChange.current = 'next-page';
        else if (next === pageCount - 1) focusAfterChange.current = 'previous-page';
        setView({ data, page: next, point: pointIndex });
    };
    const movePoint = (next: number) => {
        if (!onAction()) return;
        if (next === 0) focusAfterChange.current = 'next-point';
        else if (next === points.length - 1) focusAfterChange.current = 'previous-point';
        setView({ data, page, point: next });
    };
    const close = () => { if (onAction()) onClose(); };
    const disclosure = (event: MouseEvent<HTMLElement>) => {
        if (!onAction()) { event.preventDefault(); event.stopPropagation(); }
    };
    const range = data.observedRange;
    const lower = range ? approximate(range.start) : 0, extent = range ? approximate(range.end) - lower : 0;
    const position = (value: TabExactFraction) => extent > 0 ? Math.max(0, Math.min(100, (approximate(value) - lower) / extent * 100)) : 0;
    const state = data.noteCoverage === 'unreadable' ? 'Timing unreadable'
        : data.noteCoverage === 'partial' ? 'Timing incomplete' : data.intervals.length ? 'Written timing' : 'No written notes';

    return <section className={styles.panel} aria-label="Written time" onKeyDown={event => {
        if (event.key === 'Escape' && !event.nativeEvent.isComposing) { event.preventDefault(); event.stopPropagation(); close(); }
    }}>
        <div className={styles.heading}>
            <div className={styles.title}><h3>{data.scope.measure === null ? 'Bar unavailable' : `Bar ${data.scope.measure}`}</h3><p role="status">{state}</p></div>
            <details className={styles.about}>
                <summary onClick={disclosure}>About written time</summary>
                <p>Written notes owned by this bar only. Notes carried in from other bars and performed sound are outside this view.
                    Rests, mutes, continuations and techniques are preserved, not realized. The drawing is approximate; Details keeps exact values.</p>
            </details>
            <button type="button" className={styles.action} aria-label="Close written time" onClick={close}>Close</button>
        </div>
        {data.noteCoverage === 'partial' && <p className={styles.hint}>{data.intervals.length
            ? `${data.intervals.length} of ${data.ownedNoteCount} notes timed`
            : 'Add starts and lengths in Edit.'}</p>}
        {data.noteCoverage === 'unreadable' && <p className={styles.hint}>Review this bar in Edit.</p>}
        {data.noteCoverage !== 'unreadable' && visible.length > 0 && <>
            {canQuery && <div className={styles.cursor} role="group" aria-label="Written time points">
                <button type="button" ref={previousPoint} className={styles.action} aria-label="Previous written time point" disabled={pointIndex === 0} onClick={() => movePoint(pointIndex - 1)}>Previous point</button>
                <span>Point {pointIndex + 1} of {points.length}</span>
                <button type="button" ref={nextPoint} className={styles.action} aria-label="Next written time point" disabled={pointIndex === points.length - 1} onClick={() => movePoint(pointIndex + 1)}>Next point</button>
                {data.noteCoverage === 'partial' && query?.status === 'complete' && <p role="status" className={styles.pointStatus}>Complete at this point</p>}
                <p role="status" className={styles.pointStatus}>{query?.status === 'complete'
                    ? query.notes.length ? `${query.notes.length} written ${query.notes.length === 1 ? 'note' : 'notes'} at this point` : 'No written notes at this point'
                    : query?.status === 'partial' ? 'More timing needed at this point'
                        : query?.status === 'unreadable' ? 'Timing unreadable at this point'
                            : query?.status === 'invalid-query' ? 'Invalid time point' : 'Outside observed range'}</p>
                {onRevealEvidence && query?.status === 'complete' && query.notes.length > 0 && <button type="button" className={styles.action} data-evidence-action
                    onClick={event => { if (onAction()) onRevealEvidence({ noteIds: query.notes.map(note => note.noteId) }, event.currentTarget); }}>Show point on tab</button>}
            </div>}
            <div className={styles.axis} aria-hidden="true"><span>{range && approximateLabel(range.start)}</span><span>Quarter notes</span><span>{range && approximateLabel(range.end)}</span></div>
            <ul className={styles.notes} aria-label="Written notes">
                {visible.map(note => <li key={`${note.momentIndex}:${note.noteIndex}`} data-active={active?.has(note.noteId) || undefined}>
                    <div className={styles.noteLabel}><span>Position {note.momentIndex + 1} · String {note.string + 1}</span><span>{pitchLabel(note.midi)}
                        {active?.has(note.noteId) && <><span className={styles.activeDot} aria-hidden="true">●</span><span className={styles.srOnly}> · At this point</span></>}</span>
                        {onRevealEvidence && <button type="button" className={styles.action} data-evidence-action
                            aria-label={`Show on tab · ${pitchLabel(note.midi)} · Bar ${data.scope.measure} · Position ${note.momentIndex + 1} · String ${note.string + 1}`}
                            onClick={event => { if (onAction()) onRevealEvidence({ noteIds: [note.noteId] }, event.currentTarget); }}>Show on tab</button>}</div>
                    <div className={styles.rail} aria-hidden="true">
                        <span className={styles.interval} style={{ left: `${position(note.start)}%`, width: `${Math.max(0, position(note.end) - position(note.start))}%` }} />
                        {time && <span className={styles.timeCursor} style={{ left: `${position(time)}%` }} />}
                    </div>
                </li>)}
            </ul>
            {pageCount > 1 && <div className={styles.paging} role="group" aria-label="Written note pages">
                <button type="button" ref={previousPage} className={styles.action} aria-label="Previous written notes page" disabled={page === 0} onClick={() => movePage(page - 1)}>Previous</button>
                <span>Page {page + 1} of {pageCount}</span>
                <button type="button" ref={nextPage} className={styles.action} aria-label="Next written notes page" disabled={page === pageCount - 1} onClick={() => movePage(page + 1)}>Next</button>
            </div>}
            <details className={styles.details}>
                <summary onClick={disclosure}>Details</summary>
                <p className={styles.hint}>Exact quarter notes from this bar&apos;s start. Each interval keeps its own written length.</p>
                {time && <p>Current point · {exactLabel(time)}</p>}
                {query?.status === 'complete' && <>
                    <p>Proof · {query.proof.basis === 'whole-population' ? 'All written notes timed' : 'Later starts excluded'}</p>
                    <p>Excluded notes · {query.proof.excluded.length}</p>
                </>}
                <ul className={styles.exactNotes}>{visible.map(note => <li key={`${note.momentIndex}:${note.noteIndex}`}>
                    <p>Position {note.momentIndex + 1} · String {note.string + 1} · {pitchLabel(note.midi)}</p>
                    <dl><dt>Start</dt><dd>{exactLabel(note.start)}</dd><dt>Length</dt><dd>{exactLabel(note.duration)}</dd><dt>Local end</dt><dd>{exactLabel(note.end)}</dd></dl>
                </li>)}</ul>
            </details>
        </>}
    </section>;
}
