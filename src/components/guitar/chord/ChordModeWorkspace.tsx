"use client";

import React from 'react';

import { Fretboard } from '../shared/Fretboard';
import { TogglePill } from '../../ui/design-system/TogglePill';
import { CompactVoicingDiagram } from './CompactVoicingDiagram';
import { getCompleteChordWindow, getVoicingTechniqueTag, type VoicingCandidate, type VoicingTechniqueTag } from '@/domain/chord';
import type { Fingering } from '@/domain/shared/types';
import { getCompleteChordWindowName, getVoicingPresentationMeta } from './voicing-labels';

// Presentational order (easiest/most-familiar to most-specialized), not the classification
// priority deductiveRanking.ts uses to break ties when a voicing qualifies for more than one tag.
// 'standard' (deductiveRanking.ts's fallback for "none of the other three") is deliberately not
// a filterable category here — it isn't a technique a player sets out to pick, so it's just left
// mixed into "All" rather than given its own button (and rankedVoicingSearch.ts doesn't reserve
// it shelf space in the candidate selection either — see GUARANTEED_TECHNIQUES there).
const TECHNIQUE_SECTION_ORDER: Exclude<VoicingTechniqueTag, 'standard'>[] = ['open', 'barre', 'shell'];
const TECHNIQUE_SECTION_LABELS: Record<Exclude<VoicingTechniqueTag, 'standard'>, string> = {
    open: 'Open',
    barre: 'Barre',
    shell: 'Shell',
};

interface ChordSelectorOption {
    id: string;
    stateValue: string;
    label: string;
}

interface ChordSelectorGroup {
    id: string;
    label: string;
    options: ChordSelectorOption[];
}

interface ChordModeWorkspaceProps {
    chordType: string;
    onChordTypeChange: (value: string) => void;
    chordSelectorGroups: ChordSelectorGroup[];
    chordPreviewTitle: string;
    activeFutureCandidate?: VoicingCandidate | null;
    activeFuturePresentation: ReturnType<typeof getVoicingPresentationMeta>;
    fretboardContainerRef: React.RefObject<HTMLDivElement | null>;
    tuning: number[];
    activeNotes: number[];
    rootNote: number;
    chordTones: number[];
    modifierNotes: number[];
    showChordTones: boolean;
    showIntervals: boolean;
    onToggleIntervals: () => void;
    fingering?: Fingering[];
    futureVoicingCandidates: VoicingCandidate[];
    onSelectFutureVoicing: (candidateId: string) => void;
    activeFutureVoicingId: string | null;
}

