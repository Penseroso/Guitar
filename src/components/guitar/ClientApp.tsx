"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Fretboard } from '../Fretboard';
import { Controls } from './Controls';
import { ChordGallery } from './ChordGallery';
import { TogglePill } from '../ui/design-system/TogglePill';
import { SlidersHorizontal } from 'lucide-react';
import {
    NOTES,
    TUNING,
    SCALES,
    PROGRESSION_LIBRARY,
    CHORD_SHAPES,
} from '../../utils/guitar/theory';
import {
    getChordFromDegree,
    getChordTones,
    getChordFingering,
    getSortedVoicings,
    getDiatonicDoubleStops,
    getPlayableDoubleStopsOnStrings
} from '../../utils/guitar/logic';
import { Mode } from '../../utils/guitar/types';

export default function ClientApp() {
    // --- State: Global ---
    const [selectedKey, setSelectedKey] = useState(0); // C
    const [mode, setMode] = useState<Mode>('scale');
    const [showIntervals, setShowIntervals] = useState(false);

    // --- State: Scale Mode ---
    const [scaleGroup, setScaleGroup] = useState('Major Modes');
    const [scaleName, setScaleName] = useState('Major / Ionian');
    const [showChordTones, setShowChordTones] = useState(false); // In scale mode, shows Triad of root
    const [isPentatonic, setIsPentatonic] = useState(false);
    const [blueNote, setBlueNote] = useState(false);
    const [sixthNote, setSixthNote] = useState(false);
    const [secondNote, setSecondNote] = useState(false);

    // --- State: Chord Mode ---
    const [chordType, setChordType] = useState('Major'); // 'Major', 'Minor', '7'
    const [voicingIndex, setVoicingIndex] = useState(0);

    // --- State: Double Stops (Scale Mode Feature) ---
    const [isDoubleStopActive, setIsDoubleStopActive] = useState(false);
    const [doubleStopInterval, setDoubleStopInterval] = useState(3);
    const [doubleStopStrings, setDoubleStopStrings] = useState<[number, number]>([1, 2]);

    // --- State: Progression Mode ---
    const [progressionName, setProgressionName] = useState('pop-punk');
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    // --- Refs ---
    const fretboardContainerRef = useRef<HTMLDivElement>(null);
    const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

    // --- Derived Data: Scales ---
    const activeScaleIntervals = useMemo(() => {
        return SCALES[scaleGroup]?.[scaleName] || SCALES['Major Modes']['Major / Ionian'];
    }, [scaleGroup, scaleName]);

    const scaleNotes = useMemo(() => {
        return activeScaleIntervals.map(interval => (selectedKey + interval) % 12);
    }, [selectedKey, activeScaleIntervals]);

    // Update isPentatonic flag for UI
    useEffect(() => {
        setIsPentatonic(scaleName.includes('Pentatonic'));
    }, [scaleName]);

    const modifierNotes = useMemo(() => {
        const mods = [];
        if (mode === 'scale') {
            if (blueNote) {
                mods.push((selectedKey + 6) % 12);
            }
            if (sixthNote) {
                mods.push((selectedKey + 9) % 12);
            }
            if (secondNote) {
                mods.push((selectedKey + 2) % 12);
            }
        }
        return mods;
    }, [mode, blueNote, sixthNote, secondNote, selectedKey]);

    // --- Derived Data: Chords ---
    const availableVoicings = useMemo(() => {
        const shapes = CHORD_SHAPES[chordType] || CHORD_SHAPES['Major'];
        return getSortedVoicings(shapes, selectedKey, TUNING);
    }, [chordType, selectedKey]);

    const currentVoicingShape = useMemo(() => {
        return availableVoicings[voicingIndex] || availableVoicings[0];
    }, [availableVoicings, voicingIndex]);

    const fingering = useMemo(() => {
        if (mode !== 'chord') return undefined;

        if (!currentVoicingShape) return undefined;

        // New logic
        return getChordFingering(currentVoicingShape, selectedKey, TUNING);

        /* Old logic to be removed
        const { offsets, rootString } = currentVoicingShape;
        // offsets are for strings 0-5 (High E to Low E) as per my new definition?
        // Wait, let's check theory.ts definition. 
        // "offsets: [0, 0, 1, 2, 2, 0]" for E Shape.
        // If E Shape Root is Low E (String 5).
        // offset[0] ? musicTheory.ts said "offsets for strings 0-5". 
        // And I decided 0 is High E (Standard) but musicTheory.ts comment said:
        // "offset[0] matches E A D G B e" NO -> E shape matches "0 2 2 1 0 0" (Low to High).
        // musicTheory.ts E Shape: `offsets: [0, 0, 1, 2, 2, 0]`.
        // My previous analysis in page.tsx:
        // "matches E A D G B e" -> No.
        // Let's assume standard array order usually Low to High?
        // BUT TUNING is [4, 11, 7, 2, 9, 4] (High to Low).
        // Components usually iterate 0..5 (High to Low).
        // So if musicTheory.ts has `offsets: [0, 0, 1, 2, 2, 0]`, and string 0 is High E (4)...
        // High E = 0. B = 0. G = 1. D = 2. A = 2. Low E = 0.
        // This looks like E Major! (0 2 2 1 0 0) - but reversed.
        // Low E (0) -> High E (0).
        // So `offsets` in theory.ts seem to be High E to Low E order?
        // Let's check `E Shape`: `offsets: [0, 0, 1, 2, 2, 0]`.
        // String 0 (High E): 0 (E).
        // String 1 (B): 0 (B).
        // String 2 (G): 1 (G#).
        // String 3 (D): 2 (E).
        // String 4 (A): 2 (B).
        // String 5 (Low E): 0 (E).
        // This forms E Major chord! So yes, offsets are High E -> Low E.

        // rootString is 5 (Low E).

        // Calculate Fret
        const openNote = TUNING[currentVoicingShape.rootString]; // Low E for E Shape
        // We want this string to play `selectedKey`.
        // (openNote + fret) % 12 = selectedKey.
        // fret = (selectedKey - openNote + 12) % 12.
        // This is the "Base Fret" (Barre fret or Nut position).
        const baseFret = (selectedKey - openNote + 12) % 12;

        const fingerings = [];
        for (let s = 0; s < 6; s++) {
            const offset = offsets[s];
            if (offset !== -1) {
                const computedFret = baseFret + offset;
                const noteIdx = (TUNING[s] + computedFret) % 12;

                // Label
                let label = "•";
                const diff = (noteIdx - selectedKey + 12) % 12;
                if (diff === 0) label = "R";
                else if (diff === 7) label = "5";
                else if (diff === 4) label = "3";
                else if (diff === 3) label = "b3";
                else if (diff === 10) label = "b7";
                else if (diff === 11) label = "7";

                fingerings.push({
                    string: s,
                    fret: computedFret,
                    noteIdx: noteIdx,
                    label: label
                });
            }
        }
        */

    }, [mode, currentVoicingShape, selectedKey]);

    // --- Derived Data: Progression ---
    const progressionData = useMemo(() => {
        if (mode !== 'progression') return null;

        const progDef = PROGRESSION_LIBRARY.find(p => p.id === progressionName) || PROGRESSION_LIBRARY[0];
        const steps = progDef.degrees;
        const currentStepDegree = steps[currentStepIndex % steps.length];

        const { interval, type } = getChordFromDegree(currentStepDegree);
        const stepRoot = (selectedKey + interval) % 12;

        const tones = getChordTones(type, stepRoot);

        return {
            steps,
            currentStepDegree,
            stepRoot,
            tones,
            type
        };
    }, [mode, progressionName, currentStepIndex, selectedKey]);

    // --- Active Notes Calculation ---
    const activeNotes = useMemo(() => {
        if (mode === 'scale') {
            return [...scaleNotes, ...modifierNotes];
        }
        if (mode === 'chord') {
            if (fingering) return fingering.map(f => f.noteIdx);
            return [];
        }
        if (mode === 'progression') {
            const majorScale = SCALES['Major Modes']['Major / Ionian'];
            return majorScale.map(i => (selectedKey + i) % 12);
        }
        return [];
    }, [mode, scaleNotes, modifierNotes, fingering, selectedKey]);

    // --- Derived Data: Double Stops ---
    const playableDoubleStops = useMemo(() => {
        if (mode !== 'scale' || !isDoubleStopActive) return [];

        // Use active scale notes (without modifiers) to find diatonic pairs
        const diatonicPairs = getDiatonicDoubleStops(scaleNotes, doubleStopInterval);
        return getPlayableDoubleStopsOnStrings(diatonicPairs, selectedKey, TUNING, doubleStopStrings);
    }, [mode, isDoubleStopActive, scaleNotes, doubleStopInterval, doubleStopStrings, selectedKey]);

    // --- Chord Tone Highlighting ---
    const currentChordTones = useMemo(() => {
        if (mode === 'scale') {
            if (showChordTones) {
                // User requested 1, 3, 5, 7.
                // We filter the active scale's intervals to find these specific degrees.
                // 0 (Root), 3/4 (Thirds), 7 (Fifth), 10/11 (Sevenths)
                const targetIntervals = [0, 3, 4, 7, 10, 11];
                return activeScaleIntervals
                    .filter(interval => targetIntervals.includes(interval))
                    .map(interval => (selectedKey + interval) % 12);
            }
            return [];
        }
        if (mode === 'chord') {
            return [];
        }
        if (mode === 'progression') {
            return progressionData?.tones || [];
        }
        return [];
    }, [mode, showChordTones, selectedKey, progressionData]);

    const rootNote = useMemo(() => {
        if (mode === 'progression') {
            return progressionData?.stepRoot ?? selectedKey;
        }
        return selectedKey;
    }, [mode, progressionData, selectedKey]);

    // --- Handlers ---
    const togglePlay = () => setIsPlaying(p => !p);

    // --- Effects ---
    // Playback and progression logic was removed as progression is now just a static gallery

    // FIXME: Auto-Scroll - This depends on Fretboard structure. 
    // With grid, Fret 0 is at left. 
    // We can just scroll the container.
    // We need to access the container via Ref.
    // The Ref is passed to Fretboard? No, Fretboard wrapper in Page has the ref.
    // We need to pass ref or move wrapper here.
    // I will move the wrapper here.

    useEffect(() => {
        if (mode === 'chord' && fingering && fingering.length > 0) {
            const minFret = Math.min(...fingering.map(f => f.fret));
            // Estimation
            if (fretboardContainerRef.current) {
                // This logic is rough, but functional. 
                const scrollPos = minFret * 60;
                fretboardContainerRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
            }
        }
    }, [mode, fingering, voicingIndex, selectedKey]);

    return (
        <div className="min-h-screen bg-[#050505] text-[#a0a0a0] selection:bg-white/20 p-8 flex flex-col items-center gap-12 overflow-x-hidden font-sans">
            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* 1. Controls (Left & Right Racks handled internally) */}
                <Controls
                    selectedKey={selectedKey}
                    onKeyChange={setSelectedKey}
                    selectedScaleGroup={scaleGroup}
                    selectedScaleName={scaleName}
                    onScaleChange={(g, n) => { setScaleGroup(g); setScaleName(n); }}
                    showChordTones={showChordTones}
                    onToggleChordTones={() => setShowChordTones(p => !p)}
                    showIntervals={showIntervals}
                    onToggleIntervals={() => setShowIntervals(p => !p)}
                    isPentatonic={scaleName.includes('Pentatonic')}
                    blueNote={blueNote}
                    onToggleBlueNote={() => setBlueNote(p => !p)}
                    sixthNote={sixthNote}
                    onToggleSixthNote={() => setSixthNote(p => !p)}
                    secondNote={secondNote}
                    onToggleSecondNote={() => setSecondNote(p => !p)}

                    isDoubleStopActive={isDoubleStopActive}
                    onToggleDoubleStop={() => setIsDoubleStopActive(p => !p)}
                    doubleStopInterval={doubleStopInterval}
                    onDoubleStopIntervalChange={setDoubleStopInterval}
                    doubleStopStrings={doubleStopStrings}
                    onDoubleStopStringsChange={setDoubleStopStrings}

                    mode={mode}
                    onModeChange={setMode}

                    chordType={chordType}
                    onChordTypeChange={setChordType}
                    voicingIndex={voicingIndex}
                    onVoicingChange={setVoicingIndex}
                    availableVoicingsCount={availableVoicings.length}
                    voicingLabels={availableVoicings.map(v => v.name)}

                    progressionName={progressionName}
                    onProgressionChange={setProgressionName}
                    currentStepIndex={currentStepIndex}
                    onStepChange={setCurrentStepIndex}
                    isPlaying={isPlaying}
                    onTogglePlay={togglePlay}
                />

                {/* 2. Visualizations (Footer Rack) */}
                <div className="col-span-1 lg:col-span-12 bg-[#0a0a0a] border border-white/5 rounded-[3rem] p-12 relative group shadow-2xl overflow-hidden mt-4">
                    {/* Decorative Grid */}
                    <div
                        className="absolute inset-0 opacity-[0.02] pointer-events-none"
                        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                    />

                    {mode === 'scale' && (
                        <div className="relative z-10 w-full flex flex-col gap-6">
                            {/* Visualizer Controls Dashboard */}
                            <div className="flex flex-col gap-4 bg-[#050505]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-2">
                                    <SlidersHorizontal size={14} className="text-white/40" />
                                    <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em]">Visualization Overrides</span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    <TogglePill label={showIntervals ? "Mode: Note" : "Mode: Interval"} isActive={showIntervals} onToggle={() => setShowIntervals(p => !p)} hideDot={true} />
                                    <TogglePill label="Chord Tones" isActive={showChordTones} onToggle={() => setShowChordTones(p => !p)} />

                                    {isPentatonic && (
                                        <TogglePill label="Add Blue Note" isActive={blueNote} onToggle={() => setBlueNote(p => !p)} />
                                    )}
                                    {isPentatonic && scaleName === "Minor Pentatonic" && (
                                        <>
                                            <TogglePill label="Add 2 (9th)" isActive={secondNote} onToggle={() => setSecondNote(p => !p)} />
                                            <TogglePill label="Add 6th Note" isActive={sixthNote} onToggle={() => setSixthNote(p => !p)} />
                                        </>
                                    )}

                                    <div className="flex flex-col gap-2">
                                        <TogglePill label="Double Stops" isActive={isDoubleStopActive} onToggle={() => setIsDoubleStopActive(p => !p)} />
                                        {isDoubleStopActive && (
                                            <div className="flex gap-2 mt-2">
                                                {[3, 4, 6].map(int => (
                                                    <button key={int}
                                                        onClick={() => {
                                                            setDoubleStopInterval(int);
                                                            setDoubleStopStrings(int === 6 ? [0, 2] : [0, 1]);
                                                        }}
                                                        className={`flex-1 py-1.5 text-[9px] font-black rounded-lg border transition-all ${doubleStopInterval === int ? 'bg-white/10 text-white border-white/30' : 'border-white/5 text-white/30 hover:text-white/70'}`}>
                                                        {int}{int === 3 ? 'rd' : 'th'}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="border-y border-white/5 py-8 flex items-center justify-center relative overflow-hidden bg-white/[0.01]">
                                <div ref={fretboardContainerRef} className="overflow-x-auto overflow-y-hidden custom-scrollbar relative w-full flex justify-center py-2">
                                    <Fretboard
                                        tuning={TUNING}
                                        activeNotes={activeNotes}
                                        rootNote={rootNote}
                                        chordTones={currentChordTones}
                                        modifierNotes={modifierNotes}
                                        showChordTones={showChordTones}
                                        showIntervals={showIntervals}
                                        fingering={fingering}
                                        doubleStops={playableDoubleStops}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {mode === 'chord' && (
                        <div className="relative z-10 w-full mt-4">
                            <ChordGallery
                                availableVoicings={availableVoicings}
                                selectedKey={selectedKey}
                                voicingIndex={voicingIndex}
                                onVoicingChange={setVoicingIndex}
                            />
                        </div>
                    )}

                    {/* Bottom Metrics */}
                    <div className="relative z-10 flex justify-end items-center gap-10 mt-12 w-full pr-4">
                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-15">MODUS ENGINE V2.2</span>
                        <div className="w-16 h-[1px] bg-white/40 opacity-15" />
                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-15">SYSTEM NOMINAL</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
