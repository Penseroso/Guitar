"use client";

import React from 'react';
import { flushSync } from 'react-dom';
import type { ScaleToneAnalysis } from '@/domain/chord/scale-tone-analysis';
import { formatAccidentals, formatNoteName, parseDegreeLabel, parseNoteName, spellDegree } from '@/domain/shared/spelling';
import { resolveScaleRef } from '@/domain/scale/scale-ref';
import { getScalePresentationName } from '@/domain/scale/scaleSelector';
import { getKeyName } from '@/domain/shared/keys';
import styles from './tone-roles.module.css';

export function ToneRolesPanel({ analysis, onClear, focusedInterval, onFocusTone, onLocateTone, canLocateTone }: {
    analysis: ScaleToneAnalysis | null;
    onClear: () => void;
    focusedInterval?: number | null;
    onLocateTone?: () => void;
    canLocateTone?: boolean;
    onFocusTone?: (interval: number | null) => void;
}) {
    const relationshipRef = React.useRef<HTMLDivElement>(null);
    if (!analysis) return null;
    const { chord, identity, tones } = analysis;
    const scale = resolveScaleRef(analysis.scaleRef);
    const scaleName = scale && `${formatNoteName(getKeyName(scale.tonic))} ${getScalePresentationName(scale.name)}`;
    const chordName = chord && formatAccidentals(chord.rootNoteName + chord.chordSuffix);
    const focusedTone = tones.find(tone => tone.interval === focusedInterval);
    const reviewed = focusedTone?.interpretations.filter(item => item.status === 'reviewed') ?? [];

    const hasCharacteristic = identity.status === 'reviewed' && reviewed.some(item => item.kind === 'characteristic');
    const tonic = scale && parseNoteName(getKeyName(scale.tonic));
    const markers = hasCharacteristic && tonic ? identity.markers.flatMap(marker => {
        const tone = tones.find(tone => tone.interval === marker.interval);
        const degree = parseDegreeLabel(marker.degree);
        if (!tone || !degree) return [];
        const name = spellDegree(tonic, degree.number, tone.pitchClass)?.name;
        if (!name) return [];
        return [{ ...marker, name, tone }];
    }) : [];
    const chordReadings = reviewed.filter(item => item.kind !== 'characteristic');

    const sustainedAgainst = chordReadings.find(item => item.kind === 'caution')?.sustainedAgainst;
    const referenceDegree = sustainedAgainst ?? (chordReadings.some(item => item.kind === 'tension') ? '1' : null);
    const referenceTone = referenceDegree && tones.find(tone => tone.chordMembership === 'member' && tone.chordDegree === referenceDegree);
    const showPair = referenceTone?.chordNoteName && focusedTone?.chordNoteName;
    const roleLabels = showPair ? reviewed.filter(item => item.kind === 'characteristic') : reviewed;

    return <section className={styles.panel} aria-label="Tone roles">
        <div className={styles.header}>
            <div>
                <h2 className={styles.heading}>Tone roles</h2>
                {scaleName && <p className={styles.meta}>Scale: {scaleName}</p>}
            </div>
            <div className={styles.actions}>
                {chord && <button type="button" className={styles.textButton} onClick={onClear}>Clear analysis chord</button>}
                {focusedTone && <button type="button" className={styles.textButton} onClick={() => onFocusTone?.(null)}>Clear tone focus</button>}
            </div>
        </div>
        {identity.status === 'reviewed' && identity.markers.length > 0 && <p className={styles.meta}>Characteristic degrees · {identity.markers.map(marker => formatAccidentals(marker.degree)).join(' · ')}</p>}
        {!chord && !focusedTone && <p className={styles.meta}>Select a note for its role</p>}
        {chord && chord.basis !== 'containment' && <p className={styles.chordContext} aria-live="polite">Analyzing {chordName}</p>}
        {chord && <p className={styles.legend}><span className={styles.member}>●</span> {chord.basis === 'containment' ? `Shared with ${chordName}` : 'Chord tone'} <span className={styles.nonMember}>○</span> Other scale tone</p>}
        <ul className={styles.toneList} aria-label="Scale tones">
            {tones.map(tone => <li key={tone.interval} className={styles.toneItem}>
                <button type="button" className={styles.toneButton}
                    aria-label={`Focus ${formatNoteName(tone.scaleNoteName)} on fretboard`}
                    aria-pressed={focusedInterval === tone.interval}
                    onClick={event => {
                        if (!onFocusTone) return;
                        if (focusedInterval === tone.interval) { onFocusTone(null); return; }
                        // Measure the newly selected relationship only on activation from this list.
                        flushSync(() => onFocusTone(tone.interval));
                        if (event.currentTarget.getAttribute('aria-pressed') === 'true') {
                            relationshipRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
                        }
                    }}>
                    <span className={styles.toneName}>{formatNoteName(tone.scaleNoteName)}</span>
                    <span className={styles.degree}>{formatAccidentals(tone.scaleDegree)}</span>
                    {chord && <span className={tone.chordMembership === 'member' ? styles.member : styles.nonMember} aria-label={tone.chordMembership === 'member' ? 'Chord tone' : 'Not a chord tone'}>{tone.chordMembership === 'member' ? '●' : '○'}</span>}
                </button>
            </li>)}
        </ul>
        {focusedTone && <div className={styles.detail} role="region" aria-label="Selected tone detail" aria-live="polite">
            <div className={styles.header}>
                <h3>{formatNoteName(focusedTone.scaleNoteName)}</h3>
                {onLocateTone && (canLocateTone
                    ? <button type="button" className={styles.textButton} onClick={onLocateTone}>Show {formatNoteName(focusedTone.scaleNoteName)} on fretboard</button>
                    : <span className={styles.meta}>Outside practice range</span>)}
            </div>
            <dl className={styles.degreeFrames}>
                <div><dt>{scaleName}</dt><dd>{formatAccidentals(focusedTone.scaleDegree)}</dd></div>
                {chord && <div><dt>{chordName}</dt><dd>
                    {focusedTone.chordNoteName && focusedTone.chordNoteName !== focusedTone.scaleNoteName && `${formatNoteName(focusedTone.chordNoteName)} · `}
                    {focusedTone.chordDegree && formatAccidentals(focusedTone.chordDegree)}{' '}
                    <span role="img" className={focusedTone.chordMembership === 'member' ? styles.member : styles.nonMember}
                        aria-label={focusedTone.chordMembership === 'member' ? 'Chord tone' : 'Other scale tone'}>{focusedTone.chordMembership === 'member' ? '●' : '○'}</span>
                </dd></div>}
            </dl>
            {showPair && <div ref={relationshipRef} className={styles.relationship} role="group" aria-label="Chord tone relationship">
                <div className={styles.pair}>
                    <span><strong>{formatNoteName(referenceTone.chordNoteName)}</strong> <small>{referenceDegree === '1' ? 'Root' : formatAccidentals(referenceTone.chordDegree)}</small></span>
                    <span className={styles.between}>{sustainedAgainst ? 'Semitone' : 'Extension'}</span>
                    <span><strong>{formatNoteName(focusedTone.chordNoteName)}</strong> <small>{formatAccidentals(focusedTone.chordDegree)}</small></span>
                </div>
                {sustainedAgainst && <p>When sustained</p>}
            </div>}
            {roleLabels.length > 0 && <ul className={styles.roleList}>{roleLabels.map((item, index) => <li key={`${item.kind}:${index}`} className={styles.kind}>{item.kind}</li>)}</ul>}
            {(markers.length > 0 || chordReadings.length > 0) && <details className={styles.context} onToggle={({ currentTarget }) => {
                if (currentTarget.open) currentTarget.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
            }}>
                <summary>Context</summary>
                {markers.length > 0 && <div className={styles.interpretation}>
                    <h4>{scaleName} · Characteristic tones</h4>
                    <ul className={styles.markerRow} aria-label={`Characteristic tones of ${scaleName}`}>
                        {markers.map(marker => <li key={marker.interval} aria-current={marker.interval === focusedInterval ? 'true' : undefined}>
                            <strong>{formatNoteName(marker.name)}</strong> <span>{formatAccidentals(marker.degree)}</span>
                            {marker.name !== marker.tone.scaleNoteName && <small>{formatNoteName(marker.tone.scaleNoteName)} · {formatAccidentals(marker.tone.scaleDegree)} in scale</small>}
                        </li>)}
                    </ul>
                </div>}
                {chordReadings.map(item => <section className={styles.interpretation} key={item.kind}>
                    <h4><span>{item.kind}</span>{chordName && ` · ${chordName}`}</h4>
                    <p>{item.explanation}</p>
                    {item.conditions.length > 0 && <ul className={styles.conditions}>{item.conditions.map(condition => <li key={condition}>{condition}</li>)}</ul>}
                </section>)}
            </details>}
        </div>}
        {chord && chord.tonesOutsideScale.length > 0 && <p className={styles.meta}>Outside scale · {chord.tonesOutsideScale.map(formatNoteName).join(' · ')}</p>}
    </section>;
}
