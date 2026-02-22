"use client";
import React, { useMemo } from 'react';
import { NOTES, TUNING, INLAYS, DOUBLE_INLAYS } from '../utils/musicTheory';

interface FretboardProps {
    tuning?: number[];
    activeNotes: number[]; // Indices of notes (0-11) to show
    rootNote: number;
    chordTones: number[];
    modifierNotes: number[];
    showChordTones: boolean;
    showIntervals?: boolean; // New Prop
    fingering?: { string: number; fret: number; noteIdx: number; label?: string }[];
}

// Precise Fret Widths
const FRET_WIDTHS = [
    80,  // Nut
    140, 132, 125, 118, 111, 105, 99, 94, 88, 83, 79, 74,
    70, 66, 62, 59, 56, 53, 50, 47, 44, 42, 40, 38
];

const STRINGS_COUNT = 6;
const INTERVAL_NAMES = ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];

export const Fretboard: React.FC<FretboardProps> = ({
    tuning = TUNING,
    activeNotes,
    rootNote,
    chordTones,
    modifierNotes,
    showChordTones,
    showIntervals = false,
    fingering
}) => {

    const frets = useMemo(() => Array.from({ length: 25 }, (_, i) => i), []);

    return (
        <div className="w-full overflow-x-auto pb-4 pt-4 custom-scrollbar">
            <div className="min-w-max px-4">
                <div className="relative">
                    {/* 
                       Visual Strings Overlay 
                       Using Flex Column to ensure exact alignment with the Flex Column in Fret Cells 
                    */}
                    <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none z-10 flex flex-col justify-between py-6">
                        {Array.from({ length: STRINGS_COUNT }).map((_, i) => (
                            <div
                                key={`string-${i}`}
                                className="w-full relative"
                                style={{ height: '2px' }} // Container for string line
                            >
                                <div
                                    className="w-full absolute top-1/2 -translate-y-1/2 bg-gradient-to-b from-slate-300 to-slate-500 shadow-sm opacity-90"
                                    style={{ height: `${i * 0.5 + 1}px` }} // Grading string thickness
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex items-stretch bg-[#1a1510] shadow-2xl rounded-md overflow-hidden relative">
                        {/* Wood Texture Overlay */}
                        <div className="absolute inset-0 opacity-30 pointer-events-none z-0 mix-blend-overlay"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E"), linear-gradient(to bottom, #302015, #150f0a)`,
                                backgroundSize: '150px 150px, cover'
                            }}
                        />

                        {frets.map(f => (
                            <div
                                key={`fret-col-${f}`}
                                className="flex flex-col shrink-0 z-1"
                                style={{ width: FRET_WIDTHS[f] }}
                            >
                                {/* 1. Label Component */}
                                <div className="h-[30px] flex items-end justify-center pb-2 text-xs font-mono font-bold text-slate-500 opacity-60">
                                    {f}
                                </div>

                                {/* 2. Fret Cell */}
                                <div
                                    className={`
                                        relative h-[260px] w-full
                                        box-border flex flex-col justify-between py-6
                                        ${f === 0
                                            ? 'bg-gradient-to-b from-[#e5e5e5] to-[#a3a3a3] border-r-[4px] border-[#737373] shadow-[2px_0_5px_rgba(0,0,0,0.5)] z-20'
                                            : 'border-r-[2px] border-[#888] shadow-[inset_-2px_0_2px_rgba(0,0,0,0.3),1px_0_0_rgba(255,255,255,0.2)]'} 
                                    `}
                                >
                                    {/* Inlays */}
                                    {INLAYS.includes(f) && (
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#d4d4d8] shadow-[inset_0_1px_4px_rgba(0,0,0,0.4),0_0_10px_rgba(255,255,255,0.2)] pointer-events-none" />
                                    )}
                                    {DOUBLE_INLAYS.includes(f) && (
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-10 pointer-events-none opacity-90">
                                            <div className="w-4 h-4 rounded-full bg-[#d4d4d8] shadow-[inset_0_1px_4px_rgba(0,0,0,0.4),0_0_10px_rgba(255,255,255,0.2)]" />
                                            <div className="w-4 h-4 rounded-full bg-[#d4d4d8] shadow-[inset_0_1px_4px_rgba(0,0,0,0.4),0_0_10px_rgba(255,255,255,0.2)]" />
                                        </div>
                                    )}

                                    {/* String Slots for Notes */}
                                    {Array.from({ length: STRINGS_COUNT }).map((_, s) => {
                                        const noteIdx = (tuning[s] + f) % 12;

                                        const specificFinger = fingering?.find(fico => fico.string === s && fico.fret === f);
                                        const isRoot = noteIdx === rootNote;
                                        const isChordTone = chordTones.includes(noteIdx);
                                        const isModifier = modifierNotes.includes(noteIdx);
                                        const isActive = activeNotes.includes(noteIdx);

                                        let shouldShow = false;
                                        if (fingering) shouldShow = !!specificFinger;
                                        else shouldShow = isActive || isModifier;

                                        if (!shouldShow) return null;

                                        // Note Styles Calculation
                                        let noteClass = "bg-blue-500 border-blue-300 scale-90";
                                        let label = NOTES[noteIdx];
                                        let shadow = "shadow-[0_0_10px_rgba(59,130,246,0.6)]";

                                        // Determine Label based on Mode
                                        if (showIntervals) {
                                            const intervalIdx = (noteIdx - rootNote + 12) % 12;
                                            label = INTERVAL_NAMES[intervalIdx];
                                        }

                                        if (fingering && specificFinger) {
                                            if (specificFinger.label && !showIntervals) {
                                                label = NOTES[noteIdx]; // Default to Note Name if not showing intervals
                                            }
                                            if (showIntervals) {
                                                const intervalIdx = (noteIdx - rootNote + 12) % 12;
                                                label = INTERVAL_NAMES[intervalIdx];
                                            }

                                            if (specificFinger.label === 'R' || (showIntervals && label === 'R')) {
                                                noteClass = "bg-red-500 border-white ring-2 ring-red-900";
                                                shadow = "shadow-[0_0_15px_rgba(239,68,68,0.8)]";
                                            } else {
                                                noteClass = "bg-amber-500 border-amber-200";
                                                shadow = "shadow-[0_0_10px_rgba(245,158,11,0.6)]";
                                            }
                                        } else {
                                            if (isRoot) {
                                                noteClass = "bg-red-600 border-white ring-2 ring-red-900 z-30 scale-110";
                                                shadow = "shadow-[0_0_20px_rgba(220,38,38,0.9)]";
                                            } else if (showChordTones && isChordTone) {
                                                noteClass = "bg-amber-500 border-amber-200 z-20";
                                                shadow = "shadow-[0_0_15px_rgba(245,158,11,0.7)]";
                                            } else if (isModifier) {
                                                noteClass = "bg-purple-600 border-purple-300 animate-pulse";
                                                shadow = "shadow-[0_0_15px_rgba(168,85,247,0.7)]";
                                            }
                                        }

                                        return (
                                            <div
                                                key={`slot-${s}`} // Simplified key
                                                className="relative w-full h-2 flex items-center justify-center text-white"
                                            >
                                                <div
                                                    className={`
                                                        absolute w-9 h-9 rounded-full flex items-center justify-center 
                                                        font-black text-sm border-2 
                                                        transition-transform duration-200 hover:scale-125
                                                        ${noteClass} ${shadow}
                                                    `}
                                                >
                                                    {label}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
