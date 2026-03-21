import React from 'react';
import { Compass, Trash2, Volume2, Zap } from 'lucide-react';
import { degreeToChordName } from '../../../utils/guitar/logic';
import type { ChordNode } from '../../../utils/guitar/types';
import type { ProgressionPlaybackData } from '../utils/getProgressionPlaybackData';

type ProgressionInspectorProps = {
    focusedNode: ChordNode;
    playbackData: ProgressionPlaybackData | null;
    selectedKey: number;
    isMinorMode: boolean;
    isCadencePosition: boolean;
    addSecondaryDominant: (id: string) => void;
    addTritoneSubstitution: (id: string) => void;
    addSubdominantMinor: (id: string) => void;
    addFlatSix: (id: string) => void;
    addFlatSeven: (id: string) => void;
    applyPicardyThird: (id: string) => void;
    removeNode: (id: string) => void;
    playProgressionChord: (root: number, intervals: number[]) => void | Promise<void>;
};

export const ProgressionInspector = React.forwardRef<HTMLDivElement, ProgressionInspectorProps>(
    function ProgressionInspector(
        {
            focusedNode,
            playbackData,
            selectedKey,
            isMinorMode,
            isCadencePosition,
            addSecondaryDominant,
            addTritoneSubstitution,
            addSubdominantMinor,
            addFlatSix,
            addFlatSeven,
            applyPicardyThird,
            removeNode,
            playProgressionChord,
        },
        ref
    ) {
        const chordName = degreeToChordName(focusedNode.displayDegree, focusedNode.coreDegree, selectedKey);

        return (
            <div
                ref={ref}
                className="flex items-center justify-between bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 mt-6 shadow-lg animate-in fade-in slide-in-from-bottom-4"
            >
                <div className="flex items-center gap-3">
                    {!focusedNode.isSecondary && focusedNode.durationInBeats >= 1 && (
                        <>
                            <button
                                onClick={() => addSecondaryDominant(focusedNode.id)}
                                className="px-5 py-2.5 text-[11px] font-black tracking-widest text-amber-500 hover:bg-amber-500/10 rounded-xl border border-amber-500/20 transition-all flex items-center gap-2"
                            >
                                <Zap size={12} /> + V7/{focusedNode.coreDegree}
                            </button>
                            <button
                                onClick={() => addTritoneSubstitution(focusedNode.id)}
                                className="px-5 py-2.5 text-[11px] font-black tracking-widest text-fuchsia-400 hover:bg-fuchsia-500/10 rounded-xl border border-fuchsia-500/20 transition-all flex items-center gap-2"
                            >
                                <Compass size={12} /> + subV7/{focusedNode.coreDegree}
                            </button>
                        </>
                    )}
                    {!focusedNode.isSecondary && (focusedNode.coreDegree === 'IV' || focusedNode.coreDegree === 'IVmaj7') && focusedNode.durationInBeats >= 2 && (
                        <button
                            onClick={() => addSubdominantMinor(focusedNode.id)}
                            className="px-5 py-2.5 text-[11px] font-black tracking-widest text-blue-400 hover:bg-blue-500/10 rounded-xl border border-blue-500/20 transition-all flex items-center gap-2"
                        >
                            + SDM (iv)
                        </button>
                    )}
                    {!focusedNode.isSecondary && (focusedNode.coreDegree === 'IV' || focusedNode.coreDegree === 'IVmaj7') && focusedNode.durationInBeats >= 2 && (
                        <button
                            onClick={() => addFlatSeven(focusedNode.id)}
                            className="px-5 py-2.5 text-[11px] font-black tracking-widest text-blue-400 hover:bg-blue-500/10 rounded-xl border border-blue-500/20 transition-all flex items-center gap-2"
                        >
                            + bVII
                        </button>
                    )}
                    {!focusedNode.isSecondary && (focusedNode.coreDegree === 'I' || focusedNode.coreDegree === 'Imaj7') && focusedNode.durationInBeats >= 2 && (
                        <button
                            onClick={() => addFlatSix(focusedNode.id)}
                            className="px-5 py-2.5 text-[11px] font-black tracking-widest text-blue-400 hover:bg-blue-500/10 rounded-xl border border-blue-500/20 transition-all flex items-center gap-2"
                        >
                            + bVI
                        </button>
                    )}
                    {(focusedNode.coreDegree === 'i' || focusedNode.coreDegree === 'im7') && isMinorMode && isCadencePosition && (
                        <button
                            onClick={() => applyPicardyThird(focusedNode.id)}
                            className="px-5 py-2.5 text-[11px] font-black tracking-widest text-yellow-400 hover:bg-yellow-500/10 rounded-xl border border-yellow-500/20 transition-all flex items-center gap-2"
                        >
                            Picardy (I)
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                        <span className="text-2xl font-black text-white tracking-wide">{chordName}</span>
                        <span className="text-[11px] font-semibold text-white/30 tracking-widest">{focusedNode.displayDegree}</span>
                        <div className="flex items-center gap-2 opacity-30 mt-0.5">
                            <div className="w-1 h-1 rounded-full bg-white/40" />
                            <span className="text-[9px] tracking-widest font-bold">{focusedNode.durationInBeats} beats</span>
                            <div className="w-1 h-1 rounded-full bg-white/40" />
                        </div>
                    </div>
                    {playbackData && (
                        <button
                            onClick={() => playProgressionChord(playbackData.stepRoot, playbackData.tones)}
                            className="p-2.5 rounded-xl border border-[#00ff88]/20 bg-[#00ff88]/5 text-[#00ff88] hover:bg-[#00ff88]/15 hover:border-[#00ff88]/40 transition-all flex items-center gap-1.5 text-[11px] font-black tracking-widest"
                            title="Play chord"
                        >
                            <Volume2 size={14} /> Play
                        </button>
                    )}
                </div>

                <div className="flex items-center">
                    <button
                        onClick={() => removeNode(focusedNode.id)}
                        className="px-5 py-2.5 text-red-500 hover:bg-red-500/10 font-black text-[11px] tracking-widest rounded-xl transition-all flex items-center gap-2 border border-red-500/10 hover:border-red-500/30"
                    >
                        <Trash2 size={14} /> Delete Node
                    </button>
                </div>
            </div>
        );
    }
);
