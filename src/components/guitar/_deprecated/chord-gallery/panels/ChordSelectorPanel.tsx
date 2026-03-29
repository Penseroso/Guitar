import React from 'react';
import { Layers } from 'lucide-react';
import { CHORD_SHAPES } from '../../../../../utils/guitar/theory';

interface ChordSelectorPanelProps {
    chordType: string;
    onChordTypeChange: (type: string) => void;
}

const CHORD_GROUPS = [
    { category: 'Triads', types: ['Major', 'Minor', 'Power (5)'] },
    { category: '7th Chords', types: ['Major 7', 'Minor 7', 'Dominant 7', 'm7b5 (Half Dim)', 'Diminished 7'] },
    { category: 'Extended', types: ['Major 9', 'Minor 9', 'Dominant 9', '13'] },
    { category: 'Altered & Sus', types: ['sus2', 'sus4', '7#9 (Hendrix)', '7b9'] },
];

// Legacy chord selector preserved while the chord domain/model is refactored in later stages.
export const ChordSelectorPanel: React.FC<ChordSelectorPanelProps> = ({
    chordType,
    onChordTypeChange,
}) => {
    return (
        <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 flex flex-col gap-6 shadow-2xl relative w-full h-fit">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4">
                <Layers size={14} className="text-white/40" />
                <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em]">Chord Selector</span>
            </div>

            <div className="flex flex-col gap-6 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                {CHORD_GROUPS.map((group) => (
                    <div key={group.category} className="flex flex-col gap-3">
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] border-l border-white/20 pl-2">
                            {group.category}
                        </span>
                        <div className="flex gap-2 flex-wrap">
                            {group.types.map((type) => CHORD_SHAPES[type] && (
                                <button
                                    key={type}
                                    onClick={() => onChordTypeChange(type)}
                                    className={`px-3 py-1.5 text-[10px] font-black rounded-md border transition-all ${
                                        chordType === type
                                            ? 'bg-white/10 text-white border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                                            : 'border-white/5 text-white/40 hover:border-white/20 hover:text-white'
                                    }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
