"use client";

import React, { useEffect, useMemo, useState } from 'react';

import { getNoteName } from '../../utils/guitar/logic';
import {
    getProgressionLinksForChord,
    getRankedVoicingsForChord,
    getRelatedScaleSuggestionsForChord,
    interpretChordAgainstTonalCenter,
    resolveChordRegistryEntry,
    type HarmonicTonalContext,
    type ProgressionHandoffPayload,
    type VoicingCandidate,
    type VoicingRankingMode,
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
import { getVoicingPresentationMeta } from './chord-preview/voicing-labels';

interface ChordVoicingViewportProps {
    chordType: string;
    selectedKey: number;
    rankingMode?: VoicingRankingMode;
    candidates?: VoicingCandidate[];
    activeCandidateId?: string | null;
    activeScaleId?: string | null;
    onActiveVoicingChange?: (payload: ActiveVoicingChangePayload) => void;
    onScaleSelect?: (scaleId: string) => void;
    onPrepareProgressionHandoff?: (payload: ProgressionHandoffPayload) => void;
    tonalContext?: HarmonicTonalContext;
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
                <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/30">Chord Context</span>
                <h3 className="text-2xl font-black tracking-tight text-white">{title}</h3>
                <p className="max-w-3xl text-sm text-white/55">{description}</p>
            </div>
            {body}
        </div>
    );
}

function buildSelectionSummary(primaryLabel: string, rootFret?: number): string {
    return rootFret !== undefined
        ? `${primaryLabel} · ${rootFret}fr position`
        : `${primaryLabel} · Open position`;
}

