import React from 'react';
import { getScaleDisplayName, getVisibleScaleFamilyLabel } from '../../../utils/guitar/scaleSelector';

interface RelatedScaleChipProps {
    group: string;
    name: string;
    isActive: boolean;
    onClick: () => void;
}

export const RelatedScaleChip: React.FC<RelatedScaleChipProps> = ({
    group,
    name,
    isActive,
    onClick,
}) => {
    return (
        <button
            onClick={onClick}
            className={`min-w-[140px] rounded-2xl border px-4 py-3 text-left transition-all ${
                isActive
                    ? 'bg-white/10 border-white/30 text-white'
                    : 'bg-white/[0.02] border-white/10 text-white/65 hover:border-white/25 hover:text-white'
            }`}
        >
            <div className="text-[8px] font-black uppercase tracking-[0.28em] text-white/30">{getVisibleScaleFamilyLabel(group)}</div>
            <div className="text-sm font-semibold mt-1">{getScaleDisplayName(name)}</div>
        </button>
    );
};
