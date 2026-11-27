"use client";

import React, { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { deriveEnteredShape, SILENT_SHAPE_STATES, type ShapeStates } from '@/domain/chord/reverse/enteredShape';
import { inferChordReadings, type ChordReading } from '@/domain/chord/reverse/readings';
import { midiNoteLabel } from '@/domain/chord/engine/presentation';
import { STANDARD_GUITAR_STRING_MIDI_PITCHES } from '@/domain/shared/tuning';
import { useVoicingAudio } from '../useVoicingAudio';
import { ShapeEntry } from './ShapeEntry';
import { badgeFor, describeDyad, playedTone, titleFor } from './reading-labels';
import styles from '../chord-ui.module.css';
import type { ChordRef } from '@/domain/harmony/types';
import { chordRefFromReading } from '@/features/harmonic-workspace/links';

const SHAPE_PLAYBACK_ID = 'reverse-shape';

export interface ReverseChordPanelProps {
    states: ShapeStates;
    onStatesChange: (states: ShapeStates) => void;
    /** Shown only when the caller has a current forward voicing to seed the shape from. */
    onStartFromVoicing?: () => void;
    onExploreHarmony?: (chord: ChordRef) => void;
}

export function ReverseChordPanel({ states, onStatesChange, onStartFromVoicing, onExploreHarmony }: ReverseChordPanelProps) {
    const audio = useVoicingAudio();
    const [focusedReadingKey, setFocusedReadingKey] = useState<string | null>(null);
    const shape = useMemo(() => deriveEnteredShape(states), [states]);
    const inference = useMemo(() => inferChordReadings(shape), [shape]);
    const allReadings = useMemo(
        () => inference.status === 'named' ? [...inference.best, ...inference.other, ...inference.looser] : [],
        [inference],
    );
    const stripId = useId();
    const noteStrip = useRef<HTMLOListElement>(null);
    const activatedChoice = useRef<HTMLButtonElement | null>(null);
    const shapeMidi = shape.notes.map((note) => note.midi);
    const focusedReading = allReadings.find((reading) => reading.key === focusedReadingKey) ?? null;

    useLayoutEffect(() => {
        const choice = activatedChoice.current;
        activatedChoice.current = null;
        if (!choice || !noteStrip.current || !focusedReadingKey) return;
        const notes = noteStrip.current.getBoundingClientRect();
        const button = choice.getBoundingClientRect();
        const top = Math.min(notes.top, button.top);
        const bottom = Math.max(notes.bottom, button.bottom);
        if (bottom - top > window.innerHeight) return;
        const shift = top < 0 ? top : Math.max(0, bottom - window.innerHeight);
        if (shift) window.scrollBy({ top: shift, behavior: 'instant' });
    }, [focusedReadingKey]);

    const playShape = () => { if (shapeMidi.length > 0) void audio.playMidi(SHAPE_PLAYBACK_ID, shapeMidi); };
    const playSingleNote = (string: number, fret: number) => {
        void audio.playMidi(`reverse-note-${string}`, [STANDARD_GUITAR_STRING_MIDI_PITCHES[string] + fret]);
    };
    const toggleFocus = (reading: ChordReading, button: HTMLButtonElement) => {
        activatedChoice.current = button;
        setFocusedReadingKey((current) => (current === reading.key ? null : reading.key));
    };

    const readingChoices = (label: string, readings: readonly ChordReading[]) => <div className={styles.readingChoices} role="group" aria-label={label}>
        {readings.map(reading => {
            const badge = badgeFor(reading);
            return <button key={reading.key} type="button" className={styles.readingTitle}
                aria-pressed={reading.key === focusedReading?.key} aria-controls={stripId} onClick={event => toggleFocus(reading, event.currentTarget)}>
                {titleFor(reading)}{badge && <small>{badge}</small>}
            </button>;
        })}
    </div>;

    return <section aria-label="Name a shape" className={styles.reversePanel}>
        <ShapeEntry states={states} onChange={onStatesChange} onSelectFret={playSingleNote} focusedReading={focusedReading} />

        <div className={styles.reverseControls}>
            <button type="button" className={styles.action + ' ' + styles.primary} disabled={shapeMidi.length === 0}
                aria-busy={audio.loadingCandidateId === SHAPE_PLAYBACK_ID} onClick={playShape}>
                <Play size={16} aria-hidden="true" />{audio.loadingCandidateId === SHAPE_PLAYBACK_ID ? 'Loading…' : 'Play shape'}
            </button>
            <button type="button" className={styles.action} onClick={() => onStatesChange(SILENT_SHAPE_STATES)}>Clear</button>
            {onStartFromVoicing && shape.notes.length === 0 &&
                <button type="button" className={styles.action} onClick={onStartFromVoicing}>Start from current voicing</button>}
            {inference.status !== 'named' && <p className={styles.small} style={{ marginLeft: 'auto' }}>
                {shape.notes.length > 0 ? shape.notes.map((note) => midiNoteLabel(note.midi)).join(' · ') : 'No notes selected.'}
                {shape.bass && ` · Bass ${midiNoteLabel(shape.bass.midi)}`}
            </p>}
        </div>

        <div>
            <h2 className="text-lg font-semibold">Possible names</h2>
            {inference.status === 'empty' && <p role="status">Tap a fret or open string to start.</p>}
            {inference.status === 'too-few-notes' && <p role="status">Not enough distinct notes yet — try adding another.</p>}
            {inference.status === 'no-clear-name' && <p role="status">These notes do not resolve to a clear chord name. Try removing a note.</p>}
            {inference.status === 'dyad' && (() => {
                const dyad = describeDyad(inference.dyad);
                return <div role="status">
                    <p className={styles.small}>Two notes — an interval, not a chord:</p>
                    <p className={styles.small}>{dyad.bassToOtherLine}</p>
                    <p className={styles.small}>{dyad.otherToBassLine}</p>
                </div>;
            })()}
            {inference.status === 'named' && <>
                <div id={stripId} aria-live="polite" aria-atomic="true">
                    <ol ref={noteStrip} className={styles.playedNotes} aria-label="Played notes">
                        {shape.notes.map((note, index) => {
                            const { name, degree } = playedTone(note, focusedReading);
                            return <li key={note.string}>
                                <strong>{name}</strong>
                                {degree && <span>{degree}</span>}
                                {index === 0 && <small>Bass</small>}
                            </li>;
                        })}
                    </ol>
                </div>
                <div className={styles.readingGroups}>
                    <div><h3 className={styles.groupHeading}>Best match</h3>
                        {readingChoices('Best match', inference.best)}</div>
                    {inference.other.length > 0 && <div><h3 className={styles.groupHeading}>Other names</h3>
                        {readingChoices('Other names', inference.other)}</div>}
                </div>
                {inference.looser.length > 0 && <details>
                    <summary className={styles.groupHeading}>Looser readings ({inference.looser.length})</summary>
                    {readingChoices('Looser readings', inference.looser)}
                </details>}
                {focusedReading?.bass.inversion && <p className={styles.small}>{focusedReading.bass.inversion} inversion</p>}
                {focusedReading && onExploreHarmony && <button type="button" className={styles.action}
                    onClick={() => onExploreHarmony(chordRefFromReading(focusedReading))}>Explore selected name in Harmony →</button>}
            </>}
        </div>

        {audio.error && <p role="alert" className={styles.warning}>{audio.error}</p>}
    </section>;
}
