"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, useReducer } from 'react';
import { Controls } from './Controls';
import { useProgressionAudio } from '../../features/progression/hooks/useProgressionAudio';
import { getProgressionPlaybackData } from '../../features/progression/utils/getProgressionPlaybackData';
import {
    CHORD_REGISTRY_LIST,
    getRankedVoicingsForChord,
    resolveChordRegistryEntry,
    type ProgressionHandoffPayload,
    type ResolvedVoicing,
    type VoicingRankingMode,
} from '../../utils/guitar/chords';
import {
    TUNING,
    SCALES,
    CHORD_SHAPES,
    getScaleIntervalLabels,
    getScaleEngineIntervalLabels,
    isDoubleStopSupported,
    generateModeData,
} from '../../utils/guitar/theory';
import {
    getChordFingering,
    getSortedVoicings,
    getHarmonicDoubleStops,
    getPlayableDoubleStopsOnStrings,
    getNoteName,
} from '../../utils/guitar/logic';
import { Mode, HarmonicInterval, Fingering } from '../../utils/guitar/types';
import { useProgression } from '../../hooks/useProgression';
import { applyDraftToProgressionDocument, type ProgressionDraftApplyMode } from '../../utils/guitar/progression';
import {
    createHarmonicWorkspaceState,
    reduceHarmonicWorkspaceState,
} from '../../features/harmonic-workspace/state';
import { resolveBridgeSelection } from './chord-preview/bridge';
import { getVoicingPresentationMeta } from './chord-preview/voicing-labels';
import { ScaleModeWorkspace } from './workspaces/ScaleModeWorkspace';
import { ChordModeWorkspace } from './workspaces/ChordModeWorkspace';
import { ProgressionModeWorkspace } from './workspaces/ProgressionModeWorkspace';

const CHORD_TYPE_PRIORITY = [
    'major',
    'minor',
    'major-7',
    'minor-7',
    'dominant-7',
    'sus2',
    'sus4',
    'major-9',
    'minor-9',
    'dominant-9',
    'dominant-13',
    'power-5',
    'half-diminished-7',
    'diminished-7',
    'hendrix-7-sharp-9',
    'dominant-7-flat-9',
] as const;

