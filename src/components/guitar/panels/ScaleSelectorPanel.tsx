import React from 'react';
import { Layers, Sparkles } from 'lucide-react';
import {
    getDefaultScaleForFamily,
    getScaleMetadata,
    getVisibleScaleFamily,
    type VisibleScaleFamily,
} from '../../../utils/guitar/scaleSelector';
import { ScaleFamilyRail } from '../scale-selector/ScaleFamilyRail';
import { ScaleOrbit } from '../scale-selector/ScaleOrbit';
import { RelatedScalesRail } from '../scale-selector/RelatedScalesRail';

interface ScaleSelectorPanelProps {
    selectedScaleGroup: string;
    selectedScaleName: string;
    onScaleChange: (group: string, name: string) => void;
}

export const ScaleSelectorPanel: React.FC<ScaleSelectorPanelProps> = ({
    selectedScaleGroup,
    selectedScaleName,
    onScaleChange,
}) => {
    const handleFamilyChange = (family: VisibleScaleFamily) => {
        if (getVisibleScaleFamily(selectedScaleGroup) === family) return;
        const nextScale = getDefaultScaleForFamily(family);
        onScaleChange(nextScale.group, nextScale.name);
    };
    const metadata = getScaleMetadata(selectedScaleGroup, selectedScaleName);

    return (
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-7 flex flex-col gap-6 shadow-2xl relative w-full overflow-hidden">
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.11),_transparent_42%)]" />

            <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Layers size={14} className="text-white/35" />
                    <span className="text-[10px] font-black uppercase text-white/35 tracking-[0.3em]">Scale Navigator</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.28em] text-white/40">
                    <Sparkles size={10} />
                    {metadata.familyLabel}
                </div>
            </div>

            <div className="relative z-10 flex flex-col gap-5">
                <ScaleOrbit
                    selectedScaleGroup={selectedScaleGroup}
                    selectedScaleName={selectedScaleName}
                    onScaleChange={onScaleChange}
                />

                <div className="flex flex-col gap-4 rounded-[1.75rem] border border-white/5 bg-white/[0.025] px-5 py-4 backdrop-blur-sm">
                    <div className="flex flex-col gap-1">
                        <div className="text-[8px] font-black uppercase tracking-[0.32em] text-white/28">Formula</div>
                        <div className="text-sm font-semibold text-white/62">{metadata.formula.join(' · ')}</div>
                    </div>

                    <ScaleFamilyRail selectedScaleGroup={selectedScaleGroup} onSelectFamily={handleFamilyChange} />
                </div>

                <RelatedScalesRail
                    selectedScaleGroup={selectedScaleGroup}
                    selectedScaleName={selectedScaleName}
                    onScaleChange={onScaleChange}
                />
            </div>
        </div>
    );
};
