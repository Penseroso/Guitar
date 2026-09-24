"use client";

import { useEffect, useState, type KeyboardEvent } from 'react';
import type { ChordRef, RelationKind, RelationQuery, RelationResult } from '@/domain/harmony/types';
import { auditionLines } from '@/domain/harmony/connections';
import { resolveChord } from '@/domain/harmony/roman';
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
    { name: 'Dominant motion', kinds: [{ id: 'dominant', label: 'Dominant resolution' }, { id: 'fifths', label: 'Motion of 5th' }, { id: 'tritone', label: 'Tritone substitution (subV7)' }] },
    { name: 'Predominant', kinds: [{ id: 'ii-v', label: 'ii–V' }, { id: 'predominant', label: 'IV–V' }] },
    { name: 'Tonic substitutes', kinds: [{ id: 'tonic-sub', label: 'Tonic substitutes' }] },
    { name: 'Subdominant minor', kinds: [{ id: 'minor-sub', label: 'Minor-subdominant family' }, { id: 'backdoor', label: 'Backdoor' }] },
    { name: 'Diminished approach', kinds: [{ id: 'leading', label: 'Leading-tone diminished' }, { id: 'common-tone', label: 'Common-tone diminished' }, { id: 'passing', label: 'Passing diminished' }] },
    { name: 'Cadence', kinds: [{ id: 'cadence', label: 'Cadence' }] },
];
const MODE_OPTIONS = [{ value: 'major', label: 'Major' }, { value: 'minor', label: 'Minor' }];
const LENS_OPTIONS = [{ value: 'jazz-pop', label: 'Jazz / Pop' }, { value: 'classical', label: 'Classical' }];
const STATUS_LABELS: Record<RelationResult['status'], string> = {
    matched: 'Established relation', possible: 'Possible interpretation', 'insufficient-context': 'More context needed', unsupported: 'Outside current scope',
};
const copyParts = (text: string) => text.split(/\s+·\s+/).filter(Boolean);
const copyLines = (text: string) => copyParts(text).map((part, index) => <span className={styles.copyUnit} key={`${index}:${part}`}>{part}</span>);
function hasMinorThird(query: RelationQuery) {
    try { return resolveChord(query.target).tones.some(tone => tone.degree === 'b3'); }
    catch { return query.frame.mode === 'minor'; }
}

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
    const { play, cancel, loading, mode: audioMode, error: audioError, playing, step: activeStep } = useHarmonyAudio();
    const family = FAMILIES.find(item => item.kinds.some(kind => kind.id === query.kind)) ?? FAMILIES[0];
    const examples = result.examples.filter(item => query.kind === 'predominant' ? item.id === 'iv-v' : query.kind === 'ii-v' ? item.id === 'ii-v' : true);
    const example = examples.find(item => item.id === selectedExampleId) ?? examples[0];
    const destinationIsMinor = hasMinorThird(query);
    const preparationLabel = destinationIsMinor ? 'iv–V' : 'IV–V';
    const predominantLabel = destinationIsMinor ? 'iiø–V' : 'ii–V';
    const relationLabel = (item: { id: RelationKind; label: string }) => item.id === 'dominant' && query.kind === 'dominant' && example
        ? example.steps.map(step => step.roman).join(' → ')
        : item.id === 'predominant' ? preparationLabel : item.id === 'ii-v' ? predominantLabel : item.label;
    const exampleLabel = (id: string, label: string) => query.kind === 'tonic-sub' ? (id === 'iii' ? 'iii7' : id === 'vi' ? 'vi7' : label) : query.kind === 'tritone' ? (id === 'original' ? 'Original dominant' : 'Substitute dominant') : label;
    const lines = example?.kind === 'motion' ? auditionLines(example) : null;
    // Line playback exists only for motion; a comparison is not a progression.
    const hasGuideTones = !!lines && lines.transitions.some(transition => transition.voices.length > 0);
    const linesLabel = !lines || lines.guide ? 'Hear guide tones' : 'Hear voice lines';
    const unmetConditions = result.checks?.filter(check => check.state === 'fail').length ?? 0;
    const unknownConditions = result.checks?.filter(check => check.state === 'unknown').length ?? 0;
    const conditionSummary = [unmetConditions ? `${unmetConditions} unmet` : '', unknownConditions ? `${unknownConditions} unknown` : ''].filter(Boolean).join(', ') || 'confirmed';
    const cadenceReading = query.kind === 'cadence' ? result.interpretations?.[0] : undefined;
    const resultTitle = cadenceReading && query.context?.before ? copyParts(cadenceReading.label)[0]
        : query.kind === 'predominant' ? `${preparationLabel} preparation` : query.kind === 'ii-v' ? `${predominantLabel} preparation`
            : query.kind === 'tonic-sub' ? 'Tonic substitutes' : query.kind === 'dominant' ? 'Dominant resolution'
                : query.kind === 'tritone' ? 'Tritone substitution' : copyParts(result.title)[0];
    // Summary facts stay in one place; a reading only adds its distinct interpretation.
    const readings = (result.interpretations ?? []).map(reading => ({
        ...reading,
        evidence: [...new Set(reading.evidence)].filter(item => !result.observations.includes(item) && item !== reading.label && item !== result.title),
        missing: [...new Set(reading.missing)].filter(item => !result.missing.includes(item)),
    })).filter(reading => (reading.label !== result.title && reading.id !== cadenceReading?.id) || reading.evidence.length > 0 || reading.missing.length > 0 || (result.interpretations?.length ?? 0) > 1);
    const readingLabels = new Set(readings.map(reading => reading.label));
    const observations = [...new Set(result.observations)].filter(item => !readingLabels.has(item) && item !== cadenceReading?.label).map(item => {
        if (query.kind === 'predominant' && example && /^(Major|Minor) · ii/.test(item)) return `${example.steps[0].roman} → ${example.steps[1].roman}`;
        if (item === 'Target · key center') return 'Tonic destination';
        if (item === '3 → root · ♭7 → third') {
            const destination = result.observations.includes('Target · key center') ? 'tonic' : 'destination';
            return `3rd → ${destination} root · ♭7 → ${destination} 3rd`;
        }
        if (item === 'Same guides · different bass') return 'Same guide-tone tritone · Different root approach';
        return item.replace(/^Local target · /, 'Destination: ');
    });
    const mainObservations = observations.filter(item => item.length < 85 && !/context|unconfirmed|not inferred|outside|≠|fit|depends|distinct chord|same pitches|shared guides|supplied ending|not an observed|function needs/i.test(item)).slice(0, 2);
    const detailedObservations = observations.filter(item => !mainObservations.includes(item));
    const showExampleLabel = query.kind === 'cadence' && examples.length === 1 && example && !result.observations.includes(example.label) && !readingLabels.has(example.label);
    const isContextual = query.kind === 'passing' || query.kind === 'cadence';
    const sourceScale = sourceScaleRef ? resolveScaleRef(sourceScaleRef) : null;
    const canAdoptSource = !!onUseScaleFrame && (sourceScale?.name === 'Ionian' || sourceScale?.name === 'Aeolian');

    useEffect(() => { cancel(); }, [query, example?.id, cancel]);

    const update = (patch: Partial<RelationQuery>) => onQueryChange({ ...query, ...patch });
    const exampleTabs = examples.length > 1 && <div className={styles.exampleTabs} role="tablist" aria-label={query.kind === 'tritone' ? 'Audition version' : 'Examples'}>
        {examples.map(item => <button key={item.id} type="button" role="tab" aria-selected={item.id === example?.id} tabIndex={item.id === example?.id ? 0 : -1} onKeyDown={onTabKeyDown} className={styles.tab} onClick={() => setSelectedExampleId(item.id)}>{exampleLabel(item.id, item.label)}</button>)}
    </div>;

    return <main className={styles.workspace} aria-label="Harmony relationship explorer">
        {sourceScale && <div className={styles.sourceScale}><span>From Scale</span><span>{sourceScale.name}</span>{canAdoptSource && <button type="button" onClick={onUseScaleFrame}>Use as key</button>}</div>}

        <section className={styles.setup} aria-label="Tonal context and target">
            <div className={styles.fieldGroup}>
                <div className={styles.contextFields}>
                    <RootDial label="Key" value={parseNoteName(query.frame.tonic)?.pitchClass ?? 0} displayName={formatAccidentals(query.frame.tonic)} onChange={pitchClass => update({ frame: { ...query.frame, tonic: query.frame.mode === 'minor' ? getMinorKeyName(pitchClass) : getKeyName(pitchClass) } })} />
                    <SwipePicker label="Major / Minor" value={query.frame.mode} options={MODE_OPTIONS} onChange={mode => update({ frame: { ...query.frame, mode: mode as RelationQuery['frame']['mode'] } })} />
                </div>
                <details className={styles.theoryStyle}>
                    <summary>Theory style</summary>
                    <SwipePicker label="Style" value={query.frame.lens} options={LENS_OPTIONS} onChange={lens => update({ frame: { ...query.frame, lens: lens as RelationQuery['frame']['lens'] } })} />
                    <p className={styles.notationHint}>Roman numerals use the major-scale reference in both styles.</p>
                </details>
            </div>
            <div className={styles.fieldGroup}>
                <span className={styles.groupLabel}>Resolve to</span>
                <HarmonyChordFields label="Destination" value={query.target} allowBass={isContextual} onChange={chord => { if (chord) update({ target: chord }); }} />
            </div>
        </section>

        <section className={styles.relationSection} aria-label="Relationship">
            <span className={styles.groupLabel}>Harmonic relationships</span>
            <div className={styles.familyTabs} role="tablist" aria-label="Relationship family">
                {FAMILIES.map(item => <button key={item.name} type="button" role="tab" aria-selected={item === family} tabIndex={item === family ? 0 : -1} onKeyDown={onTabKeyDown} className={styles.tab} onClick={() => update({ kind: item.kinds[0].id })}>{item.name}</button>)}
            </div>
            {family.kinds.length > 1 && <div className={styles.kindTabs} role="tablist" aria-label={`${family.name} relationships`}>
                {family.kinds.map(item => <button key={item.id} type="button" role="tab" aria-selected={item.id === query.kind} tabIndex={item.id === query.kind ? 0 : -1} onKeyDown={onTabKeyDown} className={styles.tab} onClick={() => update({ kind: item.id })}>{relationLabel(item)}</button>)}
            </div>}
        </section>

        {isContextual && <ContextWindow key={`${query.kind}:${query.context?.soprano ?? ''}`} query={query} onQueryChange={onQueryChange} />}

        <section className={styles.resultSection} aria-live="polite">
            <div className={styles.resultHeading}>
                <div><span className={styles.status} data-status={result.status}>{STATUS_LABELS[result.status]}</span><h3>{resultTitle}</h3></div>
                {example && <div className={styles.playActions}>
                    {/* Each button is its own play/stop toggle; there is no separate Stop control. */}
                    <button type="button" className={styles.playButton} disabled={audioMode !== 'relation' && loading} aria-busy={audioMode === 'relation' && loading} aria-pressed={audioMode === 'relation' && playing} onClick={audioMode === 'relation' && (loading || playing) ? cancel : () => play(example, false)}>
                        {audioMode === 'relation' && loading ? 'Loading sound…' : audioMode === 'relation' && playing ? 'Stop' : playing ? 'Play again' : 'Play relation'}
                    </button>
                    {hasGuideTones && <button type="button" className={styles.quietButton} disabled={audioMode !== 'guide' && loading} aria-busy={audioMode === 'guide' && loading} aria-pressed={audioMode === 'guide' && playing} onClick={audioMode === 'guide' && (loading || playing) ? cancel : () => play(example, true)}>
                        {audioMode === 'guide' && loading ? 'Loading…' : audioMode === 'guide' && playing ? 'Stop' : linesLabel}
                    </button>}
                </div>}
            </div>
            {exampleTabs}
            {audioError && <p className={styles.error} role="alert">{audioError}</p>}
            {playing && activeStep !== null && example && <p className={styles.nowPlaying}>Playing {example.steps[activeStep]?.chord.name}</p>}
            {example && <p className={styles.exampleLabel}><span className={styles.provenance}>{example.provenance === 'observation' ? 'Observed' : 'Example'}</span>{showExampleLabel && <span>{copyLines(example.label)}</span>}</p>}
            {example && <RelationExampleView key={`${example.id}:${JSON.stringify(query)}`} example={example} alternative={query.kind === 'tritone' ? result.examples.find(item => item.id !== example.id) : undefined} onOpenChord={onOpenChord} activeStep={activeStep} />}
            {(mainObservations.length > 0 || result.missing.length > 0) && <div className={styles.findings}>
                {mainObservations.map((observation, index) => <p key={`observation-${index}`}>{copyLines(observation)}</p>)}
                {result.missing.map((missing, index) => <p key={`missing-${index}`} className={styles.missing}>Needed: {missing}</p>)}
            </div>}
            {(detailedObservations.length > 0 || !!result.checks?.length) && <details className={styles.conditionDetails}>
                <summary aria-label="Relationship details">Details{!!result.checks?.length && <span className={styles.summaryNote}>{conditionSummary}</span>}</summary>
                <div className={styles.detailCopy}>{detailedObservations.map((observation, index) => <p key={index}>{copyLines(observation)}</p>)}</div>
                {!!result.checks?.length && <div className={styles.checks} aria-label="Observed conditions">{result.checks.map(check => <span key={check.id} data-state={check.state} aria-label={`${check.label}: ${check.state === 'pass' ? 'met' : check.state === 'fail' ? 'not met' : 'unknown'}`}><span aria-hidden="true">{check.state === 'pass' ? '✓' : check.state === 'fail' ? '−' : '?'}</span> {copyParts(check.label).join(' / ')}</span>)}</div>}
            </details>}
            {readings.length > 0 && <div className={styles.interpretations} aria-label="Possible readings">{readings.map(reading => <div key={reading.id} className={styles.interpretation}>
                <p>{copyLines(reading.label)}<span className={`${styles.readingStatus} ${styles.copyUnit}`}>{STATUS_LABELS[reading.status]}</span></p>
                {(reading.evidence.length > 0 || reading.missing.length > 0) && <details className={styles.readingDetails}>
                    <summary aria-label={`Details for ${reading.label}`}>Details{reading.missing.length > 0 && <span className={styles.summaryNote}>Context needed</span>}</summary>
                    {reading.evidence.map((evidence, index) => <p key={index} className={styles.readingDetail}>{copyLines(evidence)}</p>)}
                    {reading.missing.map((missing, index) => <p key={index} className={styles.readingDetail}>Needed: {missing}</p>)}
                </details>}
            </div>)}</div>}
            {result.scaleLinks.length > 0 && <div className={styles.scaleLinks}><span>Scale reference</span>{result.scaleLinks.map(link => <button key={`${link.ref.group}-${link.ref.scaleId}-${link.ref.tonic}`} type="button" onClick={() => onOpenScale(link.ref)}>{copyParts(link.label)[0]}<span aria-hidden="true"> ↗</span></button>)}</div>}
        </section>
    </main>;
}
