"use client";

import React, { useState } from 'react';
import { Target, Compass, Disc } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getKeyName } from '@/domain/shared/keys';
import { KeyButton } from '../../ui/design-system/KeyButton';
import { CircleOfFifths } from '../shared/CircleOfFifths';
import styles from './scale-workspace.module.css';

// Rail-sized presentation variant of the root navigator Controls.tsx also renders for Progression
// (orbit/matrix toggle + CircleOfFifths, or the 12-key matrix) — same components, same domain
// theory, just scaled to fit a 320px context rail instead of a full-width hero panel.
interface ScaleRootNavigatorProps {
    selectedKey: number;
    onKeyChange: (key: number) => void;
    selectedScaleGroup: string;
    selectedScaleName: string;
}

export function ScaleRootNavigator({ selectedKey, onKeyChange, selectedScaleGroup, selectedScaleName }: ScaleRootNavigatorProps) {
    const [rootViewMode, setRootViewMode] = useState<'orbit' | 'matrix'>('orbit');

    return (
        <div className={styles.panel}>
            <div className="flex items-center justify-between gap-2 mb-5">
                <div className="flex items-center gap-2 opacity-30">
                    <Disc size={12} fill="currentColor" />
                    <span className="text-[9px] font-black tracking-[0.3em] uppercase text-white">Root Navigator</span>
                </div>
                <div className="flex bg-black/60 p-1 rounded-full border border-white/5 shadow-inner">
                    <button
                        onClick={() => setRootViewMode('orbit')}
                        aria-pressed={rootViewMode === 'orbit'}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 text-[9px] font-black tracking-widest uppercase ${
                            rootViewMode === 'orbit' ? 'bg-white text-black shadow-lg' : 'text-white/20 hover:text-white/40'
                        }`}
                    >
                        <Compass size={11} /> Orbit
                    </button>
                    <button
                        onClick={() => setRootViewMode('matrix')}
                        aria-pressed={rootViewMode === 'matrix'}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 text-[9px] font-black tracking-widest uppercase ${
                            rootViewMode === 'matrix' ? 'bg-white text-black shadow-lg' : 'text-white/20 hover:text-white/40'
                        }`}
                    >
                        <Target size={11} /> Matrix
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-center min-h-[240px]">
                <AnimatePresence mode="wait">
                    {rootViewMode === 'orbit' ? (
                        <motion.div
                            key="orbit"
                            initial={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
                            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="w-full max-w-[260px] aspect-square flex justify-center items-center"
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
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="grid grid-cols-3 gap-2 w-full"
                        >
                            {Array.from({ length: 12 }, (_, index) => (
                                <KeyButton
                                    key={`key-${index}`}
                                    note={getKeyName(index)}
                                    isActive={selectedKey === index}
                                    onClick={() => onKeyChange(index)}
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
