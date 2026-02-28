import React, { useState } from 'react';
import { ChordShape, Fingering } from '../../utils/guitar/types';
import { getChordFingering } from '../../utils/guitar/logic';
import { TUNING } from '../../utils/guitar/theory';
import { ChordBox } from './ChordBox';
import { GlassPanel } from '../ui/design-system/GlassPanel';
import { TogglePill } from '../ui/design-system/TogglePill';

interface ChordGalleryProps {
    availableVoicings: ChordShape[];
    selectedKey: number;
    voicingIndex: number;
    onVoicingChange: (idx: number) => void;
}

export const ChordGallery: React.FC<ChordGalleryProps> = ({
    availableVoicings,
    selectedKey,
    voicingIndex,
    onVoicingChange
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    // currentToggleState: 0 = 'dot', 1 = 'interval', 2 = 'note'
    // But we have binary toggles or maybe just a local state for this string
    const [labelMode, setLabelMode] = useState<'dot' | 'interval' | 'note'>('dot');

    const handleBoxClick = (idx: number) => {
        onVoicingChange(idx);
        setIsModalOpen(true);
    };

    // Calculate all fingerings
    const voicingsList: { shape: ChordShape; fingering: Fingering[] }[] = availableVoicings.map(shape => ({
        shape,
        fingering: getChordFingering(shape, selectedKey, TUNING)
    }));

    const selectedVoicing = voicingsList[voicingIndex];

    return (
        <div className="flex flex-col relative w-full pt-4">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white tracking-tight">Voicing Gallery</h2>
                <span className="text-sm font-medium text-secondary bg-slate-800/50 py-1 px-3 rounded-full border border-stroke">
                    {availableVoicings.length} Positions Available
                </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {voicingsList.map((item, idx) => (
                    <GlassPanel
                        key={idx}
                        className={`p-4 rounded-xl flex flex-col items-center cursor-pointer transition-all hover:border-accent-blue/50 group ${idx === voicingIndex ? 'border-accent-blue bg-accent-blue/5 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : ''
                            }`}
                        onClick={() => handleBoxClick(idx)}
                    >
                        <div className="mb-4 text-center">
                            <h3 className={`text-md font-bold transition-colors ${idx === voicingIndex ? 'text-accent-blue' : 'text-white'}`}>
                                {item.shape.name}
                            </h3>
                        </div>
                        <div className="flex-1 flex items-center justify-center p-2 bg-slate-900/60 rounded-lg w-full group-hover:bg-slate-900/80 transition-colors">
                            <ChordBox
                                fingering={item.fingering}
                                labelMode="dot"
                                isMagnified={false}
                            />
                        </div>
                    </GlassPanel>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && selectedVoicing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    {/* Click outside to close */}
                    <div className="absolute inset-0" onClick={() => setIsModalOpen(false)}></div>

                    <GlassPanel className="relative z-10 p-8 rounded-2xl w-full max-w-lg flex flex-col items-center bg-slate-900 border-stroke shadow-2xl">
                        <button
                            className="fixed top-6 right-6 z-[60] bg-slate-800/60 p-3 rounded-full text-secondary hover:text-white hover:bg-slate-700/80 transition-all cursor-pointer backdrop-blur-md border border-white/10"
                            onClick={() => setIsModalOpen(false)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>

                        <h2 className="text-3xl font-black text-white mb-2">{selectedVoicing.shape.name}</h2>
                        <p className="text-secondary text-sm mb-8 uppercase tracking-widest font-bold">Magnified View</p>

                        <div className="inline-flex items-center justify-center gap-1 mb-8 bg-slate-800/50 p-1.5 rounded-full border border-stroke w-fit">
                            <button
                                className={`w-28 flex items-center justify-center py-1.5 rounded-full text-sm font-bold transition-colors ${labelMode === 'dot' ? 'bg-accent-blue text-white' : 'text-secondary hover:text-white'}`}
                                onClick={() => setLabelMode('dot')}
                            >
                                Dot
                            </button>
                            <button
                                className={`w-28 flex items-center justify-center py-1.5 rounded-full text-sm font-bold transition-colors ${labelMode === 'interval' ? 'bg-accent-blue text-white' : 'text-secondary hover:text-white'}`}
                                onClick={() => setLabelMode('interval')}
                            >
                                Interval
                            </button>
                            <button
                                className={`w-28 flex items-center justify-center py-1.5 rounded-full text-sm font-bold transition-colors ${labelMode === 'note' ? 'bg-accent-blue text-white' : 'text-secondary hover:text-white'}`}
                                onClick={() => setLabelMode('note')}
                            >
                                Note
                            </button>
                        </div>

                        <div className="bg-slate-950/50 p-8 rounded-xl border border-stroke shadow-inner">
                            <ChordBox
                                fingering={selectedVoicing.fingering}
                                labelMode={labelMode}
                                isMagnified={true}
                            />
                        </div>
                    </GlassPanel>
                </div>
            )}
        </div>
    );
};
