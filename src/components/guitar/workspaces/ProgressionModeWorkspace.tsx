"use client";

import React, { useEffect, useRef, useState } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    PointerSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

import { ProgressionInspector } from '../../../features/progression/components/ProgressionInspector';
import type { ProgressionPlaybackData } from '../../../features/progression/utils/getProgressionPlaybackData';
import { degreeToChordName, getChordFromDegree } from '../../../utils/guitar/logic';
import type {
    ChordNode,
    HarmonicFunction,
    Measure,
} from '../../../utils/guitar/types';

type ResizePreview = {
    nodeId: string;
    measureId: string;
    nodeIndex: number;
    direction: 'left' | 'right';
    delta: number;
};

function clampIndex(value: number, max: number) {
    return Math.max(0, Math.min(value, max));
}

type DiatonicChord = {
    degree: string;
    color?: string;
    interval: number;
};

type ActiveOverData = {
    type?: 'measure' | 'node';
    measureId?: string;
    nodeIndex?: number;
    insertIndex?: number;
} | null;

function DraggablePaletteItem({ degree, selectedKey, color }: { degree: string; selectedKey: number; color?: string }) {
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

    return (
        <button
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform) }}
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
        </button>
    );
}

function DroppableMeasure({ measure, children, isOver }: { measure: Measure; children: React.ReactNode; isOver?: boolean }) {
    const { setNodeRef } = useDroppable({
        id: measure.id,
        data: {
            type: 'measure',
            measureId: measure.id,
        },
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

function DropIndicator({ index, measure }: { index: number; measure: Measure }) {
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
                transform: leftPosition >= 100 ? 'translateX(-100%)' : (leftPosition <= 0 ? 'none' : 'translateX(-50%)'),
            }}
        />
    );
}

