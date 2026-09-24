"use client";

import { useEffect, useState, type KeyboardEvent } from 'react';
import type { ChordRef, RelationKind, RelationQuery, RelationResult } from '@/domain/harmony/types';
import { formatAccidentals, parseNoteName } from '@/domain/shared/spelling';
import { getKeyName, getMinorKeyName } from '@/domain/shared/keys';
import { resolveScaleRef, type ScaleRef } from '@/domain/scale/scale-ref';
import { useHarmonyAudio } from './useHarmonyAudio';
import { RelationExampleView } from './RelationExampleView';
import { HarmonyChordFields } from './HarmonyChordFields';
import { ContextWindow } from './ContextWindow';
import { RootDial } from '../chord/RootDial';
import { SwipePicker } from './SwipePicker';
import styles from './harmony-workspace.module.css';

const FAMILIES: { name: string; kinds: { id: RelationKind; label: string }[] }[] = [
    { name: 'Dominant', kinds: [{ id: 'dominant', label: 'To target' }, { id: 'fifths', label: 'Fifths' }, { id: 'tritone', label: 'Tritone' }] },
    { name: 'Preparation', kinds: [{ id: 'ii-v', label: 'ii–V' }, { id: 'predominant', label: 'Predominant' }] },
    { name: 'Substitutes', kinds: [{ id: 'tonic-sub', label: 'Tonic family' }] },
    { name: 'Borrowing', kinds: [{ id: 'minor-sub', label: 'Subdominant minor' }] },
    { name: 'Diminished', kinds: [{ id: 'leading', label: 'Leading tone' }, { id: 'common-tone', label: 'Common tone' }, { id: 'passing', label: 'Passing' }] },
    { name: 'Cadence', kinds: [{ id: 'cadence', label: 'Cadence' }] },
];
const MODE_OPTIONS = [{ value: 'major', label: 'Major' }, { value: 'minor', label: 'Minor' }];
const LENS_OPTIONS = [{ value: 'jazz-pop', label: 'Jazz / pop' }, { value: 'classical', label: 'Classical' }];

function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
    if (!tabs.length) return;
    event.preventDefault();
    const index = tabs.indexOf(event.currentTarget);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].focus();
    tabs[next].click();
}

type Props = {
    query: RelationQuery;
    result: RelationResult;
    onQueryChange: (query: RelationQuery) => void;
    onOpenChord: (chord: ChordRef) => void;
    onOpenScale: (ref: ScaleRef) => void;
    sourceScaleRef?: ScaleRef | null;
    onUseScaleFrame?: () => void;
};

