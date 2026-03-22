import React from 'react';
import { getScaleFamilyOptions, getVisibleScaleFamily, type VisibleScaleFamily } from '../../../utils/guitar/scaleSelector';

interface ScaleFamilyRailProps {
    selectedScaleGroup: string;
    onSelectFamily: (family: VisibleScaleFamily) => void;
}

export const ScaleFamilyRail: React.FC<ScaleFamilyRailProps> = ({
    selectedScaleGroup,
    onSelectFamily,
}) => {
    const activeFamily = getVisibleScaleFamily(selectedScaleGroup);

    return (
        <div className="flex flex-wrap gap-2">
            {getScaleFamilyOptions().map(({ family }) => (
                <button
                    key={family}
                    onClick={() => onSelectFamily(family)}
                    className={`px-3 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                        activeFamily === family
                            ? 'bg-white text-black border-white shadow-[0_0_18px_rgba(255,255,255,0.16)]'
                            : 'bg-white/[0.02] border-white/10 text-white/45 hover:text-white hover:border-white/30'
                    }`}
                >
                    {family}
                </button>
            ))}
        </div>
    );
};
