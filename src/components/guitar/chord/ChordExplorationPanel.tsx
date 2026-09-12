"use client";

import React, { useState } from 'react';
import {
    DEFAULT_EXPLORATION_FILTERS, EXPLORATION_PAGE_SIZE, EXPLORATION_START_SIZE,
    matchesExplorationFilters, midiNoteLabel, queryExploration,
    type ChordPlayingContext, type ExplorationCandidate, type ExplorationFilters,
} from '@/domain/chord/exploration';
import type { ExplorationWorkerResponse } from './chord-exploration.worker';
import { CompactVoicingDiagram } from './CompactVoicingDiagram';
import { useVoicingAudio } from './useVoicingAudio';
import { ChordDialog } from './ChordDialog';
import { ChordNeckView } from './ChordNeckView';
import { SelectPill } from '../../ui/design-system/SelectPill';
import { TogglePill } from '../../ui/design-system/TogglePill';
import { FretRangeControl } from './FretRangeControl';
import styles from './chord-ui.module.css';

interface Props {
    context: ChordPlayingContext;
    response: ExplorationWorkerResponse | null;
    onRetry: () => void;
    selectedId: string | null;
    onSelect: (id: string) => void;
    showIntervals: boolean;
    onToggleIntervals: () => void;
    degrees: string[];
    title: string;
    selectionReplaced?: boolean;
}

function position(candidate: ExplorationCandidate) {
    return candidate.facts.maxStoppedFret ? `Frets ${candidate.facts.minStoppedFret}–${candidate.facts.maxStoppedFret}` : 'Open strings only';
}

function Exceptions({ candidate }: { candidate: ExplorationCandidate }) {
    return <>
        {candidate.facts.omittedDegrees.length > 0 && <p className={styles.warning}>Omits {candidate.facts.omittedDegrees.join(', ')}{!candidate.facts.hasRoot ? ' · Rootless' : ''}</p>}
        {candidate.assessment.status === 'uncertain' && <p className={styles.warning}>Check reach on your guitar</p>}
    </>;
}

export function VoicingFactsView({ candidate }: { candidate: ExplorationCandidate }) {
    const { facts, assessment } = candidate;
    return <div className={styles.facts}>
        <p>Sounds: {facts.midiNotes.map(midiNoteLabel).join(' · ')}</p>
        <p>Degrees: {facts.degrees.join(', ')} · {facts.omittedDegrees.length ? `Omits ${facts.omittedDegrees.join(', ')}` : 'Complete formula'}</p>
        <p>{facts.openStringCount} open strings · Reach {Math.round(facts.spanMm)} mm</p>
        <p>Estimated finger groups: {assessment.estimatedFingerGroups}. Geometry is an estimate; comfort depends on your hand and technique.</p>
        {!facts.hasRoot && <p className={styles.warning}>Root omitted: accompaniment or musical context supplies the missing harmony.</p>}
        <p className={styles.small}>Standard tuning · search frets 0–15</p>
        <p>Ranking model assumptions</p>
        <ul className="list-disc pl-4">{candidate.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>
    </div>;
}

const filterLabels: Record<keyof ExplorationFilters, string> = {
    minFret: 'Min fret', maxFret: 'Max fret', bassDegree: 'Bass', topDegree: 'Top', stringCount: 'Strings',
    root: 'Root', openStrings: 'Open strings', coverage: 'Coverage',
};

function PillField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
    return <div className={styles.field}><span>{label}</span><SelectPill comfortable label={label} value={value} onChange={onChange} options={options} /></div>;
}

