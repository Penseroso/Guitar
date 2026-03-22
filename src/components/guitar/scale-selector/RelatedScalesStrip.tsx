import React from 'react';
import { buildScaleId, getRelatedScales } from '../../../utils/guitar/scaleSelector';
import { RelatedScaleChip } from './RelatedScaleChip';

interface RelatedScalesStripProps {
    selectedScaleGroup: string;
    selectedScaleName: string;
    onScaleChange: (group: string, name: string) => void;
}

export const RelatedScalesStrip: React.FC<RelatedScalesStripProps> = ({
    selectedScaleGroup,
    selectedScaleName,
    onScaleChange,
}) => {
    const relatedScales = getRelatedScales(buildScaleId(selectedScaleGroup, selectedScaleName));

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">Related Scales</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
                {relatedScales.map((scale) => (
                    <RelatedScaleChip
                        key={scale.scaleId}
                        group={scale.group}
                        name={scale.name}
                        isActive={scale.group === selectedScaleGroup && scale.name === selectedScaleName}
                        onClick={() => onScaleChange(scale.group, scale.name)}
                    />
                ))}
            </div>
        </div>
    );
};
