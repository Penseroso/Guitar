"use client";

import React from 'react';
import { SCALES } from '@/domain/scale/scales';
import { createScaleRef, resolveScaleRef, type ScaleRef } from '@/domain/scale/scale-ref';
import { compareParallelScales, getScaleRelations } from '@/domain/scale/scale-relations';
import { buildScaleId, getScalePresentationName } from '@/domain/scale/scaleSelector';
import { getKeyName } from '@/domain/shared/keys';
import { getScaleStructuralTones } from '@/domain/scale/scale-tones';
import { formatNoteName } from '@/domain/shared/spelling';
import styles from './scale-analysis.module.css';

export function ScaleRelationsPanel({ scaleRef, onNavigateScale }: { scaleRef: ScaleRef; onNavigateScale: (ref: ScaleRef) => void }) {
    const [targetId, setTargetId] = React.useState('');
    const current = resolveScaleRef(scaleRef);
    const relations = getScaleRelations(scaleRef);
    if (!current || !relations) return null;
    const options = Object.entries(SCALES).flatMap(([group, modes]) => Object.keys(modes).map(name => ({ group, name, id: buildScaleId(group, name) })));
    const selected = options.find(option => option.id === targetId && option.id !== scaleRef.scaleId);
    const comparison = selected ? compareParallelScales(scaleRef, createScaleRef(selected.group, selected.name, scaleRef.tonic)) : null;
    const currentTones = getScaleStructuralTones(scaleRef);
    const targetTones = comparison ? getScaleStructuralTones(comparison.scaleRef) : null;
    const noteNames = (notes: number[], role: 'shared' | 'added' | 'removed') => {
        if (!notes.length) return 'None';
        if (!currentTones || !targetTones) return 'Spelling unavailable';
        return notes.map(note => {
            const currentName = currentTones.find(tone => tone.pitchClass === note)?.scaleNoteName;
            const targetName = targetTones.find(tone => tone.pitchClass === note)?.scaleNoteName;
            if (role === 'added') return targetName ? formatNoteName(targetName) : 'Spelling unavailable';
            if (role === 'removed') return currentName ? formatNoteName(currentName) : 'Spelling unavailable';
            if (!currentName || !targetName) return 'Spelling unavailable';
            return currentName === targetName ? formatNoteName(currentName)
                : `${formatNoteName(currentName)} (current) / ${formatNoteName(targetName)} (comparison)`;
        }).join(' · ');
    };
    const title = (ref: ScaleRef, name: string) => `${formatNoteName(getKeyName(ref.tonic))} ${getScalePresentationName(name)}`;

    return <section className={styles.panel} aria-label="Scale relationships">
        <h2 className={styles.heading}>Scale relationships</h2>
        <div className={styles.relationshipGrid}>
            <section className={styles.stack}>
                <h3>Parallel — same tonic</h3>
                <label className={styles.stack}>Compare with
                    <select className={styles.select} value={selected?.id ?? ''} onChange={event => setTargetId(event.target.value)}>
                        <option value="">Choose a scale</option>
                        {options.filter(option => option.id !== scaleRef.scaleId).map(option => <option key={option.id} value={option.id}>{getScalePresentationName(option.name)}</option>)}
                    </select>
                </label>
                {comparison && selected && <div className={styles.stack} aria-label="Parallel comparison">
                    <p>Shared: {noteNames(comparison.shared, 'shared')}</p>
                    <p>Added: {noteNames(comparison.added, 'added')}</p>
                    <p>Removed: {noteNames(comparison.removed, 'removed')}</p>
                    <p className={styles.muted}>These are pitch differences, not characteristic-tone judgments.</p>
                    <button type="button" className={styles.button} onClick={() => onNavigateScale(comparison.scaleRef)}>Use {title(comparison.scaleRef, selected.name)}</button>
                </div>}
            </section>
            <section className={styles.stack}>
                <h3>Siblings — same pitch collection</h3>
                <p className={styles.muted}>Change the tonic and scale together.</p>
                <div className={styles.actions}>{relations.siblings.map(sibling => <button type="button" className={styles.button} key={`${sibling.scaleRef.scaleId}:${sibling.scaleRef.tonic}`} onClick={() => onNavigateScale(sibling.scaleRef)}>{title(sibling.scaleRef, sibling.name)}</button>)}</div>
                {!relations.siblings.length && <p className={styles.muted}>No other registered modal siblings.</p>}
            </section>
            <section className={styles.stack}>
                <h3>Parent — construction relationship</h3>
                {relations.parent ? <>
                    <p className={styles.muted}>{relations.parent.subset ? 'This is the registered source collection for the subset, not its only possible musical parent.' : 'The source collection for this registered rotation.'}</p>
                    {relations.parent.scaleRef.scaleId === scaleRef.scaleId && relations.parent.scaleRef.tonic === scaleRef.tonic
                        ? <p>This is the registered parent collection.</p>
                        : <button type="button" className={styles.button} onClick={() => onNavigateScale(relations.parent!.scaleRef)}>{title(relations.parent.scaleRef, relations.parent.name)}</button>}
                </> : <p className={styles.muted}>This is already the registered parent collection.</p>}
                {relations.symmetryOffsets.length > 0 && <p className={styles.muted}>Same pitch collection after transposing by {relations.symmetryOffsets.join(', ')} semitones. The harmonic function may change.</p>}
            </section>
        </div>
    </section>;
}
