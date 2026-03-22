import React from 'react';
import { motion } from 'framer-motion';
import { getScaleDisplayName, getScaleFamilyModes, getScaleOrbitLabel } from '../../../utils/guitar/scaleSelector';
import { ScaleOrbitNode } from './ScaleOrbitNode';

interface ScaleOrbitProps {
    selectedScaleGroup: string;
    selectedScaleName: string;
    onScaleChange: (group: string, name: string) => void;
}

export const ScaleOrbit: React.FC<ScaleOrbitProps> = ({
    selectedScaleGroup,
    selectedScaleName,
    onScaleChange,
}) => {
    const modes = getScaleFamilyModes(selectedScaleGroup);
    const radius = modes.length <= 2 ? 92 : 108;
    const displayName = getScaleDisplayName(selectedScaleName);

    return (
        <div className="relative w-full h-[360px] rounded-[2rem] border border-white/5 bg-[#050505]/70 overflow-hidden shadow-[inset_0_0_80px_rgba(255,255,255,0.03)]">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] [background-size:18px_18px]" />
            <div className="absolute inset-x-10 top-10 h-24 rounded-full bg-white/[0.04] blur-3xl pointer-events-none" />
            <div className="relative w-full h-full flex items-center justify-center">
                <div className="relative z-10 flex flex-col items-center justify-center">
                    <motion.span
                        key={selectedScaleGroup + selectedScaleName}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-2xl font-black text-white tracking-tight drop-shadow-[0_0_20px_rgba(255,255,255,0.18)]"
                    >
                        {displayName}
                    </motion.span>
                </div>

                {modes.map((mode, index) => {
                    const angle = modes.length === 2 ? index * 180 : (index * 360) / modes.length;
                    const x = radius * Math.sin((angle * Math.PI) / 180);
                    const y = -radius * Math.cos((angle * Math.PI) / 180);

                    return (
                        <ScaleOrbitNode
                            key={`${mode.group}-${mode.name}`}
                            label={getScaleOrbitLabel(mode.name)}
                            indexLabel={`${index + 1}`}
                            isActive={mode.group === selectedScaleGroup && mode.name === selectedScaleName}
                            x={x}
                            y={y}
                            onClick={() => onScaleChange(mode.group, mode.name)}
                        />
                    );
                })}

                <motion.svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.08]">
                    <circle cx="50%" cy="50%" r={radius} fill="none" stroke="white" strokeWidth="1" strokeDasharray="4 8" />
                </motion.svg>
            </div>
        </div>
    );
};
