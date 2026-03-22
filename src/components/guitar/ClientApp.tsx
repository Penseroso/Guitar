"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    DndContext, 
    useDraggable, 
    useDroppable, 
    DragOverEvent, 
    DragEndEvent,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Fretboard } from '../Fretboard';
import { Controls } from './Controls';
import { ChordGallery } from './ChordGallery';
import { RelatedScalesStrip } from './scale-selector/RelatedScalesStrip';
import { TogglePill } from '../ui/design-system/TogglePill';
import { SlidersHorizontal } from 'lucide-react';
import { ProgressionInspector } from '../../features/progression/components/ProgressionInspector';
import { useProgressionAudio } from '../../features/progression/hooks/useProgressionAudio';
import { getProgressionPlaybackData } from '../../features/progression/utils/getProgressionPlaybackData';
import {
    TUNING,
    SCALES,
    CHORD_SHAPES,
    getScaleIntervalLabels,
    generateModeData,
} from '../../utils/guitar/theory';
import {
    getChordFromDegree,
    getChordFingering,
    getSortedVoicings,
    getDiatonicDoubleStops,
    getPlayableDoubleStopsOnStrings,
    getNoteName,
    degreeToChordName,
} from '../../utils/guitar/logic';
import { Mode, HarmonicFunction, Measure, ChordNode } from '../../utils/guitar/types';
import { useProgression } from '../../hooks/useProgression';



const clampIndex = (value: number, max: number) => Math.max(0, Math.min(value, max));

type ResizePreview = {
    nodeId: string;
    measureId: string;
    nodeIndex: number;
    direction: 'left' | 'right';
    delta: number;
};

type DraggablePaletteItemProps = {
    degree: string;
    selectedKey: number;
    color?: string;
};

function DraggablePaletteItem({ degree, selectedKey, color }: DraggablePaletteItemProps) {
    let harmonicFunction: HarmonicFunction = 'Tonic';
    if (['V', 'vii°'].includes(degree)) harmonicFunction = 'Dominant';
    if (['IV', 'ii'].includes(degree)) harmonicFunction = 'Subdominant';

    const { interval, type } = getChordFromDegree(degree);
    const rootNoteIdx = (selectedKey + interval) % 12;
    const rootText = getNoteName(rootNoteIdx);
    const suffix = type === 'Minor' ? 'm' : type === 'Diminished' ? 'dim' : '';
    const displayName = `${rootText}${suffix}`;

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: degree,
        data: {
            type: 'new',
            coreDegree: degree,
            harmonicFunction,
        },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
    };

    return (
        <button
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`px-6 py-3 rounded-xl border text-white flex flex-col items-center gap-1 touch-none group ${
                isDragging
                    ? 'border-[#00ff88]/50 bg-[#00ff88]/10 shadow-[0_0_24px_rgba(0,255,136,0.18)] opacity-80'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all'
            }`}
        >
            <span className="text-sm font-bold" style={{ color: !isDragging && color ? color : undefined }}>{displayName}</span>
            <span className="text-[9px] font-black text-white/40 group-hover:text-white/60 transition-colors">{degree}</span>
            {isActiveScaleItem && (
                <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-white/50" />
            )}
        </button>
    );
}

// Helper to determine if a chord is part of the current scale (aesthetic only)
const isActiveScaleItem = false; 


type DroppableMeasureProps = {
    measure: Measure;
    children: React.ReactNode;
    isOver?: boolean;
};

function DroppableMeasure({ measure, children, isOver }: DroppableMeasureProps) {
    const { setNodeRef } = useDroppable({
        id: measure.id,
        data: {
            type: 'measure',
            measureId: measure.id
        }
    });

    return (
        <div 
            ref={setNodeRef} 
            className={`flex flex-col gap-2 p-3 rounded-2xl border transition-all group/measure relative ${
                isOver ? 'bg-white/[0.04] border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)]' : 'bg-white/[0.02] border-white/5 hover:border-white/10'
            }`}
        >
            {children}
        </div>
    );
}

type DropIndicatorProps = {
    index: number;
    measure: Measure;
};

