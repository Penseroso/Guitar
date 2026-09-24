"use client";

import React, { useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import { deriveEnteredShape, SILENT_SHAPE_STATES, type ShapeStates } from '@/domain/chord/reverse/enteredShape';
import { inferChordReadings, type ChordReading } from '@/domain/chord/reverse/readings';
import { midiNoteLabel } from '@/domain/chord/engine/presentation';
import { STANDARD_GUITAR_STRING_MIDI_PITCHES } from '@/domain/shared/tuning';
import { useVoicingAudio } from '../useVoicingAudio';
import { ShapeEntry } from './ShapeEntry';
import { ChordReadingCard } from './ChordReadingCard';
import { buildTitleIndex, describeDyad } from './reading-labels';
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

function readingGroup(
    title: string,
    readings: readonly ChordReading[],
    titleByKey: ReadonlyMap<string, string>,
    focusedKey: string | null,
    onToggleFocus: (reading: ChordReading) => void,
) {
    if (readings.length === 0) return null;
    return <section aria-label={title}>
        <h3 className={styles.groupHeading}>{title}</h3>
        <div className={styles.cards}>
            {readings.map((reading) => <ChordReadingCard key={reading.key} reading={reading} titleByKey={titleByKey}
                focused={focusedKey === reading.key} onToggleFocus={() => onToggleFocus(reading)} />)}
        </div>
    </section>;
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
    const titleByKey = useMemo(() => buildTitleIndex(allReadings), [allReadings]);
    const shapeMidi = shape.notes.map((note) => note.midi);
    const focusedReading = allReadings.find((reading) => reading.key === focusedReadingKey) ?? null;

    const playShape = () => { if (shapeMidi.length > 0) void audio.playMidi(SHAPE_PLAYBACK_ID, shapeMidi); };
    const playSingleNote = (string: number, fret: number) => {
        void audio.playMidi(`reverse-note-${string}`, [STANDARD_GUITAR_STRING_MIDI_PITCHES[string] + fret]);
    };
    const toggleFocus = (reading: ChordReading) => {
        setFocusedReadingKey((current) => (current === reading.key ? null : reading.key));
    };

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
            <p className={styles.small} style={{ marginLeft: 'auto' }}>
                {shape.notes.length > 0 ? shape.notes.map((note) => midiNoteLabel(note.midi)).join(' · ') : 'No notes selected.'}
                {shape.bass && ` · Bass ${midiNoteLabel(shape.bass.midi)}`}
            </p>
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
                <p className={styles.small}>Select a name → intervals on fretboard</p>
                {readingGroup('Best match', inference.best, titleByKey, focusedReadingKey, toggleFocus)}
                {readingGroup('Other names', inference.other, titleByKey, focusedReadingKey, toggleFocus)}
                {inference.looser.length > 0 && <details>
                    <summary className={styles.groupHeading} style={{ cursor: 'pointer' }}>Looser readings ({inference.looser.length})</summary>
                    <div className={styles.cards}>
                        {inference.looser.map((reading) => <ChordReadingCard key={reading.key} reading={reading} titleByKey={titleByKey}
                            focused={focusedReadingKey === reading.key} onToggleFocus={() => toggleFocus(reading)} />)}
                    </div>
                </details>}
                {focusedReading && onExploreHarmony && <button type="button" className={styles.action}
                    onClick={() => onExploreHarmony(chordRefFromReading(focusedReading))}>Explore selected name in Harmony →</button>}
            </>}
        </div>

        {audio.error && <p role="alert" className={styles.warning}>{audio.error}</p>}
    </section>;
}