export function ChordExplorationPanel({ context, response, onRetry, selectedId, onSelect, showIntervals,
    onToggleIntervals, degrees, title, selectionReplaced }: Props) {
    const [filters, setFilters] = useState<ExplorationFilters>({ ...DEFAULT_EXPLORATION_FILTERS });
    const [visibleCount, setVisibleCount] = useState(EXPLORATION_START_SIZE);
    const [positionOpen, setPositionOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const [neck, setNeck] = useState<'inline' | 'dialog' | null>(null);
    const audio = useVoicingAudio();
    const candidates = response?.status === 'ready' ? response.candidates : [];
    const query = queryExploration(candidates, filters, visibleCount);
    const selected = candidates.find(candidate => candidate.voicing.id === selectedId);
    const activeFilters = (Object.keys(filters) as (keyof ExplorationFilters)[]).filter(key => filters[key] !== DEFAULT_EXPLORATION_FILTERS[key]);
    function update<K extends keyof ExplorationFilters>(key: K, value: ExplorationFilters[K]) {
        setFilters(previous => ({ ...previous, [key]: value }));
        setVisibleCount(EXPLORATION_START_SIZE);
    }
    function reset() { setFilters({ ...DEFAULT_EXPLORATION_FILTERS }); setVisibleCount(EXPLORATION_START_SIZE); }
    function play(candidate: ExplorationCandidate) { onSelect(candidate.voicing.id); void audio.play(candidate); }
    const playButton = (candidate: ExplorationCandidate, primary = false) => <button
        className={`${styles.action} ${primary ? styles.primary : styles.cardPlay}`} disabled={audio.loadingCandidateId === candidate.voicing.id}
        data-play-id={candidate.voicing.id} onClick={() => play(candidate)}>
        {audio.loadingCandidateId === candidate.voicing.id ? 'Loading audio…' : primary ? 'Play voicing' : 'Play'}
    </button>;
    const neckContent = selected && <>
        <div className={styles.row}><p>{title} · {position(selected)}</p>{playButton(selected, true)}</div>
        <ChordNeckView candidate={selected} showIntervals={showIntervals} />
    </>;

    return <section aria-label="Chord voicings" className={styles.layout}>
        {neck === 'inline' && selected && <div className={styles.neck}>
            <div className={styles.row}><h2 className="text-lg font-semibold">Full fretboard</h2><button className={styles.action} onClick={() => setNeck(null)}>Close fretboard</button></div>
            {neckContent}
        </div>}
        {selected ? <aside className={styles.selected} aria-label="Selected voicing" data-selected-id={selected.voicing.id}>
            <div className={styles.row}><h2 className="text-2xl font-semibold">{title}</h2>
                <TogglePill comfortable hideDot className="!w-auto !px-4 !py-2" label={showIntervals ? 'Intervals' : 'Notes'} isActive={showIntervals} onToggle={onToggleIntervals} />
            </div>
            <div className={styles.hero}>
                <CompactVoicingDiagram voicing={selected.voicing} labelMode={showIntervals ? 'degree' : 'note'} />
                <div className={styles.heroInfo}>
                    <p>{position(selected)}</p>
                    <p className={styles.muted}>Bass {selected.facts.bassDegree} · Top {selected.facts.topDegree}</p>
                    <p className={styles.small}>{selected.facts.playedStrings.length} sounding strings</p>
                    <Exceptions candidate={selected} />
                    {playButton(selected, true)}
                </div>
            </div>
            {!matchesExplorationFilters(selected, filters) && <p role="status" className={styles.warning}>Selected voicing is outside these filters. Choose another to change it.</p>}
            {selectionReplaced && <p role="status" className={styles.warning}>Previous voicing is unavailable in this context. Selected the first available voicing.</p>}
            <div className={styles.details}>
                <details><summary>Details</summary><VoicingFactsView candidate={selected} /></details>
                <button className={styles.action} aria-expanded={neck !== null} onClick={() => setNeck(window.matchMedia('(min-width: 1024px)').matches ? 'inline' : 'dialog')}>Full fretboard</button>
            </div>
            {audio.error && <p role="alert" className={styles.warning}>{audio.error}</p>}
        </aside> : <div className={styles.selected}>
            {!response && <p role="status">Finding voicings…</p>}
            {response?.status === 'error' && <div role="alert"><p>{response.message}</p><button className={styles.action} onClick={onRetry}>Retry search</button></div>}
            {response?.status === 'unsupported' && <p role="status">{response.message}</p>}
            {response?.status === 'ready' && <p role="status">No candidates within this search model.</p>}
        </div>}
        <div className="min-w-0">
            <h2 className="text-lg font-semibold">Voicings</h2>
            <div className={styles.filters}>
                <button className={styles.action} aria-expanded={positionOpen} aria-controls="chord-position" onClick={() => setPositionOpen(open => !open)}>Position {filters.minFret > 0 || filters.maxFret < 15 ? `${filters.minFret}–${filters.maxFret}` : ''}</button>
                {(['bassDegree', 'topDegree'] as const).map(key => <PillField key={key} label={key === 'bassDegree' ? 'Bass' : 'Top'}
                    value={filters[key] ?? ''} onChange={value => update(key, value || null)}
                    options={[{ value: '', label: 'Any' }, ...degrees.map(degree => ({ value: degree, label: degree }))]} />)}
                <button className={styles.action} aria-expanded={moreOpen} aria-controls="chord-more-filters" onClick={() => setMoreOpen(open => !open)}>More filters</button>
            </div>
            {positionOpen && <div id="chord-position">
                <FretRangeControl min={filters.minFret} max={filters.maxFret} onChange={(minFret, maxFret) => {
                    setFilters(previous => ({ ...previous, minFret, maxFret })); setVisibleCount(EXPLORATION_START_SIZE);
                }} />
            </div>}
            {moreOpen && <div id="chord-more-filters" className={styles.filterBody}>
                <PillField label="Sounding strings" value={String(filters.stringCount ?? '')} onChange={value => update('stringCount', value ? Number(value) : null)}
                    options={[{ value: '', label: 'Any' }, ...[2, 3, 4, 5, 6].map(count => ({ value: String(count), label: String(count) }))]} />
                <PillField label="Open strings" value={filters.openStrings} onChange={value => update('openStrings', value as ExplorationFilters['openStrings'])}
                    options={[{ value: 'any', label: 'Any' }, { value: 'require', label: 'Include open strings' }, { value: 'exclude', label: 'No open strings' }]} />
                <PillField label="Root" value={filters.root} onChange={value => update('root', value as ExplorationFilters['root'])}
                    options={[{ value: 'any', label: 'Any' }, { value: 'include', label: 'Include root' }, { value: 'omit', label: 'Omit root' }]} />
                <PillField label="Formula coverage" value={filters.coverage} onChange={value => update('coverage', value as ExplorationFilters['coverage'])}
                    options={[{ value: 'any', label: 'Any' }, { value: 'complete', label: 'Complete formula' }, { value: 'omissions', label: 'With omissions' }]} />
                {context === 'standalone' && <button className={`${styles.action} col-span-2`} onClick={() => document.getElementById('chord-accompaniment')?.focus()}>For rootless shapes, enable accompaniment above</button>}
            </div>}
            {activeFilters.length > 0 && <div className={styles.chips} aria-label="Active filters">
                {activeFilters.map(key => <button className={`${styles.action} ${styles.chip}`} key={key} aria-label={`Remove ${filterLabels[key]} filter`}
                    onClick={() => update(key, DEFAULT_EXPLORATION_FILTERS[key])}>{filterLabels[key]}: {filters[key]} ×</button>)}
                <button className={styles.action} onClick={reset}>Clear all</button>
            </div>}
            {response?.status === 'ready' && <>
                <p role="status" className={styles.small}>Showing {query.visible.length} of {query.matchCount} voicings</p>
                {query.matchCount === 0 && query.totalCount > 0 && <p className={styles.warning}>No voicings match these conditions. Clear filters or change the playing context.</p>}
                <div className={styles.cards}>
                    {query.visible.map(candidate => <article key={candidate.voicing.id} className={`${styles.card} ${candidate.voicing.id === selectedId ? styles.cardSelected : ''}`}>
                        <button className={styles.cardSelect} data-voicing-id={candidate.voicing.id} aria-pressed={candidate.voicing.id === selectedId}
                            aria-label={`Select voicing, ${position(candidate)}, bass ${candidate.facts.bassDegree}, top ${candidate.facts.topDegree}`}
                            onClick={() => onSelect(candidate.voicing.id)}>
                            <div className={styles.small}>{candidate.voicing.id === selectedId ? '✓ Selected' : position(candidate)}</div>
                            <CompactVoicingDiagram voicing={candidate.voicing} labelMode={showIntervals ? 'degree' : 'note'} />
                            <div><p>{position(candidate)}</p><p className={styles.small}>{candidate.facts.playedStrings.length} strings</p>
                                <p>Bass {candidate.facts.bassDegree} · Top {candidate.facts.topDegree}</p><Exceptions candidate={candidate} /></div>
                        </button>
                        {playButton(candidate)}
                    </article>)}
                </div>
                {query.hasMore && <button className={`${styles.action} mt-4 w-full`} onClick={() => setVisibleCount(count => count + EXPLORATION_PAGE_SIZE)}>Show more</button>}
            </>}
        </div>
        {neck === 'dialog' && selected && <ChordDialog title="Full fretboard" fullscreen onClose={() => setNeck(null)}>{neckContent}</ChordDialog>}
    </section>;
}