function DropIndicator({ index, measure }: DropIndicatorProps) {
    const totalBeats = measure.timeSignature[0];
    const nodes = measure.nodes;

    let leftPosition = 0;
    if (index > 0) {
        const beatsBefore = nodes.slice(0, index).reduce((sum, node) => sum + node.durationInBeats, 0);
        leftPosition = (beatsBefore / totalBeats) * 100;
    }

    if (index === nodes.length) {
        leftPosition = 100;
    }

    return (
        <div
            className="absolute top-0 bottom-0 w-1 bg-[#00ff88] shadow-[0_0_10px_rgba(0,255,136,0.5)] z-30 rounded-full animate-pulse"
            style={{ 
                left: `${leftPosition}%`, 
                transform: leftPosition >= 100 ? 'translateX(-100%)' : (leftPosition <= 0 ? 'none' : 'translateX(-50%)') 
            }}
        />
    );
}

type DraggableNodeProps = {
    node: ChordNode;
    measureId: string;
    isFocused: boolean;
    selectedKey: number;
    addSecondaryDominant: (id: string) => void;
    addTritoneSubstitution: (id: string) => void;
    removeNode: (id: string) => void;
    updateNodeDuration: (id: string, direction: 'left' | 'right', delta: number) => void;
    index: number;
    totalNodes: number;
    prevNodeDuration?: number;
    nextNodeDuration?: number;
    resizePreview: ResizePreview | null;
    setResizePreview: React.Dispatch<React.SetStateAction<ResizePreview | null>>;
    onClick: () => void;
};

