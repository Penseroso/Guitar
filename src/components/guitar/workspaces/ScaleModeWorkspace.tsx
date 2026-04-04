"use client";

import React from 'react';

import { Fretboard } from '../../Fretboard';
import { RelatedScalesStrip } from '../scale-selector/RelatedScalesStrip';
import { TogglePill } from '../../ui/design-system/TogglePill';
import { SlidersHorizontal } from 'lucide-react';
import type { HarmonicInterval, Fingering, PlayableDoubleStop } from '../../../utils/guitar/types';

interface ScaleModeWorkspaceProps {
    effectiveScaleGroup: string;
    effectiveScaleName: string;
    scaleGroup: string;
    scaleName: string;
    previewScaleGroup: string | null;
    previewScaleName: string | null;
    onPreviewToggle: (group: string, name: string) => void;
    onApplyPreview: () => void;
    onClearPreview: () => void;
    showIntervals: boolean;
    onToggleIntervals: () => void;
    showChordTones: boolean;
    onToggleChordTones: () => void;
    isPentatonic: boolean;
    blueNote: boolean;
    onToggleBlueNote: () => void;
    secondNote: boolean;
    onToggleSecondNote: () => void;
    sixthNote: boolean;
    onToggleSixthNote: () => void;
    isDoubleStopAvailable: boolean;
    isDoubleStopVisible: boolean;
    onToggleDoubleStop: () => void;
    doubleStopInterval: HarmonicInterval;
    onDoubleStopIntervalChange: (interval: HarmonicInterval) => void;
    doubleStopStrings: [number, number];
    onDoubleStopStringsChange: (value: [number, number]) => void;
    harmonicDoubleStopPairsByInterval: Record<HarmonicInterval, unknown[]>;
    fretboardContainerRef: React.RefObject<HTMLDivElement | null>;
    tuning: number[];
    activeNotes: number[];
    rootNote: number;
    chordTones: number[];
    modifierNotes: number[];
    scaleIntervalLabels: Partial<Record<number, string>>;
    fingering?: Fingering[];
    doubleStops: PlayableDoubleStop[];
}

