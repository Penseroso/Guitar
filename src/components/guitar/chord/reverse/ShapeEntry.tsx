"use client";

import React from 'react';
import { Fretboard } from '../../shared/Fretboard';
import { STANDARD_GUITAR_STRING_MIDI_PITCHES, STANDARD_GUITAR_TUNING_PITCH_CLASSES } from '@/domain/shared/tuning';
import type { ShapeStates } from '@/domain/chord/reverse/enteredShape';
import type { ChordReading } from '@/domain/chord/reverse/readings';
import { fretboardDegreeOverrides } from './reading-labels';
import styles from '../chord-ui.module.css';

// Reuses the same full, spread-out fretboard Scale mode already shows (shared/Fretboard.tsx) as
// the input surface itself — clicking a cell places or removes a note there. No separate diagram
// component, no artificially-capped fret window: Fretboard's own onCellClick support (additive,
// opt-in) is what makes this interactive, across its full modeled range.

export interface ShapeEntryProps {
    states: ShapeStates;
    onChange: (states: ShapeStates) => void;
    /** Fires when a fret or open string is selected (not on mute), so the caller can preview-play it. */
    onSelectFret?: (string: number, fret: number) => void;
    /** When the caller has a specific reading in focus (e.g. its name was clicked in "Possible
     *  names"), notes are labeled/colored as intervals from THAT reading's real root and its own
     *  literal formula degrees, instead of the plain bass-anchored default — see the note on
     *  bassPitchClass below for why this can't just be a blanket "show intervals" toggle. */
    focusedReading?: ChordReading | null;
}

/** Clicking a cell selects that fret on that string, replacing whatever it held; clicking the
 *  already-selected cell again mutes the string instead. Pure, so it's directly unit-testable. */
export function applyCellClick(states: ShapeStates, string: number, fret: number): ShapeStates {
    const next = states.slice() as number[];
    next[string] = states[string] === fret ? -1 : fret;
    return next as unknown as ShapeStates;
}

export function ShapeEntry({ states, onChange, onSelectFret, focusedReading = null }: ShapeEntryProps) {
    const pitchClassAt = (string: number, fret: number) => (STANDARD_GUITAR_TUNING_PITCH_CLASSES[string] + fret) % 12;
    const fingering = states
        .map((fret, string) => ({ string, fret, noteIdx: pitchClassAt(string, fret) }))
        .filter((entry) => entry.fret >= 0);

    // Default anchor (no reading focused) is just the physical bass, purely for Fretboard's note
    // coloring — never for interval labels, and never seen by recognition. A blanket "show
    // intervals" toggle here would be wrong as soon as the panel lists a reading whose root isn't
    // the bass (e.g. Am7 vs C6 for the same notes): intervals are only ever shown once the caller
    // names which reading's root to use, via focusedReading.
    const bassEntry = fingering.length > 0
        ? fingering.reduce((lowest, entry) => (STANDARD_GUITAR_STRING_MIDI_PITCHES[entry.string] + entry.fret <
            STANDARD_GUITAR_STRING_MIDI_PITCHES[lowest.string] + lowest.fret ? entry : lowest))
        : null;
    const bassPitchClass = bassEntry?.noteIdx ?? 0;

    const handleCellClick = (string: number, fret: number) => {
        const isReselection = states[string] === fret;
        onChange(applyCellClick(states, string, fret));
        if (!isReselection) onSelectFret?.(string, fret);
    };

    return <div className={`${styles.neckScroll} ${styles.reverseFretboard}`} tabIndex={-1} aria-label="Guitar shape entry — click a string/fret cell to place or remove a note">
        <Fretboard
            activeNotes={[]}
            rootNote={focusedReading?.rootPitchClass ?? bassPitchClass}
            showIntervals={focusedReading !== null}
            noteLabelsByPosition={focusedReading ? fretboardDegreeOverrides(focusedReading, fingering) : undefined}
            chordTones={[]}
            modifierNotes={[]}
            showChordTones={false}
            fingering={fingering}
            onCellClick={handleCellClick}
        />
    </div>;
}
