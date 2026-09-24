import React from 'react';
import { Zap } from 'lucide-react';
import { TabsRail } from '../../ui/design-system/TabsRail';
import type { Mode } from '@/domain/shared/types';

export function WorkspaceHeader({ mode, onModeChange }: {
    mode: Mode;
    onModeChange: (mode: Mode) => void;
}) {
    return (<header className="flex flex-col sm:flex-row justify-between sm:items-end gap-5 border-b border-white/5 pb-6 mb-6 sm:pb-8 sm:mb-8">
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
                            { id: 'harmony', label: 'Harmony' },
                        ]}
                        activeId={mode}
                        onChange={(id) => onModeChange(id as Mode)}
                    />
                </header>);
}
