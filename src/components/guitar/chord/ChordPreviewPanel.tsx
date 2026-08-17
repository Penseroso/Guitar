import React from 'react';

import { NOTES } from '@/domain/shared/notes';

interface ChordPreviewPanelProps {
    selectedKey: number;
    chordPreviewTitle: string;
    chordPreviewFormula: string[];
    chordPreviewPrimaryLabel: string;
    chordPreviewSecondaryLabel?: string | null;
    chordPreviewPosition?: string | null;
    chordTypeLabel: string;
}

export const ChordPreviewPanel: React.FC<ChordPreviewPanelProps> = ({
    selectedKey,
    chordPreviewTitle,
    chordPreviewFormula,
    chordPreviewPrimaryLabel,
    chordPreviewSecondaryLabel,
    chordPreviewPosition,
    chordTypeLabel,
}) => {
    return (
        <div className="rounded-[2rem] border border-white/5 bg-[#0a0a0a] p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.32em] text-white/30">Chord Preview</span>
                    <span className="text-xl font-black text-white">{chordPreviewTitle}</span>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-white/55">
                    {NOTES[selectedKey]}
                </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                    <span className="text-[8px] font-black uppercase tracking-[0.28em] text-white/30">Formula</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {chordPreviewFormula.map((degree) => (
                            <span
                                key={degree}
                                className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black tracking-[0.18em] text-white/70"
                            >
                                {degree}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase tracking-[0.28em] text-white/30">Current Voicing</span>
                    <span className="text-sm font-black text-white">{chordPreviewPrimaryLabel}</span>
                    {chordPreviewSecondaryLabel && (
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                            {chordPreviewSecondaryLabel}
                        </span>
                    )}
                    {chordPreviewPosition && (
                        <span className="text-xs text-white/55">{chordPreviewPosition}</span>
                    )}
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 flex flex-col gap-3">
                    <span className="text-[8px] font-black uppercase tracking-[0.28em] text-white/30">Chord Type</span>
                    <span className="text-sm font-semibold text-white/75">{chordTypeLabel}</span>
                </div>
            </div>
        </div>
    );
};
