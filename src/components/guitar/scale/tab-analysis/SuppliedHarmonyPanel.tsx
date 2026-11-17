"use client";

import { useMemo, useRef, useState } from 'react';
import { CHORD_REGISTRY_LIST } from '@/domain/chord/registry';
import { resolveChord } from '@/domain/harmony/roman';
import type { ChordRef } from '@/domain/harmony/types';
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

function PageControls({ page, count, name, onChange }: {
    page: number; count: number; name: string; onChange: (page: number) => void;
}) {
    const previous = useRef<HTMLButtonElement>(null);
    const next = useRef<HTMLButtonElement>(null);
    if (count <= 1) return null;
    const move = (to: number) => {
        onChange(to);
        // On the end pages the opposite control remains available.
        if (to === 0) next.current?.focus({ preventScroll: true });
        if (to === count - 1) previous.current?.focus({ preventScroll: true });
    };
    return <div className={shared.paging} role="group" aria-label={name}>
        <button type="button" ref={previous} className={shared.action} disabled={!page} onClick={() => move(page - 1)}>Previous</button>
        <span>Page {page + 1} of {count}</span>
        <button type="button" ref={next} className={shared.action} disabled={page >= count - 1} onClick={() => move(page + 1)}>Next</button>
    </div>;
}

export function SuppliedHarmonyPanel({ document, selection, harmony, rows, references, onEdit }: {
    document: TabDocument;
    selection: TabSelection;
    harmony: HarmonyState;
    rows: readonly SuppliedChordRow[];
    references?: TabWrittenPointReferences;
    onEdit: (action: TabAnalysisAction) => void;
}) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<Mode>('positions');
    const [draft, setDraft] = useState<Draft | null>(null);
    const [chosenId, setChosenId] = useState<string | null>(null);
    const [listPage, setListPage] = useState(0);
    const [notePage, setNotePage] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const composing = useRef(false);
    const toggle = useRef<HTMLButtonElement>(null);
    const add = useRef<HTMLButtonElement>(null);
    const editorHeading = useRef<HTMLHeadingElement>(null);
    const meter = document.meter;
    const hasMeter = !!meter && isValidTabMeter(meter);
    const selectedPositions = selectedChordPositions(document, selection);
    const entries = rows.filter(row => row.entry.binding.kind === mode).sort((a, b) => {
        const left = a.placement, right = b.placement;
        if (left?.kind === 'positions' && right?.kind === 'positions') return left.first - right.first;
        if (left?.kind === 'written-time' && right?.kind === 'written-time') {
            return compareExactTimes(left.start, right.start);
        }
        return Number(!!right) - Number(!!left);
    });
    const chosen = rows.find(row => row.entry.id === chosenId && row.entry.binding.kind === mode);
    const listPages = Math.ceil(entries.length / PAGE_SIZE);
    const currentListPage = Math.max(0, Math.min(listPage, listPages - 1));
    const observeWritten = open && mode === 'written-time' && !!chosen?.placement;
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
        setMode(value);
        setChosenId(null);
        setListPage(0);
        setNotePage(0);
    };

    return <div className={styles.progression}>
        <button type="button" ref={toggle} className={shared.action} aria-expanded={open} disabled={draft !== null}
            onClick={() => setOpen(!open)}>Chord progression{rows.length > 0 ? ` · ${rows.length}` : ''}</button>
        {open && <section aria-label="Supplied chord progression" className={styles.body} onKeyDown={event => {
            if (event.key !== 'Escape' || event.nativeEvent.isComposing || composing.current) return;
            event.preventDefault();
            event.stopPropagation();
            if (draft) cancel();
            else {
                setOpen(false);
                toggle.current?.focus({ preventScroll: true });
            }
        }}>
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
                <div className={styles.actions}>
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
                    {detailNotes.slice(currentNotePage * PAGE_SIZE, (currentNotePage + 1) * PAGE_SIZE).map((note, index) => <li key={`${note.noteId}:${index}`}>
                        <p><strong>{note.name}</strong> · {note.chordDegree ? `Degree ${formatAccidentals(note.chordDegree)}` : 'Outside chord formula'}</p>
                        <p>Bar {note.bar} · Position {note.position} · String {note.string + 1}
                            {note.inScale !== null && (note.scaleDegree ? ` · Scale ${formatAccidentals(note.scaleDegree)}${note.scaleNoteName !== note.name ? ` (${note.scaleNoteName})` : ''}` : ' · Outside reference scale')}
                            {note.written && ` · ${exactLabel(note.written.overlap.start)}–${exactLabel(note.written.overlap.end)} quarter notes`}</p>
                    </li>)}
                </ul>}
                <PageControls page={currentNotePage} count={notePages} name="Relationship pages" onChange={setNotePage} />
            </div>}
        </section>}
    </div>;
}