export function ChordModeWorkspace({
    chordType,
    onChordTypeChange,
    chordSelectorGroups,
    chordPreviewTitle,
    activeFutureCandidate,
    activeFuturePresentation,
    fretboardContainerRef,
    tuning,
    activeNotes,
    rootNote,
    chordTones,
    modifierNotes,
    showChordTones,
    showIntervals,
    onToggleIntervals,
    fingering,
    futureVoicingCandidates,
    onSelectFutureVoicing,
    activeFutureVoicingId,
}: ChordModeWorkspaceProps) {
    const getCandidateMetaLabel = React.useCallback((candidate: VoicingCandidate) => {
        const segments: string[] = [];

        if (candidate.voicing.rootFret !== undefined) {
            segments.push(`${candidate.voicing.rootFret}fr`);
        }

        segments.push(`span ${candidate.voicing.span}`);

        if (candidate.voicing.omittedOptionalDegrees && candidate.voicing.omittedOptionalDegrees.length > 0) {
            const omitted = candidate.voicing.omittedOptionalDegrees.join(', ');
            segments.push(
                candidate.voicing.omittedOptionalDegrees.length > 1
                    ? `omits ${omitted}`
                    : `omit ${omitted}`
            );
        }

        return segments.join(' · ');
    }, []);

    const groupedByTechnique = React.useMemo(() => {
        const groups = new Map<VoicingTechniqueTag, VoicingCandidate[]>();
        for (const candidate of futureVoicingCandidates) {
            const tag = getVoicingTechniqueTag(candidate.voicing);
            const list = groups.get(tag) ?? [];
            list.push(candidate);
            groups.set(tag, list);
        }
        return TECHNIQUE_SECTION_ORDER
            .map((tag) => ({ tag, candidates: groups.get(tag) ?? [] }))
            .filter((section) => section.candidates.length > 0);
    }, [futureVoicingCandidates]);

    // A voicing's registral footprint (consecutiveStringWindow, "does this cover the chord's
    // entire formula on N consecutive strings" — see getCompleteChordWindow) is a fact independent
    // of its technique tag, but the filter row treats it as a fully separate view, not something
    // that combines with a technique selection — one filter is active at a time, same as Open/
    // Barre/Shell are mutually exclusive with each other. Composing them (e.g. "Barre voicings
    // that are also triads") sounds appealing but made every count in the row context-dependent
    // and confusing to reason about; a single active filter keeps every button's count simple and
    // always exactly matches what's rendered. Grouped by size (not just "3") since a 7th chord's
    // complete window is 4 strings ("Quad"), not 3 — see getCompleteChordWindowName.
    const groupedByWindowSize = React.useMemo(() => {
        const groups = new Map<number, VoicingCandidate[]>();
        for (const candidate of futureVoicingCandidates) {
            const window = getCompleteChordWindow(candidate.voicing);
            if (!window) {
                continue;
            }
            const list = groups.get(window.size) ?? [];
            list.push(candidate);
            groups.set(window.size, list);
        }
        return [...groups.entries()]
            .sort(([a], [b]) => a - b)
            .map(([size, candidates]) => ({ size, candidates }));
    }, [futureVoicingCandidates]);

    const [selectedFilter, setSelectedFilter] = React.useState<VoicingTechniqueTag | 'all' | number>('all');
    // Falls back to 'all' in render (rather than via an effect) whenever the current chord's
    // candidates no longer support the previously selected filter — e.g. switching to a chord
    // type with no barre-technique shapes while "Barre" was selected, or no window of that size
    // while a window-size filter was selected.
    const effectiveFilter =
        (typeof selectedFilter === 'string' && selectedFilter !== 'all' && !groupedByTechnique.some((section) => section.tag === selectedFilter))
        || (typeof selectedFilter === 'number' && !groupedByWindowSize.some((section) => section.size === selectedFilter))
            ? 'all'
            : selectedFilter;
    const visibleCandidates = effectiveFilter === 'all'
        ? futureVoicingCandidates
        : typeof effectiveFilter === 'number'
            ? groupedByWindowSize.find((section) => section.size === effectiveFilter)?.candidates ?? []
            : groupedByTechnique.find((section) => section.tag === effectiveFilter)?.candidates ?? [];

    const hasEngineCandidates = futureVoicingCandidates.length > 0;
    const chordWorkspaceEmptyMessage = !hasEngineCandidates
        ? 'No playable voicing candidates found for this chord yet.'
        : !activeFutureCandidate
            ? 'No active voicing candidate is available right now.'
            : null;

    return (
        <div className="relative z-10 w-full mt-4 flex flex-col gap-8">
            <div className="rounded-[2rem] border border-white/5 bg-[#050505] p-6 flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/30">Chord Type</span>
                    <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] px-4 py-4">
                        <div className="flex flex-wrap items-start gap-3">
                            {chordSelectorGroups.map((group, index) => (
                                <div
                                    key={group.id}
                                    className={`min-w-[9rem] flex-1 basis-[12rem] ${index > 0 ? 'border-l border-white/5 pl-3' : ''} flex flex-col gap-2`}
                                >
                                    <span className="text-[9px] font-black uppercase tracking-[0.24em] text-white/32">{group.label}</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {group.options.map((option) => {
                                            const isActive = chordType === option.stateValue;

                                            return (
                                                <button
                                                    key={option.id}
                                                    onClick={() => onChordTypeChange(option.stateValue)}
                                                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold leading-none transition-all ${
                                                        isActive
                                                            ? 'border-cyan-200/45 bg-cyan-300/[0.1] text-cyan-50'
                                                            : 'border-white/10 bg-white/[0.02] text-white/65 hover:border-white/20 hover:text-white'
                                                    }`}
                                                >
                                                    {option.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] overflow-hidden">
                    <div className="px-6 py-5 flex flex-col gap-4 border-b border-white/5 xl:flex-row xl:items-end xl:justify-between">
                        <div className="flex flex-col gap-2">
                            <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/30">Chord</span>
                            <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                                <h3 className="text-3xl font-black text-white tracking-tight">{chordPreviewTitle}</h3>
                                <span className="pb-1 text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
                                    {activeFutureCandidate ? activeFuturePresentation.primaryLabel : 'No voicing available'}
                                </span>
                                {activeFutureCandidate && activeFuturePresentation.secondaryLabel && (
                                    <span className="pb-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/28">
                                        {activeFuturePresentation.secondaryLabel}
                                    </span>
                                )}
                                {activeFutureCandidate && activeFuturePresentation.techniqueLabel && (
                                    <span className="mb-1 inline-flex items-center rounded-full border border-cyan-200/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200/70">
                                        {activeFuturePresentation.techniqueLabel}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <TogglePill
                                label={showIntervals ? 'Labels: Intervals' : 'Labels: Notes'}
                                isActive={showIntervals}
                                onToggle={onToggleIntervals}
                                hideDot={true}
                                className="px-3 py-1.5"
                            />
                        </div>
                    </div>

                    <div className="border-y border-white/5 py-8 flex items-center justify-center relative overflow-hidden bg-white/[0.01]">
                        {activeFutureCandidate && fingering ? (
                            <div ref={fretboardContainerRef} className="overflow-x-auto overflow-y-hidden custom-scrollbar relative w-full flex justify-center py-2">
                                <Fretboard
                                    tuning={tuning}
                                    activeNotes={activeNotes}
                                    rootNote={rootNote}
                                    chordTones={chordTones}
                                    modifierNotes={modifierNotes}
                                    showChordTones={showChordTones}
                                    showIntervals={showIntervals}
                                    fingering={fingering}
                                    doubleStops={[]}
                                />
                            </div>
                        ) : (
                            <div className="w-full max-w-2xl rounded-[1.5rem] border border-white/5 bg-white/[0.03] px-6 py-10 text-center">
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">Voicing State</span>
                                <p className="mt-3 text-sm font-semibold text-white">
                                    {chordWorkspaceEmptyMessage ?? 'No voicing candidate is available.'}
                                </p>
                                <p className="mt-2 text-xs text-white/55">
                                    Try another chord type or key to explore another engine-derived candidate.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="px-6 py-5 flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/30">Voicing</span>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/25">
                                {visibleCandidates.length} choices
                            </span>
                        </div>

                        {(groupedByTechnique.length > 1 || groupedByWindowSize.length > 0) && (
                            <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                    onClick={() => setSelectedFilter('all')}
                                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold leading-none transition-all ${
                                        effectiveFilter === 'all'
                                            ? 'border-cyan-200/45 bg-cyan-300/[0.1] text-cyan-50'
                                            : 'border-white/10 bg-white/[0.02] text-white/65 hover:border-white/20 hover:text-white'
                                    }`}
                                >
                                    All
                                </button>
                                {groupedByTechnique.map(({ tag, candidates }) => (
                                    <button
                                        key={tag}
                                        onClick={() => setSelectedFilter(tag)}
                                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold leading-none transition-all ${
                                            effectiveFilter === tag
                                                ? 'border-cyan-200/45 bg-cyan-300/[0.1] text-cyan-50'
                                                : 'border-white/10 bg-white/[0.02] text-white/65 hover:border-white/20 hover:text-white'
                                        }`}
                                    >
                                        {TECHNIQUE_SECTION_LABELS[tag]} · {candidates.length}
                                    </button>
                                ))}

                                {groupedByWindowSize.map(({ size, candidates }) => (
                                    <button
                                        key={size}
                                        onClick={() => setSelectedFilter(size)}
                                        title={`${size} consecutive strings covering the chord's entire formula — a separate view, not combined with a technique filter`}
                                        className={`ml-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold leading-none transition-all ${
                                            effectiveFilter === size
                                                ? 'border-amber-200/45 bg-amber-300/[0.1] text-amber-50'
                                                : 'border-white/10 bg-white/[0.02] text-white/65 hover:border-white/20 hover:text-white'
                                        }`}
                                    >
                                        {getCompleteChordWindowName(size)} · {candidates.length}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                            {visibleCandidates.map((candidate) => {
                                const presentation = getVoicingPresentationMeta(candidate.voicing);
                                const isActive = candidate.voicing.id === activeFutureVoicingId;

                                return (
                                    <button
                                        key={candidate.voicing.id}
                                        onClick={() => onSelectFutureVoicing(candidate.voicing.id)}
                                        className={`text-left rounded-[1rem] border px-3 py-3 transition-all ${
                                            isActive
                                                ? 'border-cyan-100/35 bg-white/[0.08] shadow-[0_0_0_1px_rgba(186,230,253,0.08)]'
                                                : 'border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        <div className="flex h-full flex-col gap-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/28">
                                                    {candidate.voicing.rootFret !== undefined ? `${candidate.voicing.rootFret}fr` : 'Open'}
                                                </span>
                                            </div>
                                            <div className="flex min-h-[10.5rem] items-center justify-center rounded-[0.9rem] border border-white/6 bg-[#070707] px-2 py-3">
                                                <CompactVoicingDiagram
                                                    voicing={candidate.voicing}
                                                    labelMode={showIntervals ? 'degree' : 'note'}
                                                />
                                            </div>
                                            <div className="min-w-0 flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[13px] font-bold leading-tight text-white">{presentation.primaryLabel}</span>
                                                </div>
                                                {presentation.secondaryLabel && (
                                                    <span className="text-[10px] leading-tight text-white/52">{presentation.secondaryLabel}</span>
                                                )}
                                                <span className="text-[10px] leading-tight text-white/38">
                                                    {getCandidateMetaLabel(candidate)}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {futureVoicingCandidates.length === 0 && (
                            <div className="rounded-[1.25rem] border border-white/5 bg-white/[0.02] px-4 py-4 text-sm text-white/55">
                                No playable voicing candidates found for this chord yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
