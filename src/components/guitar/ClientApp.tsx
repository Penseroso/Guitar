"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, useReducer } from 'react';
import { Controls } from './Controls';
import { useProgressionAudio } from '../../features/progression/hooks/useProgressionAudio';
import { getProgressionPlaybackData } from '@/domain/progression/getProgressionPlaybackData';
import {
    CHORD_FAMILIES,
    CHORD_REGISTRY_LIST,
    getDeductiveChordSurfaceVoicingsForChord,
    getChordTypeLabel,
    getChordTypeSuffix,
    resolveChordRegistryEntry,
    type ResolvedVoicing,
} from '@/domain/chord';
import { TUNING } from '@/domain/shared/tuning';
import { SCALES } from '@/domain/scale/scales';
import { getNoteName } from '@/domain/shared/notes';
import { Mode, Fingering } from '@/domain/shared/types';
import { useProgression } from '../../hooks/useProgression';
import { useScaleMode } from '../../hooks/useScaleMode';
import { getScaleDerivedData } from '@/domain/scale/getScaleDerivedData';
import {
    createHarmonicWorkspaceState,
    reduceHarmonicWorkspaceState,
} from '../../features/harmonic-workspace/state';
import { resolveBridgeSelection } from './chord-preview/bridge';
import { getVoicingPresentationMeta } from './chord-preview/voicing-labels';
import { ScaleModeWorkspace } from './workspaces/ScaleModeWorkspace';
import { ChordModeWorkspace } from './workspaces/ChordModeWorkspace';
import { ProgressionModeWorkspace } from './workspaces/ProgressionModeWorkspace';

