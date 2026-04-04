"use client";

import React, { useEffect, useMemo, useState } from 'react';

import { getNoteName } from '../../utils/guitar/logic';
import {
    getProgressionLinksForChord,
    getRankedVoicingsForChord,
    getRelatedScaleSuggestionsForChord,
    resolveChordRegistryEntry,
    type ProgressionHandoffPayload,
    type VoicingCandidate,
} from '../../utils/guitar/chords';
import { CompactVoicingDiagram } from './chord-preview/CompactVoicingDiagram';
import { ChordProgressionHintsPanel } from './chord-preview/ChordProgressionHintsPanel';
import { ChordRelatedScalesPanel } from './chord-preview/ChordRelatedScalesPanel';
import {
    getBridgeSelectionKey,
    getReasonPreview,
    resolveBridgeSelection,
    type ActiveVoicingChangePayload,
} from './chord-preview/bridge';

interface ChordVoicingViewportProps {
    chordType: string;
    selectedKey: number;
    activeCandidateId?: string | null;
    onActiveVoicingChange?: (payload: ActiveVoicingChangePayload) => void;
    onPrepareProgressionHandoff?: (payload: ProgressionHandoffPayload) => void;
}

function buildChordLabel(chordType: string, selectedKey: number): string {
    try {
        const entry = resolveChordRegistryEntry(chordType);
        const root = getNoteName(selectedKey);
        return entry.symbol ? `${root}${entry.symbol}` : `${root} ${entry.displayName}`;
    } catch {
        return `${getNoteName(selectedKey)} ${chordType}`;
    }
}

function renderDegreeList(
    title: string,
    degrees: string[] | undefined,
    emptyLabel: string,
    tone: 'default' | 'warning' | 'danger' = 'default'
) {
    const toneClassName = tone === 'danger'
        ? 'text-rose-200'
        : tone === 'warning'
            ? 'text-amber-200'
            : 'text-white/75';

    return (
        <div className="flex flex-col gap-1 rounded-2xl border border-white/5 bg-black/20 px-3 py-3">
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">{title}</span>
            <span className={`text-xs font-semibold ${toneClassName}`}>
                {degrees && degrees.length > 0 ? degrees.join(' · ') : emptyLabel}
            </span>
        </div>
    );
}

function renderViewportShell(
    title: string,
    description: string,
    body: React.ReactNode
) {
    return (
        <div className="rounded-[2rem] border border-white/5 bg-[#050505] p-6 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
                <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/30">Future Engine Chord Preview</span>
                <h3 className="text-2xl font-black tracking-tight text-white">{title}</h3>
                <p className="max-w-3xl text-sm text-white/55">{description}</p>
            </div>
            {body}
        </div>
    );
}

function buildSelectionSummary(
    activeCandidate: VoicingCandidate,
    activeIndex: number,
    candidateCount: number
): string {
    const templateLabel = activeCandidate.voicing.template?.label ?? 'Unnamed shape';
    const positionLabel = activeCandidate.voicing.rootFret !== undefined
        ? `@ ${activeCandidate.voicing.rootFret}fr`
        : 'open position';
    const rankLabel = `#${activeIndex + 1} of ${candidateCount}`;

    return `${templateLabel} ${positionLabel} · ${rankLabel}`;
}

