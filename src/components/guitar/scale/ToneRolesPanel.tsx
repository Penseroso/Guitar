"use client";

import React from 'react';
import type { ScaleToneAnalysis } from '@/domain/chord/scale-tone-analysis';
import { formatAccidentals, formatNoteName } from '@/domain/shared/spelling';
import { resolveScaleRef } from '@/domain/scale/scale-ref';
import { getScalePresentationName } from '@/domain/scale/scaleSelector';
import { getKeyName } from '@/domain/shared/keys';
import styles from './tone-roles.module.css';

export function ToneRolesPanel({ analysis, onClear, focusedInterval, onFocusTone }: {
    analysis: ScaleToneAnalysis | null;
    onClear: () => void;
    focusedInterval?: number | null;
    onFocusTone?: (interval: number | null) => void;
}) {
    if (!analysis) return null;
    const { chord, identity, tones } = analysis;
    const scale = resolveScaleRef(analysis.scaleRef);
    const focusedTone = tones.find(tone => tone.interval === focusedInterval);
    const reviewed = focusedTone?.interpretations.filter(item => item.status === 'reviewed') ?? [];

    return <section className={styles.panel} aria-label="Tone roles">
        <div className={styles.header}>
            <div>
                <h2 className={styles.heading}>Tone roles</h2>
                {scale && <p className={styles.meta}>Scale: {formatNoteName(getKeyName(scale.tonic))} {getScalePresentationName(scale.name)}</p>}
            </div>
            <div className={styles.actions}>
                {chord && <button type="button" className={styles.textButton} onClick={onClear}>Clear analysis chord</button>}
                {focusedTone && <button type="button" className={styles.textButton} onClick={() => onFocusTone?.(null)}>Clear tone focus</button>}
            </div>
        </div>
        {identity.status === 'reviewed' && identity.markers.length > 0 && <p className={styles.meta}>Signature · {identity.markers.map(marker => formatAccidentals(marker.degree)).join(' · ')}</p>}
        {!chord && !focusedTone && <p className={styles.meta}>Select a note for its role</p>}
        {chord && <p className={styles.chordContext} aria-live="polite">Analyzing {formatAccidentals(chord.rootNoteName + chord.chordSuffix)}</p>}
        {chord && <p className={styles.legend}><span className={styles.member}>●</span> Chord tone <span className={styles.nonMember}>○</span> Other scale tone</p>}
        <ul className={styles.toneList} aria-label="Scale tones">
            {tones.map(tone => <li key={tone.interval} className={styles.toneItem}>
                <button type="button" className={styles.toneButton}
                    aria-label={`Focus ${formatNoteName(tone.scaleNoteName)} on fretboard`}
                    aria-pressed={focusedInterval === tone.interval}
                    onClick={() => onFocusTone?.(focusedInterval === tone.interval ? null : tone.interval)}>
                    <span className={styles.toneName}>{formatNoteName(tone.scaleNoteName)}</span>
                    <span className={styles.degree}>{formatAccidentals(tone.scaleDegree)}</span>
                    {chord && <span className={tone.chordMembership === 'member' ? styles.member : styles.nonMember} aria-label={tone.chordMembership === 'member' ? 'Chord tone' : 'Not a chord tone'}>{tone.chordMembership === 'member' ? '●' : '○'}</span>}
                </button>
            </li>)}
        </ul>
        {focusedTone && <div className={styles.detail} role="region" aria-label="Selected tone detail" aria-live="polite">
            <h3>{formatNoteName(focusedTone.scaleNoteName)} <span>{formatAccidentals(focusedTone.scaleDegree)} in this scale</span></h3>
            {chord && <p className={styles.meta}>
                {focusedTone.chordMembership === 'member' ? 'Chord tone' : 'Not a chord tone'}
                {focusedTone.chordDegree && focusedTone.chordNoteName && <> · {formatNoteName(focusedTone.chordNoteName)} as {formatAccidentals(focusedTone.chordDegree)} against {formatAccidentals(chord.rootNoteName + chord.chordSuffix)}</>}
            </p>}
            {reviewed.length > 0 && <ul className={styles.roleList}>{reviewed.map((item, index) => <li key={`${item.kind}:${index}`} className={styles.kind}>{item.kind}</li>)}</ul>}
            {reviewed.some(item => item.kind !== 'characteristic' || item.conditions.length > 0) && <details className={styles.context}>
                <summary>Context</summary>
                <ul>{reviewed.map((item, index) => <li key={`${item.kind}:${index}`}>
                    <strong>{item.kind}</strong> · {item.explanation}
                    {item.conditions.length > 0 && <span className={styles.meta}> {item.conditions.join(' ')}</span>}
                </li>)}</ul>
            </details>}
        </div>}
        {chord?.basis === 'containment' && <p className={styles.meta}>Note containment · pairing and tensions unverified</p>}
        {chord && chord.tonesOutsideScale.length > 0 && <p className={styles.meta}>Outside scale · {chord.tonesOutsideScale.map(formatNoteName).join(' · ')}</p>}
    </section>;
}
