"use client";

import React from 'react';

import { Fretboard } from '../../Fretboard';
import { ChordVoicingViewport } from '../ChordVoicingViewport';
import { type ProgressionHandoffPayload, type VoicingCandidate } from '../../../utils/guitar/chords';
import type { Fingering } from '../../../utils/guitar/types';
import { getVoicingPresentationMeta } from '../chord-preview/voicing-labels';

interface ChordSelectorOption {
    id: string;
    stateValue: string;
    label: string;
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
}: ChordModeWorkspaceProps) {
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
                    <div className="flex flex-wrap gap-1.5">
                        {chordSelectorOptions.map((option) => {
                            const isActive = chordType === option.stateValue;

                            return (
                                <button
                                    key={option.id}
                                    onClick={() => onChordTypeChange(option.stateValue)}
                                    className={`rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] transition-all ${
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

                <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] overflow-hidden">
                    <div className="px-6 py-5 flex flex-col gap-4 border-b border-white/5 xl:flex-row xl:items-end xl:justify-between">
                        <div className="flex flex-col gap-2">
                            <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/30">Chord</span>
                            <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                                <h3 className="text-3xl font-black text-white tracking-tight">{chordPreviewTitle}</h3>
                                <span className="pb-1 text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
                                    {activeFutureCandidate ? activeFuturePresentation.primaryLabel : 'No voicing available'}
                                </span>
                                {activeFutureCandidate && (activeFuturePresentation.familyLabel || activeFuturePresentation.secondaryLabel) && (
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
                                {futureVoicingCandidates.length} choices
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {futureVoicingCandidates.map((candidate) => {
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
                        {futureVoicingCandidates.length === 0 && (
                            <div className="rounded-[1.25rem] border border-white/5 bg-white/[0.02] px-4 py-4 text-sm text-white/55">
                                No playable voicing candidates found for this chord yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ChordVoicingViewport
                chordType={chordType}
                selectedKey={selectedKey}
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
        </div>
    );
}