export function ChordVoicingViewport({
    chordType,
    selectedKey,
    rankingMode = 'balanced',
    candidates: providedCandidates,
    activeCandidateId,
    activeScaleId,
    onActiveVoicingChange,
    onScaleSelect,
    onPrepareProgressionHandoff,
    tonalContext,
}: ChordVoicingViewportProps) {
    const selectionKey = useMemo(() => getBridgeSelectionKey(chordType, selectedKey), [chordType, selectedKey]);

    const { candidates, errorMessage } = useMemo(() => {
        if (providedCandidates) {
            return {
                candidates: providedCandidates,
                errorMessage: null,
            };
        }

        try {
            return {
                candidates: getRankedVoicingsForChord(chordType, selectedKey, {
                    maxRootFret: 15,
                    maxCandidates: 12,
                    rankingMode,
                }),
                errorMessage: null,
            };
        } catch (error) {
            return {
                candidates: [],
                errorMessage: error instanceof Error ? error.message : 'Unknown future-engine resolution error.',
            };
        }
    }, [chordType, providedCandidates, rankingMode, selectedKey]);

    const selection = useMemo(
        () => resolveBridgeSelection(candidates, activeCandidateId ?? null),
        [activeCandidateId, candidates]
    );

    useEffect(() => {
        onActiveVoicingChange?.({
            ...selection,
            candidateCount: candidates.length,
            chordType,
            selectedKey,
        });
    }, [candidates.length, chordType, onActiveVoicingChange, selectedKey, selection]);

    const harmonicInterpretation = useMemo(() => interpretChordAgainstTonalCenter(chordType, selectedKey, {
        selectedKey,
        tonicPitchClass: tonalContext?.tonicPitchClass ?? tonalContext?.selectedKey ?? selectedKey,
        scaleGroup: tonalContext?.scaleGroup ?? 'Diatonic Modes',
        scaleName: tonalContext?.scaleName ?? 'Ionian',
    }), [chordType, selectedKey, tonalContext]);
    const chordLabel = buildChordLabel(chordType, selectedKey);
    const relatedScaleSuggestions = useMemo(
        () => getRelatedScaleSuggestionsForChord(chordType, tonalContext, selectedKey),
        [chordType, tonalContext, selectedKey]
    );
    const progressionContext = useMemo(
        () => getProgressionLinksForChord(chordType, selectedKey, tonalContext),
        [chordType, selectedKey, tonalContext]
    );

    const workspaceContextKey = `${selectionKey}::${selection.activeCandidateId ?? 'none'}`;
    const [workspaceSelection, setWorkspaceSelection] = useState<{
        contextKey: string;
        activeHintId: string | null;
    }>({
        contextKey: workspaceContextKey,
        activeHintId: null,
    });

    const activeHintId = workspaceSelection.contextKey === workspaceContextKey
        ? workspaceSelection.activeHintId
        : null;

    if (errorMessage) {
        return renderViewportShell(
            chordLabel,
            'No playable voicing could be resolved for this chord.',
            <div className="rounded-[1.5rem] border border-rose-500/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
                <span className="font-black uppercase tracking-[0.2em] text-[10px] text-rose-200/80">Voicing Status</span>
                <p className="mt-2 text-rose-100/85">{errorMessage}</p>
            </div>
        );
    }

    if (!selection.activeCandidate) {
        return renderViewportShell(
            chordLabel,
            'No voicing candidates are available for this chord yet.',
            <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.03] px-4 py-4 text-sm text-white/65">
                Try another key or chord type.
            </div>
        );
    }

    const activeCandidate = selection.activeCandidate;
    const activePresentation = getVoicingPresentationMeta(activeCandidate.voicing);
    const conciseReasons = getReasonPreview(activeCandidate.reasons, 3);
    const defaultSelectionLabel = selection.selectionSource === 'requested'
        ? 'Selected manually'
        : selection.selectionSource === 'first-playable'
            ? 'Default playable voicing'
            : 'Default ranked voicing';

    return (
        <div className="rounded-[2rem] border border-white/5 bg-[#050505] p-6 flex flex-col gap-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/30">Interpretation</span>
                    <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                        <h3 className="text-2xl font-black text-white tracking-tight">{chordLabel}</h3>
                        <span className="pb-1 text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                            Current voicing
                        </span>
                    </div>
                    <p className="max-w-3xl text-sm text-white/55">
                        Root {harmonicInterpretation.chordRootNoteName} against tonic {harmonicInterpretation.tonicNoteName}.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-[0.25em] ${
                        activeCandidate.voicing.playable
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                    }`}>
                        {activeCandidate.voicing.playable ? 'Playable' : 'Alternate'}
                    </span>
                    <span className="px-3 py-1.5 rounded-full border border-cyan-300/20 bg-cyan-400/[0.05] text-[9px] font-black uppercase tracking-[0.25em] text-cyan-100/80">
                        {harmonicInterpretation.roleLabel}
                    </span>
                    <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-[9px] font-black uppercase tracking-[0.25em] text-white/65">
                        {rankingMode.replace('-', ' ')} mode
                    </span>
                    {selection.selectionSource !== 'requested' && (
                        <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-[9px] font-black uppercase tracking-[0.25em] text-white/65">
                            Recommended
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-4">
                <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-4 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">Voicing</span>
                            <span className="text-sm font-black text-white">
                                {buildSelectionSummary(activePresentation.primaryLabel, activeCandidate.voicing.rootFret)}
                            </span>
                            {(activePresentation.familyLabel || activePresentation.secondaryLabel) && (
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                                    {activePresentation.familyLabel ?? activePresentation.secondaryLabel}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                            {activePresentation.sourceLabel && (
                                <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.25em] text-white/65">
                                    {activePresentation.sourceLabel}
                                </div>
                            )}
                            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.25em] text-white/65">
                                {defaultSelectionLabel}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.05] px-3 py-3">
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-cyan-100/70">Function</span>
                            <div className="mt-1 text-sm font-semibold text-cyan-50">{harmonicInterpretation.relativeDegree} · {harmonicInterpretation.roleLabel}</div>
                            <p className="mt-1 text-xs text-cyan-50/80">{harmonicInterpretation.summary}</p>
                        </div>
                        <div className="flex flex-col gap-1 rounded-2xl border border-white/5 bg-black/20 px-3 py-3">
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">Voicing Details</span>
                            <span className="text-xs font-semibold text-white/75">
                                {activePresentation.primaryLabel} · {activeCandidate.voicing.rootFret ?? 0}fr start
                            </span>
                            <span className="text-xs text-white/55">
                                Span {activeCandidate.voicing.span}
                            </span>
                        </div>
                        {renderDegreeList('Missing required tones', activeCandidate.voicing.missingRequiredDegrees, 'None', 'danger')}
                        {renderDegreeList('Optional omissions', activeCandidate.voicing.omittedOptionalDegrees, 'None', 'warning')}
                        {renderDegreeList('Included tones', activeCandidate.matchedRequiredDegrees, 'None')}
                    </div>
                </div>

                <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-4 flex flex-col gap-3">
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">Selection Notes</span>
                    <div className="flex flex-col gap-2">
                        {conciseReasons.map((reason) => (
                            <div key={reason} className="text-xs text-white/70 border border-white/5 bg-black/20 rounded-xl px-3 py-2">
                                {reason}
                            </div>
                        ))}
                        {conciseReasons.length === 0 && (
                            <div className="text-xs text-white/45 border border-white/5 bg-black/20 rounded-xl px-3 py-2">
                                No additional selection notes are available.
                            </div>
                        )}
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-black/20 p-3 flex items-center justify-center">
                        <CompactVoicingDiagram voicing={activeCandidate.voicing} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChordRelatedScalesPanel
                    rootPitchClass={selectedKey}
                    suggestions={relatedScaleSuggestions}
                    activeScaleId={activeScaleId ?? null}
                    onScaleSelect={(scaleId) => onScaleSelect?.(scaleId)}
                />
                <ChordProgressionHintsPanel
                    context={progressionContext}
                    activeHintId={activeHintId}
                    onHintSelect={(hintId) => setWorkspaceSelection({ contextKey: workspaceContextKey, activeHintId: hintId })}
                    onPrepareHandoff={onPrepareProgressionHandoff}
                />
            </div>
        </div>
    );
}
