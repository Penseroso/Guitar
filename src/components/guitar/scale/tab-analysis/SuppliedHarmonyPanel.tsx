"use client";

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CHORD_REGISTRY_LIST } from '@/domain/chord/registry';
import { resolveChord } from '@/domain/harmony/roman';
import type { ChordRef, TonalFrame } from '@/domain/harmony/types';
import { formatAccidentals } from '@/domain/shared/spelling';
import { isValidTabMeter } from '@/domain/tab/input-capabilities';
import { compareExactTimes } from '@/domain/tab/exact-time';
import { observeTabAcrossBarsWrittenTime } from '@/domain/tab/written-time-across-bars';
import {
    describeSuppliedChord, parseChordBoundary, prepareSuppliedChord, selectedChordPositions,
    type PositionChordBinding, type SaveChordError, type SuppliedChordRow, type SuppliedTabChord,
} from '@/domain/tab/supplied-harmony';
import type { TabDocument, TabSelection } from '@/domain/tab/types';
import { SwipePicker } from '../../harmony/SwipePicker';
import type { TabWrittenPointReferences } from '@/domain/tab/written-point-analysis';
import type { TabAnalysisAction } from '@/features/tab-analysis/state';
import { PageControls } from './PageControls';
import { SuppliedHarmonyAnalysis } from './SuppliedHarmonyAnalysis';
import type { TabEvidenceTarget } from './tab-evidence';
import shared from './written-time-panel.module.css';
import styles from './supplied-harmony.module.css';

type Mode = SuppliedTabChord['binding']['kind'];
type HarmonyState = { scoreId: number; originsRevision: number; suppliedHarmony: readonly SuppliedTabChord[] };
type Draft = {
    id: string;
    scoreId: number;
    document: TabDocument;
    positions: PositionChordBinding | null;
    chord: ChordRef;
    start: string;
    end: string;
};
const PAGE_SIZE = 8;
const ROOTS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];
const ROOT_OPTIONS = [{ value: '', label: 'Choose root' }, ...ROOTS.map(value => ({ value, label: formatAccidentals(value) }))];
const QUALITY_OPTIONS = [{ value: '', label: 'Choose quality' }, ...CHORD_REGISTRY_LIST.map(({ id, symbol }) => ({
    value: id, label: id === 'major' ? 'Major' : id === 'minor' ? 'Minor' : symbol,
}))];
const exactLabel = (time: { numerator: string; denominator: string }) => time.denominator === '1'
    ? time.numerator : `${time.numerator}/${time.denominator}`;
const errorMessage: Record<SaveChordError, string> = {
    'unsupported-chord': 'Choose a supported chord spelling and bass.',
    'unavailable-range': 'Check the chord boundaries.',
    overlap: 'This range overlaps a supplied chord. Change its boundaries or edit that chord.',
};

function rangeLabel(row: SuppliedChordRow, document: TabDocument) {
    const { placement, entry } = row;
    if (placement?.kind === 'positions') {
        if (placement.first === placement.last) return `Position ${placement.first + 1}`;
        return `Positions ${placement.first + 1}–${placement.last + 1}`;
    }
    if (entry.binding.kind === 'written-time') return `${exactLabel(entry.binding.start)}–${exactLabel(entry.binding.end)} quarter notes`;
    return positionLabel(entry.binding, document);
}

function positionLabel(binding: PositionChordBinding, document: TabDocument) {
    const first = document.moments.findIndex(moment => moment.id === binding.firstId);
    const last = document.moments.findIndex(moment => moment.id === binding.lastId);
    if (first >= 0 && last >= first) return first === last ? `Position ${first + 1}` : `Positions ${first + 1}–${last + 1}`;
    return 'Position range unavailable';
}
function compareRows(a: SuppliedChordRow, b: SuppliedChordRow) {
    const left = a.placement, right = b.placement;
    if (left?.kind === 'positions' && right?.kind === 'positions') return left.first - right.first;
    if (left?.kind === 'written-time' && right?.kind === 'written-time') return compareExactTimes(left.start, right.start);
    return Number(!!right) - Number(!!left);
}