const CHORD_SELECTOR_OPTIONS = CHORD_TYPE_PRIORITY.map((id) => {
    const entry = CHORD_REGISTRY_LIST.find((item) => item.id === id);
    if (!entry) {
        return null;
    }

    return {
        id: entry.id,
        stateValue: entry.id,
        label: entry.symbol || entry.displayName,
        description: entry.displayName,
    };
}).filter((entry): entry is NonNullable<typeof entry> => entry !== null);

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
    const [scaleGroup, setScaleGroup] = useState('Diatonic Modes');
    const [scaleName, setScaleName] = useState('Ionian');
    const [previewScaleGroup, setPreviewScaleGroup] = useState<string | null>(null);
    const [previewScaleName, setPreviewScaleName] = useState<string | null>(null);
    const [showChordTones, setShowChordTones] = useState(false); // In scale mode, shows Triad of root
    const [blueNote, setBlueNote] = useState(false);
    const [sixthNote, setSixthNote] = useState(false);
    const [secondNote, setSecondNote] = useState(false);

    // --- State: Chord Mode ---
    const [chordType, setChordType] = useState('major');
    const [voicingIndex, setVoicingIndex] = useState(0);
    const [voicingRankingMode, setVoicingRankingMode] = useState<VoicingRankingMode>('balanced');
    const [voicingSourceFilter, setVoicingSourceFilter] = useState<'all' | 'legacy-import' | 'generated'>('all');
    const [voicingRootFilter, setVoicingRootFilter] = useState<'all' | '6' | '5' | '4'>('all');

    // --- State: Double Stops (Scale Mode Feature) ---
    const [isDoubleStopActive, setIsDoubleStopActive] = useState(false);
    const [doubleStopInterval, setDoubleStopInterval] = useState<HarmonicInterval>(3);
    const [doubleStopStrings, setDoubleStopStrings] = useState<[number, number]>([1, 2]);

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
        applyProgressionDocument,
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
    const hasPreview = previewScaleGroup !== null && previewScaleName !== null;
    const effectiveScaleGroup = previewScaleGroup ?? scaleGroup;
    const effectiveScaleName = previewScaleName ?? scaleName;

    const isPreviewingScale = (group: string, name: string) =>
        previewScaleGroup === group && previewScaleName === name;

    const handleClearPreview = useCallback(() => {
        setPreviewScaleGroup(null);
        setPreviewScaleName(null);
    }, []);

    const commitScaleSelection = useCallback((group: string, name: string) => {
        setScaleGroup(group);
        setScaleName(name);
        setBlueNote(false);
        setSixthNote(false);
        setSecondNote(false);
        handleClearPreview();
    }, [handleClearPreview]);

    const handleRelatedPreviewToggle = (group: string, name: string) => {
        if (isPreviewingScale(group, name)) {
            handleClearPreview();
            return;
        }

        setPreviewScaleGroup(group);
        setPreviewScaleName(name);
    };

    const handleApplyPreview = useCallback(() => {
        if (!previewScaleGroup || !previewScaleName) return;
        commitScaleSelection(previewScaleGroup, previewScaleName);
    }, [commitScaleSelection, previewScaleGroup, previewScaleName]);

    // --- Derived Data: Scales ---
    const activeScaleIntervals = useMemo(() => {
        return SCALES[effectiveScaleGroup]?.[effectiveScaleName] || SCALES['Diatonic Modes']['Ionian'];
    }, [effectiveScaleGroup, effectiveScaleName]);

    const diatonicChords = useMemo(() => {
        const modeData = generateModeData(effectiveScaleGroup, effectiveScaleName);
        return Object.entries(modeData).map(([interval, data]) => ({
            degree: data.role,
            color: data.color,
            interval: parseInt(interval)
        })).sort((a, b) => a.interval - b.interval);
    }, [effectiveScaleGroup, effectiveScaleName]);

    const scaleNotes = useMemo(() => {
        return activeScaleIntervals.map(interval => (selectedKey + interval) % 12);
    }, [selectedKey, activeScaleIntervals]);

    const scaleIntervalLabels = useMemo(() => {
        return getScaleIntervalLabels(effectiveScaleGroup, effectiveScaleName);
    }, [effectiveScaleGroup, effectiveScaleName]);

    const scaleEngineIntervalLabels = useMemo(() => {
        return getScaleEngineIntervalLabels(effectiveScaleGroup, effectiveScaleName);
    }, [effectiveScaleGroup, effectiveScaleName]);

    const isDoubleStopAvailable = useMemo(() => {
        return isDoubleStopSupported(effectiveScaleGroup, effectiveScaleName);
    }, [effectiveScaleGroup, effectiveScaleName]);

    const isDoubleStopVisible = isDoubleStopAvailable && isDoubleStopActive;

    const isPentatonic = effectiveScaleName.includes('Pentatonic');

    const modifierNotes = useMemo(() => {
        const mods = [];
        if (mode === 'scale') {
            if (blueNote && effectiveScaleName.includes('Pentatonic')) {
                mods.push((selectedKey + 6) % 12);
            }
            if (sixthNote && effectiveScaleName === 'Minor Pentatonic') {
                mods.push((selectedKey + 9) % 12);
            }
            if (secondNote && effectiveScaleName === 'Minor Pentatonic') {
                mods.push((selectedKey + 2) % 12);
            }
        }
        return mods;
    }, [mode, blueNote, sixthNote, secondNote, selectedKey, effectiveScaleName]);

    // --- Derived Data: Chords ---
    const currentChordEntry = useMemo(() => {
        try {
            return resolveChordRegistryEntry(chordType);
        } catch {
            return null;
        }
    }, [chordType]);
    const availableVoicings = useMemo(() => {
        const legacyShapeKey = currentChordEntry?.legacyType ?? 'Major';
        const shapes = CHORD_SHAPES[legacyShapeKey] || CHORD_SHAPES['Major'];
        return getSortedVoicings(shapes, selectedKey, TUNING);
    }, [currentChordEntry, selectedKey]);

    const currentVoicingShape = useMemo(() => {
        return availableVoicings[voicingIndex] || availableVoicings[0];
    }, [availableVoicings, voicingIndex]);
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

    const activeFutureVoicingId = harmonicWorkspace.selectedCandidateId;
    const activePreparedChordWorkspaceHandoff = harmonicWorkspace.preparedHandoff;
    const activeSelectedScaleId = harmonicWorkspace.selectedScaleId;
    const activeStagedProgression = harmonicWorkspace.stagedProgression;
    const activeDraftApplyMode = activeStagedProgression?.applyMode ?? 'replace';
    const futureVoicingCandidates = useMemo(() => {
        try {
            return getRankedVoicingsForChord(chordType, selectedKey, {
                maxRootFret: 15,
                maxCandidates: 12,
                rankingMode: voicingRankingMode,
            });
        } catch {
            return [];
        }
    }, [chordType, selectedKey, voicingRankingMode]);
    const visibleFutureVoicingCandidates = useMemo(() => {
        return futureVoicingCandidates.filter((candidate) => {
            const sourceMatches = voicingSourceFilter === 'all'
                || candidate.voicing.descriptor.provenance.sourceKind === voicingSourceFilter;
            const rootMatches = voicingRootFilter === 'all'
                || String((candidate.voicing.descriptor.rootString ?? -1) + 1) === voicingRootFilter;

            return sourceMatches && rootMatches;
        });
    }, [futureVoicingCandidates, voicingRootFilter, voicingSourceFilter]);
    const futureVoicingSelection = useMemo(
        () => resolveBridgeSelection(futureVoicingCandidates, activeFutureVoicingId),
        [activeFutureVoicingId, futureVoicingCandidates]
    );
    const activeFutureCandidate = futureVoicingSelection.activeCandidate;
    const activeFutureVoicingFingering = useMemo(
        () => buildResolvedVoicingFingering(activeFutureCandidate?.voicing),
        [activeFutureCandidate]
    );
    const activeFuturePresentation = useMemo(
        () => getVoicingPresentationMeta(activeFutureCandidate?.voicing),
        [activeFutureCandidate]
    );
    const chordPreviewTitle = useMemo(() => {
        const root = getNoteName(selectedKey);
        if (!currentChordEntry) {
            return `${root} ${chordType}`;
        }

        return currentChordEntry.symbol
            ? `${root}${currentChordEntry.symbol}`
            : `${root} ${currentChordEntry.displayName}`;
    }, [chordType, currentChordEntry, selectedKey]);
    const chordPreviewFormula = currentChordEntry?.formula.degrees ?? [];
    const chordPreviewPosition = activeFutureCandidate?.voicing.rootFret !== undefined
        ? `${activeFutureCandidate.voicing.rootFret}fr position`
        : 'Open position';

    const handleFutureVoicingChange = useCallback(({ activeCandidateId, chordType, selectedKey }: {
        activeCandidateId: string | null;
        chordType: string;
        selectedKey: number;
    }) => {
        dispatchHarmonicWorkspace({
            type: 'select-candidate',
            scopeKey: `${chordType}::${selectedKey}`,
            candidateId: activeCandidateId,
        });
    }, []);
    const handleSelectFutureVoicing = useCallback((candidateId: string) => {
        dispatchHarmonicWorkspace({
            type: 'select-candidate',
            scopeKey: futureVoicingScopeKey,
            candidateId,
        });
    }, [futureVoicingScopeKey]);
    const handleSelectWorkspaceScale = useCallback((scaleId: string) => {
        dispatchHarmonicWorkspace({
            type: 'select-scale',
            scopeKey: futureVoicingScopeKey,
            scaleId,
        });
    }, [futureVoicingScopeKey]);
    const handlePrepareChordWorkspaceHandoff = useCallback((payload: ProgressionHandoffPayload) => {
        dispatchHarmonicWorkspace({
            type: 'prepare-handoff',
            scopeKey: `${payload.chordType}::${payload.selectedKey}`,
            tonalContext,
            payload,
        });
    }, [tonalContext]);
    const handleSelectDraftApplyMode = useCallback((applyMode: ProgressionDraftApplyMode) => {
        dispatchHarmonicWorkspace({
            type: 'set-draft-apply-mode',
            scopeKey: futureVoicingScopeKey,
            applyMode,
        });
    }, [futureVoicingScopeKey]);
    const handleClearPreparedChordWorkspaceHandoff = useCallback(() => {
        dispatchHarmonicWorkspace({
            type: 'clear-handoff',
            scopeKey: futureVoicingScopeKey,
            tonalContext,
        });
    }, [futureVoicingScopeKey, tonalContext]);
    const handleApplyPreparedChordWorkspaceHandoff = useCallback(() => {
        if (!activeStagedProgression) return;

        const nextProgressionDoc = applyDraftToProgressionDocument(
            progressionDoc,
            activeStagedProgression.document,
            activeStagedProgression.applyMode,
            focusedNodeId
        );
        applyProgressionDocument(nextProgressionDoc, activeStagedProgression.title);
        dispatchHarmonicWorkspace({
            type: 'mark-handoff-applied',
            scopeKey: futureVoicingScopeKey,
            tonalContext,
            applyMode: activeStagedProgression.applyMode,
        });
    }, [activeStagedProgression, applyProgressionDocument, focusedNodeId, futureVoicingScopeKey, progressionDoc, tonalContext]);
    const handleOpenProgressionWorkspace = useCallback(() => {
        setMode('progression');
    }, []);

    const fingering = useMemo(() => {
        if (mode !== 'chord') return undefined;

        if (activeFutureVoicingFingering && activeFutureVoicingFingering.length > 0) {
            return activeFutureVoicingFingering;
        }

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
        // So `offsets` in theory.ts seem to be High E -> Low E.

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
                let label = "??;
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

    }, [activeFutureVoicingFingering, mode, currentVoicingShape, selectedKey]);

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

    // --- Derived: Minor Mode detection for Picardy Third condition ---
    const isMinorMode = useMemo(() => {
        const minorKeywords = ['Minor', 'Aeolian', 'Dorian', 'Phrygian', 'Locrian'];
        return minorKeywords.some(kw => effectiveScaleName.includes(kw));
    }, [effectiveScaleName]);

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
            return [...scaleNotes, ...modifierNotes];
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
    }, [mode, scaleNotes, modifierNotes, fingering, selectedKey]);

    // --- Derived Data: Double Stops ---
    const harmonicDoubleStopPairsByInterval = useMemo(() => {
        const intervals: HarmonicInterval[] = [3, 4, 6];

        return intervals.reduce<Record<HarmonicInterval, ReturnType<typeof getHarmonicDoubleStops>>>((acc, interval) => {
            acc[interval] = getHarmonicDoubleStops(scaleNotes, scaleEngineIntervalLabels, interval);
            return acc;
        }, {
            3: [],
            4: [],
            6: [],
        });
    }, [scaleNotes, scaleEngineIntervalLabels]);

    const playableDoubleStops = useMemo(() => {
        if (mode !== 'scale' || !isDoubleStopVisible) return [];

        return getPlayableDoubleStopsOnStrings(
            harmonicDoubleStopPairsByInterval[doubleStopInterval],
            selectedKey,
            TUNING,
            doubleStopStrings
        );
    }, [mode, isDoubleStopVisible, harmonicDoubleStopPairsByInterval, doubleStopInterval, doubleStopStrings, selectedKey]);

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
    }, [mode, showChordTones, selectedKey, progressionData, activeScaleIntervals]);

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
    }, [mode, fingering, voicingIndex, selectedKey]);

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
                    onToggleChordTones={() => setShowChordTones(p => !p)}
                    showIntervals={showIntervals}
                    onToggleIntervals={() => setShowIntervals(p => !p)}
                    isPentatonic={isPentatonic}
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
                    chordPreviewTitle={chordPreviewTitle}
                    chordPreviewFormula={chordPreviewFormula}
                    chordPreviewPrimaryLabel={activeFuturePresentation.primaryLabel}
                    chordPreviewSecondaryLabel={activeFuturePresentation.secondaryLabel}
                    chordPreviewPosition={chordPreviewPosition}

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
                            onToggleChordTones={() => setShowChordTones((prev) => !prev)}
                            isPentatonic={isPentatonic}
                            blueNote={blueNote}
                            onToggleBlueNote={() => setBlueNote((prev) => !prev)}
                            secondNote={secondNote}
                            onToggleSecondNote={() => setSecondNote((prev) => !prev)}
                            sixthNote={sixthNote}
                            onToggleSixthNote={() => setSixthNote((prev) => !prev)}
                            isDoubleStopAvailable={isDoubleStopAvailable}
                            isDoubleStopVisible={isDoubleStopVisible}
                            onToggleDoubleStop={() => setIsDoubleStopActive((prev) => !prev)}
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
                            scaleIntervalLabels={scaleIntervalLabels}
                            fingering={fingering}
                            doubleStops={playableDoubleStops}
                        />
                    )}

                    {mode === 'chord' && (
                        <ChordModeWorkspace
                            chordType={chordType}
                            onChordTypeChange={setChordType}
                            chordSelectorOptions={CHORD_SELECTOR_OPTIONS}
                            chordPreviewTitle={chordPreviewTitle}
                            activeFutureCandidate={activeFutureCandidate}
                            activeFuturePresentation={activeFuturePresentation}
                            futureVoicingSelection={futureVoicingSelection}
                            fretboardContainerRef={fretboardContainerRef}
                            tuning={TUNING}
                            activeNotes={activeNotes}
                            rootNote={rootNote}
                            chordTones={currentChordTones}
                            modifierNotes={modifierNotes}
                            showChordTones={showChordTones}
                            showIntervals={showIntervals}
                            fingering={fingering}
                            voicingRankingMode={voicingRankingMode}
                            onVoicingRankingModeChange={setVoicingRankingMode}
                            voicingSourceFilter={voicingSourceFilter}
                            onVoicingSourceFilterChange={setVoicingSourceFilter}
                            voicingRootFilter={voicingRootFilter}
                            onVoicingRootFilterChange={setVoicingRootFilter}
                            visibleFutureVoicingCandidates={visibleFutureVoicingCandidates}
                            futureVoicingCandidates={futureVoicingCandidates}
                            onSelectFutureVoicing={handleSelectFutureVoicing}
                            activeFutureVoicingId={activeFutureVoicingId}
                            activeSelectedScaleId={activeSelectedScaleId}
                            onActiveVoicingChange={handleFutureVoicingChange}
                            onScaleSelect={handleSelectWorkspaceScale}
                            onPrepareProgressionHandoff={handlePrepareChordWorkspaceHandoff}
                            selectedKey={selectedKey}
                            tonalContext={tonalContext}
                            activePreparedChordWorkspaceHandoff={activePreparedChordWorkspaceHandoff}
                            activeStagedProgression={activeStagedProgression}
                            activeDraftApplyMode={activeDraftApplyMode}
                            onSelectDraftApplyMode={handleSelectDraftApplyMode}
                            onApplyPreparedChordWorkspaceHandoff={handleApplyPreparedChordWorkspaceHandoff}
                            onOpenProgressionWorkspace={handleOpenProgressionWorkspace}
                            onClearPreparedChordWorkspaceHandoff={handleClearPreparedChordWorkspaceHandoff}
                            availableVoicings={availableVoicings}
                            voicingIndex={voicingIndex}
                            onLegacyVoicingChange={setVoicingIndex}
                        />
                    )}

                    {mode === 'progression' && (
                        <ProgressionModeWorkspace
                            activePreparedChordWorkspaceHandoff={activePreparedChordWorkspaceHandoff}
                            activeStagedProgression={activeStagedProgression}
                            activeDraftApplyMode={activeDraftApplyMode}
                            onApplyPreparedChordWorkspaceHandoff={handleApplyPreparedChordWorkspaceHandoff}
                            onClearPreparedChordWorkspaceHandoff={handleClearPreparedChordWorkspaceHandoff}
                            tonalContext={tonalContext}
                            effectiveScaleName={effectiveScaleName}
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







