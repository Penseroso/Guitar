"use client";

import React from 'react';

import { getScaleDisplayName, getVisibleScaleFamilyLabel } from '../../../utils/guitar/scaleSelector';
import type { ChordRelatedScaleSuggestion } from '../../../utils/guitar/chords';
import { getNoteName } from '../../../utils/guitar/logic';

interface ChordRelatedScalesPanelProps {
    rootPitchClass: number;
    suggestions: ChordRelatedScaleSuggestion[];
    activeScaleId: string | null;
    onScaleSelect: (scaleId: string) => void;
}

export function ChordRelatedScalesPanel({
    rootPitchClass,
    suggestions,
    activeScaleId,
    onScaleSelect,
}: ChordRelatedScalesPanelProps) {
    const activeScale = suggestions.find((suggestion) => suggestion.scaleId === activeScaleId) ?? suggestions[0] ?? null;

    return (
        <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">Choose a Scale</span>
                    <span className="text-sm font-black text-white">Scale options</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                    {suggestions.length} options
                </span>
            </div>

            {suggestions.length === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-black/20 px-3 py-3 text-sm text-white/55">
                    No scale guidance is available yet for this chord shape.
                </div>
            ) : (
                <>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {suggestions.map((suggestion) => {
                            const isActive = suggestion.scaleId === activeScale?.scaleId;

                            return (
                                <button
                                    key={suggestion.scaleId}
                                    onClick={() => onScaleSelect(suggestion.scaleId)}
                                    className={`min-w-[168px] rounded-2xl border px-4 py-3 text-left transition-all ${
                                        isActive
                                            ? 'border-cyan-300/50 bg-cyan-400/[0.08] text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.12)]'
                                            : 'border-white/10 bg-white/[0.02] text-white/65 hover:border-white/25 hover:text-white'
                                    }`}
                                >
                                    <div className="mt-1 text-sm font-semibold">
                                        {getNoteName(rootPitchClass)} {getScaleDisplayName(suggestion.name)}
                                    </div>
                                    <div className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                                        {suggestion.functionLabel}
                                    </div>
                                    <div className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
                                        {getVisibleScaleFamilyLabel(suggestion.group)}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {activeScale && (
                        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.05] px-4 py-3">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/70">Active Scale</span>
                            <div className="mt-2 text-sm font-semibold text-cyan-50">
                                {getNoteName(rootPitchClass)} {getScaleDisplayName(activeScale.name)}
                            </div>
                            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/50">
                                {activeScale.functionLabel} · {getVisibleScaleFamilyLabel(activeScale.group)}
                            </div>
                            <p className="mt-1 text-xs text-cyan-50/75">{activeScale.reason}</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
