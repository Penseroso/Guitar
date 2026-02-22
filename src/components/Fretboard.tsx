import React, { useMemo } from 'react';
import { NOTES, TUNING, INLAYS, DOUBLE_INLAYS } from '../utils/guitar/theory';
import { FretboardProps } from '../utils/guitar/types';
import styles from '../styles/fretboard.module.css';

// Precise Fret Widths for columns 0 to 24
const FRET_WIDTHS = [
    80,  // Nut (Fret 0)
    140, 132, 125, 118, 111, 105, 99, 94, 88, 83, 79, 74,
    70, 66, 62, 59, 56, 53, 50, 47, 44, 42, 40, 38, 36
];

// Names for intervals
const INTERVAL_NAMES = ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];

export const Fretboard: React.FC<FretboardProps> = ({
    tuning = TUNING,
    activeNotes,
    rootNote,
    chordTones,
    modifierNotes,
    showChordTones,
    showIntervals = false,
    fingering
}) => {
    // Generate fret indices [0...24]
    const frets = useMemo(() => Array.from({ length: 25 }, (_, i) => i), []);
    const strings = useMemo(() => Array.from({ length: 6 }, (_, i) => i), []);

    // Grid Template Columns: string of pixel values
    const gridTemplateColumns = FRET_WIDTHS.map(w => `${w}px`).join(' ');

    return (
        <div className={styles.fretboardContainer}>
            <div className={styles.boardWrapper}>

                {/* Fret Labels Row (Outside of Board) */}
                <div style={{ display: 'grid', gridTemplateColumns: gridTemplateColumns, marginBottom: '0.5rem' }}>
                    {frets.map(f => (
                        <div key={`label-${f}`} className={styles.fretLabel}>
                            {f > 0 ? f : 'Nut'}
                        </div>
                    ))}
                </div>

                <div className={styles.fretboardGrid} style={{ gridTemplateColumns }}>
                    {/* Background Wood Texture */}
                    <div className={styles.woodTexture} />

                    {/* Render Cells (Fret x String intersection) */}
                    {/* We map COLUMN major or ROW major? 
                        CSS Grid fills Row by Row usually. 
                        We want 6 Rows (Strings).
                        So we iterate Strings then Frets. 
                    */}

                    {strings.map((s) => (
                        <React.Fragment key={`string-row-${s}`}>
                            {frets.map((f) => {
                                // Logic for Note
                                const noteIdx = (tuning[s] + f) % 12;
                                const specificFinger = fingering?.find(fico => fico.string === s && fico.fret === f);
                                const isRoot = noteIdx === rootNote;
                                const isChordTone = chordTones.includes(noteIdx);
                                const isModifier = modifierNotes.includes(noteIdx);
                                const isActive = activeNotes.includes(noteIdx);

                                let shouldShow = false;
                                if (fingering) shouldShow = !!specificFinger;
                                else shouldShow = isActive || isModifier;

                                // Determine Style
                                let dotClass = styles.noteScale;
                                let label = NOTES[noteIdx];

                                if (showIntervals) {
                                    const intervalIdx = (noteIdx - rootNote + 12) % 12;
                                    label = INTERVAL_NAMES[intervalIdx];
                                }

                                if (fingering && specificFinger) {
                                    if (specificFinger.label === 'X') {
                                        label = 'X';
                                    } else if (specificFinger.label && !showIntervals) {
                                        label = NOTES[noteIdx];
                                    } else if (showIntervals) {
                                        const intervalIdx = (noteIdx - rootNote + 12) % 12;
                                        label = INTERVAL_NAMES[intervalIdx];
                                    }
                                    if (specificFinger.label === 'R' || (showIntervals && label === 'R')) {
                                        dotClass = styles.noteRoot;
                                    } else {
                                        dotClass = styles.noteChordTone;
                                    }
                                } else {
                                    if (isRoot) dotClass = styles.noteRoot;
                                    else if (showChordTones && isChordTone) dotClass = styles.noteChordTone;
                                    else if (isModifier) {
                                        const diff = (noteIdx - rootNote + 12) % 12;
                                        if (diff === 2) dotClass = styles.note2nd;
                                        else if (diff === 6) dotClass = styles.noteB5;
                                        else if (diff === 9) dotClass = styles.note6th;
                                        else dotClass = styles.noteModifier;
                                    }
                                }

                                return (
                                    <div
                                        key={`cell-${s}-${f}`}
                                        className={`${f === 0 ? styles.nutCell : styles.fretCell}`}
                                        style={{ gridRow: s + 1, gridColumn: f + 1 }}
                                    >
                                        {/* Background Cell Content if any */}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}

                    {/* Inlays Layer (Overlay on Grid) */}
                    {INLAYS.map(f => (
                        <div
                            key={`inlay-${f}`}
                            className={styles.inlayContainer}
                            style={{
                                gridColumn: f + 1,
                                gridRow: '1 / -1' /* Span all strings */
                            }}
                        >
                            <div className={styles.inlay} />
                        </div>
                    ))}
                    {DOUBLE_INLAYS.map(f => (
                        <div
                            key={`dbl-inlay-${f}`}
                            className={styles.doubleInlay}
                            style={{
                                gridColumn: f + 1,
                                gridRow: '1 / -1'
                            }}
                        >
                            <div className={styles.inlay} style={{ position: 'static', transform: 'none' }} />
                            <div className={styles.inlay} style={{ position: 'static', transform: 'none' }} />
                        </div>
                    ))}


                    {/* Strings Layer (Overlay on Grid - Z-Index 10) */}
                    <div className={styles.stringsLayer}>
                        {strings.map(s => (
                            <div key={`string-line-${s}`} className={styles.stringLine} style={{ height: '50px' /* row height */ }}>
                                <div
                                    className={styles.stringWire}
                                    style={{ height: `${s * 0.5 + 1}px` }}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Notes Layer (Overlay on Grid - Z-Index 20 - TOP) */}
                    <div className={styles.notesLayer} style={{ gridTemplateColumns }}>
                        {strings.map((s) => (
                            <React.Fragment key={`note-row-${s}`}>
                                {frets.map((f) => {
                                    // Logic for Note
                                    const noteIdx = (tuning[s] + f) % 12;
                                    const specificFinger = fingering?.find(fico => fico.string === s && fico.fret === f);
                                    const isRoot = noteIdx === rootNote;
                                    const isChordTone = chordTones.includes(noteIdx);
                                    const isModifier = modifierNotes.includes(noteIdx);
                                    const isActive = activeNotes.includes(noteIdx);

                                    let shouldShow = false;
                                    if (fingering) shouldShow = !!specificFinger;
                                    else shouldShow = isActive || isModifier;

                                    if (!shouldShow) return null;

                                    // Determine Style
                                    let dotClass = styles.noteScale;
                                    let label = NOTES[noteIdx];

                                    if (showIntervals) {
                                        const intervalIdx = (noteIdx - rootNote + 12) % 12;
                                        label = INTERVAL_NAMES[intervalIdx];
                                    }

                                    if (fingering && specificFinger) {
                                        if (specificFinger.label === 'X') {
                                            label = 'X';
                                            dotClass = styles.noteMute;
                                        } else if (specificFinger.label && !showIntervals) {
                                            label = NOTES[noteIdx];
                                        } else if (showIntervals) {
                                            const intervalIdx = (noteIdx - rootNote + 12) % 12;
                                            label = INTERVAL_NAMES[intervalIdx];
                                        }

                                        if (label !== 'X') {
                                            if (specificFinger.label === 'R' || (showIntervals && label === 'R')) {
                                                dotClass = styles.noteRoot;
                                            } else {
                                                dotClass = styles.noteChordTone;
                                            }
                                        }
                                    } else {
                                        if (isRoot) dotClass = styles.noteRoot;
                                        else if (showChordTones && isChordTone) dotClass = styles.noteChordTone;
                                        else if (isModifier) {
                                            const diff = (noteIdx - rootNote + 12) % 12;
                                            if (diff === 2) dotClass = styles.note2nd;
                                            else if (diff === 6) dotClass = styles.noteB5;
                                            else if (diff === 9) dotClass = styles.note6th;
                                            else dotClass = styles.noteModifier;
                                        }
                                    }

                                    return (
                                        <div
                                            key={`note-${s}-${f}`}
                                            className={styles.noteCell}
                                            style={{ gridRow: s + 1, gridColumn: f + 1 }}
                                        >
                                            <div className={`${styles.noteDot} ${dotClass}`}>
                                                {label}
                                            </div>
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
};
