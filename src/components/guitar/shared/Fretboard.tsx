import React, { useMemo, useRef, useState } from 'react';
import { NOTES } from '@/domain/shared/notes';
import { TUNING, INLAYS, DOUBLE_INLAYS } from '@/domain/shared/tuning';
import { FretboardProps } from '@/domain/shared/types';
import styles from '@/styles/fretboard.module.css';

// Precise Fret Widths for columns 0 to 24
const FRET_WIDTHS = [
    80,  // Nut (Fret 0)
    140, 132, 125, 118, 111, 105, 99, 94, 88, 83, 79, 74,
    70, 66, 62, 59, 56, 53, 50, 47, 44, 42, 40, 38, 36
];

// Names for intervals
const INTERVAL_NAMES = ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];

const LAST_STRING = 5, LAST_FRET = 24;

export const Fretboard: React.FC<FretboardProps> = ({
    tuning = TUNING,
    activeNotes,
    rootNote,
    chordTones,
    modifierNotes,
    showChordTones,
    showIntervals = false,
    scaleIntervalLabels,
    noteLabelsByPosition,
    fingering,
    doubleStops: inputDoubleStops = [],
    onCellClick,
    noteAnnotations,
    focusedPitchClass = null,
    fretRange,
    visibleStrings,
}) => {
    // Generate fret indices [0...24]
    const frets = useMemo(() => Array.from({ length: 25 }, (_, i) => i), []);
    const strings = useMemo(() => Array.from({ length: 6 }, (_, i) => i), []);
    const isVisiblePosition = (string: number, fret: number) =>
        (!visibleStrings || visibleStrings.includes(string))
        && (!fretRange || (fret >= fretRange[0] && fret <= fretRange[1]));
    const doubleStops = inputDoubleStops.filter(pair =>
        isVisiblePosition(pair.string1, pair.fret1) && isVisiblePosition(pair.string2, pair.fret2));

    // Grid Template Columns: string of pixel values
    const gridTemplateColumns = FRET_WIDTHS.map(w => `${w}px`).join(' ');

    // Coordinate Math Helper for SVG connections
    const getNoteCoordinates = (stringIdx: number, fretIdx: number) => {
        let x = 0;
        // Sum widths up to the fret before the target
        for (let i = 0; i < fretIdx; i++) {
            x += FRET_WIDTHS[i];
        }
        // Add half of the target fret width to reach the center
        x += FRET_WIDTHS[fretIdx] / 2;

        // Y coordinate is row-based. 6 rows of 60px each, plus some padding from container.
        // Actually, css grid template rows is repeat(6, 60px).
        // We know exactly what top/left is relative to the board grid.
        // strings 0-5. Row height is 60px.
        // Y center = (stringIdx * 60) + 30
        const y = (stringIdx * 60) + 30;

        return { x, y };
    };

    const getIntervalLabel = (noteIdx: number) => {
        const intervalIdx = (noteIdx - rootNote + 12) % 12;
        const scaleLabel = scaleIntervalLabels?.[intervalIdx];
        if (scaleLabel) {
            return intervalIdx === 0 ? 'R' : scaleLabel;
        }
        return INTERVAL_NAMES[intervalIdx];
    };

    // Which (string, fret) positions actually show a note dot — used only to decide, when
    // onCellClick is set, which one of the two stacked cells at a position (background vs. note)
    // is the single keyboard-reachable target there.
    const notePositions = useMemo(() => {
        if (!onCellClick) return null;
        const set = new Set<string>();
        for (const s of strings) for (const f of frets) {
            if ((visibleStrings && !visibleStrings.includes(s)) || (fretRange && (f < fretRange[0] || f > fretRange[1]))) continue;
            const noteIdx = (tuning[s] + f) % 12;
            const shouldShow = fingering ? fingering.some(fico => fico.string === s && fico.fret === f)
                : activeNotes.includes(noteIdx) || modifierNotes.includes(noteIdx);
            if (shouldShow) set.add(`${s}:${f}`);
        }
        return set;
    }, [onCellClick, strings, frets, tuning, fingering, activeNotes, modifierNotes, visibleStrings, fretRange]);

    // Roving tabindex: exactly one cell in the whole board is a Tab stop at a time (the other ~150
    // stay at tabIndex=-1, still reachable via arrow keys) — a real fretboard has too many cells for
    // every one of them to sit in the Tab order.
    const [activeCell, setActiveCell] = useState({ string: 0, fret: 0 });
    const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const setCellRef = (s: number, f: number) => (element: HTMLDivElement | null) => {
        const key = `${s}:${f}`;
        if (element) cellRefs.current.set(key, element); else cellRefs.current.delete(key);
    };
    const activate = (s: number, f: number) => { setActiveCell({ string: s, fret: f }); onCellClick?.(s, f); };
    const moveFocus = (s: number, f: number, deltaString: number, deltaFret: number) => {
        const nextString = Math.max(0, Math.min(LAST_STRING, s + deltaString));
        const nextFret = Math.max(0, Math.min(LAST_FRET, f + deltaFret));
        setActiveCell({ string: nextString, fret: nextFret });
        cellRefs.current.get(`${nextString}:${nextFret}`)?.focus();
    };
    const cellKeyDown = (s: number, f: number) => (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(s, f); }
        else if (event.key === 'ArrowRight') { event.preventDefault(); moveFocus(s, f, 0, 1); }
        else if (event.key === 'ArrowLeft') { event.preventDefault(); moveFocus(s, f, 0, -1); }
        else if (event.key === 'ArrowDown') { event.preventDefault(); moveFocus(s, f, 1, 0); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); moveFocus(s, f, -1, 0); }
    };
    const isActive = (s: number, f: number) => activeCell.string === s && activeCell.fret === f;

    return (
        <div className={styles.fretboardContainer}>
            <div className={styles.boardWrapper}>

                {/* Fret Labels Row (Outside of Board) */}
                <div style={{ display: 'grid', gridTemplateColumns: gridTemplateColumns, marginBottom: '0.5rem' }}>
                    {frets.map(f => (
                        <div key={`label-${f}`} data-fret={f} className={styles.fretLabel}>
                            {f > 0 ? f : 'Nut'}
                        </div>
                    ))}
                </div>

                <div className={styles.fretboardGrid} style={{ gridTemplateColumns }}>

                    {/* SVG Connections Layer (For Double Stops) */}
                    <svg
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
                            zIndex: 15
                        }}
                    >
                        {doubleStops.map((ds, idx) => {
                            const pt1 = getNoteCoordinates(ds.string1, ds.fret1);
                            const pt2 = getNoteCoordinates(ds.string2, ds.fret2);
                            return (
                                <line
                                    key={`ds-conn-${idx}`}
                                    x1={pt1.x}
                                    y1={pt1.y}
                                    x2={pt2.x}
                                    y2={pt2.y}
                                    stroke="rgba(255, 255, 255, 0.4)"
                                    strokeWidth="3"
                                    strokeDasharray="4 4"
                                />
                            );
                        })}
                    </svg>

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
                                // A note dot at this position is the single keyboard target here instead.
                                const interactive = onCellClick && !notePositions?.has(`${s}:${f}`);
                                return (
                                    <div
                                        key={`cell-${s}-${f}`}
                                        ref={interactive ? setCellRef(s, f) : undefined}
                                        className={`${f === 0 ? styles.nutCell : styles.fretCell}`}
                                        style={{ gridRow: s + 1, gridColumn: f + 1, cursor: interactive ? 'pointer' : undefined }}
                                        role={interactive ? 'button' : undefined}
                                        tabIndex={interactive ? (isActive(s, f) ? 0 : -1) : undefined}
                                        aria-label={interactive ? `String ${s + 1}, fret ${f}` : undefined}
                                        onClick={interactive ? () => activate(s, f) : undefined}
                                        onKeyDown={interactive ? cellKeyDown(s, f) : undefined}
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
                            className={styles.doubleInlayWrapper}
                            style={{
                                gridColumn: f + 1,
                                gridRow: '1 / -1', /* 세로 전체 확장 */
                            }}
                        >
                            {/* Dot 1: 2번과 3번 줄 사이 정확한 좌표 (Y=120) */}
                            <div className={styles.doubleInlayDot} style={{ top: '110px' }} />

                            {/* Dot 2: 4번과 5번 줄 사이 정확한 좌표 (Y=240) */}
                            <div className={styles.doubleInlayDot} style={{ top: '230px' }} />
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
                                    const isNoteActive = activeNotes.includes(noteIdx);

                                    let shouldShow = false;
                                    if (fingering) shouldShow = !!specificFinger;
                                    else shouldShow = isNoteActive || isModifier;

                                    if (!shouldShow || !isVisiblePosition(s, f)) return null;

                                    const isDoubleStop = doubleStops.some(ds => (ds.string1 === s && ds.fret1 === f) || (ds.string2 === s && ds.fret2 === f));

                                    // Determine Style
                                    let dotClass = styles.noteScale;
                                    let label = NOTES[noteIdx];

                                    if (showIntervals) {
                                        label = noteLabelsByPosition?.[`${s}:${f}`] ?? getIntervalLabel(noteIdx);
                                    }

                                    const annotation = noteAnnotations?.[noteIdx];

                                    if (fingering && specificFinger) {
                                        if (specificFinger.label === 'X') {
                                            label = 'X';
                                            dotClass = styles.noteMute;
                                        } else if (specificFinger.label && !showIntervals) {
                                            label = NOTES[noteIdx];
                                        } else if (showIntervals) {
                                            label = noteLabelsByPosition?.[`${s}:${f}`] ?? getIntervalLabel(noteIdx);
                                        }

                                        if (label !== 'X') {
                                            if (specificFinger.label === 'R' || (showIntervals && label === 'R')) {
                                                dotClass = styles.noteRoot;
                                            } else {
                                                const diff = (noteIdx - rootNote + 12) % 12;
                                                if (diff === 3 || diff === 4) dotClass = styles.note3rd;
                                                else if (diff === 7) dotClass = styles.note5th;
                                                else if (diff === 10 || diff === 11) dotClass = styles.note7th;
                                                else dotClass = styles.noteChordTone;
                                            }
                                        }
                                    } else {
                                        if (isDoubleStop) {
                                            dotClass = styles.noteDoubleStop;
                                        } else if (isRoot) dotClass = styles.noteRoot;
                                        else if (showChordTones && isChordTone) {
                                            const diff = (noteIdx - rootNote + 12) % 12;
                                            if (diff === 3 || diff === 4) dotClass = styles.note3rd;
                                            else if (diff === 7) dotClass = styles.note5th;
                                            else if (diff === 10 || diff === 11) dotClass = styles.note7th;
                                            else dotClass = styles.noteChordTone;
                                        }
                                        else if (isModifier) {
                                            const diff = (noteIdx - rootNote + 12) % 12;
                                            if (diff === 2) dotClass = styles.note2nd;
                                            else if (diff === 6) dotClass = styles.noteB5;
                                            else if (diff === 9) dotClass = styles.note6th;
                                            else dotClass = styles.noteModifier;
                                        }
                                    }

                                    // Scale chooses its spelling frame and chord role explicitly.
                                    // Keep legacy voicing and double-stop presentation unchanged.
                                    if (annotation && !fingering) {
                                        label = showIntervals ? annotation.intervalLabel : annotation.noteName;
                                        if (!isDoubleStop) {
                                            dotClass = isRoot ? styles.noteRoot : styles.noteScale;
                                            if (showChordTones && isChordTone) {
                                                const roleClasses = {
                                                    root: styles.noteRoot,
                                                    third: styles.note3rd,
                                                    fifth: styles.note5th,
                                                    seventh: styles.note7th,
                                                    'chord-tone': styles.noteChordTone,
                                                    scale: styles.noteScale,
                                                };
                                                dotClass = roleClasses[annotation.role];
                                            }
                                        }
                                    }

                                    return (
                                        <div
                                            key={`note-${s}-${f}`}
                                            data-string={s}
                                            data-fret={f}
                                            data-pitch-class={noteIdx}
                                            data-tone-role={annotation?.role}
                                            data-focused={noteIdx === focusedPitchClass || undefined}
                                            ref={onCellClick ? setCellRef(s, f) : undefined}
                                            className={styles.noteCell}
                                            style={{ gridRow: s + 1, gridColumn: f + 1, cursor: onCellClick ? 'pointer' : undefined }}
                                            role={onCellClick ? 'button' : undefined}
                                            tabIndex={onCellClick ? (isActive(s, f) ? 0 : -1) : undefined}
                                            aria-label={onCellClick ? `String ${s + 1}, fret ${f} (currently placed) — click to remove` : undefined}
                                            onClick={onCellClick ? () => activate(s, f) : undefined}
                                            onKeyDown={onCellClick ? cellKeyDown(s, f) : undefined}
                                        >
                                            <div className={`${styles.noteDot} ${dotClass} ${(!isDoubleStop && doubleStops.length > 0) ? styles.faded : ''} ${noteIdx === focusedPitchClass ? styles.noteFocused : ''}`}>
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
