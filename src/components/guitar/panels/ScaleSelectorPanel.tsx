import React from 'react';
import { Layers } from 'lucide-react';
import {
    SCALE_FAMILY_ORDER,
    getDefaultScaleForFamily,
    getVisibleScaleFamily,
    type VisibleScaleFamily,
} from '../../../utils/guitar/scaleSelector';
import { SelectPill } from '../../ui/design-system/SelectPill';
import { ScaleOrbit } from '../scale-selector/ScaleOrbit';

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
    const activeFamily = getVisibleScaleFamily(selectedScaleGroup);
    const familyOptions = SCALE_FAMILY_ORDER.map((family) => ({
        value: family,
        label: family,
    }));

    return (
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-7 flex flex-col gap-6 shadow-2xl relative w-full overflow-visible">
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.11),_transparent_42%)]" />

            <div className="relative z-10 flex items-center gap-2">
                <Layers size={14} className="text-white/35" />
                <span className="text-[10px] font-black uppercase text-white/35 tracking-[0.3em]">Scale Navigator</span>
            </div>

            <div className="relative z-10 flex flex-col gap-5">
                <ScaleOrbit
                    selectedScaleGroup={selectedScaleGroup}
                    selectedScaleName={selectedScaleName}
                    onScaleChange={onScaleChange}
                />

                <div className="flex justify-center">
                    <SelectPill
                        value={activeFamily}
                        onChange={(value) => handleFamilyChange(value as VisibleScaleFamily)}
                        options={familyOptions}
                        className="w-full max-w-[240px]"
                    />
                </div>
            </div>
        </div>
    );
};
