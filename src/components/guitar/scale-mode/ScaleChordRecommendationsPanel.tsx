"use client";

import React from 'react';

import type { ChordScaleSuggestionCategory } from '@/domain/chord/related-scales';
import { getChordContextsForScale } from '@/domain/chord/scale-chord-context';

interface ScaleChordRecommendationsPanelProps {
    scaleGroup: string;
    scaleName: string;
}

const CATEGORY_LABELS: Record<ChordScaleSuggestionCategory, string> = {
    primary: 'Primary Fit',
    color: 'Color Option',
    altered: 'Altered Tension',
    modal: 'Modal Color',
};

const CATEGORY_ORDER: ChordScaleSuggestionCategory[] = ['primary', 'color', 'altered', 'modal'];

export function ScaleChordRecommendationsPanel({
    scaleGroup,
    scaleName,
}: ScaleChordRecommendationsPanelProps) {
    const contexts = React.useMemo(
        () => getChordContextsForScale(scaleGroup, scaleName),
        [scaleGroup, scaleName]
    );

    const groupedByCategory = React.useMemo(() => {
        return CATEGORY_ORDER.map((category) => ({
            category,
            items: contexts.filter((context) => context.category === category),
        })).filter((group) => group.items.length > 0);
    }, [contexts]);

    return (
        <div className="flex flex-col gap-4 bg-[#050505]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm animate-in fade-in duration-500">
            <div className="flex flex-col gap-1 border-b border-white/5 pb-3">
                <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em]">Scale Chords</span>
                <span className="text-sm text-white/56">Chord qualities this scale works well over.</span>
            </div>

            {groupedByCategory.map(({ category, items }) => (
                <div key={category} className="flex flex-col gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.24em] text-white/32">
                        {CATEGORY_LABELS[category]}
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                        {items.map((item) => (
                            <div
                                key={item.chordId}
                                title={item.reason}
                                className="rounded-[1rem] border border-white/6 bg-white/[0.02] px-3.5 py-3 flex flex-col gap-1"
                            >
                                <span className="text-[15px] font-bold leading-none text-white">
                                    {item.chordDisplayName || item.chordSymbol || item.chordId}
                                </span>
                                <span className="text-[11px] text-white/45 leading-snug">{item.reason}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
