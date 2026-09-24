"use client";

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { SCALES } from '@/domain/scale/scales';
import { createScaleRef, resolveScaleRef, type ScaleRef } from '@/domain/scale/scale-ref';
import { compareParallelScales, getScaleRelations } from '@/domain/scale/scale-relations';
import { buildScaleId, getScalePresentationName } from '@/domain/scale/scaleSelector';
import { getKeyName } from '@/domain/shared/keys';
import { getScaleStructuralTones, type ScaleStructuralTone } from '@/domain/scale/scale-tones';
import { formatAccidentals, formatNoteName } from '@/domain/shared/spelling';
import styles from './scale-relations.module.css';

function namesForPitch(tones: ScaleStructuralTone[] | null, pitchClass: number) {
    if (!tones) return ['Spelling unavailable'];
    const names = [...new Set(tones.filter(tone => tone.pitchClass === pitchClass).map(tone => formatNoteName(tone.scaleNoteName)))];
    return names.length ? names : ['Spelling unavailable'];
}

function DifferenceRow({ label, notes, currentTones, targetTones }: {
    label: 'Added' | 'Removed' | 'Shared';
    notes: number[];
    currentTones: ScaleStructuralTone[] | null;
    targetTones: ScaleStructuralTone[] | null;
}) {
    return <div className={styles.differenceRow}>
        <span className={styles.differenceLabel}>{label}</span>
        <div className={styles.chips} aria-label={`${label} notes`}>
            {notes.length ? notes.map(pitchClass => {
                const current = namesForPitch(currentTones, pitchClass).join(' / ');
                const target = namesForPitch(targetTones, pitchClass).join(' / ');
                const name = label === 'Added' ? target : label === 'Removed' ? current
                    : current === target ? current : `${current} (current) / ${target} (comparison)`;
                return <span className={styles.chip} key={pitchClass}>{name}</span>;
            }) : <span className={styles.empty}>None</span>}
        </div>
    </div>;
}

function ScaleToneRow({ name, tones, otherTones, side }: {
    name: string;
    tones: ScaleStructuralTone[];
    otherTones: ScaleStructuralTone[];
    side: 'from' | 'to';
}) {
    const otherByPitch = new Map(otherTones.map(tone => [tone.pitchClass, tone]));
    return <div className={styles.scaleLine}>
        <p className={styles.scaleName}>{name}</p>
        <ol className={styles.toneRow} aria-label={`Notes of ${name}`}>
            {tones.map(tone => {
                const other = otherByPitch.get(tone.pitchClass);
                const changed = !other || other.scaleDegree !== tone.scaleDegree || other.scaleNoteName !== tone.scaleNoteName;
                return <li key={tone.pitchClass} className={styles.tone} data-change={changed ? side : undefined}>
                    <small>{formatAccidentals(tone.scaleDegree)}</small>
                    <span>{formatNoteName(tone.scaleNoteName)}</span>
                    {changed && <span className={styles.srOnly}>Changed</span>}
                </li>;
            })}
        </ol>
    </div>;
}

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
    const title = (ref: ScaleRef, name: string) => `${formatNoteName(getKeyName(ref.tonic))} ${getScalePresentationName(name)}`;
    const currentTitle = title(scaleRef, current.name);
    const subsetParent = relations.parent?.subset ? relations.parent : null;

    return <section className={styles.section} aria-label="Scale relationships">
        <details className={styles.explorer}>
            <summary className={styles.explorerTrigger}>
                <span><strong>Related scales</strong><small>Compare · same notes</small></span>
                <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <div className={styles.content}>
                <div className={styles.route}>
                    <h3>Compare · {formatNoteName(getKeyName(scaleRef.tonic))} root</h3>
                    <label className={styles.field}>Scale
                        <span className={styles.selectWrap}>
                            <select className={styles.select} value={selected?.id ?? ''} onChange={event => setTargetId(event.target.value)}>
                                <option value="">Choose a scale</option>
                                {options.filter(option => option.id !== scaleRef.scaleId).map(option => <option key={option.id} value={option.id}>{getScalePresentationName(option.name)}</option>)}
                            </select>
                            <ChevronDown size={16} className={styles.selectArrow} aria-hidden="true" />
                        </span>
                    </label>
                    {comparison && selected && <div className={styles.comparison} aria-label="Parallel comparison">
                        {currentTones && targetTones ? <>
                            <ScaleToneRow name={currentTitle} tones={currentTones} otherTones={targetTones} side="from" />
                            <ScaleToneRow name={title(comparison.scaleRef, selected.name)} tones={targetTones} otherTones={currentTones} side="to" />
                        </> : <>
                            <DifferenceRow label="Added" notes={comparison.added} currentTones={currentTones} targetTones={targetTones} />
                            <DifferenceRow label="Removed" notes={comparison.removed} currentTones={currentTones} targetTones={targetTones} />
                            <DifferenceRow label="Shared" notes={comparison.shared} currentTones={currentTones} targetTones={targetTones} />
                        </>}
                        <button type="button" className={styles.action} onClick={() => onNavigateScale(comparison.scaleRef)}>Use {title(comparison.scaleRef, selected.name)}</button>
                    </div>}
                </div>
                <div className={styles.route}>
                    <h3>Same notes · new root</h3>
                    <div className={styles.actions}>{relations.siblings.map(sibling => <button type="button" className={styles.action} key={`${sibling.scaleRef.scaleId}:${sibling.scaleRef.tonic}`} onClick={() => onNavigateScale(sibling.scaleRef)}>{title(sibling.scaleRef, sibling.name)}</button>)}</div>
                    {!relations.siblings.length && <p className={styles.empty}>No registered matches</p>}
                </div>
                {(subsetParent || relations.symmetryOffsets.length > 0) && <div className={styles.provenance}>
                    {subsetParent && <div className={styles.provenanceItem}>
                        <h3>Registered subset</h3>
                        <p className={styles.empty}>{title(subsetParent.scaleRef, subsetParent.name)} · other parents possible</p>
                        <button type="button" className={styles.action} onClick={() => onNavigateScale(subsetParent.scaleRef)}>Use {title(subsetParent.scaleRef, subsetParent.name)}</button>
                    </div>}
                    {relations.symmetryOffsets.length > 0 && <div className={styles.provenanceItem}>
                        <h3>Symmetry</h3>
                        <p className={styles.empty}>Same notes after +{relations.symmetryOffsets.join(' / +')} semitones · function may change</p>
                    </div>}
                </div>}
            </div>
        </details>
    </section>;
}