function DraggableNode({
    node,
    measureId,
    isFocused,
    selectedKey,
    updateNodeDuration,
    index,
    totalNodes,
    prevNodeDuration,
    nextNodeDuration,
    resizePreview,
    setResizePreview,
    onClick,
}: {
    node: ChordNode;
    measureId: string;
    isFocused: boolean;
    selectedKey: number;
    updateNodeDuration: (id: string, direction: 'left' | 'right', delta: number) => void;
    index: number;
    totalNodes: number;
    prevNodeDuration?: number;
    nextNodeDuration?: number;
    resizePreview: ResizePreview | null;
    setResizePreview: React.Dispatch<React.SetStateAction<ResizePreview | null>>;
    onClick: () => void;
}) {
    const chordName = degreeToChordName(node.displayDegree, node.coreDegree, selectedKey);
    const isResizing = resizePreview?.nodeId === node.id;
    const isAnyNodeResizing = resizePreview !== null;
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: node.id,
        disabled: isAnyNodeResizing,
        data: {
            type: 'move',
            node,
            sourceMeasureId: measureId,
        },
    });

    const { setNodeRef: setBeforeDroppableRef } = useDroppable({
        id: `drop-${node.id}-before`,
        data: {
            type: 'node',
            measureId,
            nodeIndex: index,
            insertIndex: index,
        },
    });

    const { setNodeRef: setAfterDroppableRef } = useDroppable({
        id: `drop-${node.id}-after`,
        data: {
            type: 'node',
            measureId,
            nodeIndex: index,
            insertIndex: index + 1,
        },
    });

    let displayDuration = node.durationInBeats;
    if (resizePreview && resizePreview.measureId === measureId) {
        if (node.id === resizePreview.nodeId) {
            displayDuration = node.durationInBeats + resizePreview.delta;
        } else if (resizePreview.direction === 'right' && index === resizePreview.nodeIndex + 1) {
            displayDuration = node.durationInBeats - resizePreview.delta;
        } else if (resizePreview.direction === 'left' && index === resizePreview.nodeIndex - 1) {
            displayDuration = node.durationInBeats - resizePreview.delta;
        }
    }

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
            if (!container) return;

            const totalWidth = (container as HTMLElement).clientWidth;
            const pixelsPerBeat = totalWidth / 4;
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
            ref={setNodeRef}
            style={{
                transform: isAnyNodeResizing ? undefined : CSS.Translate.toString(transform),
                gridColumn: `span ${Math.max(1, Math.round(displayDuration * 2))}`,
            }}
            onClick={(e) => {
                e.stopPropagation();
                if (isAnyNodeResizing) return;
                onClick();
            }}
            className={`relative h-full min-w-0 rounded-xl border flex flex-col justify-center items-center group touch-none ${!isAnyNodeResizing && !isDragging ? 'transition-all duration-200' : ''} ${
                isFocused
                    ? 'border-amber-500/50 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.2)] z-10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
            } ${node.isSecondary ? 'scale-[0.85] border-dashed border-amber-500/30 -mx-1' : ''} ${isResizing && isFocused ? 'ring-1 ring-amber-500/50 z-20 transition-none' : ''}`}
        >
            <div ref={setBeforeDroppableRef} className="absolute inset-y-0 left-0 w-1/2" />
            <div ref={setAfterDroppableRef} className="absolute inset-y-0 right-0 w-1/2" />

            <div {...listeners} {...attributes} className="relative z-10 flex flex-col items-center justify-center flex-1 w-full overflow-hidden">
                <span className={`text-base font-black whitespace-nowrap ${node.isSecondary ? 'text-amber-500/90' : 'text-white/90'}`}>{chordName}</span>
                <span className={`text-[9px] font-semibold whitespace-nowrap ${node.isSecondary ? 'text-amber-400/40' : 'text-white/30'}`}>{node.displayDegree}</span>
            </div>
            <div className="relative z-10 w-full flex justify-center pb-1 pointer-events-none overflow-hidden">
                <span className="text-[8px] tracking-widest text-white/30 whitespace-nowrap">{displayDuration} beats</span>
            </div>

            {isFocused && totalNodes > 1 && (
                <>
                    {index > 0 && (
                        <div onPointerDown={(e) => handleResizeStart(e, 'left')} className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-amber-500/30 rounded-l-xl transition-colors z-20 flex items-center justify-center group/h">
                            <div className="w-1 h-4 bg-amber-500/20 group-hover/h:bg-amber-500/40 rounded-full" />
                        </div>
                    )}
                    {index < totalNodes - 1 && (
                        <div onPointerDown={(e) => handleResizeStart(e, 'right')} className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-amber-500/30 rounded-r-xl transition-colors z-20 flex items-center justify-center group/h">
                            <div className="w-1 h-4 bg-amber-500/20 group-hover/h:bg-amber-500/40 rounded-full" />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function ProgressionTimelineCanvas({
    progressionDoc,
    activeOverId,
    activeOverData,
    focusedNodeId,
    selectedKey,
    removeMeasure,
    clearMeasure,
    setFocusedNodeId,
    updateNodeDuration,
    resizePreview,
    setResizePreview,
}: {
    progressionDoc: { measures: Measure[] };
    activeOverId: string | null;
    activeOverData: ActiveOverData;
    focusedNodeId: string | null;
    selectedKey: number;
    removeMeasure: (id: string) => void;
    clearMeasure: (id: string) => void;
    setFocusedNodeId: (id: string | null | ((prev: string | null) => string | null)) => void;
    updateNodeDuration: (id: string, direction: 'left' | 'right', delta: number) => void;
    resizePreview: ResizePreview | null;
    setResizePreview: React.Dispatch<React.SetStateAction<ResizePreview | null>>;
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-4 w-full">
            {progressionDoc.measures.map((measure) => {
                const measureSubdivisions = measure.timeSignature[0] * 2;
                const usedSubdivisions = measure.nodes.reduce((sum, node) => sum + Math.round(node.durationInBeats * 2), 0);

                return (
                    <DroppableMeasure key={measure.id} measure={measure} isOver={activeOverId === measure.id}>
                        <div className="flex justify-between items-center px-2 opacity-30 group-hover/measure:opacity-100 transition-opacity">
                            <span className="text-[9px] font-black tracking-widest">M.{measure.index + 1}</span>
                            <div className="flex items-center gap-3">
                                <button onClick={() => removeMeasure(measure.id)} className="text-[9px] font-black text-red-500/50 hover:text-red-500">
                                    DEL
                                </button>
                                {measure.nodes.length > 0 && (
                                    <button onClick={() => clearMeasure(measure.id)} className="text-[9px] font-black text-orange-500/50 hover:text-orange-500">
                                        CLEAR
                                    </button>
                                )}
                                <span className="text-[9px] font-black">{measure.timeSignature[0]}/{measure.timeSignature[1]}</span>
                            </div>
                        </div>
                        <div className="flex-1 grid grid-rows-1 grid-flow-col gap-1 h-20 relative" style={{ gridTemplateColumns: `repeat(${measureSubdivisions}, minmax(0, 1fr))` }} data-measure-id={measure.id}>
                            {measure.nodes.map((node, nIdx) => (
                                <DraggableNode
                                    key={node.id}
                                    node={node}
                                    measureId={measure.id}
                                    isFocused={focusedNodeId === node.id}
                                    selectedKey={selectedKey}
                                    onClick={() => setFocusedNodeId((prev) => prev === node.id ? null : node.id)}
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
                            {activeOverData?.measureId === measure.id && typeof activeOverData.insertIndex === 'number' && (
                                <DropIndicator index={activeOverData.insertIndex} measure={measure} />
                            )}
                        </div>
                    </DroppableMeasure>
                );
            })}
        </div>
    );
}

interface ProgressionModeWorkspaceProps {
    diatonicChords: DiatonicChord[];
    selectedKey: number;
    progressionDoc: { measures: Measure[] };
    appendMeasure: () => void;
    removeMeasure: (id: string) => void;
    clearMeasure: (id: string) => void;
    focusedNodeId: string | null;
    setFocusedNodeId: (id: string | null | ((prev: string | null) => string | null)) => void;
    handleDragEnd: (event: DragEndEvent) => void;
    updateNodeDuration: (id: string, direction: 'left' | 'right', delta: number) => void;
    focusedNode: ChordNode | null;
    progressionData: ProgressionPlaybackData | null;
    isMinorMode: boolean;
    isCadencePosition: boolean;
    addSecondaryDominant: (id: string) => void;
    addTritoneSubstitution: (id: string) => void;
    addSubdominantMinor: (id: string) => void;
    addFlatSix: (id: string) => void;
    addFlatSeven: (id: string) => void;
    applyPicardyThird: (id: string) => void;
    removeNode: (id: string) => void;
    playProgressionChord: (root: number, intervals: number[]) => void | Promise<void>;
}

export function ProgressionModeWorkspace({
    diatonicChords,
    selectedKey,
    progressionDoc,
    appendMeasure,
    removeMeasure,
    clearMeasure,
    focusedNodeId,
    setFocusedNodeId,
    handleDragEnd,
    updateNodeDuration,
    focusedNode,
    progressionData,
    isMinorMode,
    isCadencePosition,
    addSecondaryDominant,
    addTritoneSubstitution,
    addSubdominantMinor,
    addFlatSix,
    addFlatSeven,
    applyPicardyThird,
    removeNode,
    playProgressionChord,
}: ProgressionModeWorkspaceProps) {
    const timelineContainerRef = useRef<HTMLDivElement>(null);
    const inspectorPanelRef = useRef<HTMLDivElement>(null);
    const [activeOverId, setActiveOverId] = useState<string | null>(null);
    const [activeOverData, setActiveOverData] = useState<ActiveOverData>(null);
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

    return (
        <DndContext sensors={sensors} onDragOver={handleDragOver} onDragEnd={wrapHandleDragEnd}>
            <div className="relative z-10 w-full flex flex-col gap-8 animate-in fade-in duration-500">
                <div className="flex flex-col gap-4 bg-[#050505]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em]">Diatonic Palette</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {diatonicChords.map((chord) => (
                            <DraggablePaletteItem key={chord.degree} degree={chord.degree} selectedKey={selectedKey} color={chord.color} />
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-4 bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 shadow-inner" ref={timelineContainerRef}>
                    <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-2">
                        <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em]">Timeline Canvas</span>
                        <button onClick={appendMeasure} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[9px] font-black tracking-widest text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all">
                            + MEASURE
                        </button>
                    </div>
                    <ProgressionTimelineCanvas
                        progressionDoc={progressionDoc}
                        activeOverId={activeOverId}
                        activeOverData={activeOverData}
                        focusedNodeId={focusedNodeId}
                        selectedKey={selectedKey}
                        removeMeasure={removeMeasure}
                        clearMeasure={clearMeasure}
                        setFocusedNodeId={setFocusedNodeId}
                        updateNodeDuration={updateNodeDuration}
                        resizePreview={resizePreview}
                        setResizePreview={setResizePreview}
                    />
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
    );
}
