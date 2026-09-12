"use client";

import React, { useEffect, useRef } from 'react';
import type { ExplorationCandidate } from '@/domain/chord/exploration';
import { Fretboard } from '../shared/Fretboard';
import styles from './chord-ui.module.css';

export function ChordNeckView({ candidate, showIntervals }: { candidate: ExplorationCandidate; showIntervals: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    const played = candidate.voicing.notes.filter(note => !note.isMuted);
    useEffect(() => {
        const scroll = ref.current!;
        const labels = scroll.querySelectorAll<HTMLElement>('[data-fret]');
        const fret = candidate.facts.openStringCount ? 0 : candidate.facts.minStoppedFret;
        const target = Array.from(labels).find(label => label.dataset.fret === String(fret));
        if (target) scroll.scrollLeft += target.getBoundingClientRect().left - scroll.getBoundingClientRect().left - 16;
    }, [candidate]);
    return <div ref={ref} className={styles.neckScroll} tabIndex={0} aria-label="Full guitar fretboard, scroll horizontally">
        <Fretboard activeNotes={candidate.facts.midiNotes.map(midi => midi % 12)} rootNote={candidate.voicing.chord.rootPitchClass}
            chordTones={[]} modifierNotes={[]} showChordTones={false} showIntervals={showIntervals}
            noteLabelsByPosition={Object.fromEntries(played.map(note => [`${note.string}:${note.fret}`, note.degree ?? '']))}
            fingering={played.map(note => ({ string: note.string, fret: note.fret, noteIdx: note.pitchClass, label: note.isRoot ? 'R' : undefined }))} />
    </div>;
}
