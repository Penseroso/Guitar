import React from 'react';
import { getScaleDisplayName, getVisibleScaleFamilyLabel } from '../../../utils/guitar/scaleSelector';

interface RelatedScaleChipProps {
    group: string;
    name: string;
    isCommitted: boolean;
    isPreview: boolean;
    onClick: () => void;
}

export const RelatedScaleChip: React.FC<RelatedScaleChipProps> = ({
    group,
    name,
    isCommitted,
    isPreview,
    onClick,
}) => {
    return (
        <button
            onClick={onClick}
            className={`min-w-[140px] rounded-2xl border px-4 py-3 text-left transition-all ${
                isCommitted
                    ? 'bg-white/10 border-white/30 text-white'
                    : isPreview
                        ? 'bg-cyan-400/[0.08] border-cyan-300/50 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.12)]'
                    : 'bg-white/[0.02] border-white/10 text-white/65 hover:border-white/25 hover:text-white'
            }`}
        >
            <div className={`text-[8px] font-black uppercase tracking-[0.28em] ${isPreview ? 'text-cyan-200/70' : 'text-white/30'}`}>{getVisibleScaleFamilyLabel(group)}</div>
            <div className="text-sm font-semibold mt-1">{getScaleDisplayName(name)}</div>
        </button>
    );
};
