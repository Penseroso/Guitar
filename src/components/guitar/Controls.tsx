import React, { useState } from 'react';
import { Zap, Target, Compass, Activity, Layers, Disc } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NOTES, SCALES, CHORD_SHAPES, PROGRESSION_LIBRARY } from '../../utils/guitar/theory';
import { getChordFromDegree, getNoteName, injectSecondaryDominants } from '../../utils/guitar/logic';
import { TabsRail } from '../ui/design-system/TabsRail';
import { KeyButton } from '../ui/design-system/KeyButton';
import { SelectPill } from '../ui/design-system/SelectPill';
import { TogglePill } from '../ui/design-system/TogglePill';
import { CircleOfFifths } from './CircleOfFifths';

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
    secondNote: boolean;
    onToggleSecondNote: () => void;
    isDoubleStopActive: boolean;
    onToggleDoubleStop: () => void;
    doubleStopInterval: number;
    onDoubleStopIntervalChange: (interval: number) => void;
    doubleStopStrings: [number, number];
    onDoubleStopStringsChange: (strings: [number, number]) => void;
    mode: 'scale' | 'chord' | 'progression';
    onModeChange: (mode: 'scale' | 'chord' | 'progression') => void;
    chordType: string;
    onChordTypeChange: (type: string) => void;
    voicingIndex: number;
    onVoicingChange: (idx: number) => void;
    availableVoicingsCount: number;
    voicingLabels: string[];
    progressionName: string;
    onProgressionChange: (name: string) => void;
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
    secondNote,
    onToggleSecondNote,
    isDoubleStopActive,
    onToggleDoubleStop,
    doubleStopInterval,
    onDoubleStopIntervalChange,
    doubleStopStrings,
    onDoubleStopStringsChange,
    mode,
    onModeChange,
    chordType,
    onChordTypeChange,
    progressionName,
    onProgressionChange,
}) => {
    const [rootViewMode, setRootViewMode] = useState<'orbit' | 'matrix'>('orbit');

    const scaleOptions = Object.entries(SCALES).flatMap(([group, scales]) =>
        Object.keys(scales).map(name => ({
            value: `${group}|${name}`,
            label: `${group} - ${name}`
        }))
    );

    const progressionOptions = PROGRESSION_LIBRARY.map(prog => ({
        value: prog.id,
        label: prog.title
    }));

    const getChordName = (degree: string) => {
        if (degree.startsWith('V7 of ')) {
            const targetDegree = degree.replace('V7 of ', '');
            const targetInfo = getChordFromDegree(targetDegree);
            const targetRoot = (selectedKey + targetInfo.interval) % 12;
            const stepRoot = (targetRoot + 7) % 12;
            return `${getNoteName(stepRoot)}7`;
        }

        const { interval, type } = getChordFromDegree(degree);
        const rootNoteIdx = (selectedKey + interval) % 12;
        const rootText = getNoteName(rootNoteIdx);
        const suffix = type === 'Minor' ? 'm' : type === 'Diminished' ? 'dim' : type === 'Augmented' ? 'aug' : '';
        return `${rootText}${suffix}`;
    };

    const getStructureDisplay = () => {
        const INTERVAL_NAMES = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];

        if (mode === 'scale') {
            const arr = SCALES[selectedScaleGroup]?.[selectedScaleName] || [];
            return arr.map((i: number) => INTERVAL_NAMES[i]).join(' · ');
        } else if (mode === 'chord') {
            const chordIntervals: Record<string, number[]> = {
                "Major": [0, 4, 7],
                "Minor": [0, 3, 7],
                "Major 7": [0, 4, 7, 11],
                "Minor 7": [0, 3, 7, 10],
                "Dominant 7": [0, 4, 7, 10],
                "m7b5 (Half Dim)": [0, 3, 6, 10],
                "Diminished 7": [0, 3, 6, 9],
                "Major 9": [0, 4, 7, 11, 2],
                "Minor 9": [0, 3, 7, 10, 2],
                "Dominant 9": [0, 4, 7, 10, 2],
                "13": [0, 4, 7, 10, 2, 9],
                "7#9 (Hendrix)": [0, 4, 7, 10, 3],
                "7b9": [0, 4, 7, 10, 1],
                "sus4": [0, 5, 7],
                "sus2": [0, 2, 7],
                "Power (5)": [0, 7]
            };
            const arr = chordIntervals[chordType] || [];

            if (chordType === "7#9 (Hendrix)") return ['1', '3', '5', 'b7', '#9'].join(' · ');
            if (chordType === "7b9") return ['1', '3', '5', 'b7', 'b9'].join(' · ');
            if (chordType === "Major 9") return ['1', '3', '5', '7', '9'].join(' · ');
            if (chordType === "Minor 9") return ['1', 'b3', '5', 'b7', '9'].join(' · ');
            if (chordType === "Dominant 9") return ['1', '3', '5', 'b7', '9'].join(' · ');
            if (chordType === "13") return ['1', '3', '5', 'b7', '9', '13'].join(' · ');

            return arr.map((i: number) => INTERVAL_NAMES[i]).join(' · ');
        } else if (mode === 'progression') {
            const prog = PROGRESSION_LIBRARY.find(p => p.id === progressionName);
            const steps = prog ? prog.degrees : [];
            return steps.map(deg => getChordName(deg)).join(' · ');
        }
        return '-';
    };

    return (
        <>
            {/* LEFT RACK: LOGIC & NAVIGATOR */}
            <div className="col-span-1 lg:col-span-8 flex flex-col w-full h-full">
                <header className="flex justify-between items-end border-b border-white/5 pb-8 mb-8">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-4xl font-black tracking-tighter text-white flex items-baseline gap-1">
                            <span className="font-extralight opacity-40 uppercase text-lg tracking-[0.3em]">the</span> MODUS
                        </h1>
                        <span className="text-[10px] font-black tracking-[0.4em] uppercase opacity-30 flex items-center gap-2 mt-1">
                            <Zap size={10} /> Harmonic Workstation
                        </span>
                    </div>
                    <TabsRail
                        tabs={[
                            { id: 'scale', label: 'Scale' },
                            { id: 'chord', label: 'Chord' },
                            { id: 'progression', label: 'Prog' }
                        ]}
                        activeId={mode}
                        onChange={(id) => onModeChange(id as any)}
                    />
                </header>

                <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-10 min-h-[580px] relative overflow-hidden shadow-[inset_0_0_80px_rgba(0,0,0,0.5)]">
                    <div className="absolute top-8 left-10 flex flex-col gap-3 z-20">
                        <div className="flex items-center gap-2 opacity-30">
                            <Disc size={12} fill="currentColor" />
                            <span className="text-[9px] font-black tracking-[0.3em] uppercase text-white">Root Navigator</span>
                        </div>
                        <div className="flex bg-black/60 p-1 rounded-full border border-white/5 backdrop-blur-md w-fit shadow-inner">
                            <button
                                onClick={() => setRootViewMode('orbit')}
                                className={`flex items-center gap-2 px-5 py-2 rounded-full transition-all duration-300 text-[10px] font-black tracking-widest uppercase ${rootViewMode === 'orbit' ? 'bg-white text-black shadow-lg' : 'text-white/20 hover:text-white/40'
                                    }`}
                            >
                                <Compass size={12} /> ORBIT
                            </button>
                            <button
                                onClick={() => setRootViewMode('matrix')}
                                className={`flex items-center gap-2 px-5 py-2 rounded-full transition-all duration-300 text-[10px] font-black tracking-widest uppercase ${rootViewMode === 'matrix' ? 'bg-white text-black shadow-lg' : 'text-white/20 hover:text-white/40'
                                    }`}
                            >
                                <Target size={12} /> MATRIX
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 mt-24 flex items-center justify-center w-full min-h-[420px]">
                        <AnimatePresence mode="wait">
                            {rootViewMode === 'orbit' ? (
                                <motion.div
                                    key="orbit"
                                    initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                    className="w-[420px] h-[420px] drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] flex justify-center items-center"
                                >
                                    <CircleOfFifths
                                        selectedKey={selectedKey}
                                        onKeySelect={onKeyChange}
                                        selectedScaleGroup={selectedScaleGroup}
                                        selectedScaleName={selectedScaleName}
                                    />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="matrix"
                                    initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                    className="grid grid-cols-4 gap-3 max-w-lg w-full"
                                >
                                    {NOTES.map((note, index) => (
                                        <KeyButton
                                            key={`key-${index}`}
                                            note={note}
                                            isActive={selectedKey === index}
                                            onClick={() => onKeyChange(index)}
                                        />
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* RIGHT RACK: PARAMETERS */}
            <div className="col-span-1 lg:col-span-4 flex flex-col gap-6 w-full h-full lg:mt-[116px] relative z-50">
                {/* Context-Aware Info Panel */}
                <AnimatePresence mode="wait">
                    {mode === 'progression' ? (
                        <motion.div 
                            key="mode-wheel"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden min-h-[380px]"
                        >
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
                                <Activity size={320} strokeWidth={0.5} />
                            </div>
                            
                            {/* The Wheel Container */}
                            <div className="relative w-full h-full flex items-center justify-center aspect-square max-w-[300px]">
                                {/* Center: Tonic */}
                                <div className="relative z-20 flex flex-col items-center justify-center">
                                    <motion.h2 
                                        key={selectedKey}
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="text-7xl font-black text-white tracking-tighter leading-none drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                                    >
                                        {getNoteName(selectedKey)}
                                    </motion.h2>
                                    <span className="text-[10px] font-black tracking-[0.4em] text-white/20 uppercase mt-2">Tonic</span>
                                </div>

                                {/* Orbiting Modes */}
                                {[
                                    { label: 'Ionian', technical: 'Major / Ionian' },
                                    { label: 'Dorian', technical: 'Dorian' },
                                    { label: 'Phrygian', technical: 'Phrygian' },
                                    { label: 'Lydian', technical: 'Lydian' },
                                    { label: 'Mixolydian', technical: 'Mixolydian' },
                                    { label: 'Aeolian', technical: 'N Minor / Aeolian' },
                                    { label: 'Locrian', technical: 'Locrian' },
                                ].map((m, i) => {
                                    const angle = (i * 360) / 7;
                                    const radius = 115; // Orbital radius
                                    const isActive = selectedScaleName === m.technical && selectedScaleGroup === 'Major Modes';
                                    
                                    return (
                                        <motion.button
                                            key={m.label}
                                            initial={false}
                                            animate={{ 
                                                x: radius * Math.sin((angle * Math.PI) / 180),
                                                y: -radius * Math.cos((angle * Math.PI) / 180),
                                                scale: isActive ? 1.1 : 1,
                                            }}
                                            whileHover={{ scale: 1.15, transition: { duration: 0.2 } }}
                                            onClick={() => onScaleChange('Major Modes', m.technical)}
                                            className={`absolute w-14 h-14 rounded-full border flex flex-col items-center justify-center transition-all duration-500 shadow-lg ${
                                                isActive 
                                                    ? 'bg-white border-white text-black shadow-[0_0_30px_rgba(255,255,255,0.3)] z-30' 
                                                    : 'bg-black/40 border-white/10 text-white/40 hover:border-white/40 hover:text-white z-10 backdrop-blur-sm'
                                            }`}
                                        >
                                            <span className="text-[7px] font-black uppercase tracking-tighter opacity-60 mb-0.5">{(i + 1)}</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest">{m.label.slice(0, 3)}</span>
                                            {isActive && (
                                                <motion.div 
                                                    layoutId="glow"
                                                    className="absolute inset-0 rounded-full bg-white/20 blur-md -z-10"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                />
                                            )}
                                        </motion.button>
                                    );
                                })}

                                {/* Connection Lines (Aesthetics) */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.05]">
                                    <circle cx="50%" cy="50%" r="115" fill="none" stroke="white" strokeWidth="1" strokeDasharray="4 8" />
                                </svg>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="status-panel"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 flex flex-col gap-6 shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] pointer-events-none text-white">
                                <Activity size={120} strokeWidth={1} />
                            </div>
                            <div className="flex flex-col items-center justify-center relative z-10 py-2">
                                <div className="flex items-baseline gap-2">
                                    <h2 className="text-6xl font-black text-white tracking-tighter leading-none">
                                        {getNoteName(selectedKey)}
                                    </h2>
                                    <span className="text-xl font-light text-white/20 tracking-widest uppercase italic leading-none">Active</span>
                                </div>
                            </div>
                            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-1" />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">Mode Status</span>
                                    <span className="text-xs font-bold text-white/70 tracking-wider uppercase">
                                        {mode === 'scale' ? selectedScaleName :
                                            mode === 'chord' ? chordType :
                                                mode === 'progression' ? (PROGRESSION_LIBRARY.find(p => p.id === progressionName)?.degrees.join(' · ') || mode) : mode}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">Structure / Degrees</span>
                                    <span className="text-xs font-black text-white/70 tracking-normal">
                                        {getStructureDisplay()}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 flex flex-col gap-6 shadow-2xl relative w-full h-fit">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-4">
                        <Layers size={14} className="text-white/40" />
                        <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em]">Matrix Engines</span>
                    </div>

                    {mode === 'scale' && (
                        <div className="flex flex-col gap-4">
                            <SelectPill
                                value={`${selectedScaleGroup}|${selectedScaleName}`}
                                onChange={(val) => {
                                    const [g, n] = val.split('|');
                                    onScaleChange(g, n);
                                }}
                                options={scaleOptions}
                            />
                        </div>
                    )}

                    {mode === 'chord' && (
                        <div className="flex flex-col gap-6 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                            {[
                                { category: "Triads", types: ["Major", "Minor", "Power (5)"] },
                                { category: "7th Chords", types: ["Major 7", "Minor 7", "Dominant 7", "m7b5 (Half Dim)", "Diminished 7"] },
                                { category: "Extended", types: ["Major 9", "Minor 9", "Dominant 9", "13"] },
                                { category: "Altered & Sus", types: ["sus2", "sus4", "7#9 (Hendrix)", "7b9"] }
                            ].map(group => (
                                <div key={group.category} className="flex flex-col gap-3">
                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] border-l border-white/20 pl-2">{group.category}</span>
                                    <div className="flex gap-2 flex-wrap">
                                        {group.types.map(type => CHORD_SHAPES[type] && (
                                            <button key={type} onClick={() => onChordTypeChange(type)}
                                                className={`px-3 py-1.5 text-[10px] font-black rounded-md border transition-all ${chordType === type ? 'bg-white/10 text-white border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'border-white/5 text-white/40 hover:border-white/20 hover:text-white'}`}>
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {mode === 'progression' && (
                        <div className="flex flex-col gap-4">
                            <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em]">Presets</span>
                            <SelectPill value={progressionName} onChange={onProgressionChange} options={progressionOptions} />
                        </div>
                    )}
                </div>
            </div>

        </>
    );
};