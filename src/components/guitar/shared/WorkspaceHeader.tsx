import React from 'react';
import { Zap } from 'lucide-react';
import { TabsRail } from '../../ui/design-system/TabsRail';
import type { Mode } from '@/domain/shared/types';

export function WorkspaceHeader({ mode, onModeChange, onProjectFile }: {
    mode: Mode;
    onModeChange: (mode: Mode) => void;
    onProjectFile?: (file: File) => void;
}) {
    const projectInput = React.useRef<HTMLInputElement>(null);
    return (<header className="flex flex-col sm:flex-row justify-between sm:items-end gap-5 border-b border-white/5 pb-6 mb-6 sm:pb-8 sm:mb-8">
                    <div className="flex items-center justify-between gap-4 sm:gap-7">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-4xl font-black tracking-tighter text-white flex items-baseline gap-1">
                                <span className="font-extralight opacity-40 uppercase text-lg tracking-[0.3em]">the</span> MODUS
                            </h1>
                            <span className="text-[10px] font-black tracking-[0.4em] uppercase opacity-30 flex items-center gap-2 mt-1">
                                <Zap size={10} /> Harmonic Workstation
                            </span>
                        </div>
                        {onProjectFile && <>
                            <button type="button" className="min-h-11 min-w-11 px-1 text-sm text-[var(--workspace-muted)] hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--workspace-focus)]" onClick={() => projectInput.current?.click()}>Open project</button>
                            <input hidden ref={projectInput} type="file" accept=".modus.json,.json,application/json" aria-label="Choose a TAB project file"
                                onChange={event => {
                                    const file = event.target.files?.[0];
                                    event.target.value = '';
                                    if (file) onProjectFile(file);
                                }} />
                        </>}
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