export function ScaleModeWorkspace({
    effectiveScaleGroup,
    effectiveScaleName,
    scaleGroup,
    scaleName,
    previewScaleGroup,
    previewScaleName,
    onPreviewToggle,
    onApplyPreview,
    onClearPreview,
    showIntervals,
    onToggleIntervals,
    showChordTones,
    onToggleChordTones,
    isPentatonic,
    blueNote,
    onToggleBlueNote,
    secondNote,
    onToggleSecondNote,
    sixthNote,
    onToggleSixthNote,
    isDoubleStopAvailable,
    isDoubleStopVisible,
    onToggleDoubleStop,
    doubleStopInterval,
    onDoubleStopIntervalChange,
    doubleStopStrings,
    onDoubleStopStringsChange,
    harmonicDoubleStopPairsByInterval,
    fretboardContainerRef,
    tuning,
    activeNotes,
    rootNote,
    chordTones,
    modifierNotes,
    scaleIntervalLabels,
    fingering,
    doubleStops,
}: ScaleModeWorkspaceProps) {
    return (
        <div className="relative z-10 w-full flex flex-col gap-6">
            <div className="px-6">
                <RelatedScalesStrip
                    sourceScaleGroup={effectiveScaleGroup}
                    sourceScaleName={effectiveScaleName}
                    committedScaleGroup={scaleGroup}
                    committedScaleName={scaleName}
                    previewScaleGroup={previewScaleGroup}
                    previewScaleName={previewScaleName}
                    onPreviewToggle={onPreviewToggle}
                    onApplyPreview={onApplyPreview}
                    onClearPreview={onClearPreview}
                />
            </div>

            <div className="flex flex-col gap-4 bg-[#050505]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-2">
                    <SlidersHorizontal size={14} className="text-white/40" />
                    <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em]">Visualization Overrides</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    <TogglePill label={showIntervals ? "Mode: Note" : "Mode: Interval"} isActive={showIntervals} onToggle={onToggleIntervals} hideDot={true} />
                    <TogglePill label="Chord Tones" isActive={showChordTones} onToggle={onToggleChordTones} colorTheme="chord-tones" />

                    {isPentatonic && (
                        <TogglePill label="Add Blue Note" isActive={blueNote} onToggle={onToggleBlueNote} />
                    )}
                    {isPentatonic && effectiveScaleName === "Minor Pentatonic" && (
                        <>
                            <TogglePill label="Add 2 (9th)" isActive={secondNote} onToggle={onToggleSecondNote} />
                            <TogglePill label="Add 6th Note" isActive={sixthNote} onToggle={onToggleSixthNote} />
                        </>
                    )}

                    {isDoubleStopAvailable && (
                        <div className="flex flex-col gap-2 col-span-2">
                            <div className="flex items-center justify-between">
                                <TogglePill label="Double Stops" isActive={isDoubleStopVisible} onToggle={onToggleDoubleStop} />
                            </div>
                            {isDoubleStopVisible && (
                                <div className="flex flex-col gap-3 mt-1 p-3 bg-white/[0.03] border border-white/5 rounded-2xl animate-in fade-in duration-300">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">Interval</span>
                                        <div className="flex gap-2">
                                            {([3, 4, 6] as HarmonicInterval[]).map((int) => {
                                                const hasValidPairs = harmonicDoubleStopPairsByInterval[int].length > 0;

                                                return (
                                                    <button
                                                        key={int}
                                                        disabled={!hasValidPairs}
                                                        onClick={() => {
                                                            onDoubleStopIntervalChange(int);
                                                            onDoubleStopStringsChange(int === 6 ? [0, 2] : [0, 1]);
                                                        }}
                                                        className={`flex-1 py-1.5 text-[9px] font-black rounded-lg border transition-all ${!hasValidPairs ? 'border-white/5 text-white/15 cursor-not-allowed opacity-40' : doubleStopInterval === int ? 'bg-white/10 text-white border-white/30 shadow-lg' : 'border-white/5 text-white/30 hover:text-white/70'}`}
                                                    >
                                                        {int}{int === 3 ? 'rd' : 'th'}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 border-t border-white/5 pt-2">
                                        <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">String Pair</span>
                                        <div className="flex gap-2 flex-wrap">
                                            {(doubleStopInterval === 6
                                                ? [[0, 2], [1, 3], [2, 4], [3, 5]]
                                                : [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]]
                                            ).map(([s1, s2]) => (
                                                <button
                                                    key={`${s1}-${s2}`}
                                                    onClick={() => onDoubleStopStringsChange([s1, s2] as [number, number])}
                                                    className={`px-2 py-1.5 text-[9px] font-black rounded-lg border transition-all ${doubleStopStrings[0] === s1 && doubleStopStrings[1] === s2 ? 'bg-white/10 text-white border-white/30 shadow-lg' : 'border-white/5 text-white/30 hover:text-white/70'}`}
                                                >
                                                    {s1 + 1}-{s2 + 1}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="border-y border-white/5 py-8 flex items-center justify-center relative overflow-hidden bg-white/[0.01]">
                <div ref={fretboardContainerRef} className="overflow-x-auto overflow-y-hidden custom-scrollbar relative w-full flex justify-center py-2">
                    <Fretboard
                        tuning={tuning}
                        activeNotes={activeNotes}
                        rootNote={rootNote}
                        chordTones={chordTones}
                        modifierNotes={modifierNotes}
                        showChordTones={showChordTones}
                        showIntervals={showIntervals}
                        scaleIntervalLabels={scaleIntervalLabels}
                        fingering={fingering}
                        doubleStops={doubleStops}
                    />
                </div>
            </div>
        </div>
    );
}
