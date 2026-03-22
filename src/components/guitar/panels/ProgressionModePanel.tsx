import React from 'react';
import { Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { getNoteName } from '../../../utils/guitar/logic';

interface ProgressionModePanelProps {
    selectedKey: number;
    selectedScaleGroup: string;
    selectedScaleName: string;
    onScaleChange: (group: string, name: string) => void;
}

const DIATONIC_ORBIT = [
    { label: 'Ionian', technical: 'Ionian' },
    { label: 'Dorian', technical: 'Dorian' },
    { label: 'Phrygian', technical: 'Phrygian' },
    { label: 'Lydian', technical: 'Lydian' },
    { label: 'Mixolydian', technical: 'Mixolydian' },
    { label: 'Aeolian', technical: 'Aeolian' },
    { label: 'Locrian', technical: 'Locrian' },
];

export const ProgressionModePanel: React.FC<ProgressionModePanelProps> = ({
    selectedKey,
    selectedScaleGroup,
    selectedScaleName,
    onScaleChange,
}) => {
    return (
        <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden min-h-[380px]">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
                <Activity size={320} strokeWidth={0.5} />
            </div>

            <div className="relative w-full h-full flex items-center justify-center aspect-square max-w-[300px]">
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

                {DIATONIC_ORBIT.map((mode, index) => {
                    const angle = (index * 360) / DIATONIC_ORBIT.length;
                    const radius = 115;
                    const isActive = selectedScaleName === mode.technical && selectedScaleGroup === 'Diatonic Modes';

                    return (
                        <motion.button
                            key={mode.label}
                            initial={false}
                            animate={{
                                x: radius * Math.sin((angle * Math.PI) / 180),
                                y: -radius * Math.cos((angle * Math.PI) / 180),
                                scale: isActive ? 1.1 : 1,
                            }}
                            whileHover={{ scale: 1.15, transition: { duration: 0.2 } }}
                            onClick={() => onScaleChange('Diatonic Modes', mode.technical)}
                            className={`absolute w-14 h-14 rounded-full border flex flex-col items-center justify-center transition-all duration-500 shadow-lg ${
                                isActive
                                    ? 'bg-white border-white text-black shadow-[0_0_30px_rgba(255,255,255,0.3)] z-30'
                                    : 'bg-black/40 border-white/10 text-white/40 hover:border-white/40 hover:text-white z-10 backdrop-blur-sm'
                            }`}
                        >
                            <span className="text-[7px] font-black uppercase tracking-tighter opacity-60 mb-0.5">{index + 1}</span>
                            <span className="text-[8px] font-black uppercase tracking-widest">{mode.label.slice(0, 3)}</span>
                            {isActive && (
                                <motion.div
                                    layoutId="progression-orbit-glow"
                                    className="absolute inset-0 rounded-full bg-white/20 blur-md -z-10"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                />
                            )}
                        </motion.button>
                    );
                })}

                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.05]">
                    <circle cx="50%" cy="50%" r="115" fill="none" stroke="white" strokeWidth="1" strokeDasharray="4 8" />
                </svg>
            </div>
        </div>
    );
};
