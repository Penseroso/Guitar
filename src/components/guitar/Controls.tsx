import React from 'react';
import { NOTES, SCALES, COMMON_PROGRESSIONS, CHORD_SHAPES, PROGRESSION_LIBRARY } from '../../utils/guitar/theory';
import { getChordFromDegree, getNoteName } from '../../utils/guitar/logic';
import { GlassPanel } from '../ui/design-system/GlassPanel';
import { SectionLabel } from '../ui/design-system/SectionLabel';
import { TabsRail } from '../ui/design-system/TabsRail';
import { KeyButton } from '../ui/design-system/KeyButton';
import { SelectPill } from '../ui/design-system/SelectPill';
import { TogglePill } from '../ui/design-system/TogglePill';

interface ControlsProps {
    selectedKey: number;
    onKeyChange: (key: number) => void;
    selectedScaleGroup: string;
    selectedScaleName: string;
    onScaleChange: (group: string, name: string) => void;
    showChordTones: boolean;
    onToggleChordTones: () => void;
    showIntervals: boolean;
    onToggleIntervals: () => void;
    isPentatonic: boolean;
    blueNote: boolean;
    onToggleBlueNote: () => void;
    sixthNote: boolean;
    onToggleSixthNote: () => void;
    secondNote: boolean;
    onToggleSecondNote: () => void;
    // Chord Props
    mode: 'scale' | 'chord' | 'progression';
    onModeChange: (mode: 'scale' | 'chord' | 'progression') => void;
    chordType: string;
    onChordTypeChange: (type: string) => void;
    voicingIndex: number;
    onVoicingChange: (idx: number) => void;
    availableVoicingsCount: number;
    voicingLabels: string[];
    // Progression Props
    progressionName: string;
    onProgressionChange: (name: string) => void;
    currentStepIndex: number;
    onStepChange: (index: number) => void;
    isPlaying: boolean;
    onTogglePlay: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
    selectedKey,
    onKeyChange,
    selectedScaleGroup,
    selectedScaleName,
    onScaleChange,
    showChordTones,
    onToggleChordTones,
    showIntervals,
    onToggleIntervals,
    isPentatonic,
    blueNote,
    onToggleBlueNote,
    sixthNote,
    onToggleSixthNote,
    secondNote,
    onToggleSecondNote,
    mode,
    onModeChange,
    chordType,
    onChordTypeChange,
    voicingIndex,
    onVoicingChange,
    availableVoicingsCount,
    voicingLabels,
    progressionName,
    onProgressionChange,
    currentStepIndex,
    onStepChange,
    isPlaying,
    onTogglePlay
}) => {

    // --- Block 1: Header + Tabs (Hero Rhythm) ---
    const HeroBlock = (
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
            <div className="flex flex-col">
                <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white">
                    GUITAR <span className="text-accent-blue">HUB</span>
                </h1>
                <span className="text-xs font-bold tracking-[0.3em] text-secondary/60 uppercase mt-1">
                    Professional Navigator
                </span>
            </div>
            <TabsRail
                tabs={[
                    { id: 'scale', label: 'Scale' },
                    { id: 'chord', label: 'Chord' },
                    { id: 'progression', label: 'Prog' }
                ]}
                activeId={mode}
                onChange={(id) => onModeChange(id as any)}
            />
        </div>
    );

    // --- Block 2: Root Key Panel (Fixed Grid -> Rail) ---
    const RootKeyBlock = (
        <GlassPanel className="p-10 rounded-lg mb-8">
            <SectionLabel text="Select Root Key" className="relative -top-5 -left-4" />

            {/* 
                User Request: 
                - flex gap-4 overflow-x-auto py-6
                - No wrap
                - Centered if possible (justify-center for large)
                - Scrollable on small
            */}
            <div className="flex gap-4 overflow-x-auto py-6 justify-start md:justify-center no-scrollbar">
                {NOTES.map((note, idx) => (
                    <KeyButton
                        key={note}
                        note={note}
                        isActive={selectedKey === idx}
                        onClick={() => onKeyChange(idx)}
                    />
                ))}
            </div>
        </GlassPanel>
    );

    // --- Block 3: Mode Specific Controls (Control Deck) ---
    const scaleOptions = Object.entries(SCALES).flatMap(([group, scales]) =>
        Object.keys(scales).map(name => ({
            value: `${group}|${name}`,
            label: `${group} - ${name}` // e.g., "Diatonic - Ionian (Major)"
        }))
    );

    const progressionOptions = PROGRESSION_LIBRARY.map(prog => ({
        value: prog.id,
        label: prog.title
    }));

    // Helper function to calculate actual chord name from Roman degree
    const getChordName = (degree: string) => {
        const { interval, type } = getChordFromDegree(degree);
        const rootNoteIdx = (selectedKey + interval) % 12;
        const rootText = getNoteName(rootNoteIdx);
        const suffix = type === 'Minor' ? 'm' : '';
        return `${rootText}${suffix}`;
    };

    const ControlDeck = (
        <div className={`grid grid-cols-1 gap-8 items-start ${mode === 'chord' ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
            {/* Left Deck: Primary Selection */}
            <GlassPanel className={`p-10 rounded-lg flex flex-col ${mode === 'chord' ? 'lg:col-span-2' : ''}`}>
                <SectionLabel text="Mode Configuration" className="relative -top-5 -left-4" />

                {mode === 'scale' && (
                    <SelectPill
                        value={`${selectedScaleGroup}|${selectedScaleName}`}
                        onChange={(val) => {
                            const [g, n] = val.split('|');
                            onScaleChange(g, n);
                        }}
                        options={scaleOptions}
                    />
                )}

                {mode === 'chord' && (
                    <div className="flex flex-col gap-4">
                        {/* Chord Type Groups */}
                        <div className="flex flex-col gap-1 w-full">
                            {[
                                { category: "Triads", types: ["Major", "Minor", "Power (5)"] },
                                { category: "7th Chords", types: ["Major 7", "Minor 7", "Dominant 7", "m7b5 (Half Dim)", "Diminished 7"] },
                                { category: "Extended (9/13)", types: ["Major 9", "Minor 9", "Dominant 9", "13"] },
                                { category: "Altered & Sus", types: ["sus2", "sus4", "7#9 (Hendrix)", "7b9"] }
                            ].map(group => (
                                <div key={group.category} className="mb-4 last:mb-0">
                                    <h3 className="text-sm font-bold text-secondary mb-2 uppercase tracking-wider">{group.category}</h3>
                                    <div className="flex gap-2 flex-wrap">
                                        {group.types.map(type => {
                                            if (!CHORD_SHAPES[type]) return null;
                                            return (
                                                <button
                                                    key={type}
                                                    onClick={() => onChordTypeChange(type)}
                                                    className={`py-2 px-3 rounded-lg text-sm font-bold border ${chordType === type ? 'bg-accent-blue/20 border-accent-blue text-accent-blue' : 'border-stroke text-secondary hover:text-white hover:border-slate-500 transition-colors'}`}
                                                >
                                                    {type}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Voicing Switcher */}
                        <div className="flex items-center justify-between w-full bg-slate-900/50 p-4 rounded-xl border border-stroke mt-2">
                            <button onClick={() => onVoicingChange((voicingIndex - 1 + availableVoicingsCount) % availableVoicingsCount)} className="text-secondary hover:text-accent-blue px-4 transition-colors">←</button>
                            <div className="flex flex-col items-center justify-center text-center flex-1 px-2">
                                <span className="text-white font-bold whitespace-normal leading-tight">{voicingLabels[voicingIndex] || `Voicing ${voicingIndex + 1}`}</span>
                                <span className="text-xs text-secondary mt-1">{voicingIndex + 1} / {availableVoicingsCount}</span>
                            </div>
                            <button onClick={() => onVoicingChange((voicingIndex + 1) % availableVoicingsCount)} className="text-secondary hover:text-accent-blue px-4 transition-colors">→</button>
                        </div>
                    </div>
                )}

                {mode === 'progression' && (
                    <div className="flex flex-col gap-4">
                        <SelectPill
                            value={progressionName}
                            onChange={(val) => onProgressionChange(val)}
                            options={progressionOptions}
                        />
                        {/* We removed Playback buttons as per instructions */}
                    </div>
                )}
            </GlassPanel>

            {/* Right Deck: Visual Targeting / Extras */}
            <GlassPanel className={`p-10 rounded-lg flex flex-col ${mode === 'chord' ? 'lg:col-span-1' : ''}`}>
                <SectionLabel text="Visual Targeting" className="relative -top-5 -left-4" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TogglePill
                        label={showIntervals ? "Change to Note" : "Change to Interval"}
                        isActive={showIntervals}
                        onToggle={onToggleIntervals}
                        hideDot={true}
                    />
                    {mode !== 'chord' && (
                        <TogglePill
                            label={<>Chord Tones (1,3,5,7/<span className="lowercase">b</span>7)</>}
                            isActive={showChordTones}
                            onToggle={onToggleChordTones}
                        />
                    )}

                    {/* Pentatonic Extras if applicable */}
                    {isPentatonic && mode === 'scale' && (
                        <>
                            <TogglePill
                                label="Add Blue Note (b5)"
                                isActive={blueNote}
                                onToggle={onToggleBlueNote}
                                colorTheme="indigo"
                            />
                            {selectedScaleName === "Minor Pentatonic" && (
                                <>
                                    <TogglePill
                                        label="Add 2 (9th)"
                                        isActive={secondNote}
                                        onToggle={onToggleSecondNote}
                                        colorTheme="amber"
                                    />
                                    <TogglePill
                                        label="Add 6th Note"
                                        isActive={sixthNote}
                                        onToggle={onToggleSixthNote}
                                        colorTheme="purple"
                                    />
                                </>
                            )}
                        </>
                    )}
                </div>
            </GlassPanel>
        </div>
    );

    return (
        <div className="w-full max-w-screen-xl mx-auto mb-12 relative">
            {HeroBlock}
            {RootKeyBlock}
            {mode !== 'progression' && ControlDeck}

            {/* PROGRESSION DASHBOARD */}
            {mode === 'progression' && (
                <div className="mt-8 relative z-10 w-full">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white tracking-tight">Progression Gallery</h2>
                        <span className="text-sm font-medium text-secondary bg-slate-800/50 py-1 px-3 rounded-full border border-stroke">Key of {getNoteName(selectedKey)}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {PROGRESSION_LIBRARY.map(prog => (
                            <GlassPanel key={prog.id} className="p-6 rounded-2xl flex flex-col hover:border-accent-blue/50 transition-colors cursor-pointer" onClick={() => onProgressionChange(prog.id)}>
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-bold text-white">{prog.title}</h3>
                                    <span className="text-xs font-bold text-accent-amber bg-accent-amber/10 py-1 px-2 rounded uppercase tracking-wider">{prog.genre}</span>
                                </div>
                                <div className="flex items-center gap-2 mb-6">
                                    {prog.degrees.map((deg, i) => (
                                        <React.Fragment key={i}>
                                            <span className="text-sm font-medium text-secondary">{deg}</span>
                                            {i < prog.degrees.length - 1 && <span className="text-secondary/50">-</span>}
                                        </React.Fragment>
                                    ))}
                                </div>
                                <div className="flex-1 flex items-center justify-center py-8 bg-slate-900/40 rounded-xl border border-stroke/50 mb-6">
                                    <div className="flex items-center gap-3 flex-wrap justify-center">
                                        {prog.degrees.map((deg, i) => (
                                            <React.Fragment key={`chord-${i}`}>
                                                <span className="text-3xl font-black text-accent-blue tracking-tighter">
                                                    {getChordName(deg)}
                                                </span>
                                                {i < prog.degrees.length - 1 && <span className="text-xl text-secondary/40 font-bold mx-1">→</span>}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                                <p className="text-sm text-secondary leading-relaxed">{prog.description}</p>
                            </GlassPanel>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

