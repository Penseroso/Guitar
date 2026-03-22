import React from 'react';
import { Layers } from 'lucide-react';
import { SelectPill } from '../../ui/design-system/SelectPill';
import { PROGRESSION_LIBRARY } from '../../../utils/guitar/theory';

interface ProgressionPresetPanelProps {
    progressionName: string;
    onProgressionChange: (name: string) => void;
}

export const ProgressionPresetPanel: React.FC<ProgressionPresetPanelProps> = ({
    progressionName,
    onProgressionChange,
}) => {
    const options = PROGRESSION_LIBRARY.map((prog) => ({
        value: prog.id,
        label: prog.title,
    }));

    return (
        <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 flex flex-col gap-6 shadow-2xl relative w-full h-fit">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4">
                <Layers size={14} className="text-white/40" />
                <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em]">Progression Presets</span>
            </div>

            <div className="flex flex-col gap-4">
                <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em]">Presets</span>
                <SelectPill value={progressionName} onChange={onProgressionChange} options={options} />
            </div>
        </div>
    );
};
