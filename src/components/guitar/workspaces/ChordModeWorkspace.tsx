"use client";

import React from 'react';

import { Fretboard } from '../../Fretboard';
import { ChordGallery } from '../ChordGallery';
import { ChordVoicingViewport } from '../ChordVoicingViewport';
import { VOICING_RANKING_MODES, type ProgressionHandoffPayload, type VoicingCandidate, type VoicingRankingMode } from '../../../utils/guitar/chords';
import type { ChordShape, Fingering } from '../../../utils/guitar/types';
import { getVoicingPresentationMeta } from '../chord-preview/voicing-labels';

interface ChordSelectorOption {
    id: string;
    stateValue: string;
    label: string;
    description: string;
}

interface ChordModeWorkspaceProps {
    chordType: string;
    onChordTypeChange: (value: string) => void;
    chordSelectorOptions: ChordSelectorOption[];
    chordPreviewTitle: string;
    activeFutureCandidate?: VoicingCandidate | null;
    activeFuturePresentation: ReturnType<typeof getVoicingPresentationMeta>;
    futureVoicingSelection: {
        activeCandidateId: string | null;
        selectionSource: 'requested' | 'first-playable' | 'first-ranked' | 'none';
    };
    fretboardContainerRef: React.RefObject<HTMLDivElement | null>;
    tuning: number[];
    activeNotes: number[];
    rootNote: number;
    chordTones: number[];
    modifierNotes: number[];
    showChordTones: boolean;
    showIntervals: boolean;
    fingering?: Fingering[];
    voicingRankingMode: VoicingRankingMode;
    onVoicingRankingModeChange: (mode: VoicingRankingMode) => void;
    voicingSourceFilter: 'all' | 'legacy-import' | 'generated';
    onVoicingSourceFilterChange: (value: 'all' | 'legacy-import' | 'generated') => void;
    voicingRootFilter: 'all' | '6' | '5' | '4';
    onVoicingRootFilterChange: (value: 'all' | '6' | '5' | '4') => void;
    visibleFutureVoicingCandidates: VoicingCandidate[];
    futureVoicingCandidates: VoicingCandidate[];
    onSelectFutureVoicing: (candidateId: string) => void;
    activeFutureVoicingId: string | null;
    activeSelectedScaleId?: string | null;
    onActiveVoicingChange: (payload: {
        activeCandidateId: string | null;
        chordType: string;
        selectedKey: number;
    }) => void;
    onScaleSelect: (scaleId: string) => void;
    onPrepareProgressionHandoff: (payload: ProgressionHandoffPayload) => void;
    selectedKey: number;
    tonalContext: {
        selectedKey: number;
        tonicPitchClass?: number;
        scaleGroup: string;
        scaleName: string;
    };
    activePreparedChordWorkspaceHandoff: ProgressionHandoffPayload | null;
    activeStagedProgression?: {
        applied?: boolean;
        applyMode: 'replace' | 'append' | 'insert-after-focus' | 'stage-only';
    } | null;
    activeDraftApplyMode: 'replace' | 'append' | 'insert-after-focus' | 'stage-only';
    onSelectDraftApplyMode: (applyMode: 'replace' | 'append' | 'insert-after-focus' | 'stage-only') => void;
    onApplyPreparedChordWorkspaceHandoff: () => void;
    onOpenProgressionWorkspace: () => void;
    onClearPreparedChordWorkspaceHandoff: () => void;
    availableVoicings: ChordShape[];
    voicingIndex: number;
    onLegacyVoicingChange: (index: number) => void;
}

