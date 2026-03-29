import React, { useState } from 'react';
import { ChordShape, Fingering } from '../../../../utils/guitar/types';
import { getChordFingering } from '../../../../utils/guitar/logic';
import { TUNING } from '../../../../utils/guitar/theory';
import { ChordBox } from './ChordBox';

interface ChordGalleryProps {
    availableVoicings: ChordShape[];
    selectedKey: number;
    voicingIndex: number;
    onVoicingChange: (idx: number) => void;
}

// Legacy chord-gallery UI preserved as-is for fallback/reference during the chord refactor.
export const ChordGallery: React.FC<ChordGalleryProps> = ({
    availableVoicings,
    selectedKey,
    voicingIndex,
    onVoicingChange
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [labelMode, setLabelMode] = useState<'dot' | 'interval' | 'note'>('dot');

    const handleBoxClick = (idx: number) => {
        onVoicingChange(idx);
        setIsModalOpen(true);
    };

    const voicingsList: { shape: ChordShape; fingering: Fingering[] }[] = availableVoicings.map(shape => ({
        shape,
        fingering: getChordFingering(shape, selectedKey, TUNING)
    }));

    const selectedVoicing = voicingsList[voicingIndex];

    return (
        <div className="flex flex-col relative w-full pt-4">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black uppercase tracking-widest text-[#a0a0a0]">Voicing Matrix</h2>
                <span className="text-[10px] font-black uppercase text-[#a0a0a0] bg-[#1e293b] py-1 px-3 rounded-md border border-[#334155] tracking-widest">
                    {availableVoicings.length} Positions Available
                </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {voicingsList.map((item, idx) => (
                    <div
                        key={idx}
                        className={`p-4 rounded-xl flex flex-col items-center cursor-pointer transition-all hover:border-white/20 group border ${idx === voicingIndex ? 'border-[#334155] bg-[#1e293b]' : 'border-white/5 bg-[#0a0a0a]'
                            }`}
                        onClick={() => handleBoxClick(idx)}
                    >
                        <div className="mb-4 text-center">
                            <h3 className={`text-xs font-black uppercase tracking-widest transition-colors ${idx === voicingIndex ? 'text-white' : 'text-secondary/50 group-hover:text-white'}`}>
                                {item.shape.name}
                            </h3>
                        </div>
                        <div className="flex-1 flex items-center justify-center p-2 bg-[#050505] rounded-xl w-full border border-white/5">
                            <ChordBox
                                fingering={item.fingering}
                                labelMode="dot"
                                isMagnified={false}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && selectedVoicing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="absolute inset-0" onClick={() => setIsModalOpen(false)}></div>

                    <div className="relative z-10 p-8 rounded-3xl w-full max-w-lg flex flex-col items-center bg-[#0a0a0a] border border-white/5 shadow-2xl">
                        <button
                            className="fixed top-6 right-6 z-[60] bg-[#050505] p-3 rounded-full text-secondary hover:text-white hover:bg-[#1e293b] transition-all cursor-pointer border border-white/5"
                            onClick={() => setIsModalOpen(false)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>

                        <h2 className="text-3xl font-black uppercase tracing-widest text-white mb-2">{selectedVoicing.shape.name}</h2>
                        <p className="text-secondary/50 text-[10px] mb-8 uppercase tracking-[0.3em] font-black">Magnified View</p>

                        <div className="inline-flex items-center justify-center gap-1 mb-8 bg-[#050505] p-1.5 rounded-xl border border-white/5 w-fit">
                            <button
                                className={`w-28 flex items-center justify-center py-1.5 rounded-lg text-xs font-black tracking-widest transition-colors ${labelMode === 'dot' ? 'bg-[#1e293b] border border-[#334155] text-white' : 'text-secondary/50 hover:text-white border border-transparent'}`}
                                onClick={() => setLabelMode('dot')}
                            >
                                Dot
                            </button>
                            <button
                                className={`w-28 flex items-center justify-center py-1.5 rounded-lg text-xs font-black tracking-widest transition-colors ${labelMode === 'interval' ? 'bg-[#1e293b] border border-[#334155] text-white' : 'text-secondary/50 hover:text-white border border-transparent'}`}
                                onClick={() => setLabelMode('interval')}
                            >
                                Interval
                            </button>
                            <button
                                className={`w-28 flex items-center justify-center py-1.5 rounded-lg text-xs font-black tracking-widest transition-colors ${labelMode === 'note' ? 'bg-[#1e293b] border border-[#334155] text-white' : 'text-secondary/50 hover:text-white border border-transparent'}`}
                                onClick={() => setLabelMode('note')}
                            >
                                Note
                            </button>
                        </div>

                        <div className="bg-[#050505] p-8 rounded-2xl border border-white/5 shadow-inner">
                            <ChordBox
                                fingering={selectedVoicing.fingering}
                                labelMode={labelMode}
                                isMagnified={true}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
