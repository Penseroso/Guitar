"use client";

import React from 'react';

import type { ChordScaleSuggestionCategory } from '@/domain/chord/related-scales';
import { getChordContextsForScale, getModalSiblingChordsForScale } from '@/domain/chord/scale-chord-context';
import { getNoteName } from '@/domain/shared/notes';

interface ScaleChordRecommendationsPanelProps {
    scaleGroup: string;
    scaleName: string;
    tonicPitchClass: number;
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
    tonicPitchClass,
}: ScaleChordRecommendationsPanelProps) {
    const sameRootContexts = React.useMemo(
        () => getChordContextsForScale(scaleGroup, scaleName),
        [scaleGroup, scaleName]
    );

    const groupedByCategory = React.useMemo(() => {
        return CATEGORY_ORDER.map((category) => ({
            category,
            items: sameRootContexts.filter((context) => context.category === category),
        })).filter((group) => group.items.length > 0);
    }, [sameRootContexts]);

    // Same notes, different starting point: e.g. C Ionian's notes also form a complete Dm7
    // rooted at D (Dorian's degree), a complete G7 rooted at G (Mixolydian's degree), etc. —
    // the complement to the "same root" fits above, not a duplicate of them.
    const otherTonics = React.useMemo(
        () => getModalSiblingChordsForScale(scaleGroup, scaleName, tonicPitchClass),
        [scaleGroup, scaleName, tonicPitchClass]
    );

    return (
        <div className="flex flex-col gap-6 bg-[#050505]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm animate-in fade-in duration-500">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1 border-b border-white/5 pb-3">
                    <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em]">Same Root</span>
                    <span className="text-sm text-white/56">Chord qualities this scale works well over, at its own tonic.</span>
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

            {otherTonics.length > 0 && (
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1 border-b border-white/5 pb-3">
                        <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em]">Other Tonics</span>
                        <span className="text-sm text-white/56">Same notes, different root — these chords fit without leaving the scale.</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                        {otherTonics.map((item) => (
                            <div
                                key={`${item.rootPitchClass}-${item.chordId}`}
                                title={`Same notes as ${getNoteName(tonicPitchClass)} ${scaleName}, reinterpreted as ${getNoteName(item.rootPitchClass)} ${item.siblingScaleName}.`}
                                className="rounded-[1rem] border border-white/6 bg-white/[0.02] px-3.5 py-3 flex flex-col gap-1"
                            >
                                <span className="text-[15px] font-bold leading-none text-white">
                                    {getNoteName(item.rootPitchClass)} {item.chordDisplayName || item.chordSymbol || item.chordId}
                                </span>
                                <span className="text-[11px] text-white/45 leading-snug">{item.siblingScaleName}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