function DraggableNode({ 
    node, 
    measureId, 
    isFocused, 
    onClick, 
    selectedKey,
    addSecondaryDominant, 
    addTritoneSubstitution,
    removeNode,
    updateNodeDuration,
    index,
    totalNodes,
    prevNodeDuration,
    nextNodeDuration,
    resizePreview,
    setResizePreview,
}: DraggableNodeProps) {
    const chordName = degreeToChordName(node.displayDegree, node.coreDegree, selectedKey);
    const isResizing = resizePreview?.nodeId === node.id;
    const isAnyNodeResizing = resizePreview !== null;
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: node.id,
        disabled: isAnyNodeResizing,
        data: {
            type: 'move',
            node,
            sourceMeasureId: measureId
        }
    });

    const { setNodeRef: setBeforeDroppableRef } = useDroppable({
        id: `drop-${node.id}-before`,
        data: {
            type: 'node',
            measureId,
            nodeIndex: index,
            insertIndex: index
        }
    });

    const { setNodeRef: setAfterDroppableRef } = useDroppable({
        id: `drop-${node.id}-after`,
        data: {
            type: 'node',
            measureId,
            nodeIndex: index,
            insertIndex: index + 1
        }
    });

    const combinedRef = (element: HTMLElement | null) => {
        setNodeRef(element);
    };

    // Calculate dynamic duration based on global resizing state
    let displayDuration = node.durationInBeats;
    if (resizePreview && resizePreview.measureId === measureId) {
        if (node.id === resizePreview.nodeId) {
            displayDuration = node.durationInBeats + resizePreview.delta;
        } else {
            // Check if this node is the affected neighbor in the same measure
            if (resizePreview.direction === 'right' && index === resizePreview.nodeIndex + 1) {
                displayDuration = node.durationInBeats - resizePreview.delta;
            }
            else if (resizePreview.direction === 'left' && index === resizePreview.nodeIndex - 1) {
                displayDuration = node.durationInBeats - resizePreview.delta;
            }
        }
    }

    const style = {
        transform: isAnyNodeResizing ? undefined : CSS.Translate.toString(transform),
        gridColumn: `span ${Math.max(1, Math.round(displayDuration * 2))}`
    };

    const startX = useRef(0);
    const lastDeltaRef = useRef(0);

    const clampResizeDelta = (direction: 'left' | 'right', delta: number) => {
        if (direction === 'right') {
            if (nextNodeDuration === undefined) return 0;
            return Math.max(-node.durationInBeats + 0.5, Math.min(nextNodeDuration - 0.5, delta));
        }
        if (prevNodeDuration === undefined) return 0;
        return Math.max(-node.durationInBeats + 0.5, Math.min(prevNodeDuration - 0.5, delta));
    };

    const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>, direction: 'left' | 'right') => {
        e.stopPropagation();
        e.preventDefault();
        if (e.currentTarget.hasPointerCapture?.(e.pointerId) === false) {
            e.currentTarget.setPointerCapture(e.pointerId);
        }

        startX.current = e.clientX;
        lastDeltaRef.current = 0;
        setResizePreview({
            nodeId: node.id,
            measureId,
            nodeIndex: index,
            direction,
            delta: 0,
        });

        const onPointerMove = (moveEvent: PointerEvent) => {
            moveEvent.preventDefault();
            const deltaX = moveEvent.clientX - startX.current;
            const container = document.querySelector(`[data-measure-id="${measureId}"]`);
            if (container) {
                const totalWidth = container.clientWidth;
                const beatsPerMeasure = 4; 
                const pixelsPerBeat = totalWidth / beatsPerMeasure;
                
                let beatDelta = Math.round((deltaX / pixelsPerBeat) * 2) / 2; 
                if (direction === 'left') beatDelta = -beatDelta;
                const clampedDelta = clampResizeDelta(direction, beatDelta);
                if (clampedDelta !== lastDeltaRef.current) {
                    lastDeltaRef.current = clampedDelta;
                    setResizePreview({
                        nodeId: node.id,
                        measureId,
                        nodeIndex: index,
                        direction,
                        delta: clampedDelta,
                    });
                }
            }
        };

        const onPointerUp = () => {
            if (lastDeltaRef.current !== 0) {
                updateNodeDuration(node.id, direction, lastDeltaRef.current);
            }
            setResizePreview(null);
            
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove, { passive: false });
        window.addEventListener('pointerup', onPointerUp);
    };

    return (
        <div
            ref={combinedRef}
            style={style}
            onClick={(e) => {
                e.stopPropagation();
                if (isAnyNodeResizing) return;
                onClick();
            }}
            className={`relative h-full min-w-0 rounded-xl border flex flex-col justify-center items-center group touch-none ${
                'cursor-pointer'
            } ${
                !isAnyNodeResizing && !isDragging ? 'transition-all duration-200' : ''
            } ${
                isFocused
                    ? 'border-amber-500/50 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.2)] z-10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
            } ${node.isSecondary ? 'scale-[0.85] border-dashed border-amber-500/30 -mx-1' : ''} ${isResizing && isFocused ? 'ring-1 ring-amber-500/50 z-20 transition-none' : ''}`}
        >
            <div ref={setBeforeDroppableRef} className="absolute inset-y-0 left-0 w-1/2" />
            <div ref={setAfterDroppableRef} className="absolute inset-y-0 right-0 w-1/2" />

            <div
                {...listeners}
                {...attributes}
                className="relative z-10 flex flex-col items-center justify-center flex-1 w-full overflow-hidden"
            >
                <span className={`text-base font-black whitespace-nowrap ${node.isSecondary ? 'text-amber-500/90' : 'text-white/90'}`}>{chordName}</span>
                <span className={`text-[9px] font-semibold whitespace-nowrap ${node.isSecondary ? 'text-amber-400/40' : 'text-white/30'}`}>{node.displayDegree}</span>
            </div>
            <div className="relative z-10 w-full flex justify-center pb-1 pointer-events-none overflow-hidden">
                <span className="text-[8px] tracking-widest text-white/30 whitespace-nowrap">{displayDuration} beats</span>
            </div>

            {/* Resize Handles */}
            {isFocused && totalNodes > 1 && (
                <>
                    {/* Left Handle: available if not the first node */}
                    {index > 0 && (
                        <div 
                            onPointerDown={(e) => handleResizeStart(e, 'left')}
                            className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-amber-500/30 rounded-l-xl transition-colors z-20 flex items-center justify-center group/h"
                        >
                            <div className="w-1 h-4 bg-amber-500/20 group-hover/h:bg-amber-500/40 rounded-full" />
                        </div>
                    )}
                    
                    {/* Right Handle: available if not the last node */}
                    {index < totalNodes - 1 && (
                        <div 
                            onPointerDown={(e) => handleResizeStart(e, 'right')}
                            className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-amber-500/30 rounded-r-xl transition-colors z-20 flex items-center justify-center group/h"
                        >
                            <div className="w-1 h-4 bg-amber-500/20 group-hover/h:bg-amber-500/40 rounded-full" />
                        </div>
                    )}
                </>
            )}

            {/* Removed floating Context Menu - replaced by Inspector Panel */}
        </div>
    );
}

