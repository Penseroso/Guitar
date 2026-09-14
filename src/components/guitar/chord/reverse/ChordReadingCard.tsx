"use client";

import React from 'react';
import type { ChordReading } from '@/domain/chord/reverse/readings';
import { badgeFor, bassNoteLetter, explainReading, soundingIntervalLabels, soundingNoteLetters, titleFor } from './reading-labels';
import styles from '../chord-ui.module.css';

export interface ChordReadingCardProps {
    reading: ChordReading;
    titleByKey: ReadonlyMap<string, string>;
    /** Whether the fretboard above is currently showing intervals against this reading's root. */
    focused?: boolean;
    /** Toggles that focus. Omit to render the title as plain (non-interactive) text. */
    onToggleFocus?: () => void;
}

export function ChordReadingCard({ reading, titleByKey, focused = false, onToggleFocus }: ChordReadingCardProps) {
    const explanation = explainReading(reading, titleByKey);
    const badge = badgeFor(reading);
    const notes = soundingNoteLetters(reading);
    const intervals = soundingIntervalLabels(reading);

    return <article className={styles.readingCard}>
        {onToggleFocus
            ? <button type="button" className={'text-lg font-semibold ' + styles.readingTitle} aria-pressed={focused} onClick={onToggleFocus}>
                {titleFor(reading)}
            </button>
            : <p className="text-lg font-semibold">{titleFor(reading)}</p>}
        <p className={styles.small}>{notes.join(' ')}</p>
        <p className={styles.small}>{intervals.join(' · ')}</p>
        <p className={styles.small}>{explanation.bassLine ?? `Bass: ${bassNoteLetter(reading)}`}</p>
        {badge && <p className={styles.small}>{badge}</p>}
        {explanation.sameNotesLine && <p className={styles.small}>{explanation.sameNotesLine}</p>}
    </article>;
}
