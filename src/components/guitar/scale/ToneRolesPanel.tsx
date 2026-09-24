"use client";

import React from 'react';
import type { ScaleToneAnalysis } from '@/domain/chord/scale-tone-analysis';
import { SOURCE_CATALOG, type SourceRefId } from '@/domain/scale/scale-identity';
import { formatAccidentals, formatNoteName } from '@/domain/shared/spelling';
import styles from './scale-analysis.module.css';
import { resolveScaleRef } from '@/domain/scale/scale-ref';
import { getScalePresentationName } from '@/domain/scale/scaleSelector';
import { getKeyName } from '@/domain/shared/keys';

function Sources({ refs }: { refs: SourceRefId[] }) {
    return <span className={styles.sources}>{refs.map(ref => {
        const source = SOURCE_CATALOG[ref];
        return <a key={ref} href={source.url} target="_blank" rel="noreferrer" title={`${source.author} — ${source.locator}`}>{source.title}</a>;
    })}</span>;
}

export function ToneRolesPanel({ analysis, onClear, focusedInterval, onFocusTone }: {
    analysis: ScaleToneAnalysis | null;
    onClear: () => void;
    focusedInterval?: number | null;
    onFocusTone?: (interval: number | null) => void;
}) {
    if (!analysis) return null;
    const { chord, identity, tones } = analysis;
    const scale = resolveScaleRef(analysis.scaleRef);
    return <section className={styles.panel} aria-label="Tone roles">
        <div className={styles.actions}>
            <h2 className={styles.heading}>Tone roles</h2>
            {chord && <button type="button" className={styles.button} onClick={onClear}>Clear analysis chord</button>}
            {focusedInterval != null && <button type="button" className={styles.button} onClick={() => onFocusTone?.(null)}>Clear tone focus</button>}
        </div>
        {scale && <p>Scale: {formatNoteName(getKeyName(scale.tonic))} {getScalePresentationName(scale.name)}</p>}
        <p aria-live="polite">{chord ? `Analyzing ${formatAccidentals(chord.rootNoteName + chord.chordSuffix)}` : 'Select a chord in “Play this scale over” to inspect chord-relative tone roles.'}</p>
        {identity.status === 'reviewed' && <div className={styles.stack}>
            <p><span className={styles.badge}>Scale identity</span> {identity.explanation}</p>
            {identity.markers.length > 0 && <p className={styles.muted}>Characteristic markers: {identity.markers.map(marker => formatAccidentals(marker.degree)).join(' · ')}</p>}
            <Sources refs={identity.sourceRefs} />
        </div>}
        {chord?.basis === 'containment' && <p className={styles.muted}>This chord is contained in the scale. Containment alone does not establish a standard pairing or available tensions.</p>}
        {chord && chord.tonesOutsideScale.length > 0 && <p className={styles.muted}>Chord tones outside the scale: {chord.tonesOutsideScale.map(formatNoteName).join(', ')}. These are not added to the scale.</p>}
        <div className={styles.tableScroll}>
            <table className={styles.table}>
                <thead><tr><th scope="col">Scale note</th><th scope="col">Structural degree</th><th scope="col">Chord-relative</th><th scope="col">Membership</th><th scope="col">Interpretation</th></tr></thead>
                <tbody>{tones.map(tone => <tr key={tone.interval}>
                    <td><button type="button" className={styles.button} aria-label={`Focus ${formatNoteName(tone.scaleNoteName)} on fretboard`} aria-pressed={focusedInterval === tone.interval} onClick={() => onFocusTone?.(focusedInterval === tone.interval ? null : tone.interval)}>{formatNoteName(tone.scaleNoteName)}</button></td>
                    <td>{formatAccidentals(tone.scaleDegree)}</td>
                    <td>{chord && tone.chordDegree ? `${tone.chordNoteName ? formatNoteName(tone.chordNoteName) + ' · ' : ''}${formatAccidentals(tone.chordDegree)}` : '—'}</td>
                    <td>{tone.chordMembership === 'member' ? 'Chord tone' : tone.chordMembership === 'non-member' ? 'Not a chord tone' : 'No chord selected'}</td>
                    <td><div className={styles.stack}>
                        {tone.interpretations.filter(interpretation => interpretation.status === 'reviewed').map((interpretation, index) => <div key={`${interpretation.kind}:${index}`}>
                            <span className={styles.badge}>{interpretation.kind}</span>
                            <p>{interpretation.explanation}</p>
                            {interpretation.conditions.length > 0 && <p className={styles.muted}>{interpretation.conditions.join(' ')}</p>}
                            <Sources refs={interpretation.sourceRefs} />
                        </div>)}
                        {!tone.interpretations.some(interpretation => interpretation.status === 'reviewed') && <span className={styles.muted}>No curated interpretation for this context.</span>}
                    </div></td>
                </tr>)}</tbody>
            </table>
        </div>
        <p className={styles.muted}>Select a note to locate every occurrence within the visible fretboard range. Cautions describe a musical context, not forbidden notes.</p>
    </section>;
}
