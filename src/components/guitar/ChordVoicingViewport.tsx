"use client";

import React, { useEffect, useMemo, useState } from 'react';

import { getNoteName } from '../../utils/guitar/logic';
import { getScaleDisplayName } from '../../utils/guitar/scaleSelector';
import {
    getChordTypeSuffix,
    getProgressionLinksForChord,
    getRankedVoicingsForChord,
    getRelatedScaleSuggestionsForChord,
    interpretChordAgainstTonalCenter,
    resolveChordRegistryEntry,
    type HarmonicTonalContext,
    type ProgressionHandoffPayload,
    type VoicingCandidate,
} from '../../utils/guitar/chords';
import { ChordProgressionHintsPanel } from './chord-preview/ChordProgressionHintsPanel';
import { ChordRelatedScalesPanel } from './chord-preview/ChordRelatedScalesPanel';
import {
    getBridgeSelectionKey,
    resolveBridgeSelection,
    type ActiveVoicingChangePayload,
} from './chord-preview/bridge';

interface ChordVoicingViewportProps {
    chordType: string;
    selectedKey: number;
    candidates?: VoicingCandidate[];
    activeCandidateId?: string | null;
    onActiveVoicingChange?: (payload: ActiveVoicingChangePayload) => void;
    onPrepareProgressionHandoff?: (payload: ProgressionHandoffPayload) => void;
    tonalContext?: HarmonicTonalContext;
}

function buildChordLabel(chordType: string, selectedKey: number): string {
    try {
        const entry = resolveChordRegistryEntry(chordType);
        const root = getNoteName(selectedKey);
        return `${root}${getChordTypeSuffix(entry)}`;
    } catch {
        return `${getNoteName(selectedKey)} ${chordType}`;
    }
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

export function ChordVoicingViewport({
    chordType,
    selectedKey,
    candidates: providedCandidates,
    activeCandidateId,
    onActiveVoicingChange,
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
                }),
                errorMessage: null,
            };
        } catch (error) {
            return {
                candidates: [],
                errorMessage: error instanceof Error ? error.message : 'Unknown future-engine resolution error.',
            };
        }
    }, [chordType, providedCandidates, selectedKey]);

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

    const [workspaceSelection, setWorkspaceSelection] = useState<{
        contextKey: string;
        activeScaleId: string | null;
        activeHintId: string | null;
    }>({
        contextKey: selectionKey,
        activeScaleId: null,
        activeHintId: null,
    });

    useEffect(() => {
        setWorkspaceSelection((current) => current.contextKey === selectionKey
            ? current
            : {
                contextKey: selectionKey,
                activeScaleId: null,
                activeHintId: null,
            });
    }, [selectionKey]);

    const activeScale = useMemo(
        () => relatedScaleSuggestions.find((suggestion) => suggestion.scaleId === workspaceSelection.activeScaleId)
            ?? relatedScaleSuggestions[0]
            ?? null,
        [relatedScaleSuggestions, workspaceSelection.activeScaleId]
    );
    const isUsingDefaultScaleSelection = activeScale !== null
        && (
            workspaceSelection.contextKey !== selectionKey
            || workspaceSelection.activeScaleId === null
            || !relatedScaleSuggestions.some((suggestion) => suggestion.scaleId === workspaceSelection.activeScaleId)
        );
    const activeHintId = workspaceSelection.contextKey === selectionKey
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

    return (
        <div className="rounded-[2rem] border border-white/5 bg-[#050505] p-6 flex flex-col gap-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/30">Harmonic Context</span>
                    <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                        <h3 className="text-2xl font-black text-white tracking-tight">{chordLabel}</h3>
                        <span className="pb-1 text-[10px] font-black uppercase tracking-[0.3em] text-white/35">
                            {harmonicInterpretation.relativeDegree}
                        </span>
                    </div>
                    <p className="max-w-3xl text-sm text-white/55">{harmonicInterpretation.summary}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1.5 rounded-full border border-cyan-300/20 bg-cyan-400/[0.05] text-[9px] font-black uppercase tracking-[0.25em] text-cyan-100/80">
                        {harmonicInterpretation.roleLabel}
                    </span>
                    <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-[9px] font-black uppercase tracking-[0.25em] text-white/65">
                        {harmonicInterpretation.chordRootNoteName} against {harmonicInterpretation.tonicNoteName}
                    </span>
                </div>
            </div>

            <div className="rounded-[1.5rem] border border-cyan-300/15 bg-cyan-400/[0.04] px-4 py-4 flex flex-col gap-2">
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-cyan-100/70">Context Summary</span>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-cyan-50">{harmonicInterpretation.relativeDegree} · {harmonicInterpretation.roleLabel}</span>
                    <span className="rounded-full border border-cyan-200/20 bg-black/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100/65">
                        {selection.activeCandidate ? 'Voicing available' : 'Context only'}
                    </span>
                </div>
                <p className="text-xs text-cyan-50/80">
                    {activeScale
                        ? `Default scale guidance starts from ${getNoteName(selectedKey)} ${getScaleDisplayName(activeScale.name)}. You can change the scale lens inside this panel without changing the main fretboard.`
                        : 'Scale guidance will appear here when related suggestions are available.'}
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChordRelatedScalesPanel
                    rootPitchClass={selectedKey}
                    suggestions={relatedScaleSuggestions}
                    activeScaleId={activeScale?.scaleId ?? null}
                    isUsingDefaultSelection={isUsingDefaultScaleSelection}
                    onScaleSelect={(scaleId) => setWorkspaceSelection((current) => ({
                        contextKey: selectionKey,
                        activeScaleId: scaleId,
                        activeHintId: current.contextKey === selectionKey ? current.activeHintId : null,
                    }))}
                />
                <ChordProgressionHintsPanel
                    context={progressionContext}
                    activeHintId={activeHintId}
                    activeScaleLabel={activeScale ? `${getNoteName(selectedKey)} ${getScaleDisplayName(activeScale.name)}` : null}
                    activeScaleReason={activeScale?.reason ?? null}
                    isUsingDefaultScaleSelection={isUsingDefaultScaleSelection}
                    onHintSelect={(hintId) => setWorkspaceSelection((current) => ({
                        contextKey: selectionKey,
                        activeScaleId: current.contextKey === selectionKey ? current.activeScaleId : null,
                        activeHintId: hintId,
                    }))}
                    onPrepareHandoff={onPrepareProgressionHandoff}
                />
            </div>
        </div>
    );
}
