import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface ScaleOrbitNodeProps {
    label: string;
    indexLabel: string;
    isActive: boolean;
    x: number;
    y: number;
    onClick: () => void;
}

export const ScaleOrbitNode: React.FC<ScaleOrbitNodeProps> = ({
    label,
    indexLabel,
    isActive,
    x,
    y,
    onClick,
}) => {
    const reducedMotion = useReducedMotion();
    return (
        <motion.button
            type="button"
            aria-label={label}
            aria-pressed={isActive}
            initial={false}
            animate={{ x, y, scale: isActive ? 1.1 : 1 }}
            transition={{ duration: reducedMotion ? 0 : .18, ease: 'easeOut' }}
            whileHover={reducedMotion ? undefined : { scale: 1.1, transition: { duration: 0.18 } }}
            onClick={onClick}
            className={`absolute w-16 h-16 rounded-full border flex flex-col items-center justify-center focus-visible:outline-2 focus-visible:outline-cyan-200 focus-visible:outline-offset-4 shadow-lg ${
                isActive
                    ? 'bg-white border-white text-black shadow-[0_0_30px_rgba(255,255,255,0.3)] z-30'
                    : 'bg-black/55 border-white/10 text-white/45 hover:text-white hover:border-white/35 backdrop-blur-sm z-10'
            }`}
        >
            <span className="text-[7px] font-black uppercase tracking-[0.25em] opacity-60">{indexLabel}</span>
            <span className="text-[8px] font-black uppercase tracking-[0.15em] leading-tight text-center px-1">{label}</span>
            {isActive && (
                <motion.div
                    layoutId="scale-orbit-glow"
                    className="absolute inset-0 rounded-full bg-white/20 blur-md -z-10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                />
            )}
        </motion.button>
    );
};
