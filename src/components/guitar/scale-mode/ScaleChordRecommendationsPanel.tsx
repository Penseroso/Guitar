"use client";

import React from 'react';

import type { ScaleChordRecommendation } from '../../../utils/guitar/scale-chord-recommendations';
import { buildScaleChordRecommendations } from '../../../utils/guitar/scale-chord-recommendations';

interface ScaleChordRecommendationsPanelProps {
    selectedKey: number;
    scaleGroup: string;
    scaleName: string;
    onOpenChordRecommendation: (payload: {
        chordType: string;
        rootPitchClass: number;
    }) => void;
}

function RecommendationSection({
    title,
    recommendations,
    onOpenChordRecommendation,
}: {
    title: string;
    recommendations: ScaleChordRecommendation[];
    onOpenChordRecommendation: (payload: {
        chordType: string;
        rootPitchClass: number;
    }) => void;
}) {
    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.24em] text-white/32">{title}</span>
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/22">
                    {recommendations.length}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {recommendations.map((recommendation) => (
                    <div
                        key={recommendation.id}
                        className="rounded-[1rem] border border-white/6 bg-white/[0.02] px-3.5 py-3 flex items-center justify-between gap-3"
                    >
                        <div className="min-w-0 flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[15px] font-bold leading-none text-white">{recommendation.symbol}</span>
                                <span className="text-[10px] font-black tracking-[0.18em] text-white/35">
                                    {recommendation.degree}
                                </span>
                                {recommendation.roleTag && (
                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/45">
                                        {recommendation.roleTag}
                                    </span>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => onOpenChordRecommendation({
                                chordType: recommendation.chordType,
                                rootPitchClass: recommendation.rootPitchClass,
                            })}
                            className="shrink-0 rounded-full border border-cyan-200/20 bg-cyan-200/[0.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-50 transition-all hover:border-cyan-100/45 hover:bg-cyan-200/[0.14]"
                        >
                            Open Chord
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function ScaleChordRecommendationsPanel({
    selectedKey,
    scaleGroup,
    scaleName,
    onOpenChordRecommendation,
}: ScaleChordRecommendationsPanelProps) {
    const recommendations = React.useMemo(
        () => buildScaleChordRecommendations(selectedKey, scaleGroup, scaleName),
        [scaleGroup, scaleName, selectedKey]
    );

    return (
        <div className="flex flex-col gap-4 bg-[#050505]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm animate-in fade-in duration-500">
            <div className="flex flex-col gap-1 border-b border-white/5 pb-3">
                <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em]">Scale Chords</span>
                <span className="text-sm text-white/56">Practical chord options for the current scale.</span>
            </div>

            <RecommendationSection
                title="Usable Chords"
                recommendations={recommendations.usable}
                onOpenChordRecommendation={onOpenChordRecommendation}
            />

            <RecommendationSection
                title="Characteristic Chords"
                recommendations={recommendations.characteristic}
                onOpenChordRecommendation={onOpenChordRecommendation}
            />
        </div>
    );
}
