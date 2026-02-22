"use client";
import React from 'react';
import { NOTES, SCALES, COMMON_PROGRESSIONS } from '../utils/musicTheory';

interface ControlsProps {
    selectedKey: number;
    onKeyChange: (key: number) => void;
    selectedScaleGroup: string;
    selectedScaleName: string;
    onScaleChange: (group: string, name: string) => void;
    showChordTones: boolean;
    onToggleChordTones: () => void;
    showIntervals: boolean;
    onToggleIntervals: () => void;
    isPentatonic: boolean;
    blueNote: boolean;
    onToggleBlueNote: () => void;
    sixthNote: boolean;
    onToggleSixthNote: () => void;
    // Chord Props
    mode: 'scale' | 'chord' | 'progression';
    onModeChange: (mode: 'scale' | 'chord' | 'progression') => void;
    chordType: string;
    onChordTypeChange: (type: string) => void;
    voicingIndex: number;
    onVoicingChange: (idx: number) => void;
    availableVoicingsCount: number;
    voicingLabels: string[]; // New: Specific names for voicings
    // Progression Props
    progressionName: string;
    onProgressionChange: (name: string) => void;
    currentStepIndex: number;
    onStepChange: (index: number) => void;
    isPlaying: boolean;
    onTogglePlay: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
    selectedKey,
    onKeyChange,
    selectedScaleGroup,
    selectedScaleName,
    onScaleChange,
    showChordTones,
    onToggleChordTones,
    showIntervals,
    onToggleIntervals,
    isPentatonic,
    blueNote,
    onToggleBlueNote,
    sixthNote,
    onToggleSixthNote,
    mode,
    onModeChange,
    chordType,
    onChordTypeChange,
    voicingIndex,
    onVoicingChange,
    availableVoicingsCount,
    voicingLabels,
    progressionName,
    onProgressionChange,
    currentStepIndex,
    onStepChange,
    isPlaying,
    onTogglePlay
}) => {
    return (
        <div className="flex flex-col gap-10 mb-12 w-full max-w-screen-2xl mx-auto relative z-20">

            {/* Mode Tab System */}
            <div className="flex justify-center mb-6">
                <div className="flex p-2 rounded-full bg-slate-950/80 border border-white/10 backdrop-blur-2xl shadow-2xl">
                    {(['scale', 'chord', 'progression'] as const).map((m) => {
                        const isActive = mode === m;
                        return (
                            <button
                                key={m}
                                onClick={() => onModeChange(m)}
                                className={`
                                    relative px-10 py-3 rounded-full text-xs font-bold uppercase tracking-[0.15em] transition-all duration-300 overflow-hidden
                                    ${isActive
                                        ? 'text-white shadow-[0_0_30px_rgba(59,130,246,0.5)]'
                                        : 'text-slate-500 hover:text-slate-300'}
                                `}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-100 rounded-full" />
                                )}
                                <span className="relative z-10">{m === 'progression' ? 'Prog Lesson' : m}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Left Panel: Key & Main Controls (Col Span 8) */}
                <div className="lg:col-span-8 glass-panel p-10 rounded-[2.5rem] flex flex-col gap-10 bg-slate-900/40">

                    {/* 1. Key Selection - Optimized for Mobile (Scrollable/Grid) */}
                    <div className="flex flex-col gap-6">
                        <div className="flex justify-between items-end border-b border-white/5 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_blue]" />
                                <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Key Selection</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{NOTES[selectedKey]} Selected</div>
                        </div>
                        {/* Use overflow-x-auto for mobile scrolling, flex-wrap for larger screens */}
                        <div className="flex overflow-x-auto md:flex-wrap gap-3 pb-2 md:pb-0 scrollbar-hide snap-x">
                            {NOTES.map((note, idx) => {
                                const isSelected = selectedKey === idx;
                                return (
                                    <button
                                        key={note}
                                        onClick={() => onKeyChange(idx)}
                                        className={`
                                            w-14 h-14 shrink-0 snap-center rounded-2xl font-black text-lg transition-all duration-200 flex items-center justify-center relative group
                                            ${isSelected
                                                ? 'text-white scale-110 z-10 shadow-[0_10px_20px_rgba(0,0,0,0.5)]'
                                                : 'text-slate-500 hover:text-slate-200 hover:scale-105'}
                                        `}
                                    >
                                        <div className={`
                                            absolute inset-0 rounded-2xl transition-all duration-300
                                            ${isSelected
                                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]'
                                                : 'bg-gradient-to-b from-slate-800 to-slate-900 border border-white/5 shadow-[0_4px_6px_rgba(0,0,0,0.3)] group-hover:border-white/10'}
                                        `} />
                                        <span className="relative z-10">{note}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. Contextual Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

                        {/* SCALE MODE */}
                        {mode === 'scale' && (
                            <>
                                <div className="flex flex-col gap-5">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Scale Type</span>
                                    <div className="relative group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        <select
                                            className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-2xl p-5 outline-none focus:border-blue-500/50 transition-all cursor-pointer appearance-none font-bold text-sm relative z-10 shadow-inner"
                                            value={`${selectedScaleGroup}|${selectedScaleName}`}
                                            onChange={(e) => {
                                                const [group, name] = e.target.value.split('|');
                                                onScaleChange(group, name);
                                            }}
                                        >
                                            {Object.entries(SCALES).map(([group, scales]) => (
                                                <optgroup key={group} label={group} className="bg-slate-950 text-slate-400">
                                                    {Object.keys(scales).map(scaleName => (
                                                        <option key={scaleName} value={`${group}|${scaleName}`}>{scaleName}</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 z-10">▼</div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-5">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Visuals</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={onToggleChordTones}
                                            className={`
                                                flex-1 py-5 rounded-2xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-2 group relative overflow-hidden shadow-lg
                                                ${showChordTones
                                                    ? 'bg-slate-900 border-amber-500/30 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                                                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-900 hover:text-slate-300'}
                                            `}
                                        >
                                            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${showChordTones ? 'bg-amber-500 shadow-[0_0_10px_orange] scale-125' : 'bg-slate-700'}`} />
                                            <span>Chord Tones</span>
                                        </button>

                                        <button
                                            onClick={onToggleIntervals}
                                            className={`
                                                flex-1 py-5 rounded-2xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-2 group relative overflow-hidden shadow-lg
                                                ${showIntervals
                                                    ? 'bg-slate-900 border-emerald-500/30 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                                                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-900 hover:text-slate-300'}
                                            `}
                                        >
                                            <span className="font-mono text-lg leading-none">{showIntervals ? '3rd' : 'E'}</span>
                                            <span>{showIntervals ? 'Intervals' : 'Notes'}</span>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* CHORD MODE */}
                        {mode === 'chord' && (
                            <>
                                <div className="flex flex-col gap-5">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Chord Type</span>
                                    <div className="flex gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800 overflow-x-auto">
                                        {['Major', 'Minor', '7'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => onChordTypeChange(type)}
                                                className={`flex-1 py-3 px-4 whitespace-nowrap rounded-xl text-xs font-bold transition-all relative
                                                    ${chordType === type
                                                        ? 'text-white shadow-lg'
                                                        : 'text-slate-500 hover:text-slate-300'}`}
                                            >
                                                {chordType === type && (
                                                    <div className="absolute inset-0 bg-gradient-to-b from-emerald-500 to-emerald-700 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] -z-10" />
                                                )}
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-5">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Voicing Variant</span>
                                    <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 p-2 rounded-2xl shadow-inner">
                                        <button
                                            onClick={() => onVoicingChange((voicingIndex - 1 + availableVoicingsCount) % availableVoicingsCount)}
                                            className="w-12 h-12 flex items-center justify-center bg-slate-800 rounded-xl hover:bg-slate-700 text-white transition-all shadow-md active:scale-95"
                                        >
                                            ←
                                        </button>
                                        <div className="flex-1 flex flex-col items-center">
                                            {/* Enhanced Labeling */}
                                            <span className="text-white font-bold text-sm text-center">
                                                {voicingLabels[voicingIndex] || `Variation ${voicingIndex + 1}`}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                                {voicingIndex + 1} / {availableVoicingsCount}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => onVoicingChange((voicingIndex + 1) % availableVoicingsCount)}
                                            className="w-12 h-12 flex items-center justify-center bg-slate-800 rounded-xl hover:bg-slate-700 text-white transition-all shadow-md active:scale-95"
                                        >
                                            →
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* PROGRESSION MODE */}
                        {mode === 'progression' && (
                            <>
                                <div className="flex flex-col gap-5">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Select Progression</span>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-2xl p-5 outline-none focus:border-amber-500/50 transition-all cursor-pointer font-bold text-sm appearance-none shadow-inner"
                                            value={progressionName}
                                            onChange={(e) => onProgressionChange(e.target.value)}
                                        >
                                            {Object.keys(COMMON_PROGRESSIONS).map(name => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-5">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Transport</span>
                                    {/* Progression Visualization Steps */}
                                    <div className="flex gap-1 mb-2">
                                        {COMMON_PROGRESSIONS[progressionName]?.map((step, idx) => {
                                            const isActive = idx === currentStepIndex;
                                            return (
                                                <div key={idx} className={`h-1 flex-1 rounded-full transition-all duration-300 ${isActive ? 'bg-amber-500 shadow-[0_0_10px_orange]' : 'bg-slate-800'}`} />
                                            )
                                        })}
                                    </div>

                                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-2 rounded-2xl shadow-inner">
                                        <button
                                            onClick={() => onStepChange(Math.max(0, currentStepIndex - 1))}
                                            className="w-12 h-12 flex items-center justify-center bg-slate-800 rounded-xl hover:bg-slate-700 text-white transition-all active:scale-95 shadow-md"
                                        >
                                            ⏮
                                        </button>
                                        <button
                                            onClick={onTogglePlay}
                                            className={`flex-1 h-12 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md 
                                                ${isPlaying
                                                    ? 'bg-amber-600 text-white animate-pulse shadow-[0_0_20px_orange]'
                                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                                        >
                                            {isPlaying ? 'STOP AUTO' : 'PLAY'}
                                        </button>
                                        <button
                                            onClick={() => onStepChange(currentStepIndex + 1)}
                                            className="w-12 h-12 flex items-center justify-center bg-slate-800 rounded-xl hover:bg-slate-700 text-white transition-all active:scale-95 shadow-md"
                                        >
                                            ⏭
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Right Panel: Modifiers (Col Span 4) */}
                <div className={`
                    lg:col-span-4 glass-panel p-10 rounded-[2.5rem] flex flex-col gap-6 h-full transition-all duration-500 bg-slate-900/40
                    ${(isPentatonic && mode === 'scale') ? 'opacity-100 translate-y-0' : 'opacity-30 grayscale pointer-events-none translate-y-4'}
                `}>
                    <div className="flex items-center gap-3 mb-2 border-b border-white/5 pb-4">
                        <div className={`w-2 h-2 rounded-full ${isPentatonic ? 'bg-purple-500 shadow-[0_0_10px_purple] animate-pulse' : 'bg-slate-700'}`} />
                        <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Pentatonic Extras</span>
                    </div>

                    <button
                        onClick={onToggleBlueNote}
                        className={`
                            w-full py-6 rounded-2xl text-sm font-bold border transition-all flex justify-between px-6 items-center group relative overflow-hidden shadow-lg
                            ${blueNote
                                ? 'border-purple-500/50 text-white shadow-[0_0_30px_rgba(168,85,247,0.2)]'
                                : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-900 hover:text-slate-300'}
                        `}
                    >
                        {blueNote && <div className="absolute inset-0 bg-gradient-to-r from-purple-900/80 to-fuchsia-900/80 -z-10" />}
                        <span className="z-10 relative">Add Blue Note (b5)</span>
                        <span className={`text-[10px] z-10 px-2 py-1 rounded-md font-mono ${blueNote ? 'bg-purple-500/30 text-purple-200' : 'bg-slate-800 text-slate-600'}`}>+6</span>
                    </button>

                    <button
                        onClick={onToggleSixthNote}
                        className={`
                            w-full py-6 rounded-2xl text-sm font-bold border transition-all flex justify-between px-6 items-center group relative overflow-hidden shadow-lg
                            ${sixthNote
                                ? 'border-purple-500/50 text-white shadow-[0_0_30px_rgba(168,85,247,0.2)]'
                                : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-900 hover:text-slate-300'}
                        `}
                    >
                        {sixthNote && <div className="absolute inset-0 bg-gradient-to-r from-purple-900/80 to-fuchsia-900/80 -z-10" />}
                        <span className="z-10 relative">Add 6th Note</span>
                        <span className={`text-[10px] z-10 px-2 py-1 rounded-md font-mono ${sixthNote ? 'bg-purple-500/30 text-purple-200' : 'bg-slate-800 text-slate-600'}`}>+9</span>
                    </button>

                    <div className="mt-auto p-4 rounded-xl bg-slate-950/50 border border-white/5 text-[10px] text-slate-500 leading-relaxed font-medium">
                        * Modifiers add exotic flavor to standard pentatonic shapes. Useful for Blues (b5) and Jazz/Fusion (6th).
                    </div>
                </div>
            </div>
        </div>
    );
};
