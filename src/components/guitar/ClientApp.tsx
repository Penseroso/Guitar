"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, useReducer } from 'react';
import {CHORD_FAMILIES,CHORD_REGISTRY_LIST} from '@/domain/chord/registry';
import {getChordTypeLabel,getChordTypeSuffix} from '@/domain/chord/helpers';
import {engineEntry} from '@/domain/chord/engine/catalog';
import type {PresentationCandidate,ResolvedRequest} from '@/domain/chord/engine/types';
import { TUNING } from '@/domain/shared/tuning';
import { getKeyName } from '@/domain/shared/keys';
import { Mode, Fingering } from '@/domain/shared/types';
import { useScaleMode } from './scale/useScaleMode';
import { getScaleDerivedData } from '@/domain/scale/getScaleDerivedData';
import { getScaleToneAnalysis } from '@/domain/chord/scale-tone-analysis';
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
import { HarmonyModeWorkspace } from './harmony/HarmonyModeWorkspace';
import { useHarmony } from './harmony/useHarmony';
import type { ChordRef } from '@/domain/harmony/types';
import type { RelationQuery } from '@/domain/harmony/types';
import type { ScaleRef } from '@/domain/scale/scale-ref';
import { chordRefBassTone, chordRefPitchClass, frameForScaleRef, linkChordToHarmony, linkScaleToHarmony, type ScaleHarmonySelection } from '@/features/harmonic-workspace/links';

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
    // Chord's forward request keeps its established context; Scale owns a separate ScaleRef.
    const scaleGroup = 'Diatonic Modes';
    const scaleName = 'Ionian';

    // --- State: Scale Mode ---
    const {
        scaleRef,
        scaleGroup: exploredScaleGroup,
        scaleName: exploredScaleName,
        setTonic,
        commitScaleRef,
        selectedChordId,
        selectAnalysisChord,
        showIntervals: scaleShowIntervals,
        onToggleIntervals: onToggleScaleIntervals,
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
    const [chordBassTone, setChordBassTone] = useState<string | null | undefined>(undefined);
    const [chordPlayingContext, setChordPlayingContext] = useState<ResolvedRequest['interpretation']['context']>('standalone');

    // --- State: Chord Mode — Reverse ("Name a shape") ---
    // Kept entirely separate from the forward request state above — there is no handoff back
    // into Forward; the two are independent workflows within Chord mode.
    const [chordIntent, setChordIntent] = useState<ChordWorkspaceIntent>('forward');
    const [reverseShapeStates, setReverseShapeStates] = useState<ShapeStates>(SILENT_SHAPE_STATES);
    const { query: harmonyQuery, setQuery: setHarmonyQuery, result: harmonyResult } = useHarmony();
    const [harmonySourceScaleRef, setHarmonySourceScaleRef] = useState<ScaleRef | null>(null);
    const [harmonyReturnMode, setHarmonyReturnMode] = useState<'chord' | 'scale' | null>(null);

    // --- Derived Data: Scales ---
    const scaleDerived = useMemo(
        () => getScaleDerivedData(exploredScaleGroup, exploredScaleName, scaleRef.tonic, {
            showChordTones,
            blueNote,
            sixthNote,
            secondNote,
            isDoubleStopActive,
            doubleStopInterval,
            doubleStopStrings,
        }),
        [
            exploredScaleGroup,
            exploredScaleName,
            scaleRef.tonic,
            showChordTones,
            blueNote,
            sixthNote,
            secondNote,
            isDoubleStopActive,
            doubleStopInterval,
            doubleStopStrings,
        ]
    );
    const { isDoubleStopAvailable, isDoubleStopVisible, isPentatonic } = scaleDerived;
    const scaleAnalysis = useMemo(() => getScaleToneAnalysis(scaleRef, selectedChordId), [scaleRef, selectedChordId]);

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
    const exploration = useChordExploration(mode === 'chord', chordType, selectedKey, chordPlayingContext, requestedFutureVoicingId, chordBassTone);

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

    // --- Active Notes Calculation ---
    const activeNotes = useMemo(() => {
        if (mode === 'scale') {
            return [...scaleDerived.scaleNotes, ...modifierNotes];
        }
        if (mode === 'chord') {
            if (fingering) return fingering.map(f => f.noteIdx);
            return [];
        }
        return [];
    }, [mode, scaleDerived.scaleNotes, modifierNotes, fingering]);

    // --- Derived Data: Double Stops ---
    const { harmonicDoubleStopPairsByInterval, playableDoubleStops } = scaleDerived;

    // --- Chord Tone Highlighting ---
    const currentChordTones = useMemo(() => {
        if (mode === 'scale') {
            return scaleAnalysis?.tones.filter(tone => tone.chordMembership === 'member').map(tone => tone.pitchClass) ?? [];
        }
        if (mode === 'chord') {
            return [];
        }
        return [];
    }, [mode, scaleAnalysis]);

    const rootNote = useMemo(() => {
        if (mode === 'scale') return scaleRef.tonic;
        return selectedKey;
    }, [mode, selectedKey, scaleRef.tonic]);

    // --- Handlers ---
    const fretboardContainerRef = useRef<HTMLDivElement>(null);
    const openHarmonyFromChord = useCallback((chord: ChordRef) => {
        setHarmonyQuery(linkChordToHarmony(harmonyQuery, chord));
        setHarmonySourceScaleRef(null);
        setHarmonyReturnMode(null);
        setMode('harmony');
    }, [harmonyQuery, setHarmonyQuery]);
    const changeHarmonyQuery = useCallback((next: RelationQuery) => {
        if (next.target.root !== harmonyQuery.target.root || next.target.chordId !== harmonyQuery.target.chordId) {
            setHarmonySourceScaleRef(null);
            const changed = { ...next };
            delete changed.context;
            setHarmonyQuery(changed);
            return;
        }
        const chordChanged = (left?: ChordRef, right?: ChordRef) => left?.root !== right?.root || left?.chordId !== right?.chordId || left?.bass !== right?.bass;
        if (next.target.bass !== harmonyQuery.target.bass || chordChanged(next.context?.before, harmonyQuery.context?.before) || chordChanged(next.context?.middle, harmonyQuery.context?.middle)) {
            // Editing an observed inversion must not erase the other chords, but
            // the old bass/rhythm confirmation no longer describes this path.
            const context = { ...next.context };
            delete context.bassConfirmed;
            delete context.rhythmConfirmed;
            setHarmonyQuery({ ...next, context });
            return;
        }
        setHarmonyQuery(next);
    }, [harmonyQuery.target, harmonyQuery.context, setHarmonyQuery]);
    const openHarmonyFromScale = useCallback((selection: ScaleHarmonySelection) => {
        const link = linkScaleToHarmony(harmonyQuery, selection);
        setHarmonyQuery(link.query);
        setHarmonySourceScaleRef(link.sourceScaleRef);
        setHarmonyReturnMode(null);
        setMode('harmony');
    }, [harmonyQuery, setHarmonyQuery]);
    const openChordFromHarmony = useCallback((chord: ChordRef) => {
        const pitchClass = chordRefPitchClass(chord);
        if (pitchClass === null) return;
        setSelectedKey(pitchClass);
        setChordType(chord.chordId);
        setChordBassTone(chordRefBassTone(chord));
        setChordIntent('forward');
        setHarmonyReturnMode('chord');
        setMode('chord');
    }, []);
    const openScaleFromHarmony = useCallback((ref: ScaleRef) => {
        commitScaleRef(ref);
        setHarmonyReturnMode('scale');
        setMode('scale');
    }, [commitScaleRef]);
    const useScaleFrame = useCallback(() => {
        if (!harmonySourceScaleRef) return;
        const frame = frameForScaleRef(harmonySourceScaleRef, harmonyQuery.frame);
        if (frame) setHarmonyQuery({ ...harmonyQuery, frame });
    }, [harmonyQuery, harmonySourceScaleRef, setHarmonyQuery]);

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
        <div className="min-h-screen bg-[#050505] text-[#a0a0a0] selection:bg-white/20 p-3 sm:p-8 flex flex-col items-center gap-12 overflow-x-hidden font-sans">
            <div className={`w-full ${mode === 'scale' ? 'max-w-[1800px]' : 'max-w-6xl'} grid grid-cols-1 lg:grid-cols-12 gap-8 items-start`}>
                <div className="col-span-1 lg:col-span-8"><WorkspaceHeader mode={mode} onModeChange={(next) => { setHarmonyReturnMode(null); if (next === 'chord') setChordBassTone(undefined); setMode(next); }} /></div>

                {mode === 'scale' && (
                    <div className="col-span-1 lg:col-span-12 min-w-0">
                        <ScaleModeWorkspace
                            scaleRef={scaleRef}
                            analysis={scaleAnalysis}
                            selectedChordId={selectedChordId}
                            onSelectChord={selectAnalysisChord}
                            onNavigateScale={commitScaleRef}
                            onExploreHarmony={openHarmonyFromScale}
                            onReturnToHarmony={harmonyReturnMode === 'scale' ? () => { setHarmonyReturnMode(null); setMode('harmony'); } : undefined}
                            selectedKey={scaleRef.tonic}
                            onKeyChange={setTonic}
                            scaleGroup={exploredScaleGroup}
                            scaleName={exploredScaleName}
                            onScaleChange={commitScaleSelection}
                            showIntervals={scaleShowIntervals}
                            onToggleIntervals={onToggleScaleIntervals}
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
                            onExploreHarmony={() => openHarmonyFromChord({ root: getKeyName(selectedKey), chordId: chordType })}
                            onReturnToHarmony={harmonyReturnMode === 'chord' ? () => { setHarmonyReturnMode(null); setMode('harmony'); } : undefined}
                            chordType={chordType} onChordTypeChange={(next) => { setChordBassTone(undefined); setChordType(next); }}
                            chordSelectorGroups={CHORD_SELECTOR_GROUPS}
                            root={selectedKey} onRootChange={(next) => { setChordBassTone(undefined); setSelectedKey(next); }}
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
                                onExploreHarmony={openHarmonyFromChord}
                            />}
                        />
                        <BottomMetrics />
                    </div>
                )}

                {mode === 'harmony' && <div className="col-span-1 lg:col-span-12 min-w-0">
                    <HarmonyModeWorkspace
                        query={harmonyQuery} result={harmonyResult} onQueryChange={changeHarmonyQuery}
                        onOpenChord={openChordFromHarmony} onOpenScale={openScaleFromHarmony}
                        sourceScaleRef={harmonySourceScaleRef} onUseScaleFrame={useScaleFrame}
                    />
                    <BottomMetrics />
                </div>}
            </div>
        </div>
    );
}
