"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, useReducer } from 'react';
import { Controls } from './Controls';
import { useProgressionAudio } from './progression/useProgressionAudio';
import { getProgressionPlaybackData } from '@/domain/progression/getProgressionPlaybackData';
import {CHORD_FAMILIES,CHORD_REGISTRY_LIST} from '@/domain/chord/registry';
import {getChordTypeLabel,getChordTypeSuffix} from '@/domain/chord/helpers';
import {engineEntry} from '@/domain/chord/engine/catalog';
import type {PresentationCandidate,ResolvedRequest} from '@/domain/chord/engine/types';
import { TUNING } from '@/domain/shared/tuning';
import { SCALES } from '@/domain/scale/scales';
import { getKeyName } from '@/domain/shared/keys';
import { Mode, Fingering } from '@/domain/shared/types';
import { useProgression } from './progression/useProgression';
import { useScaleMode } from './scale/useScaleMode';
import { getScaleDerivedData } from '@/domain/scale/getScaleDerivedData';
import {
    createHarmonicWorkspaceState,
    reduceHarmonicWorkspaceState,
} from '../../features/harmonic-workspace/state';
import { ScaleModeWorkspace } from './scale/ScaleModeWorkspace';
import { WorkspaceHeader } from './shared/WorkspaceHeader';
import { ChordModeWorkspace, type ChordWorkspaceIntent } from './chord/ChordModeWorkspace';
import { ChordExplorationPanel } from './chord/ChordExplorationPanel';
import { useChordExploration } from './chord/useChordExploration';
import { getChordToneChoices } from './chord/tone-labels';
import { ReverseChordPanel } from './chord/reverse/ReverseChordPanel';
import { SILENT_SHAPE_STATES, type ShapeStates } from '@/domain/chord/reverse/enteredShape';
import { ProgressionModeWorkspace } from './progression/ProgressionModeWorkspace';

const CHORD_SELECTOR_ORDER_BY_FAMILY = {
    triad: ['major', 'minor', 'power-5', 'augmented', 'diminished', 'sus2', 'sus4'],
    seventh: [
        'major-6', 'major-7', 'minor-7', 'dominant-7', 'half-diminished-7', 'diminished-7',
        'minor-6', 'minor-major-7', 'dominant-7-sus4', 'dominant-7-sharp-5', 'dominant-7-flat-5', 'major-7-sharp-5',
    ],
    extended: [
        'major-9', 'minor-9', 'dominant-9', 'dominant-11', 'dominant-13', 'hendrix-7-sharp-9', 'dominant-7-flat-9',
        'add9', 'minor-add9', 'six-nine', 'minor-11', 'minor-13',
    ],
} as const;

const CHORD_SELECTOR_GROUPS = CHORD_FAMILIES.map((family) => {
    const familyEntries = (CHORD_SELECTOR_ORDER_BY_FAMILY[family.id] ?? [])
        .map((id) => CHORD_REGISTRY_LIST.find((item) => item.id === id))
        .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
        .filter((entry) => entry.family === family.id);

    return {
        id: family.id,
        label: family.label,
        options: familyEntries.map((entry) => ({
            id: entry.id,
            stateValue: entry.id,
            label: getChordTypeLabel(entry),
        })),
    };
}).filter((group) => group.options.length > 0);

function buildResolvedVoicingFingering(row?: PresentationCandidate|null): Fingering[] | undefined {
    if (!row) {
        return undefined;
    }

    return row.candidate.sounding
        .map((note) => ({
            string: note.string,
            fret: note.fret,
            noteIdx: note.midi%12,
            label: note.tone==='1' ? 'R' : note.tone,
        }));
}

function BottomMetrics() {
    return (
        <div className="relative z-10 flex justify-end items-center gap-10 mt-12 w-full pr-4">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-15">MODUS ENGINE V2.2</span>
            <div className="w-16 h-[1px] bg-white/40 opacity-15" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-15">SYSTEM NOMINAL</span>
        </div>
    );
}

