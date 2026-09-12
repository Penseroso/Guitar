"use client";

import React, { useEffect, useRef } from 'react';
import type { ExplorationCandidate } from '@/domain/chord/exploration';
import { Fretboard } from '../shared/Fretboard';
import styles from './chord-ui.module.css';
import { midiNoteLabel } from '@/domain/chord/exploration';

export function ChordNeckView({ candidate, showIntervals }: { candidate: ExplorationCandidate; showIntervals: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    const played = candidate.voicing.notes.filter(note => !note.isMuted);
    useEffect(() => {
        // Measure after the containing dialog has opened and has a layout box.
        const frame = requestAnimationFrame(() => {
            const scroll = ref.current!;
            const labels = scroll.querySelectorAll<HTMLElement>('[data-fret]');
            const target = Array.from(labels).find(label => label.dataset.fret === String(candidate.facts.minStoppedFret));
            if (target) scroll.scrollLeft += target.getBoundingClientRect().left - scroll.getBoundingClientRect().left - 16;
        });
        return () => cancelAnimationFrame(frame);
    }, [candidate]);
    return <>
        <p className={styles.small}>Scroll across the neck to explore other frets.</p>
        {candidate.facts.openStringCount > 0 && <p className={styles.small}>Open strings: {played.filter(note => note.fret === 0)
            .map(note => 'string ' + (note.string + 1) + ' (' + midiNoteLabel(note.midiNote!) + ')').join(' · ')}</p>}
        <div ref={ref} className={styles.neckScroll} tabIndex={0} aria-label="Full guitar fretboard, scroll horizontally">
        <Fretboard activeNotes={candidate.facts.midiNotes.map(midi => midi % 12)} rootNote={candidate.voicing.chord.rootPitchClass}
            chordTones={[]} modifierNotes={[]} showChordTones={false} showIntervals={showIntervals}
            noteLabelsByPosition={Object.fromEntries(played.map(note => [`${note.string}:${note.fret}`, note.degree ?? '']))}
            fingering={played.map(note => ({ string: note.string, fret: note.fret, noteIdx: note.pitchClass, label: note.isRoot ? 'R' : undefined }))} />
        </div>
    </>;
}