const CHORD_SELECTOR_ORDER_BY_FAMILY = {
    triad: ['major', 'minor', 'power-5', 'augmented', 'diminished', 'sus2', 'sus4'],
    seventh: ['major-7', 'major-6', 'minor-7', 'dominant-7', 'half-diminished-7', 'diminished-7'],
    extended: ['major-9', 'minor-9', 'dominant-9', 'dominant-11', 'dominant-13', 'hendrix-7-sharp-9', 'dominant-7-flat-9'],
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

function buildResolvedVoicingFingering(voicing?: ResolvedVoicing): Fingering[] | undefined {
    if (!voicing) {
        return undefined;
    }

    return voicing.notes
        .filter((note) => !note.isMuted)
        .map((note) => ({
            string: note.string,
            fret: note.fret,
            noteIdx: note.pitchClass,
            label: note.isRoot ? 'R' : note.degree,
        }));
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
        previewScaleGroup,
        previewScaleName,
        effectiveScaleGroup,
        effectiveScaleName,
        hasPreview,
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
        handleRelatedPreviewToggle,
        handleApplyPreview,
        handleClearPreview,
        onToggleChordTones,
        onToggleBlueNote,
        onToggleSixthNote,
        onToggleSecondNote,
        onToggleDoubleStop,
    } = useScaleMode();

    // --- State: Chord Mode ---
    const [chordType, setChordType] = useState('major');
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
        () => getScaleDerivedData(effectiveScaleGroup, effectiveScaleName, selectedKey, {
            showChordTones,
            blueNote,
            sixthNote,
            secondNote,
            isDoubleStopActive,
            doubleStopInterval,
            doubleStopStrings,
        }),
        [
            effectiveScaleGroup,
            effectiveScaleName,
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
            return resolveChordRegistryEntry(chordType);
        } catch {
            return null;
        }
    }, [chordType]);
    const futureVoicingScopeKey = `${chordType}::${selectedKey}`;
    const tonalContext = useMemo(() => ({
        selectedKey,
        tonicPitchClass: selectedKey,
        scaleGroup: effectiveScaleGroup,
        scaleName: effectiveScaleName,
    }), [effectiveScaleGroup, effectiveScaleName, selectedKey]);
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

    const requestedFutureVoicingId = harmonicWorkspace.selectedCandidateId;
    const chordSurfaceVoicingCandidates = useMemo(() => {
        try {
            return getDeductiveChordSurfaceVoicingsForChord(chordType, selectedKey, {
                maxFret: 15,
                maxCandidates: 12,
            });
        } catch {
            return [];
        }
    }, [chordType, selectedKey]);
    const futureVoicingSelection = useMemo(
        () => resolveBridgeSelection(chordSurfaceVoicingCandidates, requestedFutureVoicingId),
        [chordSurfaceVoicingCandidates, requestedFutureVoicingId]
    );
    const activeFutureCandidate = futureVoicingSelection.activeCandidate;
    const activeFutureVoicingId = futureVoicingSelection.activeCandidateId;
    const activeFutureVoicingFingering = useMemo(
        () => buildResolvedVoicingFingering(activeFutureCandidate?.voicing),
        [activeFutureCandidate]
    );
    const activeFuturePresentation = useMemo(
        () => getVoicingPresentationMeta(activeFutureCandidate?.voicing),
        [activeFutureCandidate]
    );
    const chordPreviewPrimaryLabel = activeFutureCandidate
        ? activeFuturePresentation.primaryLabel
        : 'No voicing available';
    const chordPreviewSecondaryLabel = activeFutureCandidate
        ? activeFuturePresentation.secondaryLabel
        : chordSurfaceVoicingCandidates.length === 0
            ? 'No voicing candidates for this chord'
            : 'No candidate selected';
    const chordPreviewTitle = useMemo(() => {
        const root = getNoteName(selectedKey);
        if (!currentChordEntry) {
            return `${root} ${chordType}`;
        }

        return `${root}${getChordTypeSuffix(currentChordEntry)}`;
    }, [chordType, currentChordEntry, selectedKey]);
    const chordTypeLabel = currentChordEntry
        ? getChordTypeLabel(currentChordEntry)
        : chordType;
    const chordPreviewFormula = currentChordEntry?.formula.degrees ?? [];
    const chordPreviewPosition = activeFutureCandidate?.voicing.rootFret !== undefined
        ? `${activeFutureCandidate.voicing.rootFret}fr position`
        : null;

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

    useEffect(() => {
        if (mode !== 'scale' || !hasPreview) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                handleClearPreview();
            } else if (event.key === 'Enter') {
                handleApplyPreview();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [mode, hasPreview, handleApplyPreview, handleClearPreview]);

    return (
        <div className="min-h-screen bg-[#050505] text-[#a0a0a0] selection:bg-white/20 p-8 flex flex-col items-center gap-12 overflow-x-hidden font-sans">
            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* 1. Controls (Left & Right Racks handled internally) */}
                <Controls
                    selectedKey={selectedKey}
                    onKeyChange={setSelectedKey}
                    selectedScaleGroup={scaleGroup}
                    selectedScaleName={scaleName}
                    onScaleChange={commitScaleSelection}
                    showChordTones={showChordTones}
                    onToggleChordTones={onToggleChordTones}
                    isPentatonic={isPentatonic}
                    blueNote={blueNote}
                    onToggleBlueNote={onToggleBlueNote}
                    sixthNote={sixthNote}
                    onToggleSixthNote={onToggleSixthNote}
                    secondNote={secondNote}
                    onToggleSecondNote={onToggleSecondNote}

                    isDoubleStopActive={isDoubleStopActive}
                    onToggleDoubleStop={onToggleDoubleStop}
                    doubleStopInterval={doubleStopInterval}
                    onDoubleStopIntervalChange={setDoubleStopInterval}
                    doubleStopStrings={doubleStopStrings}
                    onDoubleStopStringsChange={setDoubleStopStrings}

                    mode={mode}
                    onModeChange={setMode}

                    chordPreviewTitle={chordPreviewTitle}
                    chordPreviewFormula={chordPreviewFormula}
                    chordPreviewPrimaryLabel={chordPreviewPrimaryLabel}
                    chordPreviewSecondaryLabel={chordPreviewSecondaryLabel}
                    chordPreviewPosition={chordPreviewPosition}
                    chordTypeLabel={chordTypeLabel}

                    progressionName={progressionName}
                    onProgressionChange={applyPreset}
                />

                {/* 2. Visualizations (Footer Rack) */}
                <div className="col-span-1 lg:col-span-12 bg-[#0a0a0a] border border-white/5 rounded-[3rem] p-12 relative group shadow-2xl overflow-hidden mt-4">
                    {/* Decorative Grid */}
                    <div
                        className="absolute inset-0 opacity-[0.02] pointer-events-none"
                        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                    />

                    {mode === 'scale' && (
                        <ScaleModeWorkspace
                            effectiveScaleGroup={effectiveScaleGroup}
                            effectiveScaleName={effectiveScaleName}
                            scaleGroup={scaleGroup}
                            scaleName={scaleName}
                            previewScaleGroup={previewScaleGroup}
                            previewScaleName={previewScaleName}
                            onPreviewToggle={handleRelatedPreviewToggle}
                            onApplyPreview={handleApplyPreview}
                            onClearPreview={handleClearPreview}
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
                    )}

                    {mode === 'chord' && (
                        <ChordModeWorkspace
                            chordType={chordType}
                            onChordTypeChange={setChordType}
                            chordSelectorGroups={CHORD_SELECTOR_GROUPS}
                            chordPreviewTitle={chordPreviewTitle}
                            activeFutureCandidate={activeFutureCandidate}
                            activeFuturePresentation={activeFuturePresentation}
                            fretboardContainerRef={fretboardContainerRef}
                            tuning={TUNING}
                            activeNotes={activeNotes}
                            rootNote={rootNote}
                            chordTones={currentChordTones}
                            modifierNotes={modifierNotes}
                            showChordTones={showChordTones}
                            showIntervals={showIntervals}
                            onToggleIntervals={() => setShowIntervals((prev) => !prev)}
                            fingering={fingering}
                            futureVoicingCandidates={chordSurfaceVoicingCandidates}
                            onSelectFutureVoicing={handleSelectFutureVoicing}
                            activeFutureVoicingId={activeFutureVoicingId}
                        />
                    )}

                    {mode === 'progression' && (
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







