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
import { buildTitleIndex } from './reading-labels';
import styles from '../chord-ui.module.css';

const SHAPE_PLAYBACK_ID = 'reverse-shape';

export interface ReverseChordPanelProps {
    states: ShapeStates;
    onStatesChange: (states: ShapeStates) => void;
    /** Shown only when the caller has a current forward voicing to seed the shape from. */
    onStartFromVoicing?: () => void;
}

function readingGroup(
    title: string,
    readings: readonly ChordReading[],
    titleByKey: ReadonlyMap<string, string>,
    audio: ReturnType<typeof useVoicingAudio>,
    playShapeFor: (id: string) => void,
    focusedKey: string | null,
    onToggleFocus: (reading: ChordReading) => void,
) {
    if (readings.length === 0) return null;
    return <section aria-label={title}>
        <h3 className={styles.small}>{title}</h3>
        <div className={styles.cards}>
            {readings.map((reading) => <ChordReadingCard key={reading.key} reading={reading} titleByKey={titleByKey}
                isPlaying={audio.loadingCandidateId === reading.key} onPlay={() => playShapeFor(reading.key)}
                focused={focusedKey === reading.key} onToggleFocus={() => onToggleFocus(reading)} />)}
        </div>
    </section>;
}

export function ReverseChordPanel({ states, onStatesChange, onStartFromVoicing }: ReverseChordPanelProps) {
    const audio = useVoicingAudio();
    const [focusedReadingKey, setFocusedReadingKey] = useState<string | null>(null);
    const shape = useMemo(() => deriveEnteredShape(states), [states]);
    const inference = useMemo(() => inferChordReadings(shape), [shape]);
    const allReadings = inference.status === 'named' ? [...inference.best, ...inference.other, ...inference.looser] : [];
    const titleByKey = useMemo(() => buildTitleIndex(allReadings), [allReadings]);
    const shapeMidi = shape.notes.map((note) => note.midi);
    const focusedReading = allReadings.find((reading) => reading.key === focusedReadingKey) ?? null;

    const playShapeFor = (id: string) => { if (shapeMidi.length > 0) void audio.playMidi(id, shapeMidi); };
    const playSingleNote = (string: number, fret: number) => {
        void audio.playMidi(`reverse-note-${string}`, [STANDARD_GUITAR_STRING_MIDI_PITCHES[string] + fret]);
    };
    const toggleFocus = (reading: ChordReading) => {
        setFocusedReadingKey((current) => (current === reading.key ? null : reading.key));
    };

    return <section aria-label="Name a shape" className={styles.reversePanel}>
        <ShapeEntry states={states} onChange={onStatesChange} onSelectFret={playSingleNote}
            focusedRootPitchClass={focusedReading?.rootPitchClass ?? null} />

        <div className={styles.reverseControls}>
            <button type="button" className={styles.action + ' ' + styles.primary} disabled={shapeMidi.length === 0}
                aria-busy={audio.loadingCandidateId === SHAPE_PLAYBACK_ID} onClick={() => playShapeFor(SHAPE_PLAYBACK_ID)}>
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
            {inference.status === 'too-few-notes' && <p role="status">Two notes suggest a partial chord — add another note for a clearer name.</p>}
            {inference.status === 'no-clear-name' && <p role="status">These notes don't resolve to a clear chord name. Try removing a note.</p>}
            {inference.status === 'named' && <>
                <p className={styles.small}>Click a chord name to see its intervals on the fretboard above.</p>
                {readingGroup('Best match', inference.best, titleByKey, audio, playShapeFor, focusedReadingKey, toggleFocus)}
                {readingGroup('Other names', inference.other, titleByKey, audio, playShapeFor, focusedReadingKey, toggleFocus)}
                {inference.looser.length > 0 && <details>
                    <summary className={styles.small}>Looser readings ({inference.looser.length})</summary>
                    <div className={styles.cards}>
                        {inference.looser.map((reading) => <ChordReadingCard key={reading.key} reading={reading} titleByKey={titleByKey}
                            isPlaying={audio.loadingCandidateId === reading.key} onPlay={() => playShapeFor(reading.key)}
                            focused={focusedReadingKey === reading.key} onToggleFocus={() => toggleFocus(reading)} />)}
                    </div>
                </details>}
            </>}
        </div>

        {audio.error && <p role="alert" className={styles.warning}>{audio.error}</p>}
    </section>;
}
