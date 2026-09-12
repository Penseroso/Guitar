"use client";

import React, { useId, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import {
    DEFAULT_EXPLORATION_FILTERS, EXPLORATION_PAGE_SIZE, EXPLORATION_START_SIZE,
    matchesExplorationFilters, midiNoteLabel, queryExploration,
    type ChordPlayingContext, type ExplorationCandidate, type ExplorationFilters,
} from '@/domain/chord/exploration';
import type { ExplorationWorkerResponse } from './chord-exploration.worker';
import { CompactVoicingDiagram, describeVoicingShape } from './CompactVoicingDiagram';
import { useVoicingAudio } from './useVoicingAudio';
import { ChordDialog } from './ChordDialog';
import { ChordNeckView } from './ChordNeckView';
import { ChoiceGroup, type ChordChoice } from './ChoiceGroup';
import { ChoiceRail } from './ChoiceRail';
import { FretRangeControl } from './FretRangeControl';
import { formatChordToneLabel, formatDegreeLabel } from './tone-labels';
import styles from './chord-ui.module.css';

interface Props {
    context: ChordPlayingContext;
    onContextChange: (context: ChordPlayingContext) => void;
    response: ExplorationWorkerResponse | null;
    onRetry: () => void;
    selectedId: string | null;
    onSelect: (id: string) => void;
    showIntervals: boolean;
    onToggleIntervals: () => void;
    toneChoices: ChordChoice[];
    title: string;
    selectionReplaced?: boolean;
}

function position(candidate: ExplorationCandidate) {
    const { minStoppedFret: min, maxStoppedFret: max } = candidate.facts;
    return max ? min === max ? 'Fret ' + min : 'Frets ' + min + '–' + max : 'Open strings only';
}

function ends(candidate: ExplorationCandidate) {
    const root = candidate.voicing.chord.rootPitchClass;
    return {
        bass: formatChordToneLabel(root, candidate.facts.bassDegree, candidate.facts.bassMidi - root),
        top: formatChordToneLabel(root, candidate.facts.topDegree, candidate.facts.topMidi - root),
    };
}

function Exceptions({ candidate }: { candidate: ExplorationCandidate }) {
    return <>
        {candidate.facts.omittedDegrees.length > 0 && <p className={styles.warning}>
            {!candidate.facts.hasRoot ? 'Rootless · ' : ''}Omits {candidate.facts.omittedDegrees.map(formatDegreeLabel).join(', ')}
        </p>}
        {candidate.assessment.status === 'uncertain' && <p className={styles.warning}>Check reach on your guitar</p>}
    </>;
}

export function VoicingFactsView({ candidate }: { candidate: ExplorationCandidate }) {
    const { facts, assessment } = candidate;
    return <div className={styles.facts}>
        <p>Sounds: {facts.midiNotes.map(midiNoteLabel).join(' · ')}</p>
        <p>Degrees: {facts.degrees.map(formatDegreeLabel).join(', ')} · {facts.omittedDegrees.length ? 'Omits ' + facts.omittedDegrees.map(formatDegreeLabel).join(', ') : 'Complete formula'}</p>
        <p>{facts.openStringCount} open strings · Reach {Math.round(facts.spanMm)} mm</p>
        <p>Estimated finger groups: {assessment.estimatedFingerGroups}. Comfort depends on your hand and technique.</p>
        {!facts.hasRoot && <p className={styles.warning}>Other parts or musical context supply the omitted root.</p>}
        <p className={styles.small}>Standard tuning · search frets 0–15</p>
        <p className={styles.small}>Ranking model assumptions</p>
        <ul className="list-disc pl-4">{candidate.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>
    </div>;
}

const filterLabels: Record<keyof ExplorationFilters, string> = {
    minFret: 'Min fret', maxFret: 'Max fret', bassDegree: 'Bass', topDegree: 'Top', stringCount: 'Strings',
    root: 'Root inclusion', openStrings: 'Open strings', coverage: 'Chord-tone coverage',
};
const openOptions = [{ value: 'any', label: 'Any' }, { value: 'require', label: 'At least one' }, { value: 'exclude', label: 'None' }];
const rootOptions = [{ value: 'any', label: 'Any' }, { value: 'include', label: 'Present' }, { value: 'omit', label: 'Omitted' }];
const coverageOptions = [{ value: 'any', label: 'Any' }, { value: 'complete', label: 'All tones' }, { value: 'omissions', label: 'With omissions' }];

export function ChordExplorationPanel({ context, onContextChange, response, onRetry, selectedId, onSelect, showIntervals,
    onToggleIntervals, toneChoices, title, selectionReplaced }: Props) {
    const [filters, setFilters] = useState<ExplorationFilters>({ ...DEFAULT_EXPLORATION_FILTERS });
    const [visibleCount, setVisibleCount] = useState(EXPLORATION_START_SIZE);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [neckOpen, setNeckOpen] = useState(false);
    const resultHeading = useRef<HTMLHeadingElement>(null);
    const id = useId();
    const audio = useVoicingAudio();
    const candidates = response?.status === 'ready' ? response.candidates : [];
    const query = queryExploration(candidates, filters, visibleCount);
    const selected = candidates.find(candidate => candidate.voicing.id === selectedId);
    const activeFilters = (Object.keys(filters) as (keyof ExplorationFilters)[])
        .filter(key => key !== 'minFret' && key !== 'maxFret' && filters[key] !== DEFAULT_EXPLORATION_FILTERS[key]);
    const positionActive = filters.minFret !== 0 || filters.maxFret !== 15;
    const degreeOptions = [{ value: '', label: 'Any' }, ...toneChoices];
    function update<K extends keyof ExplorationFilters>(key: K, value: ExplorationFilters[K]) {
        setFilters(previous => ({ ...previous, [key]: value }));
        setVisibleCount(EXPLORATION_START_SIZE);
    }
    function reset() { setFilters({ ...DEFAULT_EXPLORATION_FILTERS }); setVisibleCount(EXPLORATION_START_SIZE); }
    function play(candidate: ExplorationCandidate) { onSelect(candidate.voicing.id); void audio.play(candidate); }
    function filterValue(key: keyof ExplorationFilters) {
        const value = filters[key];
        if (key === 'bassDegree' || key === 'topDegree') return toneChoices.find(choice => choice.value === value)?.label;
        const options = key === 'root' ? rootOptions : key === 'openStrings' ? openOptions : key === 'coverage' ? coverageOptions : [];
        return options.find(option => option.value === value)?.label ?? String(value);
    }
    const playButton = (candidate: ExplorationCandidate, primary = false) => <button type="button"
        className={styles.action + ' ' + (primary ? styles.primary : styles.cardPlay)}
        disabled={audio.loadingCandidateId === candidate.voicing.id}
        aria-label={(primary ? 'Play voicing: ' : 'Play: ') + describeVoicingShape(candidate.voicing)}
        aria-busy={audio.loadingCandidateId === candidate.voicing.id}
        data-play-id={candidate.voicing.id} onClick={() => play(candidate)}>
        <Play size={16} aria-hidden="true" />
        {primary ? audio.loadingCandidateId === candidate.voicing.id ? 'Loading…' : 'Play voicing' : <span className={styles.srOnly}>Play</span>}
    </button>;
    const selectedEnds = selected ? ends(selected) : null;

    return <section aria-label="Chord voicings" className={styles.layout}>
        {selected ? <aside className={styles.selected} aria-label="Selected voicing" data-selected-id={selected.voicing.id}>
            <div className={styles.hero}>
                <CompactVoicingDiagram voicing={selected.voicing} labelMode={showIntervals ? 'degree' : 'note'} />
                <div className={styles.heroInfo}>
                    <h2 className="text-2xl font-semibold">{title}</h2>
                    <p className={styles.small}>{position(selected)}</p>
                    <div className={styles.endNotes}><p>Bass {selectedEnds!.bass}</p><p>Top {selectedEnds!.top}</p></div>
                    {playButton(selected, true)}
                </div>
            </div>
            <Exceptions candidate={selected} />
            {!matchesExplorationFilters(selected, filters) && <p role="status" className={styles.warning}>Selected voicing is outside these filters. Choose another to change it.</p>}
            {selectionReplaced && <p role="status" className={styles.warning}>Previous voicing is unavailable in this context. Selected the first available voicing.</p>}
            <div className={styles.selectedTools}>
                <button className={styles.action} aria-expanded={detailsOpen} aria-controls={id + '-details'} onClick={() => setDetailsOpen(open => !open)}>Details</button>
                <button className={styles.action} aria-haspopup="dialog" onClick={() => setNeckOpen(true)}>Full fretboard</button>
                <ChoiceGroup label="Diagram labels" compact value={showIntervals ? 'degree' : 'note'}
                    onChange={value => { if ((value === 'degree') !== showIntervals) onToggleIntervals(); }}
                    options={[{ value: 'note', label: 'Notes' }, { value: 'degree', label: 'Intervals' }]} />
            </div>
            {detailsOpen && <div id={id + '-details'} className={styles.details}><VoicingFactsView candidate={selected} /></div>}
        </aside> : <div className={styles.selected}>
            {!response && <p role="status">Finding voicings…</p>}
            {response?.status === 'error' && <div role="alert"><p>{response.message}</p><button className={styles.action} onClick={onRetry}>Retry search</button></div>}
            {response?.status === 'unsupported' && <p role="status">{response.message}</p>}
            {response?.status === 'ready' && <p role="status">No candidates within this search model.</p>}
        </div>}
        <div className={styles.browser}>
            <div className={styles.row}>
                <h2 className="text-lg font-semibold">Voicings</h2>
                <button className={styles.action} aria-expanded={filtersOpen} aria-controls={id + '-filters'}
                    onClick={() => setFiltersOpen(open => !open)}>Filters{activeFilters.length + Number(context === 'accompaniment') ? ' (' + (activeFilters.length + Number(context === 'accompaniment')) + ')' : ''}</button>
            </div>
            <FretRangeControl min={filters.minFret} max={filters.maxFret} onChange={(minFret, maxFret) => {
                setFilters(previous => ({ ...previous, minFret, maxFret })); setVisibleCount(EXPLORATION_START_SIZE);
            }} />
            {filtersOpen && <div id={id + '-filters'}>
                <div className={styles.filterBody}>
                    <div className={styles.accompaniment}>
                        <label className={styles.contextSwitch}>
                            <input type="checkbox" checked={context === 'accompaniment'} aria-describedby={id + '-context-help'}
                                onChange={event => onContextChange(event.target.checked ? 'accompaniment' : 'standalone')} />
                            <span className={styles.switchTrack} aria-hidden="true" />
                            <span>Include accompaniment shapes</span>
                        </label>
                        <p id={id + '-context-help'} className={styles.small}>Adds rootless and two-note voicings for playing with a bass player or other instruments.</p>
                    </div>
                    <ChoiceRail label="Bass" value={filters.bassDegree ?? ''} options={degreeOptions} onChange={value => update('bassDegree', value || null)} />
                    <ChoiceRail label="Top" value={filters.topDegree ?? ''} options={degreeOptions} onChange={value => update('topDegree', value || null)} />
                    <ChoiceRail label="Sounding strings" value={String(filters.stringCount ?? '')} expandAny
                        options={[...[2, 3, 4, 5, 6].map(count => ({ value: String(count), label: String(count) })), { value: '', label: 'Any' }]}
                        onChange={value => update('stringCount', value ? Number(value) : null)} />
                    <ChoiceRail label="Open strings" value={filters.openStrings} options={openOptions}
                        onChange={value => update('openStrings', value as ExplorationFilters['openStrings'])} />
                    <ChoiceRail label="Root inclusion" value={filters.root} options={rootOptions}
                        onChange={value => update('root', value as ExplorationFilters['root'])} />
                    <ChoiceRail label="Chord-tone coverage" value={filters.coverage} options={coverageOptions}
                        onChange={value => update('coverage', value as ExplorationFilters['coverage'])} />
                </div>
                <p className={styles.small}>Bass is the lowest sounding note; Top is the highest. All tones means the complete chord formula. With omissions means at least one tone is absent.</p>
                <button className={styles.resultsLink} onClick={() => {
                    setFiltersOpen(false);
                    requestAnimationFrame(() => { resultHeading.current?.focus({ preventScroll: true }); resultHeading.current?.scrollIntoView({ block: 'nearest' }); });
                }}>View results{response?.status === 'ready' ? ' (' + query.matchCount + ')' : ''}</button>
            </div>}
            {context === 'accompaniment' && <div className={styles.chips}>
                <button className={styles.action + ' ' + styles.chip} aria-label="Exclude accompaniment shapes"
                    onClick={() => onContextChange('standalone')}>Accompaniment included ×</button>
            </div>}
            {(activeFilters.length > 0 || positionActive) && <div className={styles.chips} aria-label="Active filters">
                {activeFilters.map(key => <button className={styles.action + ' ' + styles.chip} key={key}
                    aria-label={'Remove ' + filterLabels[key] + ' filter'} onClick={() => update(key, DEFAULT_EXPLORATION_FILTERS[key])}>
                    {filterLabels[key]}: {filterValue(key)} ×
                </button>)}
                <button className={styles.action} onClick={reset}>Clear filters</button>
            </div>}
            {response?.status === 'ready' && <>
                <h3 ref={resultHeading} tabIndex={-1} className={styles.small} aria-live="polite" data-results-count={query.matchCount}>
                    {query.matchCount} voicings · {query.visible.length} shown
                </h3>
                {query.matchCount === 0 && query.totalCount > 0 && <div className={styles.empty} role="status">
                    <p>No voicings match these conditions.</p>
                    {context === 'standalone' && (filters.root === 'omit' || filters.stringCount === 2) && <>
                        <p>Accompaniment allows rootless and two-note shapes when other parts supply the harmony.</p>
                        <button className={styles.action} onClick={() => onContextChange('accompaniment')}>Enable accompaniment</button>
                    </>}
                    <button className={styles.action} onClick={reset}>Reset conditions</button>
                </div>}
                <div className={styles.cards}>
                    {query.visible.map(candidate => {
                        const labels = ends(candidate);
                        return <article key={candidate.voicing.id} className={styles.card + (candidate.voicing.id === selectedId ? ' ' + styles.cardSelected : '')}>
                            <button className={styles.cardSelect} data-voicing-id={candidate.voicing.id} aria-pressed={candidate.voicing.id === selectedId}
                                aria-label={'Select voicing: ' + describeVoicingShape(candidate.voicing)} onClick={() => onSelect(candidate.voicing.id)}>
                                <CompactVoicingDiagram voicing={candidate.voicing} labelMode={showIntervals ? 'degree' : 'note'} />
                                <div className={styles.cardInfo}>
                                    {candidate.voicing.id === selectedId && <span className={styles.selectionMark}>✓ Selected</span>}
                                    <p>{position(candidate)}</p>
                                    <p className={styles.small}>{candidate.facts.playedStrings.length} strings</p>
                                    <div className={styles.endNotes}><p>Bass {labels.bass}</p><p>Top {labels.top}</p></div>
                                    <Exceptions candidate={candidate} />
                                </div>
                            </button>
                            {playButton(candidate)}
                        </article>;
                    })}
                </div>
                {query.hasMore && <button className={styles.action + ' ' + styles.showMore} onClick={() => setVisibleCount(count => count + EXPLORATION_PAGE_SIZE)}>Show more</button>}
            </>}
        </div>
        {audio.error && <p role="alert" className={styles.warning}>{audio.error}</p>}
        {neckOpen && selected && <ChordDialog title="Full fretboard" onClose={() => setNeckOpen(false)}>
            <div className={styles.row}><p>{title} · {position(selected)}</p>{playButton(selected, true)}</div>
            <ChordNeckView candidate={selected} showIntervals={showIntervals} />
            {audio.error && <p role="alert" className={styles.warning}>{audio.error}</p>}
        </ChordDialog>}
    </section>;
}
