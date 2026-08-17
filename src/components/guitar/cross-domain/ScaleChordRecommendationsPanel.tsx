"use client";

import React from 'react';

import { getChordContextsForScale, getModalSiblingChordsForScale } from '@/domain/chord/scale-chord-context';
import { getKeyName } from '@/domain/shared/keys';

interface ScaleChordRecommendationsPanelProps {
    scaleGroup: string;
    scaleName: string;
    tonicPitchClass: number;
}

interface ChordCardItem {
    key: string;
    rootPitchClass: number;
    chordDisplayName: string;
    tooltip: string;
}

export function ScaleChordRecommendationsPanel({
    scaleGroup,
    scaleName,
    tonicPitchClass,
}: ScaleChordRecommendationsPanelProps) {
    const sameRootContexts = React.useMemo(
        () => getChordContextsForScale(scaleGroup, scaleName),
        [scaleGroup, scaleName]
    );

    const otherTonics = React.useMemo(
        () => getModalSiblingChordsForScale(scaleGroup, scaleName, tonicPitchClass),
        [scaleGroup, scaleName, tonicPitchClass]
    );

    const items: ChordCardItem[] = React.useMemo(() => [
        ...sameRootContexts.map((item) => ({
            key: `same-${item.chordId}`,
            rootPitchClass: tonicPitchClass,
            chordDisplayName: item.chordDisplayName || item.chordSymbol || item.chordId,
            tooltip: item.reason,
        })),
        ...otherTonics.map((item) => ({
            key: `sibling-${item.rootPitchClass}-${item.chordId}`,
            rootPitchClass: item.rootPitchClass,
            chordDisplayName: item.chordDisplayName || item.chordSymbol || item.chordId,
            tooltip: `Same notes as ${getKeyName(tonicPitchClass)} ${scaleName}, reinterpreted as ${getKeyName(item.rootPitchClass)} ${item.siblingScaleName}.`,
        })),
    ], [sameRootContexts, otherTonics, tonicPitchClass, scaleName]);

    if (items.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-4 bg-[#050505]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm animate-in fade-in duration-500">
            <div className="border-b border-white/5 pb-3">
                <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em]">Chords</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {items.map((item) => (
                    <div
                        key={item.key}
                        title={item.tooltip}
                        className="rounded-[1rem] border border-white/6 bg-white/[0.02] px-3.5 py-3"
                    >
                        <span className="text-[15px] font-bold leading-none text-white">
                            {getKeyName(item.rootPitchClass)} {item.chordDisplayName}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