export function ChordVoicingViewport({
    chordType,
    selectedKey,
    activeCandidateId,
    onActiveVoicingChange,
    onPrepareProgressionHandoff,
}: ChordVoicingViewportProps) {
    const selectionKey = useMemo(() => getBridgeSelectionKey(chordType, selectedKey), [chordType, selectedKey]);
    const [internalSelection, setInternalSelection] = useState<{
        selectionKey: string;
        candidateId: string | null;
    }>({
        selectionKey,
        candidateId: null,
    });

    const { candidates, errorMessage } = useMemo(() => {
        try {
            return {
                candidates: getRankedVoicingsForChord(chordType, selectedKey, {
                    maxRootFret: 15,
                    maxCandidates: 4,
                }),
                errorMessage: null,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown future-engine resolution error.';

            return {
                candidates: [] as VoicingCandidate[],
                errorMessage: message,
            };
        }
    }, [chordType, selectedKey]);

    const requestedCandidateId = activeCandidateId ?? (
        internalSelection.selectionKey === selectionKey ? internalSelection.candidateId : null
    );
    const selection = useMemo(
        () => resolveBridgeSelection(candidates, requestedCandidateId),
        [candidates, requestedCandidateId]
    );

    useEffect(() => {
        onActiveVoicingChange?.({
            ...selection,
            candidateCount: candidates.length,
            chordType,
            selectedKey,
        });
    }, [candidates.length, chordType, onActiveVoicingChange, selectedKey, selection]);

    const chordLabel = buildChordLabel(chordType, selectedKey);
    const relatedScaleSuggestions = useMemo(
        () => getRelatedScaleSuggestionsForChord(chordType),
        [chordType]
    );
    const progressionContext = useMemo(
        () => getProgressionLinksForChord(chordType, selectedKey),
        [chordType, selectedKey]
    );

    const workspaceContextKey = `${selectionKey}::${selection.activeCandidateId ?? 'none'}`;
    const [workspaceSelection, setWorkspaceSelection] = useState<{
        contextKey: string;
        activeScaleId: string | null;
        activeHintId: string | null;
    }>({
        contextKey: workspaceContextKey,
        activeScaleId: null,
        activeHintId: null,
    });

    const activeScaleId = workspaceSelection.contextKey === workspaceContextKey
        ? workspaceSelection.activeScaleId
        : null;
    const activeHintId = workspaceSelection.contextKey === workspaceContextKey
        ? workspaceSelection.activeHintId
        : null;

    if (errorMessage) {
        return renderViewportShell(
            chordLabel,
            'The future-engine preview could not resolve a ranked voicing set. The legacy gallery remains available below while this bridge surface fails closed.',
            <div className="rounded-[1.5rem] border border-rose-500/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
                <span className="font-black uppercase tracking-[0.2em] text-[10px] text-rose-200/80">Preview Fallback</span>
                <p className="mt-2 text-rose-100/85">{errorMessage}</p>
            </div>
        );
    }

    if (!selection.activeCandidate) {
        return renderViewportShell(
            chordLabel,
            'No future-engine candidates are currently available for this chord. The legacy gallery below remains the active chord-mode browser while the preview has nothing ranked to inspect.',
            <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.03] px-4 py-4 text-sm text-white/65">
                Try another key or chord family to repopulate the preview surface.
            </div>
        );
    }

    const activeCandidate = selection.activeCandidate;
    const conciseReasons = getReasonPreview(activeCandidate.reasons, 3);
    const defaultSelectionLabel = selection.selectionSource === 'requested'
        ? 'Manual future-preview selection'
        : selection.selectionSource === 'first-playable'
            ? 'Defaulted to first playable candidate'
            : 'Defaulted to first ranked fallback';

    const handleSelectCandidate = (candidateId: string) => {
        if (activeCandidateId === undefined) {
            setInternalSelection({
                selectionKey,
                candidateId,
            });
        }
    };
    const handleScaleSelect = (scaleId: string) => {
        setWorkspaceSelection((current) => ({
            contextKey: workspaceContextKey,
            activeScaleId: scaleId,
            activeHintId: current.contextKey === workspaceContextKey ? current.activeHintId : null,
        }));
    };
    const handleHintSelect = (hintId: string) => {
        setWorkspaceSelection((current) => ({
            contextKey: workspaceContextKey,
            activeScaleId: current.contextKey === workspaceContextKey ? current.activeScaleId : null,
            activeHintId: hintId,
        }));
    };

    return (
        <div className="rounded-[2rem] border border-white/5 bg-[#050505] p-6 flex flex-col gap-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/30">Future Engine Chord Preview</span>
                    <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                        <h3 className="text-3xl font-black text-white tracking-tight">{chordLabel}</h3>
                        <span className="pb-1 text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                            {candidates.length} ranked voicings
                        </span>
                    </div>
                    <p className="max-w-3xl text-sm text-white/55">
                        Future-engine ranking is intentionally separate from the legacy gallery below. This bridge previews future-domain voicings without forcing index-level sync to the active chord-mode flow.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-[0.25em] ${
                        activeCandidate.voicing.playable
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                    }`}>
                        {activeCandidate.voicing.playable ? 'Playable' : 'Fallback Candidate'}
                    </span>
                    <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-[9px] font-black uppercase tracking-[0.25em] text-white/65">
                        {selection.hasPlayableCandidates ? 'Playable set available' : 'No playable set yet'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)] gap-6">
                <div className="rounded-[1.5rem] border border-white/5 bg-[#0a0a0a] p-4 flex items-center justify-center">
                    <CompactVoicingDiagram voicing={activeCandidate.voicing} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-4 flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">Selected Voicing</span>
                                <span className="text-sm font-black text-white">
                                    {buildSelectionSummary(activeCandidate, selection.activeIndex, candidates.length)}
                                </span>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
                                Score {activeCandidate.score}
                            </span>
                        </div>

                        <div className="rounded-2xl border border-white/5 bg-black/20 px-3 py-3">
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">Selection Policy</span>
                            <p className="mt-1 text-xs font-semibold text-white/70">{defaultSelectionLabel}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {renderDegreeList('Missing Required', activeCandidate.voicing.missingRequiredDegrees, 'None', 'danger')}
                            {renderDegreeList('Omitted Optional', activeCandidate.voicing.omittedOptionalDegrees, 'None', 'warning')}
                            {renderDegreeList('Matched Required', activeCandidate.matchedRequiredDegrees, 'None')}
                            <div className="flex flex-col gap-1 rounded-2xl border border-white/5 bg-black/20 px-3 py-3">
                                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">Shape</span>
                                <span className="text-xs font-semibold text-white/75">
                                    Span {activeCandidate.voicing.span} · {activeCandidate.voicing.template?.label ?? 'Unnamed template'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-4 flex flex-col gap-3">
                        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">Ranking Snapshot</span>
                        <div className="flex flex-col gap-2">
                            {conciseReasons.map((reason) => (
                                <div key={reason} className="text-xs text-white/70 border border-white/5 bg-black/20 rounded-xl px-3 py-2">
                                    {reason}
                                </div>
                            ))}
                            {conciseReasons.length === 0 && (
                                <div className="text-xs text-white/45 border border-white/5 bg-black/20 rounded-xl px-3 py-2">
                                    No concise ranking notes were generated for this candidate.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {candidates.map((candidate, index) => {
                    const isSelected = candidate.voicing.id === selection.activeCandidateId;
                    const isDefaultCandidate = selection.selectionSource !== 'requested' && candidate.voicing.id === selection.activeCandidateId;

                    return (
                        <button
                            key={candidate.voicing.id}
                            onClick={() => handleSelectCandidate(candidate.voicing.id)}
                            className={`text-left rounded-[1.25rem] border p-4 transition-all ${
                                isSelected
                                    ? 'border-white/30 bg-white/10'
                                    : 'border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-black text-white">{candidate.voicing.template?.label ?? 'Unnamed template'}</span>
                                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                                        {candidate.voicing.rootFret ?? 0}fr · #{index + 1}
                                    </span>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-[10px] font-black text-white/60">{candidate.score}</span>
                                    {index === 0 && (
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">Top ranked</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 text-[11px] text-white/60">
                                <span>
                                    {(candidate.voicing.missingRequiredDegrees?.length ?? 0) > 0
                                        ? `Missing ${candidate.voicing.missingRequiredDegrees?.join(', ')}`
                                        : 'Required tones intact'}
                                </span>
                                <span>
                                    {(candidate.voicing.omittedOptionalDegrees?.length ?? 0) > 0
                                        ? `Optional omissions: ${candidate.voicing.omittedOptionalDegrees?.join(', ')}`
                                        : 'No optional omissions'}
                                </span>
                                {isDefaultCandidate && (
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/80">
                                        Bridge default
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChordRelatedScalesPanel
                    rootPitchClass={selectedKey}
                    suggestions={relatedScaleSuggestions}
                    activeScaleId={activeScaleId}
                    onScaleSelect={handleScaleSelect}
                />
                <ChordProgressionHintsPanel
                    context={progressionContext}
                    activeHintId={activeHintId}
                    onHintSelect={handleHintSelect}
                    onPrepareHandoff={onPrepareProgressionHandoff}
                />
            </div>
        </div>
    );
}
