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
                <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/30">코드 해석</span>
                <h3 className="text-2xl font-black tracking-tight text-white">{title}</h3>
                <p className="max-w-3xl text-sm text-white/55">{description}</p>
            </div>
            {body}
        </div>
    );
}

function buildSelectionSummary(primaryLabel: string, rootFret?: number): string {
    return rootFret !== undefined
        ? `${primaryLabel} · ${rootFret}프렛 포지션`
        : `${primaryLabel} · 오픈 포지션`;
}

export function ChordVoicingViewport({
    chordType,
    selectedKey,
    activeCandidateId,
    activeScaleId,
    onActiveVoicingChange,
    onScaleSelect,
    onPrepareProgressionHandoff,
    tonalContext,
}: ChordVoicingViewportProps) {
    const selectionKey = useMemo(() => getBridgeSelectionKey(chordType, selectedKey), [chordType, selectedKey]);

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
            return {
                candidates: [],
                errorMessage: error instanceof Error ? error.message : 'Unknown future-engine resolution error.',
            };
        }
    }, [chordType, selectedKey]);

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
            '선택한 코드에서 바로 연주 가능한 보이싱을 고르지 못했습니다. 아래의 기존 보이싱 참고 영역은 계속 사용할 수 있습니다.',
            <div className="rounded-[1.5rem] border border-rose-500/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
                <span className="font-black uppercase tracking-[0.2em] text-[10px] text-rose-200/80">보이싱 안내</span>
                <p className="mt-2 text-rose-100/85">{errorMessage}</p>
            </div>
        );
    }

    if (!selection.activeCandidate) {
        return renderViewportShell(
            chordLabel,
            '이 코드에서는 아직 바로 보여줄 보이싱이 없습니다. 다른 키나 코드 타입을 선택하거나 아래의 기존 보이싱 참고 영역을 확인해 보세요.',
            <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.03] px-4 py-4 text-sm text-white/65">
                보이싱 후보가 생기면 이 영역에 해석과 연결 정보가 다시 표시됩니다.
            </div>
        );
    }

    const activeCandidate = selection.activeCandidate;
    const activePresentation = getVoicingPresentationMeta(activeCandidate.voicing.template);
    const conciseReasons = getReasonPreview(activeCandidate.reasons, 3);
    const defaultSelectionLabel = selection.selectionSource === 'requested'
        ? '직접 고른 보이싱'
        : selection.selectionSource === 'first-playable'
            ? '가장 바로 잡기 쉬운 보이싱으로 시작'
            : '현재 조건에서 가장 자연스러운 기본 보이싱';

    return (
        <div className="rounded-[2rem] border border-white/5 bg-[#050505] p-6 flex flex-col gap-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/30">연주 해석 프레임</span>
                    <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                        <h3 className="text-2xl font-black text-white tracking-tight">{chordLabel}</h3>
                        <span className="pb-1 text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                            현재 보이싱 해석
                        </span>
                    </div>
                    <p className="max-w-3xl text-sm text-white/55">
                        루트 {harmonicInterpretation.chordRootNoteName}를 중심으로 현재 톤 센터 {harmonicInterpretation.tonicNoteName} 안에서 이 보이싱이 어떤 역할을 하는지 정리했습니다.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-[0.25em] ${
                        activeCandidate.voicing.playable
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                    }`}>
                        {activeCandidate.voicing.playable ? '연주 가능' : '대체 보이싱'}
                    </span>
                    <span className="px-3 py-1.5 rounded-full border border-cyan-300/20 bg-cyan-400/[0.05] text-[9px] font-black uppercase tracking-[0.25em] text-cyan-100/80">
                        {harmonicInterpretation.roleLabel}
                    </span>
                    {selection.selectionSource !== 'requested' && (
                        <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-[9px] font-black uppercase tracking-[0.25em] text-white/65">
                            추천
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-4">
                <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-4 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">현재 보이싱</span>
                            <span className="text-sm font-black text-white">
                                {buildSelectionSummary(activePresentation.primaryLabel, activeCandidate.voicing.rootFret)}
                            </span>
                            {activePresentation.secondaryLabel && (
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                                    {activePresentation.secondaryLabel}
                                </span>
                            )}
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.25em] text-white/65">
                            {defaultSelectionLabel}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.05] px-3 py-3">
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-cyan-100/70">기능</span>
                            <div className="mt-1 text-sm font-semibold text-cyan-50">{harmonicInterpretation.relativeDegree} · {harmonicInterpretation.roleLabel}</div>
                            <p className="mt-1 text-xs text-cyan-50/80">{harmonicInterpretation.summary}</p>
                        </div>
                        <div className="flex flex-col gap-1 rounded-2xl border border-white/5 bg-black/20 px-3 py-3">
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">보이싱 정보</span>
                            <span className="text-xs font-semibold text-white/75">
                                {activePresentation.primaryLabel} · {activeCandidate.voicing.rootFret ?? 0}프렛 시작
                            </span>
                            <span className="text-xs text-white/55">
                                프렛 간격 {activeCandidate.voicing.span}
                            </span>
                        </div>
                        {renderDegreeList('빠진 필수 톤', activeCandidate.voicing.missingRequiredDegrees, '없음', 'danger')}
                        {renderDegreeList('생략한 선택 톤', activeCandidate.voicing.omittedOptionalDegrees, '없음', 'warning')}
                        {renderDegreeList('포함된 핵심 톤', activeCandidate.matchedRequiredDegrees, '없음')}
                    </div>
                </div>

                <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-4 flex flex-col gap-3">
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">추천 이유</span>
                    <div className="flex flex-col gap-2">
                        {conciseReasons.map((reason) => (
                            <div key={reason} className="text-xs text-white/70 border border-white/5 bg-black/20 rounded-xl px-3 py-2">
                                {reason}
                            </div>
                        ))}
                        {conciseReasons.length === 0 && (
                            <div className="text-xs text-white/45 border border-white/5 bg-black/20 rounded-xl px-3 py-2">
                                이 보이싱을 고른 기준이 아직 충분히 정리되지 않았습니다.
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
