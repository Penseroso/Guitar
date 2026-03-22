import React from 'react';
import { Activity, Layers3 } from 'lucide-react';
import { getNoteName } from '../../../utils/guitar/logic';

const CHORD_FORMULAS: Record<string, string[]> = {
    Major: ['1', '3', '5'],
    Minor: ['1', 'b3', '5'],
    'Major 7': ['1', '3', '5', '7'],
    'Minor 7': ['1', 'b3', '5', 'b7'],
    'Dominant 7': ['1', '3', '5', 'b7'],
    'm7b5 (Half Dim)': ['1', 'b3', 'b5', 'b7'],
    'Diminished 7': ['1', 'b3', 'b5', '6'],
    'Major 9': ['1', '3', '5', '7', '9'],
    'Minor 9': ['1', 'b3', '5', 'b7', '9'],
    'Dominant 9': ['1', '3', '5', 'b7', '9'],
    '13': ['1', '3', '5', 'b7', '9', '13'],
    '7#9 (Hendrix)': ['1', '3', '5', 'b7', '#9'],
    '7b9': ['1', '3', '5', 'b7', 'b9'],
    sus4: ['1', '4', '5'],
    sus2: ['1', '2', '5'],
    'Power (5)': ['1', '5'],
};

interface ChordModePanelProps {
    selectedKey: number;
    chordType: string;
    voicingIndex: number;
    availableVoicingsCount: number;
    voicingLabels: string[];
}

export const ChordModePanel: React.FC<ChordModePanelProps> = ({
    selectedKey,
    chordType,
    voicingIndex,
    availableVoicingsCount,
    voicingLabels,
}) => {
    const activeVoicingLabel = voicingLabels[voicingIndex] || voicingLabels[0] || 'No voicing';

    return (
        <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 flex flex-col gap-6 shadow-2xl relative overflow-hidden min-h-[380px]">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
                <Activity size={220} strokeWidth={0.6} />
            </div>

            <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-black tracking-[0.35em] uppercase text-white/30">Chord Mode</span>
                    <div className="flex items-end gap-3">
                        <h2 className="text-6xl font-black text-white tracking-tighter leading-none">
                            {getNoteName(selectedKey)}
                        </h2>
                        <div className="pb-2">
                            <div className="text-[10px] font-black tracking-[0.3em] uppercase text-white/20">Root</div>
                            <div className="text-xl font-semibold text-white/75">{chordType}</div>
                        </div>
                    </div>
                </div>

                <div className="w-16 h-16 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-white/40">
                    <Layers3 size={18} />
                </div>
            </div>

            <div className="relative z-10 rounded-[1.75rem] border border-white/5 bg-white/[0.02] p-6 grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">Structure</span>
                    <span className="text-sm font-semibold text-white/75">{(CHORD_FORMULAS[chordType] || []).join(' · ')}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">Voicing</span>
                    <span className="text-sm font-semibold text-white/75">
                        {activeVoicingLabel} ({Math.max(availableVoicingsCount, 1)} total)
                    </span>
                </div>
            </div>
        </div>
    );
};
