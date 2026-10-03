"use client";

import React from 'react';
import type { TabSelectionAnalysis, TabChordCandidate, TabInterval } from '@/domain/tab/analysis';
import type { ChordRef } from '@/domain/harmony/types';
import { formatAccidentals } from '@/domain/shared/spelling';
import { getKeyName } from '@/domain/shared/keys';
import { getChordTypeSuffix } from '@/domain/chord/helpers';
import { CHORD_REGISTRY } from '@/domain/chord/registry';
import styles from './tab-analysis.module.css';

const intervalName = (interval: TabInterval) => interval.label.replace(' st', Math.abs(interval.semitones) === 1 ? ' semitone' : ' semitones');
const directedInterval = (interval: TabInterval) => `${intervalName(interval)}${interval.direction === 'up' ? ' ↑' : interval.direction === 'down' ? ' ↓' : ' →'}`;

export function SelectionAnalysis({ analysis, chord, focusedNoteId, onFocusNote, onChordChange, hasScale, onOpenContext }: {
    analysis: TabSelectionAnalysis;
    chord: ChordRef | null;
    focusedNoteId: string | null;
    onFocusNote: (id: string | null) => void;
    onChordChange: (chord: ChordRef | null) => void;
    hasScale: boolean;
    onOpenContext: () => void;
}) {
    const focused = analysis.notes.find(note => note.id === focusedNoteId);
    const closerReadings = analysis.candidates.filter(candidate => candidate.match !== 'added-tone');
    const visibleReadings = (closerReadings.length ? closerReadings : analysis.candidates).slice(0, 5);
    const otherReadings = analysis.candidates.filter(candidate => !visibleReadings.includes(candidate));
    const chosenName = chord && CHORD_REGISTRY[chord.chordId] ? formatAccidentals(chord.root + getChordTypeSuffix(CHORD_REGISTRY[chord.chordId])) : null;
    const candidateRow = (candidate: TabChordCandidate) => {
        const selected = chord?.root === candidate.chord.root && chord?.chordId === candidate.chord.chordId;
        return <li className={styles.reading} key={candidate.key}>
            <button type="button" className={styles.readingButton} aria-pressed={selected}
                onClick={() => onChordChange(selected ? null : candidate.chord)}>
                <strong>{formatAccidentals(candidate.name)}</strong>
                <span>{candidate.match === 'exact' ? 'All formula notes present' : candidate.match === 'incomplete' ? 'Optional tones omitted' : 'One additional pitch'}</span>
            </button>
            {(candidate.omitted.length > 0 || candidate.added.length > 0) && <p className={styles.meta}>
                {candidate.omitted.length > 0 && `Omitted: ${candidate.omitted.map(formatAccidentals).join(', ')}`}
                {candidate.omitted.length > 0 && candidate.added.length > 0 && ' · '}
                {candidate.added.length > 0 && `Additional: ${candidate.added.map(getKeyName).join(', ')}`}
            </p>}
        </li>;
    };
    return <section className={styles.analysis} aria-label="Selected passage analysis">
        <div className={styles.sectionHeading}><h2>Selected passage</h2><span className={styles.meta}>{analysis.notes.length} notes</span></div>
        {analysis.diagnostics.length > 0 && <ul className={styles.messages}>{analysis.diagnostics.map(message => <li key={message}>{message}</li>)}</ul>}
        {analysis.notes.length === 0 ? <p className={styles.emptyAnalysis}>Add a note to begin. Select several columns to explore their movement.</p> : <>
            <ol className={styles.pitchSequence} aria-label="Observed pitches" tabIndex={0}>
                {analysis.moments.slice(0, 24).map(moment => <li key={moment.id} className={styles.pitchMoment}>
                    <span className={styles.meta}>{moment.index + 1}</span>
                    <div className={styles.noteList}>{moment.notes.map(note => <button key={note.id} className={styles.noteButton} type="button"
                        aria-pressed={focusedNoteId === note.id} aria-label={`Inspect ${formatAccidentals(note.name)}, column ${moment.index + 1}, string ${note.string + 1}`}
                        onClick={() => onFocusNote(focusedNoteId === note.id ? null : note.id)}>
                        <strong>{formatAccidentals(note.name)}</strong>
                        <span>{note.inScale === false ? 'Outside' : note.scaleDegree ? formatAccidentals(note.scaleDegree) : '—'}</span>
                        {note.chordMember !== null && <span className={styles.membership} aria-label={note.chordMember ? 'Chord tone' : 'Non-chord tone'}>{note.chordMember ? '●' : '○'}</span>}
                    </button>)}</div>
                    {moment.notes.length === 0 && <span className={styles.meta}>Empty</span>}
                </li>)}
            </ol>
            {analysis.moments.length > 24 && <p className={styles.meta}>First 24 columns shown. Select a shorter passage to inspect later notes.</p>}
            {!hasScale && <button type="button" className={styles.textAction} onClick={onOpenContext}>Set a reference scale to see degrees →</button>}
        </>}
        {focused && <div className={styles.noteDetail} aria-live="polite">
            <strong>{formatAccidentals(focused.name)}</strong>
            <p>{focused.inScale === null ? 'No reference scale selected' : focused.inScale ? `${formatAccidentals(focused.scaleDegree ?? '')} in the reference scale` : 'Outside the reference scale'}</p>
            {chosenName && <p>{focused.chordMember ? `${focused.chordNoteName ? `${formatAccidentals(focused.chordNoteName)} · ` : ''}Chord tone${focused.chordDegree ? ` · ${formatAccidentals(focused.chordDegree)}` : ''}` : 'Non-chord tone'} against {chosenName}</p>}
            <p className={styles.meta}>String {focused.string + 1}, fret {focused.fret}{focused.source ? ` · imported line ${focused.source.line}` : ' · entered in score'}</p>
        </div>}
        {analysis.melodicRuns.length > 0 && <div className={styles.analysisGroup}>
            <h3>Melodic movement</h3>
            <ul className={styles.readings}>{analysis.melodicRuns.slice(0, 12).map(run => <li className={styles.reading} key={run.start}>
                <strong className={styles.movementTitle}>{run.contour === 'ascending' ? 'Ascending' : run.contour === 'descending' ? 'Descending' : run.contour === 'level' ? 'Repeated pitch' : 'Changing direction'}</strong>
                <p className={styles.meta}>Columns {run.start + 1}–{run.end + 1}</p>
                <p className={styles.intervalFlow}>{run.intervals.slice(0, 16).map(step => directedInterval(step.interval)).join(' · ')}{run.intervals.length > 16 ? ' …' : ''}</p>
            </li>)}</ul>
        </div>}
        {analysis.moments.some(moment => moment.interval) && <div className={styles.analysisGroup}>
            <h3>Double-stop intervals</h3>
            <ul className={styles.readings}>{analysis.moments.filter(moment => moment.interval).slice(0, 16).map(moment => <li className={styles.reading} key={moment.id}>
                <strong>{intervalName(moment.interval!)}</strong><p className={styles.meta}>Column {moment.index + 1} · lower to upper pitch</p>
            </li>)}</ul>
        </div>}
        {analysis.dyadMotions.length > 0 && <div className={styles.analysisGroup}>
            <h3>Two-part movement</h3>
            <ul className={styles.readings}>{analysis.dyadMotions.slice(0, 12).map(motion => <li key={motion.from} className={styles.reading}>
                <strong className={styles.movementTitle}>{motion.kind} motion</strong>
                <p className={styles.meta}>Columns {motion.from + 1}–{motion.to + 1} · lower: {directedInterval(motion.low)} · upper: {directedInterval(motion.high)}</p>
            </li>)}</ul>
            <p className={styles.meta}>Assumes lower-to-lower and upper-to-upper connections; voices are not supplied.</p>
        </div>}
        {analysis.repeatedPatterns.length > 0 && <details className={styles.disclosure}>
            <summary>Repeated interval patterns ({analysis.repeatedPatterns.length})</summary>
            <ul className={styles.readings}>{analysis.repeatedPatterns.slice(0, 8).map((pattern, index) => <li className={styles.reading} key={index}>
                <p>{pattern.semitones.map(value => `${value > 0 ? '+' : ''}${value}`).join(' → ')} semitones</p>
                <p className={styles.meta}>Columns {pattern.occurrences.map(range => `${range.start + 1}–${range.end + 1}`).join(', ')} · rhythm unspecified</p>
            </li>)}</ul>
        </details>}
        {analysis.arpeggios.length > 0 && <details className={styles.disclosure}>
            <summary>Arpeggio readings</summary>
            <ul className={styles.readings}>{analysis.arpeggios.slice(0, 8).map((arp, index) => <li className={styles.reading} key={index}>
                <strong>{arp.candidates.slice(0, 4).map(candidate => candidate.name).join(' / ')}</strong>
                <p className={styles.meta}>Columns {arp.start + 1}–{arp.end + 1} · matching pitch collection, not confirmed accompaniment</p>
            </li>)}</ul>
        </details>}
        {analysis.chordSequence.length > 0 && <div className={styles.analysisGroup}>
            <h3>Harmony in sequence</h3>
            {analysis.progressionReadings?.map(reading => <div key={`${reading.start}:${reading.end}:${reading.label}`} className={styles.reading}>
                <strong>{reading.label}</strong>
                <p className={styles.meta}>Columns {reading.start + 1}–{reading.end + 1}</p>
                <details className={styles.disclosure}><summary>Pattern evidence</summary><p className={styles.meta}>{reading.evidence}</p></details>
            </div>)}
            <ul className={styles.readings}>{analysis.chordSequence.slice(0, 16).map(item => {
                const exact = item.candidates.filter(candidate => candidate.match === 'exact');
                const readings = exact.length ? exact : item.candidates;
                return <li className={styles.reading} key={item.index} data-group-start={!item.continues}>
                    <p className={styles.meta}>{!item.continues ? 'Group begins · ' : ''}Column {item.index + 1}</p>
                    {readings.slice(0, 3).map(candidate => <div key={candidate.key}>
                        <p>{candidate.roman && <strong>{candidate.roman} · </strong>}{candidate.name}</p>
                        {candidate.match !== 'exact' && <p className={styles.meta}>
                            {candidate.omitted.length > 0 && `Omitted: ${candidate.omitted.map(formatAccidentals).join(', ')}`}
                            {candidate.omitted.length > 0 && candidate.added.length > 0 && ' · '}
                            {candidate.added.length > 0 && `Additional: ${candidate.added.map(getKeyName).join(', ')}`}
                        </p>}
                    </div>)}
                    {readings.length > 3 && <p className={styles.meta}>{readings.length - 3} more alternatives · select this column to inspect</p>}
                </li>;
            })}</ul>
            {analysis.chordSequence.length > 16 && <p className={styles.meta}>First 16 chordal columns shown. Select a shorter passage for later readings.</p>}
            <p className={styles.meta}>Exact formula matches shown where available.</p>
            <p className={styles.meta}>Alternatives remain separate. A progression pattern does not establish a cadence.</p>
        </div>}
        {chosenName && <div className={styles.chordContext}>
            {analysis.roman && <p className={styles.roman}>{analysis.roman}</p>}
            <h3>{chosenName}</h3>
            <p className={styles.meta}>Chosen analysis chord · harmonic function unconfirmed</p>
            <button className={styles.textAction} type="button" onClick={() => onChordChange(null)}>Clear analysis chord</button>
        </div>}
        {analysis.selectionKind === 'aligned-chord' && <>
        <div className={styles.sectionHeading}><h3>Chord readings</h3>{analysis.candidates.length > 0 && <span className={styles.meta}>{analysis.candidates.length} possible</span>}</div>
        {analysis.candidates.length === 0 && <p className={styles.meta}>No clear chord name in the current registry.</p>}
        <ul className={styles.readings}>{visibleReadings.map(candidateRow)}</ul>
        {otherReadings.length > 0 && <details className={styles.disclosure}><summary>Other readings ({otherReadings.length})</summary><ul className={styles.readings}>{otherReadings.map(candidateRow)}</ul></details>}
        </>}
        <details className={styles.disclosure}>
            <summary>Evidence & limits</summary>
            <div className={styles.disclosureBody}>
                <p>Columns establish order and aligned onsets. Note lengths, meter and sustained overlap are unknown. An empty column is not a rest.</p>
                <p>Guitar strings do not identify musical voices. Without an explicit spelling context, intervals use semitone distances.</p>
                {analysis.lowestNote && <p>Lowest observed pitch: {formatAccidentals(analysis.lowestNote.name)}. This is the selected guitar part, not necessarily the ensemble bass.</p>}
                <p>Readings use the shared chord registry. A chosen chord supplies an analysis context; it does not establish a key, passing tone or cadence.</p>
                {hasScale && <p>Outside a scale means outside its pitch collection, not an incorrect note.</p>}
            </div>
        </details>
    </section>;
}
