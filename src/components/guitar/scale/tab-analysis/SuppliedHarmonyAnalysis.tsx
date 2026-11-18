"use client";

import { useMemo, useState } from 'react';
import type { TonalFrame } from '@/domain/harmony/types';
import { getNoteName } from '@/domain/shared/notes';
import { formatAccidentals } from '@/domain/shared/spelling';
import { serializeExactTime } from '@/domain/tab/exact-time';
import { observeSuppliedProgression, type ChordPlacementMode } from '@/domain/tab/progression-observation';
import { analyzeSuppliedMelody } from '@/domain/tab/supplied-melody';
import { describeSuppliedChord, type SuppliedChordRow } from '@/domain/tab/supplied-harmony';
import type { TabDocument } from '@/domain/tab/types';
import type { TabAcrossBarsWrittenTimeSnapshot } from '@/domain/tab/written-time-across-bars';
import { PageControls } from './PageControls';
import type { TabEvidenceTarget } from './tab-evidence';
import shared from './written-time-panel.module.css';
import styles from './supplied-harmony.module.css';

const PAGE_SIZE = 8;
const pageFor = (page: number, count: number) => Math.max(0, Math.min(page, Math.ceil(count / PAGE_SIZE) - 1));
const formattedDegree = (degree: string | null) => degree ? formatAccidentals(degree) : 'Outside formula';
const timeLabel = (time: ReturnType<typeof serializeExactTime>) => time.denominator === '1' ? time.numerator : `${time.numerator}/${time.denominator}`;