export function SuppliedHarmonyPanel({ document, selection, harmony, rows, references, onEdit, onRevealEvidence, requestedChord, renderLayout, onSetKeyReference }: {
    document: TabDocument;
    selection: TabSelection;
    harmony: HarmonyState;
    rows: readonly SuppliedChordRow[];
    references?: TabWrittenPointReferences;
    onEdit: (action: TabAnalysisAction) => void;
    onRevealEvidence?: (target: TabEvidenceTarget, origin: HTMLElement) => void;
    requestedChord?: { id: string; request: number; origin?: HTMLButtonElement };
    renderLayout?: (trigger: ReactNode, body: ReactNode) => ReactNode;
    onSetKeyReference?: (frame: TonalFrame) => void;
}) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<Mode>('positions');
    const [draft, setDraft] = useState<Draft | null>(null);
    const [chosenId, setChosenId] = useState<string | null>(null);
    const [listPage, setListPage] = useState(0);
    const [notePage, setNotePage] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [readingOpen, setReadingOpen] = useState(false);
    const [openingSource, setOpeningSource] = useState<'trigger' | 'score'>('trigger');
    const [handledRequest, setHandledRequest] = useState<{ id: string; request: number; accepted: boolean } | null>(null);
    const [requestNotice, setRequestNotice] = useState<string | null>(null);
    const [melody, setMelody] = useState<{ document: TabDocument; ids: string[] }>({ document, ids: [] });
    const currentMelody = melody.document === document ? melody : { document, ids: [] };
    if (melody !== currentMelody) setMelody(currentMelody);
    const composing = useRef(false);
    const toggle = useRef<HTMLButtonElement>(null);
    const add = useRef<HTMLButtonElement>(null);
    const editorHeading = useRef<HTMLHeadingElement>(null);
    const analysisButton = useRef<HTMLButtonElement>(null);
    const analysisHeading = useRef<HTMLHeadingElement>(null);
    const detailHeading = useRef<HTMLHeadingElement>(null);
    const bodyHeading = useRef<HTMLHeadingElement>(null);
    const [bodyFocusRequest, setBodyFocusRequest] = useState(0);
    const meter = document.meter;
    const hasMeter = !!meter && isValidTabMeter(meter);
    const selectedPositions = selectedChordPositions(document, selection);
    const entries = rows.filter(row => row.entry.binding.kind === mode).sort(compareRows);
    const chosen = rows.find(row => row.entry.id === chosenId && row.entry.binding.kind === mode);
    const listPages = Math.ceil(entries.length / PAGE_SIZE);
    const currentListPage = Math.max(0, Math.min(listPage, listPages - 1));
    const observeWritten = open && mode === 'written-time'
        && (!!chosen?.placement || (readingOpen && currentMelody.ids.length > 0));
    const written = useMemo(() => observeWritten
        ? observeTabAcrossBarsWrittenTime(document, 1, { model: 'regular-bar-origins' }) : undefined, [document, observeWritten]);
    const details = useMemo(() => open && chosen
        ? describeSuppliedChord(document, chosen, references ?? { scale: null, frame: null }, written)
        : null, [open, chosen, document, references, written]);
    const detailNotes = details?.notes ?? [];
    const notePages = Math.ceil(detailNotes.length / PAGE_SIZE);
    const currentNotePage = Math.max(0, Math.min(notePage, notePages - 1));
    const selectedRange = selection.start === selection.end
        ? `Position ${selection.start + 1}` : `Positions ${Math.min(selection.start, selection.end) + 1}–${Math.max(selection.start, selection.end) + 1}`;
    const selectedMoments = document.moments.slice(Math.min(selection.start, selection.end), Math.max(selection.start, selection.end) + 1);
    const canSelectRange = selectedMoments.length > 0 && selectedMoments.every(moment => moment.notes.length === 1 && !moment.rest);
    const selectedNoteIds = useMemo(() => new Set(currentMelody.ids), [currentMelody.ids]);
    const toggleMelodyNote = (id: string) => setMelody({
        document, ids: selectedNoteIds.has(id) ? currentMelody.ids.filter(noteId => noteId !== id) : [...currentMelody.ids, id],
    });
    const toggleReadings = () => {
        setReadingOpen(!readingOpen);
        if (!readingOpen) requestAnimationFrame(() => {
            analysisHeading.current?.focus({ preventScroll: true });
            analysisHeading.current?.scrollIntoView?.({ block: 'nearest' });
        });
    };
    if (requestedChord && (requestedChord.id !== handledRequest?.id || requestedChord.request !== handledRequest?.request)) {
        const row = rows.find(row => row.entry.id === requestedChord.id && row.entry.binding.kind === 'positions' && row.placement?.kind === 'positions');
        const accepted = !draft && !!row;
        setHandledRequest({ id: requestedChord.id, request: requestedChord.request, accepted });
        if (accepted) {
            const positions = rows.filter(row => row.entry.binding.kind === 'positions').sort(compareRows);
            setOpen(true); setOpeningSource('score'); setMode('positions'); setChosenId(requestedChord.id);
            if (mode !== 'positions') { setMelody({ document, ids: [] }); setReadingOpen(false); }
            setListPage(Math.floor(positions.findIndex(row => row.entry.id === requestedChord.id) / PAGE_SIZE));
            setNotePage(0); setRequestNotice(null);
        } else setRequestNotice(draft ? 'Finish or cancel chord input first.' : 'This chord position is no longer available.');
    }
    useLayoutEffect(() => {
        if (!handledRequest?.accepted) return;
        detailHeading.current?.focus({ preventScroll: true });
        detailHeading.current?.scrollIntoView?.({ block: 'nearest' });
    }, [handledRequest]);
    useLayoutEffect(() => {
        if (!bodyFocusRequest) return;
        bodyHeading.current?.focus({ preventScroll: true });
        bodyHeading.current?.scrollIntoView?.({ block: 'nearest' });
    }, [bodyFocusRequest]);
    const closePanel = () => {
        if (draft || composing.current) return;
        setOpen(false);
        const origin = openingSource === 'score' && requestedChord?.id === chosenId && requestedChord.request === handledRequest?.request ? requestedChord.origin : null;
        const destination = origin?.isConnected ? origin : toggle.current;
        destination?.focus({ preventScroll: true });
        destination?.scrollIntoView?.({ block: 'nearest' });
    };
    const chosenEvidence = (): TabEvidenceTarget => chosen?.placement?.kind === 'positions'
        ? { momentIds: document.moments.slice(chosen.placement.first, chosen.placement.last + 1).map(moment => moment.id) }
        : { noteIds: detailNotes.map(note => note.noteId) };

    const edit = (row?: SuppliedChordRow) => {
        const binding = row?.entry.binding;
        setError(null);
        setDraft({
            id: row?.entry.id ?? '',
            scoreId: harmony.scoreId,
            document,
            positions: binding?.kind === 'positions' && row?.placement ? binding : selectedPositions,
            chord: row?.entry.chord ?? { root: '', chordId: '' },
            start: binding?.kind === 'written-time' ? exactLabel(binding.start) : '',
            end: binding?.kind === 'written-time' ? exactLabel(binding.end) : '',
        });
        requestAnimationFrame(() => editorHeading.current?.focus({ preventScroll: true }));
    };
    const cancel = () => {
        if (composing.current) return;
        setDraft(null);
        setError(null);
        add.current?.focus({ preventScroll: true });
    };
    const update = (patch: Partial<Draft>) => {
        if (!draft) return;
        setError(null);
        setDraft({ ...draft, ...patch });
    };
    const expired = !!draft && (draft.scoreId !== harmony.scoreId
        || (!!draft.id && !entries.some(row => row.entry.id === draft.id)));
    let draftChord;
    if (draft?.chord.root && draft.chord.chordId) {
        try { draftChord = resolveChord({ root: draft.chord.root, chordId: draft.chord.chordId }); }
        catch { /* Show unsupported spelling if the user applies it. */ }
    }
    const apply = () => {
        if (!draft || expired || composing.current) return;
        if (draft.document !== document) {
            setError('The score changed. Recheck the range before applying.');
            return;
        }
        const start = mode === 'written-time' ? parseChordBoundary(draft.start) : null;
        const end = mode === 'written-time' ? parseChordBoundary(draft.end) : null;
        const binding = mode === 'positions' ? draft.positions : start && end
            ? { kind: 'written-time' as const, start, end, originsRevision: harmony.originsRevision } : null;
        if (!binding) {
            setError('Enter a start and an end in quarter notes, for example 0 and 3/2.');
            return;
        }
        const entry = { id: draft.id, scoreId: harmony.scoreId, chord: draft.chord, binding };
        const result = prepareSuppliedChord(document, harmony.scoreId, harmony.originsRevision, harmony.suppliedHarmony, entry);
        if ('error' in result) {
            setError(errorMessage[result.error]);
            return;
        }
        onEdit({ type: 'save-supplied-chord', entry: result.entry, document });
        cancel();
    };
    const switchMode = (value: Mode) => {
        if (value === mode) return;
        setMode(value);
        setChosenId(null);
        setListPage(0);
        setNotePage(0);
        setMelody({ document, ids: [] });
    };

    const trigger = <button type="button" ref={toggle} className={shared.action} aria-expanded={open} disabled={draft !== null}
        onClick={() => {
            if (open) closePanel();
            else { setOpen(true); setOpeningSource('trigger'); setBodyFocusRequest(previous => previous + 1); }
        }}>Read with my chords{rows.length > 0 ? ` · ${rows.length}` : ''}</button>;
    const body = <>
        {requestNotice && <p role="status">{requestNotice}</p>}
        {open && <section aria-label="Supplied chord progression" className={styles.body} onKeyDown={event => {
            if (event.key !== 'Escape' || event.nativeEvent.isComposing || composing.current) return;
            event.preventDefault();
            event.stopPropagation();
            if (draft) cancel();
            else closePanel();
        }}>
            <div className={styles.bodyHeading}>
                <h3 ref={bodyHeading} tabIndex={-1} className={styles.analysisTitle}>My chords</h3>
                <button type="button" className={shared.action} aria-label="Close supplied chord reading" disabled={!!draft}
                    onClick={closePanel}>Close</button>
            </div>
            <div className={styles.actions} role="group" aria-label="Chord placement">
                <button type="button" className={shared.action} aria-pressed={mode === 'positions'} disabled={!!draft}
                    onClick={() => switchMode('positions')}>By position</button>
                <button type="button" className={shared.action} aria-pressed={mode === 'written-time'} disabled={!!draft}
                    onClick={() => switchMode('written-time')}>By written time</button>
            </div>
            {mode === 'written-time' && <p>{hasMeter ? `Regular full bars · ${meter!.numerator}/${meter!.denominator}` : 'Set the score meter to place chords by written time.'}</p>}
            <div className={styles.actions}>
                <button type="button" ref={add} className={shared.action} aria-disabled={!!draft || (mode === 'written-time' && !hasMeter)}
                    onClick={() => { if (!draft && (mode === 'positions' || hasMeter)) edit(); }}>Add chord</button>
                {mode === 'positions' && !draft && <span>{selectedRange} selected</span>}
                {!draft && entries.length > 0 && <button type="button" ref={analysisButton} className={shared.action}
                    aria-expanded={readingOpen} onClick={toggleReadings}>Read progression{currentMelody.ids.length ? ` · ${currentMelody.ids.length} notes` : ''}</button>}
            </div>
            {draft && <div className={styles.editor} onPointerDownCapture={event => {
                if (composing.current && event.target !== event.currentTarget.ownerDocument.activeElement) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }} onClickCapture={event => {
                if (composing.current && event.target !== event.currentTarget.ownerDocument.activeElement) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }} onCompositionStart={() => { composing.current = true; }}
                onCompositionEnd={() => { composing.current = false; }}>
                <h3 ref={editorHeading} tabIndex={-1}>{draft.id ? 'Edit supplied chord' : 'Add supplied chord'}</h3>
                {mode === 'positions' && draft.positions && <p>{positionLabel(draft.positions, document)}</p>}
                {mode === 'written-time' && <div className={styles.actions}>
                    <label>Start <input aria-label="Chord start" value={draft.start} placeholder="0" onChange={event => update({ start: event.target.value })} /></label>
                    <label>End <input aria-label="Chord end" value={draft.end} placeholder="3/2" onChange={event => update({ end: event.target.value })} /></label>
                    <span>Quarter notes from score start</span>
                </div>}
                {expired ? <p role="status">This chord draft belongs to an earlier score or edit. Cancel to continue.</p>
                    : draft.document !== document && <p role="status">Score changed while editing.</p>}
                {!expired && ((mode === 'positions' && draft.id) || draft.document !== document) && <button type="button" className={shared.action}
                    onClick={() => { if (!composing.current) update({ document, positions: selectedPositions }); }}>
                    {mode === 'positions' ? 'Use selected positions' : 'Review with current meter'}
                </button>}
                <div className={styles.pickers}>
                    <SwipePicker label="Chord root" value={draft.chord.root} options={ROOT_OPTIONS}
                        onChange={root => update({ chord: { ...draft.chord, root, bass: undefined } })} />
                    <SwipePicker label="Chord quality" value={draft.chord.chordId} options={QUALITY_OPTIONS}
                        onChange={chordId => update({ chord: { ...draft.chord, chordId, bass: undefined } })} />
                    {draftChord && <SwipePicker label="Chord bass" value={draft.chord.bass ?? ''} options={[
                        { value: '', label: 'Unspecified' },
                        ...draftChord.tones.filter(tone => tone.degree !== '1').map(tone => ({ value: tone.name, label: formatAccidentals(tone.name) })),
                    ]} onChange={bass => update({ chord: { ...draft.chord, bass: bass || undefined } })} />}
                </div>
                <div className={styles.actions}>
                    <span>Concert pitch</span>
                    <button type="button" className={shared.action} disabled={expired || !draft.chord.root || !draft.chord.chordId} onClick={apply}>Apply chord</button>
                    <button type="button" className={shared.action} onClick={cancel}>Cancel chord input</button>
                </div>
                {error && <p role="alert">{error}</p>}
            </div>}
            {entries.length > 0 && <ul className={styles.rows} aria-label="Supplied chords">
                {entries.slice(currentListPage * PAGE_SIZE, (currentListPage + 1) * PAGE_SIZE).map(row => <li key={row.entry.id}>
                    <button type="button" className={shared.action} aria-pressed={chosenId === row.entry.id} disabled={!!draft}
                        onClick={() => { setChosenId(chosenId === row.entry.id ? null : row.entry.id); setNotePage(0); }}>
                        <strong>{row.chord?.name ?? row.entry.chord.root}</strong>
                        <span>{rangeLabel(row, document)}{!row.placement && ' · Review placement'}</span>
                    </button>
                </li>)}
            </ul>}
            {!draft && <PageControls page={currentListPage} count={listPages} name="Chord pages" onChange={setListPage} />}
            {chosen && !draft && <div className={styles.detail}>
                <h3 ref={detailHeading} tabIndex={-1} className={styles.analysisTitle}>{chosen.chord?.name ?? chosen.entry.chord.root} · Chord detail</h3>
                <div className={styles.actions}>
                    {onRevealEvidence && (chosen.placement?.kind === 'positions' || detailNotes.length > 0) && <button type="button" className={shared.action} data-evidence-action="true"
                        aria-label={`Show on tab: ${chosen.chord?.name ?? chosen.entry.chord.root}`}
                        onClick={event => onRevealEvidence(chosenEvidence(), event.currentTarget)}>Show on tab</button>}
                    <button type="button" className={shared.action} onClick={() => edit(chosen)}>Edit chord</button>
                    <button type="button" className={shared.action}
                        onClick={() => {
                            onEdit({ type: 'remove-supplied-chord', id: chosen.entry.id, scoreId: harmony.scoreId });
                            setChosenId(null);
                            add.current?.focus({ preventScroll: true });
                        }}>Remove chord</button>
                </div>
                {!chosen.placement && <p>Review this chord’s placement before using it.</p>}
                {details?.roman && references?.frame && <p>{details.roman} in {references.frame.tonic} {references.frame.mode}</p>}
                {details?.timing && <p>{details.timing === 'complete' ? 'Written note overlaps' : 'Known written note overlaps · Some timing is unavailable'}</p>}
                {!!details?.invalidNotes && <p>{details.invalidNotes} notes have unsupported pitches.</p>}
                {details && !detailNotes.length && <p>{mode === 'positions' ? 'No pitched notes in this range.' : 'No known written overlaps in this range.'}</p>}
                {detailNotes.length > 0 && <ul className={styles.rows} aria-label="Notes against supplied chord">
                    {detailNotes.slice(currentNotePage * PAGE_SIZE, (currentNotePage + 1) * PAGE_SIZE).map((note, index) => <li key={`${note.noteId}:${index}`} className={styles.evidenceRow}>
                        <button type="button" className={`${shared.action} ${styles.melodyChoice} ${styles.sourceChoice}`} aria-pressed={selectedNoteIds.has(note.noteId)}
                            aria-label={`${note.name}, position ${note.position}, string ${note.string + 1}, select for melody`}
                            onClick={() => toggleMelodyNote(note.noteId)}>
                            <span>
                                <strong>{note.name}</strong> · {note.chordDegree ? `Degree ${formatAccidentals(note.chordDegree)}` : 'Outside chord formula'}
                                <span className={styles.noteSource}>Bar {note.bar} · Position {note.position} · String {note.string + 1}
                                    {note.inScale !== null && (note.scaleDegree ? ` · Scale ${formatAccidentals(note.scaleDegree)}${note.scaleNoteName !== note.name ? ` (${note.scaleNoteName})` : ''}` : ' · Outside reference scale')}
                                    {note.written && ` · ${exactLabel(note.written.overlap.start)}–${exactLabel(note.written.overlap.end)} quarter notes`}
                                </span>
                            </span>
                            <span>{selectedNoteIds.has(note.noteId) ? 'Selected' : 'Select for melody'}</span>
                        </button>
                        {onRevealEvidence && <button type="button" className={`${shared.action} ${styles.evidenceAction}`} data-evidence-action="true"
                            aria-label={`Show on tab: ${note.name}, position ${note.position}, string ${note.string + 1}`}
                            onClick={event => onRevealEvidence({ noteIds: [note.noteId] }, event.currentTarget)}>Show on tab</button>}
                    </li>)}
                </ul>}
                <PageControls page={currentNotePage} count={notePages} name="Relationship pages" onChange={setNotePage} />
            </div>}
            {readingOpen && !draft && entries.length > 0 && <section className={styles.detail} aria-label="Progression reading"
                onKeyDown={event => {
                    if (event.key !== 'Escape' || event.nativeEvent.isComposing) return;
                    event.preventDefault();
                    event.stopPropagation();
                    setReadingOpen(false);
                    analysisButton.current?.focus({ preventScroll: true });
                }}>
                <h3 ref={analysisHeading} tabIndex={-1} className={styles.analysisTitle}>Progression reading</h3>
                <div className={styles.actions}>
                    <button type="button" className={shared.action} disabled={!canSelectRange}
                        onClick={() => setMelody({ document, ids: selectedMoments.map(moment => moment.notes[0].id) })}>Use single-note range</button>
                    {currentMelody.ids.length > 0 && <button type="button" className={shared.action}
                        onClick={() => { setMelody({ document, ids: [] }); analysisHeading.current?.focus({ preventScroll: true }); }}>Clear melody</button>}
                </div>
                <SuppliedHarmonyAnalysis key={mode} document={document} rows={rows} mode={mode} frame={references?.frame ?? null}
                    onRevealEvidence={onRevealEvidence}
                    onSetKeyReference={onSetKeyReference}
                    written={written} selected={currentMelody.ids} onToggleNote={id => {
                        toggleMelodyNote(id);
                        analysisHeading.current?.focus({ preventScroll: true });
                    }} />
            </section>}
        </section>}
    </>;
    return renderLayout ? renderLayout(trigger, body) : <div className={styles.progression}>{trigger}{body}</div>;
}
