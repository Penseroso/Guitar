"use client";

import React from 'react';
import { getScaleCompatibleChords, type ScaleCompatibleChord } from '@/domain/chord/chord-scale-compatibility';
import { getScalePresentationName } from '@/domain/scale/scaleSelector';
import { formatAccidentals, formatNoteName } from '@/domain/shared/spelling';
import styles from './harmony.module.css';

interface PlayThisScaleOverPanelProps {
    scaleGroup: string;
    scaleName: string;
    tonicPitchClass: number;
    selectedChordId?: string | null;
    onSelectChord?: (chordId: string) => void;
}

const chordName = (chord: ScaleCompatibleChord) => formatAccidentals(`${chord.rootNoteName}${chord.chordSuffix}`);

function ChordList({ chords, selectedChordId, onSelectChord }: {
    chords: ScaleCompatibleChord[];
    selectedChordId: string | null;
    onSelectChord?: (id: string) => void;
}) {
    return <ul className={styles.chordList}>{chords.map(chord => <li key={chord.chordId}>
        <button type="button" className={styles.chordButton} aria-label={`Analyze ${chordName(chord)}`}
            aria-pressed={selectedChordId === chord.chordId} onClick={() => onSelectChord?.(chord.chordId)}>{chordName(chord)}</button>
    </li>)}</ul>;
}

export function PlayThisScaleOverPanel({ scaleGroup, scaleName, tonicPitchClass, selectedChordId = null, onSelectChord }: PlayThisScaleOverPanelProps) {
    const chords = React.useMemo(() => getScaleCompatibleChords(scaleGroup, scaleName, tonicPitchClass), [scaleGroup, scaleName, tonicPitchClass]);
    const primary = chords.filter(chord => chord.basis === 'primary');
    const characteristic = chords.filter(chord => chord.basis === 'characteristic');
    const containment = chords.filter(chord => chord.basis === 'containment');
    const selected = chords.find(chord => chord.chordId === selectedChordId);
    const scaleLabel = chords.length > 0
        ? `${formatNoteName(chords[0].rootNoteName)} ${getScalePresentationName(scaleName)}`
        : getScalePresentationName(scaleName);
    const hasCurated = primary.length > 0 || characteristic.length > 0;
    const containmentList = <ChordList chords={containment} selectedChordId={selectedChordId} onSelectChord={onSelectChord} />;

    return <div>
        {primary.length > 0 && <section className={styles.section}>
            <h2 className={styles.label}>Primary · {scaleLabel}</h2>
            <ChordList chords={primary} selectedChordId={selectedChordId} onSelectChord={onSelectChord} />
        </section>}
        {characteristic.length > 0 && <section className={styles.section}>
            <h2 className={styles.label}>Color · {scaleLabel}</h2>
            <ChordList chords={characteristic} selectedChordId={selectedChordId} onSelectChord={onSelectChord} />
        </section>}
        {!hasCurated && <p className={styles.meta}>Curated pairings · none</p>}
        {containment.length > 0 && (hasCurated
            ? <details className={styles.disclosure} open={selected?.basis === 'containment' ? true : undefined}>
                <summary>Other contained chords · {containment.length}</summary>
                <p className={styles.meta}>Shared notes only · pairing unverified</p>
                {containmentList}
            </details>
            : <section className={styles.section}>
                <h2 className={styles.label}>Other contained chords · {containment.length}</h2>
                <p className={styles.meta}>Shared notes only · pairing unverified</p>
                {containmentList}
            </section>)}
        {selected && <div className={styles.selectedSummary} aria-live="polite">
            <h3>{chordName(selected)} <span className={styles.meta}>· {selected.basis === 'containment' ? 'note containment' : selected.basis} pairing</span></h3>
            <p className={styles.description}>Chord tones · {selected.toneNames.map(formatNoteName).join(' · ')}</p>
            {selected.tonesOutsideScale.length > 0 && <p className={styles.meta}>Outside scale · {selected.tonesOutsideScale.map(formatNoteName).join(' · ')}</p>}
        </div>}
    </div>;
}