export default function ClientApp() {
    // --- State: Global ---
    const [selectedKey, setSelectedKey] = useState(0); // C
    const [mode, setMode] = useState<Mode>('scale');
    const [showIntervals, setShowIntervals] = useState(false);

    // --- State: Scale Mode ---
    const {
        scaleGroup,
        scaleName,
        showChordTones,
        blueNote,
        sixthNote,
        secondNote,
        isDoubleStopActive,
        doubleStopInterval,
        setDoubleStopInterval,
        doubleStopStrings,
        setDoubleStopStrings,
        commitScaleSelection,
        onToggleChordTones,
        onToggleBlueNote,
        onToggleSixthNote,
        onToggleSecondNote,
        onToggleDoubleStop,
    } = useScaleMode();

    // --- State: Chord Mode ---
    const [chordType, setChordType] = useState('major');
    const [chordPlayingContext, setChordPlayingContext] = useState<ResolvedRequest['interpretation']['context']>('standalone');

    // --- State: Chord Mode — Reverse ("Name a shape") ---
    // Kept entirely separate from the forward request state above — there is no handoff back
    // into Forward; the two are independent workflows within Chord mode.
    const [chordIntent, setChordIntent] = useState<ChordWorkspaceIntent>('forward');
    const [reverseShapeStates, setReverseShapeStates] = useState<ShapeStates>(SILENT_SHAPE_STATES);
    const {
        progressionName,
        progressionDoc,
        focusedNodeId,
        setFocusedNodeId,
        handleDragEnd,
        addSecondaryDominant,
        addTritoneSubstitution,
        addSubdominantMinor,
        applyPicardyThird,
        addFlatSix,
        addFlatSeven,
        removeNode,
        removeMeasure,
        clearMeasure,
        clearAllNodes,
        appendMeasure,
        applyPreset,
        updateNodeDuration,
    } = useProgression();

    const { playProgressionChord } = useProgressionAudio();

    // --- Effect: Auto-reset progression on Key/Mode change ---
    useEffect(() => {
        if (mode === 'progression') {
            clearAllNodes();
        }
    }, [clearAllNodes, selectedKey, scaleName, mode]); // Also reset when entering progression mode? 

    // Actually the user said "?? (when changing), so watching key/scale is correct.
    // Adding `mode` ensures it resets if they change mode/key while in prog mode.

    // --- Derived Data: Scales ---
    const scaleDerived = useMemo(
        () => getScaleDerivedData(scaleGroup, scaleName, selectedKey, {
            showChordTones,
            blueNote,
            sixthNote,
            secondNote,
            isDoubleStopActive,
            doubleStopInterval,
            doubleStopStrings,
        }),
        [
            scaleGroup,
            scaleName,
            selectedKey,
            showChordTones,
            blueNote,
            sixthNote,
            secondNote,
            isDoubleStopActive,
            doubleStopInterval,
            doubleStopStrings,
        ]
    );
    const { diatonicChords, isDoubleStopAvailable, isDoubleStopVisible, isPentatonic, isMinorMode } = scaleDerived;

    const modifierNotes = useMemo(
        () => (mode === 'scale' ? scaleDerived.modifierNotes : []),
        [mode, scaleDerived.modifierNotes]
    );

    // --- Derived Data: Chords ---
    const currentChordEntry = useMemo(() => {
        try {
            return engineEntry(chordType);
        } catch {
            return null;
        }
    }, [chordType]);
    const futureVoicingScopeKey = `${chordType}::${selectedKey}`;
    const tonalContext = useMemo(() => ({
        selectedKey,
        tonicPitchClass: selectedKey,
        scaleGroup,
        scaleName,
    }), [scaleGroup, scaleName, selectedKey]);
    const [harmonicWorkspace, dispatchHarmonicWorkspace] = useReducer(
        reduceHarmonicWorkspaceState,
        createHarmonicWorkspaceState(futureVoicingScopeKey, tonalContext)
    );

    useEffect(() => {
        dispatchHarmonicWorkspace({
            type: 'sync-scope',
            scopeKey: futureVoicingScopeKey,
            tonalContext,
        });
    }, [futureVoicingScopeKey, tonalContext]);

    const requestedFutureVoicingId = harmonicWorkspace.scopeKey===futureVoicingScopeKey?harmonicWorkspace.selectedCandidateId:null;
    const exploration = useChordExploration(mode === 'chord', chordType, selectedKey, chordPlayingContext,requestedFutureVoicingId);

    const activeFutureCandidate = exploration.selected;
    const activeFutureVoicingId = activeFutureCandidate?.candidate.allocationId??null;
    const activeFutureVoicingFingering = useMemo(
        () => exploration.selectionStale?undefined:buildResolvedVoicingFingering(activeFutureCandidate),
        [activeFutureCandidate,exploration.selectionStale]
    );
    const chordPreviewTitle = useMemo(() => {
        const root = getKeyName(selectedKey);
        if (!currentChordEntry) {
            return `${root} ${chordType}`;
        }

        return `${root}${getChordTypeSuffix(currentChordEntry)}`;
    }, [chordType, currentChordEntry, selectedKey]);

    const handleSelectFutureVoicing = useCallback((candidateId: string) => {
        dispatchHarmonicWorkspace({
            type: 'select-candidate',
            scopeKey: futureVoicingScopeKey,
            candidateId,
        });
    }, [futureVoicingScopeKey]);

    const fingering = useMemo(() => {
        if (mode !== 'chord') return undefined;
        return activeFutureVoicingFingering;
    }, [activeFutureVoicingFingering, mode]);

    // --- Derived Data: Progression ---
    const progressionData = useMemo(() => {
        if (mode !== 'progression') return null;
        return getProgressionPlaybackData(progressionDoc, focusedNodeId, selectedKey);
    }, [mode, progressionDoc, focusedNodeId, selectedKey]);

    const focusedNode = useMemo(() => {
        if (!focusedNodeId) return null;
        for (const m of progressionDoc.measures) {
            const node = m.nodes.find(n => n.id === focusedNodeId);
            if (node) return node;
        }
        return null;
    }, [focusedNodeId, progressionDoc]);

    // --- Derived: Cadence position (focused node is last in whole progression) ---
    const isCadencePosition = useMemo(() => {
        if (!focusedNodeId) return false;
        const allNodes: string[] = [];
        for (const m of progressionDoc.measures) {
            for (const n of m.nodes) {
                allNodes.push(n.id);
            }
        }
        return allNodes.length > 0 && allNodes[allNodes.length - 1] === focusedNodeId;
    }, [focusedNodeId, progressionDoc]);

    // --- Active Notes Calculation ---
    const activeNotes = useMemo(() => {
        if (mode === 'scale') {
            return [...scaleDerived.scaleNotes, ...modifierNotes];
        }
        if (mode === 'chord') {
            if (fingering) return fingering.map(f => f.noteIdx);
            return [];
        }
        if (mode === 'progression') {
            const ionianScale = SCALES['Diatonic Modes']['Ionian'];
            return ionianScale.map(i => (selectedKey + i) % 12);
        }
        return [];
    }, [mode, scaleDerived.scaleNotes, modifierNotes, fingering, selectedKey]);

    // --- Derived Data: Double Stops ---
    const { harmonicDoubleStopPairsByInterval, playableDoubleStops } = scaleDerived;

    // --- Chord Tone Highlighting ---
    const currentChordTones = useMemo(() => {
        if (mode === 'scale') {
            return scaleDerived.scaleChordTones;
        }
        if (mode === 'chord') {
            return [];
        }
        if (mode === 'progression') {
            return progressionData?.tones || [];
        }
        return [];
    }, [mode, scaleDerived.scaleChordTones, progressionData]);

    const rootNote = useMemo(() => {
        if (mode === 'progression') {
            return progressionData?.stepRoot ?? selectedKey;
        }
        return selectedKey;
    }, [mode, progressionData, selectedKey]);

    // --- Handlers ---
    const fretboardContainerRef = useRef<HTMLDivElement>(null);

    // --- Effects ---

    useEffect(() => {
        if (mode === 'chord' && fingering && fingering.length > 0) {
            const minFret = Math.min(...fingering.map(f => f.fret));
            if (fretboardContainerRef.current) {
                const scrollPos = minFret * 60;
                fretboardContainerRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
            }
        }
    }, [mode, fingering, selectedKey]);

    return (
        <div className={`min-h-screen bg-[#050505] text-[#a0a0a0] selection:bg-white/20 ${mode === 'chord' || mode === 'scale' ? 'p-3 sm:p-8' : 'p-8'} flex flex-col items-center gap-12 overflow-x-hidden font-sans`}>
            <div className={`w-full ${mode === 'scale' ? 'max-w-[1800px]' : 'max-w-6xl'} grid grid-cols-1 lg:grid-cols-12 gap-8 items-start`}>
                {(mode === 'chord' || mode === 'scale') && <div className="col-span-1 lg:col-span-8"><WorkspaceHeader mode={mode} onModeChange={setMode} /></div>}
                {/* Progression still drives its root/scale navigation through the frozen Controls rack. */}
                {mode === 'progression' && <Controls
                    selectedKey={selectedKey}
                    onKeyChange={setSelectedKey}
                    selectedScaleGroup={scaleGroup}
                    selectedScaleName={scaleName}
                    onScaleChange={commitScaleSelection}
                    mode={mode}
                    onModeChange={setMode}
                    progressionName={progressionName}
                    onProgressionChange={applyPreset}
                />}

                {mode === 'scale' && (
                    <div className="col-span-1 lg:col-span-12 min-w-0">
                        <ScaleModeWorkspace
                            selectedKey={selectedKey}
                            onKeyChange={setSelectedKey}
                            scaleGroup={scaleGroup}
                            scaleName={scaleName}
                            onScaleChange={commitScaleSelection}
                            showIntervals={showIntervals}
                            onToggleIntervals={() => setShowIntervals((prev) => !prev)}
                            showChordTones={showChordTones}
                            onToggleChordTones={onToggleChordTones}
                            isPentatonic={isPentatonic}
                            blueNote={blueNote}
                            onToggleBlueNote={onToggleBlueNote}
                            secondNote={secondNote}
                            onToggleSecondNote={onToggleSecondNote}
                            sixthNote={sixthNote}
                            onToggleSixthNote={onToggleSixthNote}
                            isDoubleStopAvailable={isDoubleStopAvailable}
                            isDoubleStopVisible={isDoubleStopVisible}
                            onToggleDoubleStop={onToggleDoubleStop}
                            doubleStopInterval={doubleStopInterval}
                            onDoubleStopIntervalChange={setDoubleStopInterval}
                            doubleStopStrings={doubleStopStrings}
                            onDoubleStopStringsChange={setDoubleStopStrings}
                            harmonicDoubleStopPairsByInterval={harmonicDoubleStopPairsByInterval}
                            fretboardContainerRef={fretboardContainerRef}
                            tuning={TUNING}
                            activeNotes={activeNotes}
                            rootNote={rootNote}
                            chordTones={currentChordTones}
                            modifierNotes={modifierNotes}
                            scaleIntervalLabels={scaleDerived.scaleIntervalLabels}
                            fingering={fingering}
                            doubleStops={playableDoubleStops}
                        />
                        <BottomMetrics />
                    </div>
                )}

                {mode === 'chord' && (
                    <div className="col-span-1 lg:col-span-12 min-w-0">
                        <ChordModeWorkspace
                            intent={chordIntent} onIntentChange={setChordIntent}
                            chordType={chordType} onChordTypeChange={setChordType}
                            chordSelectorGroups={CHORD_SELECTOR_GROUPS}
                            root={selectedKey} onRootChange={setSelectedKey}
                            explorationPanel={<ChordExplorationPanel
                                key={`${chordType}:${selectedKey}`}
                                context={chordPlayingContext} engine={exploration}
                                onContextChange={(context) => {
                                    if (activeFutureVoicingId) handleSelectFutureVoicing(activeFutureVoicingId);
                                    setChordPlayingContext(context);
                                }}
                                onSelect={handleSelectFutureVoicing}
                                title={chordPreviewTitle} showIntervals={showIntervals}
                                onToggleIntervals={() => setShowIntervals(previous => !previous)}
                                toneChoices={currentChordEntry ? getChordToneChoices(currentChordEntry, selectedKey) : []}
                            />}
                            reversePanel={<ReverseChordPanel
                                states={reverseShapeStates} onStatesChange={setReverseShapeStates}
                                onStartFromVoicing={activeFutureCandidate ? () => setReverseShapeStates(activeFutureCandidate.candidate.states as unknown as ShapeStates) : undefined}
                            />}
                        />
                        <BottomMetrics />
                    </div>
                )}

                {mode === 'progression' && (
                    <div className="col-span-1 lg:col-span-12 bg-[#0a0a0a] border border-white/5 rounded-[3rem] p-12 relative group shadow-2xl overflow-hidden mt-4">
                        {/* Decorative Grid */}
                        <div
                            className="absolute inset-0 opacity-[0.02] pointer-events-none"
                            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                        />

                        <ProgressionModeWorkspace
                            diatonicChords={diatonicChords}
                            selectedKey={selectedKey}
                            progressionDoc={progressionDoc}
                            appendMeasure={appendMeasure}
                            removeMeasure={removeMeasure}
                            clearMeasure={clearMeasure}
                            focusedNodeId={focusedNodeId}
                            setFocusedNodeId={setFocusedNodeId}
                            handleDragEnd={handleDragEnd}
                            updateNodeDuration={updateNodeDuration}
                            focusedNode={focusedNode}
                            progressionData={progressionData}
                            isMinorMode={isMinorMode}
                            isCadencePosition={isCadencePosition}
                            addSecondaryDominant={addSecondaryDominant}
                            addTritoneSubstitution={addTritoneSubstitution}
                            addSubdominantMinor={addSubdominantMinor}
                            addFlatSix={addFlatSix}
                            addFlatSeven={addFlatSeven}
                            applyPicardyThird={applyPicardyThird}
                            removeNode={removeNode}
                            playProgressionChord={playProgressionChord}
                        />

                        <BottomMetrics />
                    </div>
                )}
            </div>
        </div>
    );
}



