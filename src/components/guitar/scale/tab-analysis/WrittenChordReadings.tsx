"use client";

import { useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { analyzeTabWrittenPoint, describeTabWrittenPointCandidate, type TabWrittenPointReferences } from '@/domain/tab/written-point-analysis';
import type { TabAcrossBarsWrittenTimeSnapshot } from '@/domain/tab/written-time-across-bars';
import type { TabExactFraction } from '@/domain/tab/exact-time';
import { resolveScaleRef } from '@/domain/scale/scale-ref';
import { getNoteName } from '@/domain/shared/notes';
import shared from './written-time-panel.module.css';
import styles from './written-chord-readings.module.css';

const PAGE_SIZE = 8;

export function WrittenChordReadings({ snapshot, time, references, onAction }: {
    snapshot: TabAcrossBarsWrittenTimeSnapshot;
    time: TabExactFraction;
    references: TabWrittenPointReferences;
    onAction: () => boolean;
}) {
    const point = `${time.numerator}/${time.denominator}`;
    const [open, setOpen] = useState(false);
    const [alternativesOpen, setAlternativesOpen] = useState(false);
    const [view, setView] = useState({ data: snapshot.data, point, selected: null as string | null, notePage: 0, candidatePage: 0 });
    const current = view.data === snapshot.data && view.point === point ? view
        : { data: snapshot.data, point, selected: null, notePage: 0, candidatePage: 0 };
    if (view !== current) setView(current);
    const result = useMemo(() => open ? analyzeTabWrittenPoint(snapshot, time, references) : null, [open, snapshot, time, references]);
    const analysis = result?.status === 'complete' ? result : null;
    const description = useMemo(() => analysis && current.selected ? describeTabWrittenPointCandidate(analysis, current.selected) : null, [analysis, current.selected]);
    const roles = useMemo(() => description ? new Map(description.notes.map(note => [note.interval.noteId, note])) : null, [description]);
    const presentations = useMemo(() => new Map(analysis?.candidatePresentations.map(candidate => [candidate.key, candidate]) ?? []), [analysis]);
    const namesByPitch = useMemo(() => new Map(analysis?.notes.map(note => [note.pitchClass, note.name]) ?? []), [analysis]);
    const selected = current.selected ? presentations.get(current.selected) : null;
    const notePages = Math.max(1, Math.ceil((analysis?.notes.length ?? 0) / PAGE_SIZE));
    const candidatePages = Math.max(1, Math.ceil((analysis?.candidates.length ?? 0) / PAGE_SIZE));
    const notePage = Math.min(current.notePage, notePages - 1);
    const candidatePage = Math.min(current.candidatePage, candidatePages - 1);
    const notes = analysis?.notes.slice(notePage * PAGE_SIZE, (notePage + 1) * PAGE_SIZE) ?? [];
    const candidates = analysis?.candidates.slice(candidatePage * PAGE_SIZE, (candidatePage + 1) * PAGE_SIZE) ?? [];
    const mainSummary = useRef<HTMLElement>(null), formulaSummary = useRef<HTMLElement>(null);
    const candidateButtons = useRef(new Map<string, HTMLButtonElement>());
    const previousNotes = useRef<HTMLButtonElement>(null), nextNotes = useRef<HTMLButtonElement>(null);
    const previousCandidates = useRef<HTMLButtonElement>(null), nextCandidates = useRef<HTMLButtonElement>(null);
    const pendingFocus = useRef<'previous-notes' | 'next-notes' | 'previous-candidates' | 'next-candidates' | null>(null);
    useLayoutEffect(() => {
        const target = pendingFocus.current;
        if (!target) return;
        const button = target === 'previous-notes' ? previousNotes.current : target === 'next-notes' ? nextNotes.current
            : target === 'previous-candidates' ? previousCandidates.current : nextCandidates.current;
        button?.focus({ preventScroll: true }); pendingFocus.current = null;
    }, [notePage, candidatePage]);
    const reset = () => setView({ data: snapshot.data, point, selected: null, notePage: 0, candidatePage: 0 });
    const toggle = (event: MouseEvent<HTMLElement>) => {
        event.preventDefault();
        if (!onAction()) return;
        if (open) { setAlternativesOpen(false); reset(); }
        setOpen(!open);
    };
    const disclosure = (event: MouseEvent<HTMLElement>) => {
        if (!onAction()) { event.preventDefault(); event.stopPropagation(); }
    };
    const toggleAlternatives = (event: MouseEvent<HTMLElement>) => {
        event.preventDefault();
        if (onAction()) setAlternativesOpen(!alternativesOpen);
    };
    const page = (kind: 'notes' | 'candidates', next: number) => {
        if (!onAction()) return;
        if (next === 0) pendingFocus.current = kind === 'notes' ? 'next-notes' : 'next-candidates';
        else if (next === (kind === 'notes' ? notePages : candidatePages) - 1) pendingFocus.current = kind === 'notes' ? 'previous-notes' : 'previous-candidates';
        setView({ ...current, [kind === 'notes' ? 'notePage' : 'candidatePage']: next });
    };
    const clear = () => {
        if (!onAction()) return;
        (current.selected ? candidateButtons.current.get(current.selected) : null)?.focus({ preventScroll: true });
        if (!current.selected || !candidateButtons.current.has(current.selected)) formulaSummary.current?.focus({ preventScroll: true });
        setView({ ...current, selected: null });
    };
    const scale = analysis?.references.scale && resolveScaleRef(analysis.references.scale);

    return <details className={styles.readings} open={open} onKeyDown={event => {
        if (event.key === 'Escape' && open && !event.nativeEvent.isComposing) {
            event.preventDefault(); event.stopPropagation();
            if (!onAction()) return;
            setOpen(false); setAlternativesOpen(false); reset(); mainSummary.current?.focus({ preventScroll: true });
        }
    }}>
        <summary ref={mainSummary} onClick={toggle}>Chord readings</summary>
        {open && <section aria-label="Written chord readings" className={styles.body}>
            {!analysis && <p role="status">More timing needed at this point</p>}
            {analysis && <>
                {analysis.diagnostics.map(message => <p key={message} role="status">{message}</p>)}
                {analysis.notes.length === 0 ? <p>No written notes at this point.</p> : <>
                    <p className={styles.facts}>Pitch classes · {analysis.pitchClasses.map(pitch => getNoteName(pitch)).join(' · ')}</p>
                    {analysis.twoPitchIntervalClass !== null && <p className={styles.facts}>Interval class · {analysis.twoPitchIntervalClass}</p>}
                    {scale && <p className={styles.reference}>Scale reference · {getNoteName(scale.tonic)} {scale.name}</p>}
                    {analysis.references.frame && <p className={styles.reference}>Key reference · {analysis.references.frame.tonic} {analysis.references.frame.mode}</p>}
                    {selected && description && <div className={styles.hypothesis} aria-label="Hypothetical chord">
                        <div className={styles.rowHeading}><h4>If {selected.name}</h4><button type="button" className={shared.action} aria-label="Clear hypothetical chord" onClick={clear}>Clear reading</button></div>
                        {selected.roman && analysis.references.frame && <p>If {selected.name} in {analysis.references.frame.tonic} {analysis.references.frame.mode} · {selected.roman}</p>}
                    </div>}
                    <ul className={styles.notes} aria-label="Written point notes">{notes.map(note => {
                        const role = roles?.get(note.interval.noteId);
                        return <li key={note.interval.noteId} data-note-id={note.interval.noteId}>
                            <div className={styles.rowHeading}><strong>{note.name}</strong><span>Bar {note.interval.sourceMeasure} · Position {note.interval.momentIndex + 1} · String {note.interval.string + 1}</span></div>
                            {note.inScale !== null && <p>{note.scaleDegree ? `Scale degree · ${note.scaleDegree}` : 'Outside reference scale'}</p>}
                            {role && <p>{role.chordMember ? [role.chordDegree, role.chordNoteName, 'Formula member'].filter(Boolean).join(' · ') : 'Outside this formula'}</p>}
                        </li>;
                    })}</ul>
                    {notePages > 1 && <div className={shared.paging} role="group" aria-label="Written point note pages">
                        <button type="button" ref={previousNotes} className={shared.action} aria-label="Previous written point notes page" disabled={notePage === 0} onClick={() => page('notes', notePage - 1)}>Previous</button>
                        <span>Page {notePage + 1} of {notePages}</span>
                        <button type="button" ref={nextNotes} className={shared.action} aria-label="Next written point notes page" disabled={notePage === notePages - 1} onClick={() => page('notes', notePage + 1)}>Next</button>
                    </div>}
                    {analysis.pitchClasses.length >= 2 && <details open={alternativesOpen} className={styles.alternatives}>
                        <summary ref={formulaSummary} onClick={toggleAlternatives}>Formula alternatives</summary>
                        {alternativesOpen && <>
                            {analysis.candidates.length === 0 ? <p>No supported formula alternatives.</p> : <>
                                <ul className={styles.choices} aria-label="Formula alternatives">{candidates.map(candidate => <li key={candidate.key}>
                                    <button type="button" className={`${shared.action} ${styles.choice}`} data-candidate-key={candidate.key}
                                        ref={button => { if (button) candidateButtons.current.set(candidate.key, button); else candidateButtons.current.delete(candidate.key); }}
                                        aria-pressed={current.selected === candidate.key} onClick={() => { if (onAction()) setView({ ...current, selected: candidate.key }); }}>As {presentations.get(candidate.key)!.name}</button>
                                </li>)}</ul>
                                {candidatePages > 1 && <div className={shared.paging} role="group" aria-label="Formula alternative pages">
                                    <button type="button" ref={previousCandidates} className={shared.action} aria-label="Previous formula alternatives page" disabled={candidatePage === 0} onClick={() => page('candidates', candidatePage - 1)}>Previous</button>
                                    <span>Page {candidatePage + 1} of {candidatePages}</span>
                                    <button type="button" ref={nextCandidates} className={shared.action} aria-label="Next formula alternatives page" disabled={candidatePage === candidatePages - 1} onClick={() => page('candidates', candidatePage + 1)}>Next</button>
                                </div>}
                            </>}
                        </>}
                    </details>}
                    {description && <details className={styles.formulaDetails}>
                        <summary onClick={disclosure}>Formula details</summary>
                        <p>Omitted formula degrees · {description.omitted.join(' · ') || 'None'}</p>
                        <p>Outside formula · {description.added.map(pitch => namesByPitch.get(pitch) ?? getNoteName(pitch)).join(' · ') || 'None'}</p>
                    </details>}
                    <details className={styles.observation}>
                        <summary onClick={disclosure}>Observation details</summary>
                        <p>{analysis.notes.length} source note occurrences · {analysis.pitchClasses.length} distinct pitch classes</p>
                        {analysis.lowestNote && <p>Lowest observed guitar note · {analysis.lowestNote.name}</p>}
                        <p>Interval class ignores register and direction. Formula readings do not establish a chord, bass, inversion or key.</p>
                    </details>
                </>}
            </>}
        </section>}
    </details>;
}
