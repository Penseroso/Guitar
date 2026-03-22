import React from 'react';
import { buildScaleId, getRelatedScales, getScaleDisplayName } from '../../../utils/guitar/scaleSelector';
import { RelatedScaleChip } from './RelatedScaleChip';

interface RelatedScalesStripProps {
    sourceScaleGroup: string;
    sourceScaleName: string;
    committedScaleGroup: string;
    committedScaleName: string;
    previewScaleGroup?: string | null;
    previewScaleName?: string | null;
    onPreviewToggle: (group: string, name: string) => void;
    onApplyPreview?: () => void;
    onClearPreview?: () => void;
}

export const RelatedScalesStrip: React.FC<RelatedScalesStripProps> = ({
    sourceScaleGroup,
    sourceScaleName,
    committedScaleGroup,
    committedScaleName,
    previewScaleGroup,
    previewScaleName,
    onPreviewToggle,
    onApplyPreview,
    onClearPreview,
}) => {
    const hasPreview = Boolean(previewScaleGroup && previewScaleName);
    const relatedScales = getRelatedScales(buildScaleId(sourceScaleGroup, sourceScaleName));

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
                        isCommitted={scale.group === committedScaleGroup && scale.name === committedScaleName}
                        isPreview={scale.group === previewScaleGroup && scale.name === previewScaleName}
                        onClick={() => onPreviewToggle(scale.group, scale.name)}
                    />
                ))}
            </div>
            {hasPreview && previewScaleName && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.05] px-4 py-3">
                    <div className="text-[11px] font-semibold text-cyan-50/90">
                        Previewing: {getScaleDisplayName(previewScaleName)}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onApplyPreview}
                            className="rounded-xl border border-cyan-200/40 bg-cyan-200/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-50 transition-all hover:border-cyan-100/60 hover:bg-cyan-200/15"
                        >
                            Switch
                        </button>
                        <button
                            onClick={onClearPreview}
                            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/70 transition-all hover:border-white/20 hover:text-white"
                        >
                            Return
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
