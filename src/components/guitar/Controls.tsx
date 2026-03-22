import React, { useState } from 'react';
import { Zap, Target, Compass, Disc } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NOTES } from '../../utils/guitar/theory';
import { TabsRail } from '../ui/design-system/TabsRail';
import { KeyButton } from '../ui/design-system/KeyButton';
import { CircleOfFifths } from './CircleOfFifths';
import { ChordModePanel } from './panels/ChordModePanel';
import { ProgressionModePanel } from './panels/ProgressionModePanel';
import { ScaleSelectorPanel } from './panels/ScaleSelectorPanel';
import { ChordSelectorPanel } from './panels/ChordSelectorPanel';
import { ProgressionPresetPanel } from './panels/ProgressionPresetPanel';

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
    mode,
    onModeChange,
    chordType,
    onChordTypeChange,
    voicingIndex,
    availableVoicingsCount,
    voicingLabels,
    progressionName,
    onProgressionChange,
}) => {
    const [rootViewMode, setRootViewMode] = useState<'orbit' | 'matrix'>('orbit');

    return (
        <>
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
                            { id: 'progression', label: 'Prog' },
                        ]}
                        activeId={mode}
                        onChange={(id) => onModeChange(id as 'scale' | 'chord' | 'progression')}
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
                                className={`flex items-center gap-2 px-5 py-2 rounded-full transition-all duration-300 text-[10px] font-black tracking-widest uppercase ${
                                    rootViewMode === 'orbit' ? 'bg-white text-black shadow-lg' : 'text-white/20 hover:text-white/40'
                                }`}
                            >
                                <Compass size={12} /> ORBIT
                            </button>
                            <button
                                onClick={() => setRootViewMode('matrix')}
                                className={`flex items-center gap-2 px-5 py-2 rounded-full transition-all duration-300 text-[10px] font-black tracking-widest uppercase ${
                                    rootViewMode === 'matrix' ? 'bg-white text-black shadow-lg' : 'text-white/20 hover:text-white/40'
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
                                    initial={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
                                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
                                    transition={{ duration: 0.4, ease: 'easeOut' }}
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
                                    initial={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
                                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
                                    transition={{ duration: 0.4, ease: 'easeOut' }}
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

            <div className="col-span-1 lg:col-span-4 flex flex-col gap-6 w-full h-full lg:mt-[116px] relative z-50">
                {mode === 'scale' && (
                    <motion.div key="scale-selector-surface" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <ScaleSelectorPanel
                            selectedScaleGroup={selectedScaleGroup}
                            selectedScaleName={selectedScaleName}
                            onScaleChange={onScaleChange}
                        />
                    </motion.div>
                )}

                {mode === 'chord' && (
                    <>
                        <AnimatePresence mode="wait">
                            <motion.div key="chord-mode-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                <ChordModePanel
                                    selectedKey={selectedKey}
                                    chordType={chordType}
                                    voicingIndex={voicingIndex}
                                    availableVoicingsCount={availableVoicingsCount}
                                    voicingLabels={voicingLabels}
                                />
                            </motion.div>
                        </AnimatePresence>
                        <ChordSelectorPanel chordType={chordType} onChordTypeChange={onChordTypeChange} />
                    </>
                )}

                {mode === 'progression' && (
                    <>
                        <AnimatePresence mode="wait">
                            <motion.div key="progression-mode-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                <ProgressionModePanel
                                    selectedKey={selectedKey}
                                    selectedScaleGroup={selectedScaleGroup}
                                    selectedScaleName={selectedScaleName}
                                    onScaleChange={onScaleChange}
                                />
                            </motion.div>
                        </AnimatePresence>
                        <ProgressionPresetPanel
                            progressionName={progressionName}
                            onProgressionChange={onProgressionChange}
                        />
                    </>
                )}
            </div>
        </>
    );
};
