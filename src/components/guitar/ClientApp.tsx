"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Fretboard } from '../Fretboard';
import { Controls } from './Controls';
import { ChordGallery } from './ChordGallery';
import {
    NOTES,
    TUNING,
    SCALES,
    CHORD_SHAPES,
    COMMON_PROGRESSIONS,
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
    const [scaleGroup, setScaleGroup] = useState('Diatonic');
    const [scaleName, setScaleName] = useState('Ionian');
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
    const [progressionName, setProgressionName] = useState('Classic 2-5-1 (Major)');
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    // --- Refs ---
    const fretboardContainerRef = useRef<HTMLDivElement>(null);
    const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

    // --- Derived Data: Scales ---
    const activeScaleIntervals = useMemo(() => {
        return SCALES[scaleGroup]?.[scaleName] || SCALES['Diatonic']['Ionian'];
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

        const steps = COMMON_PROGRESSIONS[progressionName] || COMMON_PROGRESSIONS['Classic 2-5-1 (Major)'];
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
            const majorScale = SCALES['Diatonic']['Ionian'];
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
        <div className="relative z-10 space-y-8 pb-48">
            {/* 1. Controls (Moved to Top) */}
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

            {/* 2. Visualizations (Moved to Bottom) */}
            {mode === 'scale' && (
                <div className="glass-panel p-1 rounded-[2rem] w-full max-w-[95vw] mx-auto overflow-hidden shadow-2xl bg-[#0f172a]">
                    <div ref={fretboardContainerRef} className="overflow-x-auto custom-scrollbar relative">
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
            )}

            {mode === 'chord' && (
                <ChordGallery
                    availableVoicings={availableVoicings}
                    selectedKey={selectedKey}
                    voicingIndex={voicingIndex}
                    onVoicingChange={setVoicingIndex}
                />
            )}
        </div >
    );
}