export function SuppliedHarmonyAnalysis({ document, rows, mode, frame, written, selected, onToggleNote, onRevealEvidence }: {
    document: TabDocument;
    rows: readonly SuppliedChordRow[];
    mode: ChordPlacementMode;
    frame: TonalFrame | null;
    written?: TabAcrossBarsWrittenTimeSnapshot;
    selected: readonly string[];
    onToggleNote: (id: string) => void;
    onRevealEvidence?: (target: TabEvidenceTarget, origin: HTMLElement) => void;
}) {
    const [progressionPage, setProgressionPage] = useState(0);
    const [selectionPage, setSelectionPage] = useState(0);
    const [melodyPage, setMelodyPage] = useState(0);
    const progression = useMemo(() => observeSuppliedProgression(rows, mode, frame), [rows, mode, frame]);
    const melody = useMemo(() => analyzeSuppliedMelody(document, progression, mode, selected, written),
        [document, progression, mode, selected, written]);
    const progressionPageIndex = pageFor(progressionPage, progression.transitions.length);
    const selectionPageIndex = pageFor(selectionPage, melody.notes.length);
    const movementCount = melody.motions.length;
    const patterns = [
        ...melody.shapes.map(shape => ({
            key: `shape-${shape.middle.id}`,
            title: shape.kind === 'passing' ? 'Possible passing motion' : 'Possible neighbor motion',
            evidence: `${shape.before.name} → ${shape.middle.name} → ${shape.after.name} · ${shape.middle.chord!.chord.name} · Positions ${shape.before.position + 1}–${shape.after.position + 1}`,
            target: { noteIds: [shape.before.id, shape.middle.id, shape.after.id] },
        })),
        ...melody.held.map(change => ({
            key: `held-${change.note.id}-${change.to.entry.id}`,
            title: `${change.note.name} across ${change.from.chord.name} → ${change.to.chord.name}`,
            evidence: `${formattedDegree(change.fromDegree)} → ${formattedDegree(change.toDegree)} · Written boundary ${timeLabel(serializeExactTime(change.boundary))} · Position ${change.note.position + 1}`,
            target: { noteIds: [change.note.id] },
        })),
        ...melody.suspensions.map(pattern => ({
            key: `suspension-${pattern.note.id}-${pattern.to.entry.id}`,
            title: 'Possible written 4–3 suspension',
            evidence: `${pattern.note.name} prepared in ${pattern.from.chord.name}, written across ${pattern.to.chord.name}, then ${pattern.next.name} · Positions ${pattern.note.position + 1} → ${pattern.next.position + 1}`,
            target: { noteIds: [pattern.note.id, pattern.next.id] },
        })),
    ];
    const resultCount = movementCount + patterns.length;
    const melodyPageIndex = pageFor(melodyPage, resultCount);
    const start = melodyPageIndex * PAGE_SIZE, end = start + PAGE_SIZE;
    const chordEvidence = (chords: readonly SuppliedChordRow[]): TabEvidenceTarget => {
        const momentIds: string[] = [], noteIds: string[] = [];
        for (const chord of chords) {
            if (chord.placement?.kind === 'positions') {
                momentIds.push(...document.moments.slice(chord.placement.first, chord.placement.last + 1).map(moment => moment.id));
            } else if (written?.sourceDocument === document) {
                const details = describeSuppliedChord(document, chord, { scale: null, frame: null }, written);
                noteIds.push(...details?.notes.map(note => note.noteId) ?? []);
            }
        }
        return { ...(momentIds.length ? { momentIds: [...new Set(momentIds)] } : {}),
            ...(noteIds.length ? { noteIds: [...new Set(noteIds)] } : {}) };
    };

    return <>
        <h4 className={styles.analysisTitle}>Chord relationships</h4>
        {progression.needsReview > 0 && <p>Review unplaced chords before reading the progression.</p>}
        {progression.conflict && <p>Resolve overlapping chord placements first.</p>}
        {!progression.frame && <p>Set a key reference for functional readings.</p>}
        {progression.frame && <p>Key reference · {formatAccidentals(progression.frame.tonic)} {progression.frame.mode}</p>}
        {!progression.transitions.length && !progression.conflict && <p>Add two chords to compare their movement.</p>}
        {!!progression.transitions.length && <ul className={styles.rows} aria-label="Chord relationships">
            {progression.transitions.slice(progressionPageIndex * PAGE_SIZE, (progressionPageIndex + 1) * PAGE_SIZE).map(({ from, to, adjacent, prefix, reading, facts }) => (
                <li className={styles.readingRow} key={from.entry.id}>
                    <p><strong>{prefix && `${prefix.chord.name} → `}{from.chord.name}{adjacent ? ' → ' : ' · '}{to.chord.name}</strong></p>
                    {!adjacent && <p>Unassigned span between chords</p>}
                    {reading && <p>{reading.label} · {reading.kind === 'tritone' ? 'Possible tritone substitute approach · Jazz/pop'
                        : reading.kind === 'applied' ? 'Possible secondary dominant' : 'Dominant motion'}</p>}
                    {reading?.kind === 'tonic' && reading.endingEvidence.length > 0 && <p>Cadence needs {reading.endingEvidence.join(', ').toLowerCase()}</p>}
                    {reading?.kind === 'tonic' && reading.endingUnsupported && <p>Chord pair outside the supported cadence vocabulary</p>}
                    {facts && <p>Shared chord tones · {facts.shared.map(pitch => getNoteName(pitch)).join(', ') || 'None'}</p>}
                    {onRevealEvidence && <button type="button" className={shared.action} data-evidence-action="true"
                        aria-label={`Show on tab: ${prefix ? `${prefix.chord.name} to ` : ''}${from.chord.name} to ${to.chord.name}`}
                        onClick={event => onRevealEvidence(chordEvidence(prefix ? [prefix, from, to] : [from, to]), event.currentTarget)}>Show on tab</button>}
                </li>
            ))}
        </ul>}
        <PageControls page={progressionPageIndex} count={Math.ceil(progression.transitions.length / PAGE_SIZE)}
            name="Chord relationship pages" onChange={setProgressionPage} />
        <h4 className={styles.analysisTitle}>Selected melody</h4>
        {!melody.notes.length && <p>Choose notes from a supplied chord or use a single-note TAB range.</p>}
        {!!melody.notes.length && <>
            {melody.timing === 'conflicting-time' && <p>Written starts disagree with the selected score order. Showing source order.</p>}
            {melody.timing === 'missing-time' && <p>Some selected notes lack written timing. Showing source order.</p>}
            {melody.timing === 'written-time-order' && <p>Written time order</p>}
            {melody.timing === 'source-order' && <p>Source position order</p>}
            {melody.sameOnset && <p>Choose one melody note per position to read its movement.</p>}
            <ul className={styles.rows} aria-label="Selected melody notes">
                {melody.notes.slice(selectionPageIndex * PAGE_SIZE, (selectionPageIndex + 1) * PAGE_SIZE).map(note => <li key={note.id}>
                    <button type="button" className={shared.action} aria-label={`Remove ${note.name} from melody, position ${note.position + 1}, string ${note.string + 1}`}
                        onClick={() => onToggleNote(note.id)}>
                        <strong>{note.name} · Position {note.position + 1} · String {note.string + 1}</strong>
                        <span>{note.chord ? `${note.chord.chord.name} · ${formattedDegree(note.degree)}` : 'No chord at onset'}</span>
                    </button>
                    {onRevealEvidence && <button type="button" className={shared.action} data-evidence-action="true"
                        aria-label={`Show on tab: ${note.name}, position ${note.position + 1}, string ${note.string + 1}`}
                        onClick={event => onRevealEvidence({ noteIds: [note.id] }, event.currentTarget)}>Show on tab</button>}
                </li>)}
            </ul>
            <PageControls page={selectionPageIndex} count={Math.ceil(melody.notes.length / PAGE_SIZE)}
                name="Selected melody pages" onChange={setSelectionPage} />
            {!!resultCount && <ul className={styles.rows} aria-label="Melody movement">
                {melody.motions.slice(start, end).map(({ from, to, semitones, guide, commonChordTone }) => (
                    <li className={styles.readingRow} key={from.id}>
                        <p><strong>{from.name} → {to.name}</strong> · {semitones > 0 ? '+' : ''}{semitones} {Math.abs(semitones) === 1 ? 'semitone' : 'semitones'}</p>
                        <p>Positions {from.position + 1} → {to.position + 1}
                            {from.chord && to.chord && ` · ${from.chord.chord.name} ${formattedDegree(from.degree)} → ${to.chord.chord.name} ${formattedDegree(to.degree)}`}</p>
                        {(guide || commonChordTone) && <p>{guide ? 'Guide-tone motion in the selected melody' : 'Shared chord tone in the selected melody'}</p>}
                        {onRevealEvidence && <button type="button" className={shared.action} data-evidence-action="true"
                            aria-label={`Show on tab: ${from.name} to ${to.name}`}
                            onClick={event => onRevealEvidence({ noteIds: [from.id, to.id] }, event.currentTarget)}>Show on tab</button>}
                    </li>
                ))}
                {patterns.slice(Math.max(0, start - movementCount), Math.max(0, end - movementCount)).map(pattern => (
                    <li className={styles.readingRow} key={pattern.key}><p><strong>{pattern.title}</strong></p><p>{pattern.evidence}</p>
                        {onRevealEvidence && <button type="button" className={shared.action} data-evidence-action="true"
                            aria-label={`Show on tab: ${pattern.title}`}
                            onClick={event => onRevealEvidence(pattern.target, event.currentTarget)}>Show on tab</button>}
                    </li>
                ))}
            </ul>}
            <PageControls page={melodyPageIndex} count={Math.ceil(resultCount / PAGE_SIZE)}
                name="Melody movement pages" onChange={setMelodyPage} />
        </>}
    </>;
}