export function ChordModeWorkspace({
    chordType,
    onChordTypeChange,
    chordSelectorOptions,
    chordPreviewTitle,
    activeFutureCandidate,
    activeFuturePresentation,
    futureVoicingSelection,
    fretboardContainerRef,
    tuning,
    activeNotes,
    rootNote,
    chordTones,
    modifierNotes,
    showChordTones,
    showIntervals,
    fingering,
    voicingRankingMode,
    onVoicingRankingModeChange,
    voicingSourceFilter,
    onVoicingSourceFilterChange,
    voicingRootFilter,
    onVoicingRootFilterChange,
    visibleFutureVoicingCandidates,
    futureVoicingCandidates,
    onSelectFutureVoicing,
    activeFutureVoicingId,
    activeSelectedScaleId,
    onActiveVoicingChange,
    onScaleSelect,
    onPrepareProgressionHandoff,
    selectedKey,
    tonalContext,
    activePreparedChordWorkspaceHandoff,
    activeStagedProgression,
    activeDraftApplyMode,
    onSelectDraftApplyMode,
    onApplyPreparedChordWorkspaceHandoff,
    onOpenProgressionWorkspace,
    onClearPreparedChordWorkspaceHandoff,
    availableVoicings,
    voicingIndex,
    onLegacyVoicingChange,
}: ChordModeWorkspaceProps) {
    return (
        <div className="relative z-10 w-full mt-4 flex flex-col gap-8">
            <div className="rounded-[2rem] border border-white/5 bg-[#050505] p-6 flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                    <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/30">Chord Type</span>
                    <div className="flex flex-wrap gap-2">
                        {chordSelectorOptions.map((option) => {
                            const isActive = chordType === option.stateValue;

                            return (
                                <button
                                    key={option.id}
                                    onClick={() => onChordTypeChange(option.stateValue)}
                                    className={`rounded-xl border px-4 py-3 text-left transition-all ${
                                        isActive
                                            ? 'border-cyan-200/50 bg-cyan-300/[0.12] text-cyan-50'
                                            : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white'
                                    }`}
                                >
                                    <div className="text-sm font-black">{option.label}</div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">{option.description}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] overflow-hidden">
                    <div className="px-6 py-5 flex flex-col gap-4 border-b border-white/5 xl:flex-row xl:items-end xl:justify-between">
                        <div className="flex flex-col gap-2">
                            <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/30">Chord</span>
                            <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                                <h3 className="text-3xl font-black text-white tracking-tight">{chordPreviewTitle}</h3>
                                <span className="pb-1 text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
                                    {activeFuturePresentation.primaryLabel}
                                </span>
                                {(activeFuturePresentation.familyLabel || activeFuturePresentation.secondaryLabel) && (
                                    <span className="pb-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/28">
                                        {activeFuturePresentation.familyLabel ?? activeFuturePresentation.secondaryLabel}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {futureVoicingSelection.selectionSource !== 'requested' && activeFutureCandidate && (
                                <span className="px-3 py-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] text-[9px] font-black uppercase tracking-[0.25em] text-emerald-200">
                                    Recommended
                                </span>
                            )}
                            {activeFutureCandidate && (
                                <span className={`px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-[0.25em] ${
                                    activeFutureCandidate.voicing.playable
                                        ? 'border-cyan-300/20 bg-cyan-400/[0.05] text-cyan-100/80'
                                        : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                                }`}>
                                    {activeFutureCandidate.voicing.playable ? 'Playable' : 'Alternate'}
                                </span>
                            )}
                            {activeFuturePresentation.sourceLabel && (
                                <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-[9px] font-black uppercase tracking-[0.25em] text-white/65">
                                    {activeFuturePresentation.sourceLabel}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="border-y border-white/5 py-8 flex items-center justify-center relative overflow-hidden bg-white/[0.01]">
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
                    </div>

                    <div className="px-6 py-5 flex flex-col gap-4">
                        <div className="flex flex-col gap-3 rounded-[1.25rem] border border-white/5 bg-black/20 p-4">
                            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/30">Exploration Mode</span>
                                    <span className="text-sm font-semibold text-white">Rank the same chord for a different playing context.</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {VOICING_RANKING_MODES.map((modeOption) => (
                                        <button
                                            key={modeOption}
                                            onClick={() => onVoicingRankingModeChange(modeOption)}
                                            className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                                                voicingRankingMode === modeOption
                                                    ? 'border-cyan-200/40 bg-cyan-300/[0.12] text-cyan-50'
                                                    : 'border-white/10 bg-white/[0.03] text-white/65 hover:border-white/20 hover:text-white'
                                            }`}
                                        >
                                            {modeOption.replace('-', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {(['all', 'legacy-import', 'generated'] as const).map((sourceOption) => (
                                    <button
                                        key={sourceOption}
                                        onClick={() => onVoicingSourceFilterChange(sourceOption)}
                                        className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] transition-all ${
                                            voicingSourceFilter === sourceOption
                                                ? 'border-white/25 bg-white/10 text-white'
                                                : 'border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:text-white'
                                        }`}
                                    >
                                        {sourceOption === 'all' ? 'All sources' : sourceOption === 'legacy-import' ? 'Legacy import' : 'Generated'}
                                    </button>
                                ))}
                                {(['all', '6', '5', '4'] as const).map((rootOption) => (
                                    <button
                                        key={rootOption}
                                        onClick={() => onVoicingRootFilterChange(rootOption)}
                                        className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] transition-all ${
                                            voicingRootFilter === rootOption
                                                ? 'border-white/25 bg-white/10 text-white'
                                                : 'border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:text-white'
                                        }`}
                                    >
                                        {rootOption === 'all' ? 'All roots' : `${rootOption}th-string root`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/30">Voicing</span>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/25">
                                {visibleFutureVoicingCandidates.length} of {futureVoicingCandidates.length} choices
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {visibleFutureVoicingCandidates.map((candidate) => {
                                const presentation = getVoicingPresentationMeta(candidate.voicing);
                                const isActive = candidate.voicing.id === activeFutureVoicingId;
                                const isRecommended = futureVoicingSelection.selectionSource !== 'requested'
                                    && candidate.voicing.id === activeFutureVoicingId;

                                return (
                                    <button
                                        key={candidate.voicing.id}
                                        onClick={() => onSelectFutureVoicing(candidate.voicing.id)}
                                        className={`text-left rounded-[1.25rem] border p-4 transition-all ${
                                            isActive
                                                ? 'border-white/30 bg-white/10'
                                                : 'border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-black text-white">{presentation.primaryLabel}</span>
                                                {(presentation.familyLabel || presentation.secondaryLabel) && (
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                                                        {presentation.familyLabel ?? presentation.secondaryLabel}
                                                    </span>
                                                )}
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/28">
                                                    {candidate.voicing.rootFret ?? 0}fr · {candidate.voicing.playable ? 'Playable' : 'Alternate'}
                                                </span>
                                                {candidate.voicing.omittedOptionalDegrees && candidate.voicing.omittedOptionalDegrees.length > 0 && (
                                                    <span className="text-[10px] text-white/45">
                                                        Omits {candidate.voicing.omittedOptionalDegrees.join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                {presentation.sourceLabel && (
                                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/60">
                                                        {presentation.sourceLabel}
                                                    </span>
                                                )}
                                                {isRecommended && (
                                                    <span className="rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200">
                                                        Recommended
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {visibleFutureVoicingCandidates.length === 0 && (
                            <div className="rounded-[1.25rem] border border-white/5 bg-white/[0.02] px-4 py-4 text-sm text-white/55">
                                No candidates match the current filters.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ChordVoicingViewport
                chordType={chordType}
                selectedKey={selectedKey}
                rankingMode={voicingRankingMode}
                candidates={futureVoicingCandidates}
                activeCandidateId={activeFutureVoicingId}
                onActiveVoicingChange={onActiveVoicingChange}
                activeScaleId={activeSelectedScaleId}
                onScaleSelect={onScaleSelect}
                onPrepareProgressionHandoff={onPrepareProgressionHandoff}
                tonalContext={tonalContext}
            />
            {activePreparedChordWorkspaceHandoff && (
                <div className="rounded-[1.5rem] border border-emerald-400/15 bg-emerald-400/[0.05] px-5 py-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black uppercase tracking-[0.28em] text-emerald-200/70">
                            {activeStagedProgression?.applied ? 'Progression Applied' : 'Progression Ready'}
                        </span>
                        <span className="text-sm font-semibold text-emerald-50">{activePreparedChordWorkspaceHandoff.title}</span>
                        <span className="text-xs text-emerald-50/75">
                            {activePreparedChordWorkspaceHandoff.degrees.join(' -> ')} · {activePreparedChordWorkspaceHandoff.summary}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/55">
                            Relative to tonic: {activePreparedChordWorkspaceHandoff.relativeDegree} · {activePreparedChordWorkspaceHandoff.roleLabel}
                        </span>
                    </div>
                    <div className="flex flex-col gap-3 xl:items-end">
                        <div className="flex flex-wrap gap-2">
                            {(['replace', 'append', 'insert-after-focus', 'stage-only'] as const).map((applyMode) => (
                                <button
                                    key={applyMode}
                                    onClick={() => onSelectDraftApplyMode(applyMode)}
                                    className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                                        activeDraftApplyMode === applyMode
                                            ? 'border-emerald-100/60 bg-emerald-200/15 text-emerald-50'
                                            : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white'
                                    }`}
                                >
                                    {applyMode === 'replace'
                                        ? 'Replace'
                                        : applyMode === 'append'
                                            ? 'Append'
                                            : applyMode === 'insert-after-focus'
                                                ? 'Insert After Focus'
                                                : 'Stage Only'}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onApplyPreparedChordWorkspaceHandoff}
                                className="rounded-xl border border-emerald-200/40 bg-emerald-200/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-50 transition-all hover:border-emerald-100/60 hover:bg-emerald-200/15"
                            >
                                {activeDraftApplyMode === 'stage-only'
                                    ? 'Keep Staged'
                                    : (activeStagedProgression?.applied ? 'Apply Again' : 'Apply to Progression')}
                            </button>
                            <button
                                onClick={onOpenProgressionWorkspace}
                                className="rounded-xl border border-cyan-200/30 bg-cyan-200/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-50 transition-all hover:border-cyan-100/60 hover:bg-cyan-200/15"
                            >
                                Open Progression
                            </button>
                            <button
                                onClick={onClearPreparedChordWorkspaceHandoff}
                                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/70 transition-all hover:border-white/20 hover:text-white"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <details className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] overflow-hidden">
                <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4 text-white/70 hover:text-white transition-colors">
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black uppercase tracking-[0.28em] text-white/30">Legacy Voicings</span>
                        <span className="text-sm font-semibold">Open reference gallery</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/30">fallback / reference</span>
                </summary>
                <div className="px-5 pb-5 pt-2 border-t border-white/5">
                    <ChordGallery
                        availableVoicings={availableVoicings}
                        selectedKey={selectedKey}
                        voicingIndex={voicingIndex}
                        onVoicingChange={onLegacyVoicingChange}
                    />
                </div>
            </details>
        </div>
    );
}
