"use client";

import { useState } from 'react';
import type { TabDocument, TabFraction, TabMoment } from '@/domain/tab/types';
import type { TabActiveCell, TabAnalysisAction } from '@/features/tab-analysis/state';
import { canSustainFromPrevious } from '@/domain/tab/input-capabilities';
import { hasTabJoinTimingConflict, hasTabSplitTimingConflict } from '@/domain/tab/editing';
import { SwipePicker } from '../../harmony/SwipePicker';
import styles from './tab-analysis.module.css';

const durationOptions = [
    { value: '', label: 'Unknown' }, { value: '4/1', label: 'Whole' },
    { value: '2/1', label: 'Half' }, { value: '3/2', label: 'Dotted quarter' },
    { value: '1/1', label: 'Quarter' }, { value: '1/2', label: 'Eighth' },
    { value: '1/3', label: 'Triplet eighth' }, { value: '1/4', label: 'Sixteenth' },
    { value: '1/8', label: 'Thirty-second' },
];
const fractionValue = (value?: TabFraction) => value ? `${value.numerator}/${value.denominator}` : '';
const fractionFromValue = (value: string): TabFraction | undefined => {
    if (!value) return undefined;
    const [numerator, denominator] = value.split('/').map(Number);
    return { numerator, denominator };
};
const meters = ['', '2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '9/8', '12/8'].map(value => ({ value, label: value || 'Unspecified' }));

/** The meter is currently score-wide; the bar header owns its entry, not its storage. */
export function TabMeasureEditor({ document, measure, dispatch }: { document: TabDocument; measure: number; dispatch: (action: TabAnalysisAction) => void }) {
    const value = fractionValue(document.meter);
    const options = meters.some(option => option.value === value) ? meters : [...meters, { value, label: value }];
    return <div role="group" aria-label={`Bar ${measure} meter`} className={styles.notationRow}>
        <span>Bar {measure} · Meter applies to all bars</span>
        <SwipePicker label="Time signature" value={value} options={options} onChange={next => dispatch({ type: 'set-meter', meter: fractionFromValue(next) })} />
    </div>;
}

function PositionOffset({ moment, dispatch }: { moment: TabMoment; dispatch: (action: TabAnalysisAction) => void }) {
    const [numerator, setNumerator] = useState(moment.beatOffset?.numerator.toString() ?? '');
    const [denominator, setDenominator] = useState(moment.beatOffset?.denominator.toString() ?? '1');
    const valid = /^\d{1,4}$/.test(numerator) && /^\d{1,4}$/.test(denominator)
        && Number(numerator) <= 1024 && Number(denominator) >= 1 && Number(denominator) <= 1024;
    return <div className={styles.notationRow}>
        <span>Start · quarter notes from bar start</span>
        <div className={styles.notationFraction}>
            <input type="text" inputMode="numeric" aria-label="Start numerator" placeholder="Unknown" value={numerator} onChange={event => setNumerator(event.target.value)} />
            <span aria-hidden="true">/</span>
            <input type="text" inputMode="numeric" aria-label="Start denominator" value={denominator} onChange={event => setDenominator(event.target.value)} />
            <button type="button" className={styles.textAction} disabled={!valid} onClick={() => dispatch({ type: 'set-beat-offset', momentId: moment.id, offset: { numerator: Number(numerator), denominator: Number(denominator) } })}>Set start</button>
            {moment.beatOffset && <button type="button" className={styles.textAction} onClick={() => dispatch({ type: 'set-beat-offset', momentId: moment.id, offset: undefined })}>Clear start</button>}
        </div>
    </div>;
}

/** Optional written information; no placement, duration or sounding pitch is auto-filled. */
export function TabNotationEditor({ document, cell, dispatch, onClose }: { document: TabDocument; cell: TabActiveCell; dispatch: (action: TabAnalysisAction) => void; onClose?: () => void }) {
    const moment = document.moments.find(item => item.id === cell.momentId);
    if (!moment) return null;
    const note = moment.notes.find(item => item.string === cell.string);
    const sustain = moment.sustains?.find(item => document.moments.some(onset => onset.notes.some(source => source.id === item.noteId && source.string === cell.string)));
    const muted = !!moment.mutes?.some(item => item.string === cell.string);
    const duration = moment.rest?.duration ?? note?.duration ?? sustain?.duration;
    const durationValue = fractionValue(duration);
    const availableDurations = durationOptions.some(option => option.value === durationValue) ? durationOptions : [...durationOptions, { value: durationValue, label: `${durationValue} quarter notes` }];
    const next = document.moments[moment.index + 1];
    const hasBarline = !!next && next.measure !== moment.measure;
    const conflict = hasBarline ? hasTabJoinTimingConflict(document, moment.id) : hasTabSplitTimingConflict(document, moment.id);
    return <div role="group" aria-label={`Position ${moment.index + 1} notation`}>
        <div className={styles.notationRow}>
            <span>Position {moment.index + 1} · Bar {moment.measure} · String {cell.string + 1}</span>
            {onClose && <button className={styles.textAction} type="button" aria-label="Close position editor" onClick={onClose}>×</button>}
        </div>
        <div className={styles.notationRow}>
            <span>{moment.rest ? 'Whole position · rest' : `String ${cell.string + 1} · ${sustain ? 'tied continuation' : muted ? 'muted' : note ? `fret ${note.fret}` : 'empty'}`}</span>
            <div className={styles.actions}>
                <button type="button" className={styles.textAction} aria-pressed={!!moment.rest} onClick={() => dispatch({ type: 'set-rest', momentId: moment.id, enabled: !moment.rest })}>Rest</button>
                <button type="button" className={styles.textAction} aria-pressed={muted} onClick={() => dispatch({ type: 'set-mute', ...cell, enabled: !muted })}>Mute x</button>
                <button type="button" className={styles.textAction} aria-pressed={!!sustain} disabled={!sustain && !canSustainFromPrevious(document, moment.id, cell.string)} onClick={() => dispatch({ type: 'set-sustain', ...cell, enabled: !sustain })}>Tie previous</button>
            </div>
        </div>
        {(note || sustain || moment.rest) && <div className={styles.notationRow}>
            <SwipePicker label="Duration" value={durationValue} options={availableDurations} onChange={value => dispatch({ type: 'set-duration', ...cell, duration: fractionFromValue(value) })} />
        </div>}
        <PositionOffset key={`${moment.id}:${fractionValue(moment.beatOffset)}`} moment={moment} dispatch={dispatch} />
        <div className={styles.notationRow}>
            <button type="button" className={styles.textAction} aria-pressed={hasBarline}
                disabled={conflict || (!hasBarline && (document.measureCount >= 1024 || (!next && document.moments.length >= 1024)))}
                onClick={() => dispatch({ type: hasBarline ? 'join-measure' : 'split-measure', afterId: moment.id })}>
                {hasBarline ? 'Remove barline after position' : 'Add barline after position'}
            </button>
            {conflict && <span className={styles.meta}>Clear starts in {hasBarline ? 'the following bar' : 'positions after this one'} before changing this barline.</span>}
        </div>
        {!!note?.techniques?.length && <p className={styles.meta}>Techniques: {note.techniques.map(technique => {
            if ('targetFret' in technique) return `${technique.kind} target ${technique.targetFret} (fret-equivalent)`;
            if ('toNoteId' in technique) {
                const target = document.moments.flatMap(item => item.notes).find(item => item.id === technique.toNoteId);
                return `${technique.kind} to fret ${target?.fret ?? '?'}`;
            }
            return 'vibrato';
        }).join(' · ')}</p>}
    </div>;
}
