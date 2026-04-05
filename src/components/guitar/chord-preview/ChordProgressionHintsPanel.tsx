"use client";

import React from 'react';

import type { ChordProgressionContext, ProgressionHandoffPayload } from '../../../utils/guitar/chords';

interface ChordProgressionHintsPanelProps {
    context: ChordProgressionContext;
    activeHintId: string | null;
    activeScaleLabel?: string | null;
    activeScaleReason?: string | null;
    isUsingDefaultScaleSelection?: boolean;
    onHintSelect: (hintId: string) => void;
    onPrepareHandoff?: (payload: ProgressionHandoffPayload) => void;
}

export function ChordProgressionHintsPanel({
    context,
    activeHintId,
    activeScaleLabel,
    activeScaleReason,
    isUsingDefaultScaleSelection,
    onHintSelect,
    onPrepareHandoff,
}: ChordProgressionHintsPanelProps) {
    const activeHint = context.hints.find((hint) => hint.id === activeHintId) ?? context.hints[0] ?? null;

    return (
        <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">Progression Context</span>
                <span className="text-sm font-black text-white">{context.role}</span>
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/55">
                    {context.relativeDegree} relative to tonic
                </span>
                <p className="text-xs text-white/60">{context.summary}</p>
                {activeScaleLabel && (
                    <div className="mt-2 rounded-2xl border border-white/5 bg-black/20 px-3 py-3">
                        <span className="text-[8px] font-black uppercase tracking-[0.28em] text-white/30">
                            {isUsingDefaultScaleSelection ? 'Default Scale Lens' : 'Current Scale Lens'}
                        </span>
                        <div className="mt-1 text-sm font-semibold text-white">{activeScaleLabel}</div>
                        {activeScaleReason && <p className="mt-1 text-xs text-white/60">{activeScaleReason}</p>}
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-2">
                {context.hints.map((hint) => {
                    const isActive = hint.id === activeHint?.id;

                    return (
                        <button
                            key={hint.id}
                            onClick={() => onHintSelect(hint.id)}
                            className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                                isActive
                                    ? 'border-white/25 bg-white/10'
                                    : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.04]'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-semibold text-white">{hint.title}</span>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                                        {hint.degrees.join(' -> ')}
                                    </span>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                                    {hint.category}
                                </span>
                            </div>
                            <p className="mt-2 text-xs text-white/65">{hint.summary}</p>
                        </button>
                    );
                })}
            </div>

            {activeHint && (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200/70">Prepared Handoff</span>
                        <span className="text-sm font-semibold text-emerald-50">{activeHint.title}</span>
                        <span className="text-xs text-emerald-50/75">{activeHint.degrees.join(' -> ')} · {activeHint.handoff.roleLabel}</span>
                    </div>
                    <button
                        onClick={() => onPrepareHandoff?.(activeHint.handoff)}
                        className="rounded-xl border border-emerald-200/40 bg-emerald-200/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-50 transition-all hover:border-emerald-100/60 hover:bg-emerald-200/15"
                    >
                        Prepare
                    </button>
                </div>
            )}
        </div>
    );
}
