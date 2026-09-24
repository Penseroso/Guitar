"use client";

import React, { useEffect, useId, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import type { PresentationCandidate, ResolvedRequest, ViewRequest } from '@/domain/chord/engine/types';
import { createViewMatcher } from '@/domain/chord/engine/view';
import { diagramVoicing, midiNoteLabel, positionLabel } from '@/domain/chord/engine/presentation';
import type { EngineExploration } from './useChordExploration';
import { CompactVoicingDiagram, describeVoicingShape } from './CompactVoicingDiagram';
import { useVoicingAudio } from './useVoicingAudio';
import { ChordDialog } from './ChordDialog';
import { ChordNeckView } from './ChordNeckView';
import { ChoiceGroup, type ChordChoice } from './ChoiceGroup';
import { ChoiceRail } from './ChoiceRail';
import { FretRangeControl } from './FretRangeControl';
import { DiagramLabelSwitch } from '../shared/DiagramLabelSwitch';
import { formatChordToneLabel, formatDegreeLabel } from './tone-labels';
import styles from './chord-ui.module.css';

interface Props {
    engine: EngineExploration; context: 'standalone' | 'accompaniment';
    onContextChange: (context: 'standalone' | 'accompaniment') => void;
    onSelect?: (id: string) => void; showIntervals: boolean; onToggleIntervals: () => void;
    toneChoices: ChordChoice[]; title: string;
}
function ends(row: PresentationCandidate, request: ResolvedRequest | null) {
    const label = (end: PresentationCandidate['facts']['bass']) => request
        ? formatChordToneLabel(request.interpretation.rootPitchClass, end.tone, end.midi - request.interpretation.rootPitchClass)
        : midiNoteLabel(end.midi) + ' · ' + formatDegreeLabel(end.tone);
    return { bass: label(row.facts.bass), top: label(row.facts.top) };
}
function OmittedFormulaNote({ candidate }: { candidate: PresentationCandidate }) {
    if (candidate.facts.omittedFormula.length === 0) return null;
    return <p className={styles.small}>{!candidate.facts.rootStrings.length ? 'Root omitted · ' : ''}Omits {candidate.facts.omittedFormula.map(formatDegreeLabel).join(', ')}</p>;
}
const openOptions = [{ value: 'any', label: 'Any' }, { value: 'require', label: 'At least one' }, { value: 'exclude', label: 'None' }];
const rootOptions = [{ value: 'any', label: 'Any' }, { value: 'include', label: 'Present' }, { value: 'omit', label: 'Omitted' }];
const coverageOptions = [{ value: 'any', label: 'Any' }, { value: 'complete', label: 'All tones' }, { value: 'omissions', label: 'With omissions' }];
const defaultView: ViewRequest = { schema: 'view-v1', position: null, soundingCount: null, stringSet: null, open: 'any', root: 'any', coverage: 'any', bass: null, top: null, statuses: ['PASS', 'UNCERTAIN'], order: { kind: 'classic' } };
const toneValue = (extreme: ViewRequest['bass']) => extreme && 'tone' in extreme ? extreme.tone : '';

export function ChordExplorationPanel({ engine, context, onContextChange, onSelect, showIntervals, onToggleIntervals, toneChoices, title }: Props) {
    const [filtersOpen, setFiltersOpen] = useState(false), [neckOpen, setNeckOpen] = useState(false);
    const neckTrigger = useRef<HTMLButtonElement>(null), filtersRail = useRef<HTMLElement>(null), id = useId();
    const audio = useVoicingAudio();
    const cancelAudio = audio.cancel;
    useEffect(() => { cancelAudio(); return () => cancelAudio(); }, [cancelAudio, engine.requestEpoch]);
    useEffect(() => { if (engine.phase === 'error' || engine.phase === 'cancelled') cancelAudio(); }, [cancelAudio, engine.phase]);
    useEffect(() => {
        if (filtersOpen && window.matchMedia('(max-width: 1023px)').matches) {
            filtersRail.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        }
    }, [filtersOpen]);
    const cancelSearch = () => { cancelAudio(); engine.cancel(); };
    const { selected, view, summary } = engine, page = engine.phase === 'ready' ? engine.page : null;
    const busy = ['idle', 'loading', 'running'].includes(engine.phase);
    const degreeOptions = [{ value: '', label: 'Any' }, ...toneChoices];
    const outsideView = !!selected && !engine.selectionStale && !!engine.request && (!createViewMatcher(engine.request, view).matches(selected.candidate.states, selected.physical.status)||engine.surface==='recommended'&&!selected.recommendation.eligible);
    const chips: { label: string; value: string; clear: Partial<ViewRequest> }[] = [];
    if (view.position) chips.push({ label: 'Fret range', value: `${view.position.low}–${view.position.high}`, clear: { position: null } });
    for (const key of ['bass', 'top'] as const) if (view[key]) chips.push({ label: key === 'bass' ? 'Bass' : 'Top', value: toneChoices.find(choice => choice.value === toneValue(view[key]))?.label ?? JSON.stringify(view[key]), clear: { [key]: null } });
    if (view.soundingCount !== null) chips.push({ label: 'Strings', value: String(view.soundingCount), clear: { soundingCount: null } });
    for (const [key, label, options] of [['open', 'Open strings', openOptions], ['root', 'Root inclusion', rootOptions], ['coverage', 'Chord-tone coverage', coverageOptions]] as const) if (view[key] !== 'any') chips.push({ label, value: options.find(option => option.value === view[key])!.label, clear: { [key]: 'any' } });
    if (view.statuses.length === 1) chips.push({ label: 'Assessment', value: view.statuses[0], clear: { statuses: ['PASS', 'UNCERTAIN'] } });
    const activeFilterCount = chips.length + Number(context === 'accompaniment');
    const reset = () => engine.setView(defaultView);
    const select = (candidate: PresentationCandidate) => { engine.select(candidate); onSelect?.(candidate.candidate.allocationId); };
    const playButton = (candidate: PresentationCandidate, primary = false) => {
        const candidateId = candidate.candidate.allocationId, stale = candidate === selected && engine.selectionStale;
        return <button type="button" className={styles.action + ' ' + (primary ? styles.primary : styles.cardPlay)} disabled={stale || audio.loadingCandidateId === candidateId} aria-busy={audio.loadingCandidateId === candidateId}
            aria-label={(primary ? 'Play voicing: ' : 'Play: ') + describeVoicingShape(diagramVoicing(candidate))} data-play-id={candidateId} onClick={() => { if (!stale) { select(candidate); void audio.play(candidate); } }}>
            <Play size={16} aria-hidden="true" />{primary ? audio.loadingCandidateId === candidateId ? 'Loading…' : 'Play voicing' : <span className={styles.srOnly}>Play</span>}
        </button>;
    };
    const selectedEnds = selected ? ends(selected, engine.request) : null;
    return <section aria-label="Chord voicings" className={styles.layout} data-filters-open={filtersOpen}>
        <div className={styles.panelToolbar} style={{ gridColumn: '1 / -1' }}>
            <ChoiceGroup label="Voicing surface" segmented value={engine.surface} options={[{ value: 'recommended', label: 'Recommended' }, { value: 'all', label: 'All voicings' }]} onChange={value => engine.setSurface(value as 'recommended' | 'all')} />
            <DiagramLabelSwitch caption="Diagram labels" showIntervals={showIntervals} onToggle={onToggleIntervals} />
        </div>
        {engine.error && <div role="alert" className={styles.warning} style={{ gridColumn: '1 / -1' }}><p>{engine.error.message}</p><button className={styles.action} onClick={engine.retry}>Retry search</button></div>}
        {selected ? <aside className={styles.selected} aria-label="Selected voicing" data-selected-id={selected.candidate.allocationId} data-selection-stale={engine.selectionStale}>
            <div className={styles.hero}><CompactVoicingDiagram voicing={diagramVoicing(selected)} labelMode={showIntervals ? 'degree' : 'note'} /><div className={styles.heroInfo}>
                <h2 className="text-2xl font-semibold">{title}</h2><p className={styles.small}>{selected.candidate.sounding.map(note => midiNoteLabel(note.midi)).join(' · ')}</p><p className={styles.small}>{positionLabel(selected)}</p><div className={styles.endNotes}><p>Bass {selectedEnds!.bass}</p><p>Top {selectedEnds!.top}</p></div>{playButton(selected, true)}</div></div>
            <OmittedFormulaNote candidate={selected} />
            {engine.selectionStale && <p role="status" className={styles.warning}>Previous selection awaits validation for this request. Playback is unavailable.</p>}
            {outsideView && <p role="status" className={styles.warning}>Selected voicing is outside this surface or these filters. Choose another to change it.</p>}
            {engine.selectionNotice && <p role="status" className={styles.warning}>{engine.selectionNotice}</p>}
            <div className={styles.selectedTools}>
                <button ref={neckTrigger} className={styles.action} aria-haspopup="dialog" onClick={() => setNeckOpen(true)}>Full fretboard</button>
            </div>
        </aside> : <div className={styles.selected}>{busy && <p role="status">Finding voicings…</p>}{engine.selectionNotice && <p role="status" className={styles.warning}>{engine.selectionNotice}</p>}{page?.outcome === 'structurally-empty' && <p role="status">No allocations satisfy this structural request.</p>}</div>}
        <div className={styles.browser}>
            <div className={styles.row}><h2 className="text-lg font-semibold">Voicings</h2><button className={styles.action} aria-expanded={filtersOpen} aria-controls={id + '-filters'} onClick={() => setFiltersOpen(open => !open)}>Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}</button></div>
            {context === 'accompaniment' && <div className={styles.chips}><button className={styles.action + ' ' + styles.chip} aria-label="Exclude accompaniment shapes" onClick={() => onContextChange('standalone')}>Accompaniment included ×</button></div>}
            {chips.length > 0 && <div className={styles.chips} aria-label="Active filters">{chips.map(chip => <button className={styles.action + ' ' + styles.chip} key={chip.label} aria-label={`Remove ${chip.label} filter`} onClick={() => engine.setView(chip.clear)}>{chip.label}: {chip.value} ×</button>)}<button className={styles.action} onClick={reset}>Clear filters</button></div>}
            {!page && summary?.completeness === 'partial' && <p role="status" aria-live="polite">At least {summary.matching} matching voicings found; search incomplete.</p>}
            {busy && <button className={styles.action} onClick={cancelSearch}>Cancel search</button>}
            {engine.phase === 'paused' && <div role="status"><p>Search paused at its time budget. Counts are incomplete.</p><button className={styles.action} onClick={() => engine.continueSearch()}>Continue search</button><button className={styles.action} onClick={cancelSearch}>Cancel search</button></div>}
            {engine.phase === 'cancelled' && <div role="status"><p>Search cancelled. No exact result has been committed.</p><button className={styles.action} onClick={engine.retry}>Retry search</button></div>}
            {page && <><h3 className={styles.small} aria-live="polite" data-results-count={page.summary.matching}>{page.summary.matching} matching voicings · {page.rows.length} on this page</h3>
                {page.outcome==='no-matches'&&engine.surface==='recommended'&&<p>No voicings meet this recommendation policy for these filters. <button className={styles.action} onClick={()=>engine.setSurface('all')}>All voicings</button></p>}
                {page.outcome === 'no-matches' && <div className={styles.empty} role="status"><p>No voicings match these conditions.</p>{context === 'standalone' && (view.root === 'omit' || view.soundingCount === 2) && <><p>Accompaniment permits an optional root and a two-tone floor; required identity tones still apply.</p><button className={styles.action} onClick={() => onContextChange('accompaniment')}>Enable accompaniment</button></>}<button className={styles.action} onClick={reset}>Reset conditions</button></div>}
                <div className={styles.cards}>{page.rows.map(candidate => { const labels = ends(candidate, engine.request), candidateId = candidate.candidate.allocationId, isSelected = candidateId === selected?.candidate.allocationId;
                    return <article key={candidateId} className={styles.card + (isSelected ? ' ' + styles.cardSelected : '')}><button className={styles.cardSelect} data-voicing-id={candidateId} aria-pressed={isSelected} aria-label={'Select voicing: ' + describeVoicingShape(diagramVoicing(candidate))} onClick={() => select(candidate)}>
                        <CompactVoicingDiagram voicing={diagramVoicing(candidate)} labelMode={showIntervals ? 'degree' : 'note'} /><div className={styles.cardInfo}>{isSelected && <span className={styles.selectionMark}>✓ Selected</span>}<p>{positionLabel(candidate)}</p><p className={styles.small}>{candidate.facts.soundingCount} strings</p><div className={styles.endNotes}><p>Bass {labels.bass}</p><p>Top {labels.top}</p></div><OmittedFormulaNote candidate={candidate} /></div>
                    </button>{playButton(candidate)}</article>;
                })}</div><nav aria-label="Voicing result pages" className={styles.row}><button className={styles.action} onClick={engine.firstPage}>First page</button><button className={styles.action} disabled={!engine.canPrevious} onClick={engine.previousPage}>Previous page</button><button className={styles.action} disabled={!page.summary.hasMore || !page.nextCursor} onClick={engine.nextPage}>Next page</button></nav>
            </>}
        </div>
        {filtersOpen && <aside ref={filtersRail} id={id + '-filters'} className={styles.filtersRail} aria-label="Filters">
            <FretRangeControl min={view.position?.low ?? 0} max={view.position?.high ?? 15} onChange={(low, high) => engine.setView({ position: low === 0 && high === 15 ? null : { low, high } })} />
            <div className={styles.accompaniment}><label className={styles.contextSwitch}><input type="checkbox" checked={context === 'accompaniment'} aria-describedby={id + '-context-help'} onChange={event => onContextChange(event.target.checked ? 'accompaniment' : 'standalone')} /><span className={styles.switchTrack} aria-hidden="true" /><span>Include accompaniment shapes</span></label>
                <p id={id + '-context-help'} className={styles.small}>Optional root · two-tone minimum · identity tones retained</p></div>
            <ChoiceRail label="Bass" value={toneValue(view.bass)} options={degreeOptions} onChange={value => engine.setView({ bass: value ? { tone: value } : null })} />
            <ChoiceRail label="Top" value={toneValue(view.top)} options={degreeOptions} onChange={value => engine.setView({ top: value ? { tone: value } : null })} />
            <ChoiceRail label="Sounding strings" value={String(view.soundingCount ?? '')} expandAny options={[...[2, 3, 4, 5, 6].map(count => ({ value: String(count), label: String(count) })), { value: '', label: 'Any' }]} onChange={value => engine.setView({ soundingCount: value ? Number(value) : null })} />
            <ChoiceRail label="Open strings" value={view.open} options={openOptions} onChange={value => engine.setView({ open: value as ViewRequest['open'] })} />
            <ChoiceRail label="Root inclusion" value={view.root} options={rootOptions} onChange={value => engine.setView({ root: value as ViewRequest['root'] })} />
            <ChoiceRail label="Chord-tone coverage" value={view.coverage} options={coverageOptions} onChange={value => engine.setView({ coverage: value as ViewRequest['coverage'] })} />
            <ChoiceRail label="Physical assessment" value={view.statuses.length === 2 ? 'both' : view.statuses[0]} options={[{ value: 'both', label: 'Both' }, { value: 'PASS', label: 'PASS' }, { value: 'UNCERTAIN', label: 'UNCERTAIN' }]} onChange={value => engine.setView({ statuses: value === 'both' ? ['PASS', 'UNCERTAIN'] : [value as 'PASS' | 'UNCERTAIN'] })} />
            <p className={styles.small}>Bass = lowest · Top = highest · All tones = complete formula · With omissions = partial formula</p>
        </aside>}
        {audio.error && <p role="alert" className={styles.warning}>{audio.error}</p>}
        {neckOpen && selected && <ChordDialog title="Full fretboard" returnFocusRef={neckTrigger} onClose={() => setNeckOpen(false)}><div className={styles.row}><p>{title} · {positionLabel(selected)}</p>{playButton(selected, true)}</div>{engine.request ? <ChordNeckView candidate={selected} rootPitchClass={engine.request.interpretation.rootPitchClass} showIntervals={showIntervals} /> : <p role="status">Waiting for the current request to validate this snapshot.</p>}{audio.error && <p role="alert" className={styles.warning}>{audio.error}</p>}</ChordDialog>}
    </section>;
}