export default function ClientApp() {
    // --- State: Global ---
    const [selectedKey, setSelectedKey] = useState(0); // C
    const [mode, setMode] = useState<Mode>('scale');
    const [showIntervals, setShowIntervals] = useState(false);

    // --- State: Scale Mode ---
    const [scaleGroup, setScaleGroup] = useState('Major Modes');
    const [scaleName, setScaleName] = useState('Major / Ionian');
    const [showChordTones, setShowChordTones] = useState(false); // In scale mode, shows Triad of root
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
    }, [selectedKey, scaleName, mode]); // Also reset when entering progression mode? 

    // Actually the user said "시" (when changing), so watching key/scale is correct.
    // Adding `mode` ensures it resets if they change mode/key while in prog mode.
    // --- Derived Data: Scales ---
    const activeScaleIntervals = useMemo(() => {
        return SCALES[scaleGroup]?.[scaleName] || SCALES['Major Modes']['Major / Ionian'];
    }, [scaleGroup, scaleName]);

    const diatonicChords = useMemo(() => {
        const modeData = generateModeData(scaleGroup, scaleName);
        return Object.entries(modeData).map(([interval, data]) => ({
            degree: data.role,
            color: data.color,
            interval: parseInt(interval)
        })).sort((a, b) => a.interval - b.interval);
    }, [scaleGroup, scaleName]);

    const scaleNotes = useMemo(() => {
        return activeScaleIntervals.map(interval => (selectedKey + interval) % 12);
    }, [selectedKey, activeScaleIntervals]);

    const scaleIntervalLabels = useMemo(() => {
        return getScaleIntervalLabels(scaleGroup, scaleName);
    }, [scaleGroup, scaleName]);

    const isPentatonic = scaleName.includes('Pentatonic');

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
        return minorKeywords.some(kw => scaleName.includes(kw));
    }, [scaleName]);

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
    }, [mode, showChordTones, selectedKey, progressionData, activeScaleIntervals]);

    const rootNote = useMemo(() => {
        if (mode === 'progression') {
            return progressionData?.stepRoot ?? selectedKey;
        }
        return selectedKey;
    }, [mode, progressionData, selectedKey]);

    // --- Handlers ---
    // (Progression handlers extracted to useProgression hook)
    const timelineContainerRef = useRef<HTMLDivElement>(null);
    const fretboardContainerRef = useRef<HTMLDivElement>(null);
    const inspectorPanelRef = useRef<HTMLDivElement>(null);
    const [activeOverId, setActiveOverId] = useState<string | null>(null);
    const [activeOverData, setActiveOverData] = useState<{ type?: 'measure' | 'node'; measureId?: string; nodeIndex?: number; insertIndex?: number } | null>(null);
    const [resizePreview, setResizePreview] = useState<ResizePreview | null>(null);

    const handleDragOver = (event: DragOverEvent) => {
        const { over } = event;
        if (!over) {
            setActiveOverId(null);
            setActiveOverData(null);
            return;
        }

        const overData = over.data.current as { type?: 'measure' | 'node'; measureId?: string; nodeIndex?: number; insertIndex?: number } | undefined;
        const measureId = overData?.measureId || (typeof over.id === 'string' && over.id.startsWith('m-') ? String(over.id) : undefined);
        setActiveOverId(measureId ?? String(over.id));
        
        if (overData?.type === 'node' && measureId) {
            const insertIndex = clampIndex(
                overData.insertIndex ?? overData.nodeIndex ?? 0,
                progressionDoc.measures.find((measure) => measure.id === measureId)?.nodes.length ?? 0
            );
            setActiveOverData({
                ...overData,
                measureId,
                insertIndex,
            });
        } else if (measureId) {
            const measure = progressionDoc.measures.find((item) => item.id === measureId);
            setActiveOverData({
                ...overData,
                measureId,
                insertIndex: measure?.nodes.length ?? 0,
            });
        } else {
            setActiveOverData(null);
        }
    };

    const wrapHandleDragEnd = (event: DragEndEvent) => {
        handleDragEnd(event);
        setActiveOverId(null);
        setActiveOverData(null);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 10,
            },
        })
    );

    // --- Effects ---

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const isInsideTimeline = timelineContainerRef.current && timelineContainerRef.current.contains(event.target as Node);
            const isInsideInspector = inspectorPanelRef.current && inspectorPanelRef.current.contains(event.target as Node);
            
            if (!isInsideTimeline && !isInsideInspector) {
                setFocusedNodeId(null);
            }
        };

        if (focusedNodeId) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [focusedNodeId, setFocusedNodeId]);

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
                    onScaleChange={(g, n) => {
                        setScaleGroup(g);
                        setScaleName(n);
                        setBlueNote(false);
                        setSixthNote(false);
                        setSecondNote(false);
                    }}
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
                    onChordTypeChange={setChordType}
                    voicingIndex={voicingIndex}
                    onVoicingChange={setVoicingIndex}
                    availableVoicingsCount={availableVoicings.length}
                    voicingLabels={availableVoicings.map(v => v.name)}

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
                        <div className="relative z-10 w-full flex flex-col gap-6">
                            <RelatedScalesStrip
                                selectedScaleGroup={scaleGroup}
                                selectedScaleName={scaleName}
                                onScaleChange={(g, n) => {
                                    setScaleGroup(g);
                                    setScaleName(n);
                                }}
                            />

                            {/* Visualizer Controls Dashboard */}
                            <div className="flex flex-col gap-4 bg-[#050505]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-2">
                                    <SlidersHorizontal size={14} className="text-white/40" />
                                    <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em]">Visualization Overrides</span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    <TogglePill label={showIntervals ? "Mode: Note" : "Mode: Interval"} isActive={showIntervals} onToggle={() => setShowIntervals(p => !p)} hideDot={true} />
                                    <TogglePill label="Chord Tones" isActive={showChordTones} onToggle={() => setShowChordTones(p => !p)} colorTheme="chord-tones" />

                                    {isPentatonic && (
                                        <TogglePill label="Add Blue Note" isActive={blueNote} onToggle={() => setBlueNote(p => !p)} />
                                    )}
                                    {isPentatonic && scaleName === "Minor Pentatonic" && (
                                        <>
                                            <TogglePill label="Add 2 (9th)" isActive={secondNote} onToggle={() => setSecondNote(p => !p)} />
                                            <TogglePill label="Add 6th Note" isActive={sixthNote} onToggle={() => setSixthNote(p => !p)} />
                                        </>
                                    )}

                                    <div className="flex flex-col gap-2 col-span-2">
                                        <div className="flex items-center justify-between">
                                            <TogglePill label="Double Stops" isActive={isDoubleStopActive} onToggle={() => setIsDoubleStopActive(p => !p)} />
                                        </div>
                                        {isDoubleStopActive && (
                                            <div className="flex flex-col gap-3 mt-1 p-3 bg-white/[0.03] border border-white/5 rounded-2xl animate-in fade-in duration-300">
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">Interval</span>
                                                    <div className="flex gap-2">
                                                        {[3, 4, 6].map(int => (
                                                            <button key={int}
                                                                onClick={() => {
                                                                    setDoubleStopInterval(int);
                                                                    setDoubleStopStrings(int === 6 ? [0, 2] : [0, 1]);
                                                                }}
                                                                className={`flex-1 py-1.5 text-[9px] font-black rounded-lg border transition-all ${doubleStopInterval === int ? 'bg-white/10 text-white border-white/30 shadow-lg' : 'border-white/5 text-white/30 hover:text-white/70'}`}>
                                                                {int}{int === 3 ? 'rd' : 'th'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2 border-t border-white/5 pt-2">
                                                    <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">String Pair</span>
                                                    <div className="flex gap-2 flex-wrap">
                                                        {(doubleStopInterval === 6
                                                            ? [[0, 2], [1, 3], [2, 4], [3, 5]]
                                                            : [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]]
                                                        ).map(([s1, s2]) => (
                                                            <button
                                                                key={`${s1}-${s2}`}
                                                                onClick={() => setDoubleStopStrings([s1, s2] as [number, number])}
                                                                className={`px-2 py-1.5 text-[9px] font-black rounded-lg border transition-all ${doubleStopStrings[0] === s1 && doubleStopStrings[1] === s2 ? 'bg-white/10 text-white border-white/30 shadow-lg' : 'border-white/5 text-white/30 hover:text-white/70'}`}
                                                            >
                                                                {s1 + 1}-{s2 + 1}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
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
                                        scaleIntervalLabels={mode === 'scale' ? scaleIntervalLabels : undefined}
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

                    {mode === 'progression' && (
                        <DndContext sensors={sensors} onDragOver={handleDragOver} onDragEnd={wrapHandleDragEnd}>
                            <div className="relative z-10 w-full flex flex-col gap-8 animate-in fade-in duration-500">
                                {/* Upper Layer: Diatonic Palette */}
                                <div className="flex flex-col gap-4 bg-[#050505]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm">
                                    <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                                        <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em]">Diatonic Palette</span>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        {diatonicChords.map((chord) => (
                                            <DraggablePaletteItem 
                                                key={chord.degree} 
                                                degree={chord.degree} 
                                                selectedKey={selectedKey} 
                                                color={chord.color}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Middle Layer: Timeline Canvas */}
                                <div className="flex flex-col gap-4 bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 shadow-inner" ref={timelineContainerRef}>
                                    <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-2">
                                        <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em]">Timeline Canvas</span>
                                        <button
                                            onClick={appendMeasure}
                                            className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[9px] font-black tracking-widest text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                                        >
                                            + MEASURE
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-4 w-full">
                                        {progressionDoc.measures.map((measure) => {
                                            const measureSubdivisions = measure.timeSignature[0] * 2;
                                            const usedSubdivisions = measure.nodes.reduce((sum, node) => {
                                                return sum + Math.round(node.durationInBeats * 2);
                                            }, 0);

                                            // Determine if this measure is being hovered and where
                                            return (
                                                <DroppableMeasure 
                                                    key={measure.id} 
                                                    measure={measure} 
                                                    isOver={activeOverId === measure.id}
                                                >
                                                    <div className="flex justify-between items-center px-2 opacity-30 group-hover/measure:opacity-100 transition-opacity">
                                                        <span className="text-[9px] font-black tracking-widest">M.{measure.index + 1}</span>
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={() => removeMeasure(measure.id)}
                                                                className="text-[9px] font-black text-red-500/50 hover:text-red-500"
                                                            >
                                                                DEL
                                                            </button>
                                                            {measure.nodes.length > 0 && (
                                                                <button
                                                                    onClick={() => clearMeasure(measure.id)}
                                                                    className="text-[9px] font-black text-orange-500/50 hover:text-orange-500"
                                                                >
                                                                    CLEAR
                                                                </button>
                                                            )}
                                                            <span className="text-[9px] font-black">{measure.timeSignature[0]}/{measure.timeSignature[1]}</span>
                                                        </div>
                                                        </div>
                                                        <div
                                                            className="flex-1 grid grid-rows-1 grid-flow-col gap-1 h-20 relative"
                                                            style={{ gridTemplateColumns: `repeat(${measureSubdivisions}, minmax(0, 1fr))` }}
                                                            data-measure-id={measure.id}
                                                        >
                                                            {measure.nodes.map((node, nIdx) => (
                                                                <DraggableNode
                                                                    key={node.id}
                                                                    node={node}
                                                                    measureId={measure.id}
                                                                    isFocused={focusedNodeId === node.id}
                                                                    selectedKey={selectedKey}
                                                                    onClick={() => {
                                                                        setFocusedNodeId(prev => prev === node.id ? null : node.id);
                                                                    }}
                                                                    addSecondaryDominant={addSecondaryDominant}
                                                                    addTritoneSubstitution={addTritoneSubstitution}
                                                                    removeNode={removeNode}
                                                                    updateNodeDuration={updateNodeDuration}
                                                                    index={nIdx}
                                                                    totalNodes={measure.nodes.length}
                                                                    prevNodeDuration={measure.nodes[nIdx - 1]?.durationInBeats}
                                                                    nextNodeDuration={measure.nodes[nIdx + 1]?.durationInBeats}
                                                                    resizePreview={resizePreview}
                                                                    setResizePreview={setResizePreview}
                                                                />
                                                            ))}
                                                            {Array.from({ length: Math.max(0, measureSubdivisions - usedSubdivisions) }).map((_, i) => (
                                                                <div key={`empty-${i}`} className="border border-white/5 rounded-xl bg-white/[0.01]" />
                                                            ))}
                                                            
                                                            {/* Drop Indicator Logic */}
                                                            {activeOverData?.measureId === measure.id && typeof activeOverData.insertIndex === 'number' && (
                                                                <DropIndicator 
                                                                    index={activeOverData.insertIndex} 
                                                                    measure={measure} 
                                                                />
                                                            )}
                                                        </div>
                                                </DroppableMeasure>
                                            );
                                        })}
                                    </div>
                                </div>

                                {focusedNode && (
                                    <ProgressionInspector
                                        ref={inspectorPanelRef}
                                        focusedNode={focusedNode}
                                        playbackData={progressionData}
                                        selectedKey={selectedKey}
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

                            </div>
                        </DndContext>
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
