"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Fretboard } from '../components/Fretboard';
import { Controls } from '../components/Controls';
import {
  NOTES,
  TUNING,
  SCALES,
  CHORD_SHAPES,
  COMMON_PROGRESSIONS,
  getNoteName,
  getChordFromDegree,
  getChordTones,
  INLAYS,
  DOUBLE_INLAYS
} from '../utils/musicTheory';

// --- Types ---
type Mode = 'scale' | 'chord' | 'progression';

export default function GuitarApp() {
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

  // --- State: Chord Mode ---
  const [chordType, setChordType] = useState('Major'); // 'Major', 'Minor', '7'
  const [voicingIndex, setVoicingIndex] = useState(0);

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

  const pentatonicNotes = useMemo(() => {
    if (!isPentatonic) return null;
    // Basic Major/Minor Pentatonic logic could be refined. 
    // For now, if "Major" scale, remove 4th and 7th intervals (5 and 11).
    // Since we are creating a generic tool, we might rely on the user selecting "Major Pentatonic" scale 
    // OR filtering the current scale. 
    // To simplify: The "Pentatonic Extras" UI suggests we start with a Pentatonic Scale.
    // If user selects "Major (Ionian)" and clicks "Blue Note", it implies we are modifying the scale.
    // Let's assume these modifiers apply to *any* scale but are intended for Pentatonics.
    return null;
  }, [isPentatonic]);

  const modifierNotes = useMemo(() => {
    const mods = [];
    if (mode === 'scale') {
      if (blueNote) {
        // b5 (tritone6). For Major: b3? For Minor: b5.
        // Standard "Blue Note" is usually b5 of Minor Pentatonic.
        // Minor Pent: 1, b3, 4, 5, b7. Blue check: 1, b3, 4, b5, 5, b7.
        // b5 is interval 6.
        mods.push((selectedKey + 6) % 12);
      }
      if (sixthNote) {
        // Major 6th is interval 9.
        mods.push((selectedKey + 9) % 12);
      }
    }
    return mods;
  }, [mode, blueNote, sixthNote, selectedKey]);

  // --- Derived Data: Chords ---
  const availableVoicings = useMemo(() => {
    // Map 'Major 7' etc from page.tsx legacy to musicTheory keys if needed.
    // musicTheory has 'Major', 'Minor', '7'.
    // If user selects 'Major', we show Major voicings.
    return CHORD_SHAPES[chordType] || CHORD_SHAPES['Major'];
  }, [chordType]);

  const currentVoicingShape = useMemo(() => {
    return availableVoicings[voicingIndex] || availableVoicings[0];
  }, [availableVoicings, voicingIndex]);

  const fingering = useMemo(() => {
    if (mode !== 'chord') return undefined;

    const { offsets, rootString } = currentVoicingShape;
    // offsets: [lowE, A, D, G, B, highE] -> NO, standard chart order is usually Low to High?
    // musicTheory.ts E Shape: [0, 2, 2, 1, 0, 0]. This matches E A D G B e.
    // TUNING is [4, 11, 7, 2, 9, 4] -> High E (0), B (1), G (2), D (3), A (4), Low E (5).
    // So offsets[0] (Low E) corresponds to string index 5.
    // offsets[5] (High E) corresponds to string index 0.

    const fingerings = [];
    for (let i = 0; i < 6; i++) {
      // map offsets index to strings
      // offsets[0] is Low E. string[5] is Low E.
      // string index s. 
      // offset index = 5 - s.
      const offset = offsets[5 - i];

      if (offset !== -1) {
        // Actual fret = Root Fret + Offset? 
        // Wait, CHORD_SHAPES in musicTheory are open position shapes or movable?
        // They seem to be movable shapes defined at specific intervals.
        // Actually they are just patterns.
        // We need to find the fret where the Root String matches the Selected Key.
        // Step 1: Find note on rootString. 
        // e.g. E Shape Root String = 5 (Low E).
        // We want Low E string, at fret X, to be SelectedKey.
        // String 5 Open Note = TUNING[5] = 4 (E).
        // (4 + fret) % 12 = selectedKey.
        // fret = (selectedKey - 4 + 12) % 12.
        // BUT, the Shape has an offset "0" at the "Nut" of the shape.
        // So BaseFret = (selectedKey - TUNING[rootString] + 12) % 12.
        // The actual fret for string s = BaseFret + offset.

        // Let's verify E Shape Major for Key E (4).
        // rootString = 5 (Low E).
        // BaseFret = (4 - 4 + 12) % 12 = 0.
        // Offset for string 5 is 0. Actual Fret = 0. Correct.

        // Key G (7).
        // BaseFret = (7 - 4 + 12) % 12 = 3.
        // Offset for string 5 is 0. Actual Fret = 3. (G is at 3rd fret Low E). Correct.

        // What about A Shape? Root String 4 (A string).
        // Key C (0). Open A is 9.
        // BaseFret = (0 - 9 + 12) % 12 = 3.
        // A Shape offsets (Low E to High E): [-1, 0, 2, 2, 2, 0].
        // String 4 (A). Offset 0. Fret = 3 + 0 = 3. (C is 3rd fret A string). Correct.

        // However, we normally clamp/scroll to a nice position.
        // For now, simpler logic: simple calculation.

        // rootString index 0-5 in musicTheory is likely 0=Low E? 
        // Let's check musicTheory.ts: "rootString: 5" for E shape.
        // If 5 is Low E (matches my mapping above where offset[0] is low E), then yes.
        // Wait, I mapped offset[0] to string index 5 earlier.
        // If rootString is 5, it means "String Index 5" (Low E) in my system?
        // Or "5th String" (A)?
        // Standard convention: 1=High E, 6=Low E.
        // musicTheory.ts uses 0-based arrays usually.
        // Fretboard string 0 = High E.
        // Fretboard string 5 = Low E.
        // E Shape Root is Low E. If `rootString: 5`, then 5 means Low E. Correct.

        const rootStringIdx = currentVoicingShape.rootString;
        const openNote = TUNING[rootStringIdx];
        let baseFret = (selectedKey - openNote + 12) % 12;
        // Prefer lower positions but not 0 if possible? 
        // Actually 0 is fine. But "A shape" for E? 
        // Key E (4). RootStr 4 (9). Base = (4-9+12)%12 = 7.
        // So fret 7.

        // Use a heuristic to keep it in the middle of the neck if desired?
        // For now, simple mod 12 is fine, maybe add 0 or 12 depending on range.

        const computedFret = baseFret + offset;

        // Note Index
        const s = i; // 0 to 5 (High E to Low E)
        const stringOpen = TUNING[s];
        const noteIdx = (stringOpen + computedFret) % 12;

        // Label (Interval)
        // We need interval relative to Root.
        // Root is selectedKey.
        // interval = (noteIdx - selectedKey + 12) % 12.
        // Map intervals to names: 0->R, 3->b3, 4->3, 7->5 ...
        // Simple logic:
        let label = "•";
        const diff = (noteIdx - selectedKey + 12) % 12;
        if (diff === 0) label = "R";
        else if (diff === 7) label = "5";
        else if (diff === 4) label = "3";
        else if (diff === 3) label = "b3";
        else if (diff === 10) label = "b7";
        else if (diff === 11) label = "7"; // M7
        // ... add others if needed or keep Generic. 
        // Fretboard component handles 'R' specially.

        fingerings.push({
          string: s,
          fret: computedFret,
          noteIdx: noteIdx,
          label: label
        });
      }
    }
    return fingerings;
  }, [mode, currentVoicingShape, selectedKey]);

  // --- Derived Data: Progression ---
  const progressionData = useMemo(() => {
    if (mode !== 'progression') return null;

    const steps = COMMON_PROGRESSIONS[progressionName] || COMMON_PROGRESSIONS['Pop Magic'];
    const currentStepDegree = steps[currentStepIndex % steps.length];

    // Convert degree (IV) to interval and chord type
    const { interval, type } = getChordFromDegree(currentStepDegree);
    const stepRoot = (selectedKey + interval) % 12;

    // Get chord tones for this step
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
  // What dots to show on the fretboard (Gray dots)
  const activeNotes = useMemo(() => {
    if (mode === 'scale') {
      return [...scaleNotes, ...modifierNotes];
    }
    if (mode === 'chord') {
      // In chord mode, usually we only show the fingering? 
      // Or do we show the full scale in background?
      // "Show just the chord notes" is standard.
      // Fingering handles the specific dots. activeNotes could be empty or same as fingering notes.
      if (fingering) return fingering.map(f => f.noteIdx);
      return [];
    }
    if (mode === 'progression') {
      // Show scale notes in background? Or just chord tones?
      // "Usually show key scale, highlight chord".
      // Let's show Key Scale.
      // But we need to define 'scale'. Progression implies a Key.
      // We can assume Major Scale of the Key.
      const majorScale = SCALES['Common']['Major (Ionian)'];
      return majorScale.map(i => (selectedKey + i) % 12);
    }
    return [];
  }, [mode, scaleNotes, modifierNotes, fingering, selectedKey]);

  // --- Chord Tone Highlighting ---
  // What notes to highlight Amber (Chord Tones)
  const currentChordTones = useMemo(() => {
    if (mode === 'scale') {
      // If toggle is on, show I Chord (Key Triad)
      if (showChordTones) {
        return getChordTones('Major', selectedKey); // Assume Major for now or derive from scale?
      }
      return [];
    }
    if (mode === 'chord') {
      // Fingering handles highlighting.
      return [];
    }
    if (mode === 'progression') {
      // Highlight current step chord tones
      return progressionData?.tones || [];
    }
    return [];
  }, [mode, showChordTones, selectedKey, progressionData]);

  const rootNote = useMemo(() => {
    if (mode === 'progression') {
      return progressionData?.stepRoot ?? selectedKey;
    }
    // In Chord mode, the root of the specific voicing (which matches Key).
    return selectedKey;
  }, [mode, progressionData, selectedKey]);


  // --- Handlers ---
  const togglePlay = () => setIsPlaying(p => !p);

  // --- Effects ---

  // Playback Loop
  useEffect(() => {
    if (isPlaying && mode === 'progression') {
      playbackTimerRef.current = setInterval(() => {
        setCurrentStepIndex(prev => {
          const steps = COMMON_PROGRESSIONS[progressionName];
          return (prev + 1) % steps.length;
        });
      }, 2000); // 2 seconds per chord
    } else {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    }
    return () => { if (playbackTimerRef.current) clearInterval(playbackTimerRef.current); };
  }, [isPlaying, mode, progressionName]);

  // Auto-Scroll to ensure visibility of fingering (Chord Mode)
  useEffect(() => {
    if (mode === 'chord' && fingering && fingering.length > 0) {
      const minFret = Math.min(...fingering.map(f => f.fret));
      // Scroll logic: Fret 0 is 0px. Fret 12 is center?
      // FRET_WIDTHS sums...
      // Rough approximation or use element matching.
      // Using direct DOM manipulation via ref for simplicity.
      if (fretboardContainerRef.current) {
        // Find element for fret column?
        // Or just estimate: 80 + (minFret * 60).
        const scrollPos = minFret * 60;
        fretboardContainerRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
      }
    }
  }, [mode, fingering, voicingIndex, selectedKey]);


  // --- Render ---
  return (
    <main className="min-h-screen relative p-4 md:p-8 font-sans selection:bg-blue-500/30">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow delay-1000" />
      </div>

      {/* Header */}
      <header className="relative z-10 text-center mb-10">
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-500">Guitar</span>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">Hub</span>
        </h1>
        <p className="text-slate-400 font-medium tracking-wide uppercase text-xs md:text-sm max-w-lg mx-auto leading-relaxed">
          Interactive Fretboard Visualization & Theory Engine
        </p>
      </header>

      {/* Main Interface */}
      <div className="relative z-10 space-y-8">

        {/* 1. Fretboard Visualization */}
        <div className="glass-panel p-1 rounded-[2rem] w-full max-w-[95vw] mx-auto overflow-hidden shadow-2xl bg-[#0f172a]">
          <div ref={fretboardContainerRef} className="overflow-x-auto custom-scrollbar relative">
            <Fretboard
              tuning={TUNING}
              activeNotes={activeNotes}
              rootNote={rootNote}
              chordTones={currentChordTones}
              modifierNotes={modifierNotes}
              showChordTones={showChordTones || mode === 'progression'}
              fingering={fingering}
            />
          </div>
        </div>

        {/* 2. Controls */}
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
      </div>

      {/* Audio Engine Placeholder */}
      {/* <AudioEngine activeNotes={activeNotes} ... /> */}
    </main>
  );
}