export function HarmonyModeWorkspace({ query, result, onQueryChange, onOpenChord, onOpenScale, sourceScaleRef, onUseScaleFrame }: Props) {
    const [selectedExampleId, setSelectedExampleId] = useState<string | null>(null);
    const { play, cancel, loading, error: audioError, playing, step: activeStep } = useHarmonyAudio();
    const family = FAMILIES.find(item => item.kinds.some(kind => kind.id === query.kind)) ?? FAMILIES[0];
    const example = result.examples.find(item => item.id === selectedExampleId) ?? result.examples[0];
    const isContextual = query.kind === 'passing' || query.kind === 'cadence';
    const sourceScale = sourceScaleRef ? resolveScaleRef(sourceScaleRef) : null;
    const canAdoptSource = !!onUseScaleFrame && (sourceScale?.name === 'Ionian' || sourceScale?.name === 'Aeolian');

    useEffect(() => { cancel(); }, [query, example?.id, cancel]);

    const update = (patch: Partial<RelationQuery>) => onQueryChange({ ...query, ...patch });

    return <main className={styles.workspace} aria-label="Harmony relationship explorer">
        {sourceScale && <div className={styles.sourceScale}><span>From Scale · {sourceScale.name}</span>{canAdoptSource && <button type="button" onClick={onUseScaleFrame}>Use as key</button>}</div>}

        <section className={styles.setup} aria-label="Tonal context and target">
            <div className={styles.fieldGroup}>
                <span className={styles.groupLabel}>Context</span>
                <div className={styles.contextFields}>
                    <RootDial label="Key" value={parseNoteName(query.frame.tonic)?.pitchClass ?? 0} displayName={formatAccidentals(query.frame.tonic)} onChange={pitchClass => update({ frame: { ...query.frame, tonic: query.frame.mode === 'minor' ? getMinorKeyName(pitchClass) : getKeyName(pitchClass) } })} />
                    <SwipePicker label="Mode" value={query.frame.mode} options={MODE_OPTIONS} onChange={mode => update({ frame: { ...query.frame, mode: mode as RelationQuery['frame']['mode'] } })} />
                    <SwipePicker label="Lens" value={query.frame.lens} options={LENS_OPTIONS} onChange={lens => update({ frame: { ...query.frame, lens: lens as RelationQuery['frame']['lens'] } })} />
                </div>
            </div>
            <div className={styles.fieldGroup}>
                <span className={styles.groupLabel}>Target chord</span>
                <HarmonyChordFields label="Target" value={query.target} allowBass={query.kind === 'cadence'} onChange={chord => { if (chord) update({ target: chord }); }} />
            </div>
        </section>

        <section className={styles.relationSection} aria-label="Relationship">
            <span className={styles.groupLabel}>Explore</span>
            <div className={styles.familyTabs} role="tablist" aria-label="Relationship family">
                {FAMILIES.map(item => <button key={item.name} type="button" role="tab" aria-selected={item === family} tabIndex={item === family ? 0 : -1} onKeyDown={onTabKeyDown} className={styles.tab} onClick={() => update({ kind: item.kinds[0].id })}>{item.name}</button>)}
            </div>
            {family.kinds.length > 1 && <div className={styles.kindTabs} role="tablist" aria-label={`${family.name} relationships`}>
                {family.kinds.map(item => <button key={item.id} type="button" role="tab" aria-selected={item.id === query.kind} tabIndex={item.id === query.kind ? 0 : -1} onKeyDown={onTabKeyDown} className={styles.tab} onClick={() => update({ kind: item.id })}>{item.label}</button>)}
            </div>}
        </section>

        {isContextual && <ContextWindow key={`${query.kind}:${query.context?.soprano ?? ''}`} query={query} onQueryChange={onQueryChange} />}

        <section className={styles.resultSection} aria-live="polite">
            <div className={styles.resultHeading}>
                <div><span className={styles.status} data-status={result.status}>{result.status.replace('-', ' ')}</span><h3>{result.title}</h3></div>
                {example && <div className={styles.playActions}>
                    <button type="button" className={styles.playButton} disabled={loading} aria-busy={loading} onClick={() => play(example, false)}>{loading ? 'Loading sound…' : playing ? 'Play again' : 'Play relation'}</button>
                    <button type="button" className={styles.quietButton} disabled={loading} onClick={() => play(example, true)}>Guide tones</button>
                    {(loading || playing) && <button type="button" className={styles.quietButton} onClick={cancel}>Stop</button>}
                </div>}
            </div>
            {audioError && <p className={styles.error} role="alert">{audioError}</p>}
            {playing && activeStep !== null && example && <p className={styles.nowPlaying}>Playing {example.steps[activeStep]?.chord.name}</p>}
            {(result.observations.length > 0 || result.missing.length > 0) && <div className={styles.findings}>
                {result.observations.map((observation, index) => <p key={`observation-${index}`}>{observation}</p>)}
                {result.missing.map((missing, index) => <p key={`missing-${index}`} className={styles.missing}>Needed · {missing}</p>)}
            </div>}
            {result.examples.length > 1 && <div className={styles.exampleTabs} role="tablist" aria-label="Examples">
                {result.examples.map(item => <button key={item.id} type="button" role="tab" aria-selected={item.id === example?.id} tabIndex={item.id === example?.id ? 0 : -1} onKeyDown={onTabKeyDown} className={styles.tab} onClick={() => setSelectedExampleId(item.id)}>{item.label}</button>)}
            </div>}
            {query.kind === 'cadence' && result.examples.length === 1 && example && <p className={styles.exampleLabel}>{example.label}</p>}
            {example && <RelationExampleView key={`${example.id}:${JSON.stringify(query)}`} example={example} onOpenChord={onOpenChord} activeStep={activeStep} />}
            {result.scaleLinks.length > 0 && <div className={styles.scaleLinks}><span>Scale reference · not a chord fit</span>{result.scaleLinks.map(link => <button key={`${link.ref.group}-${link.ref.scaleId}-${link.ref.tonic}`} type="button" onClick={() => onOpenScale(link.ref)}>{link.label}<span aria-hidden="true"> ↗</span></button>)}</div>}
        </section>
    </main>;
}
