import { useState } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import { HarmonicFunction, ChordNode, Measure, ProgressionDocument } from '../utils/guitar/types';
import { PROGRESSION_LIBRARY } from '../utils/guitar/theory';
import { 
    cloneDoc, 
    clampIndex, 
    createNode, 
    insertNodeIntoMeasure, 
    parsePresetToMeasures,
    injectSecondaryDominant,
    injectTritoneSubstitution
} from '../utils/guitar/progression';

export const useProgression = () => {
    const [progressionName, setProgressionName] = useState('pop-punk');
    const [progressionDoc, setProgressionDoc] = useState<ProgressionDocument>({
        measures: [
            { id: 'm-0', index: 0, timeSignature: [4, 4], nodes: [] },
            { id: 'm-1', index: 1, timeSignature: [4, 4], nodes: [] },
            { id: 'm-2', index: 2, timeSignature: [4, 4], nodes: [] },
            { id: 'm-3', index: 3, timeSignature: [4, 4], nodes: [] },
        ]
    });
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

    const updateNodeDuration = (nodeId: string, direction: 'left' | 'right', durationDelta: number) => {
        setProgressionDoc(prev => {
            const newDoc = cloneDoc(prev);
            const measure = newDoc.measures.find(m => m.nodes.some(n => n.id === nodeId))!;
            const nodeIndex = measure.nodes.findIndex(n => n.id === nodeId);
            const node = measure.nodes[nodeIndex];
            
            if (direction === 'right') {
                if (nodeIndex >= measure.nodes.length - 1) return prev;
                const nextNode = measure.nodes[nodeIndex + 1];
                
                const actualDelta = Math.max(-node.durationInBeats + 0.5, Math.min(nextNode.durationInBeats - 0.5, durationDelta));
                if (actualDelta === 0) return prev;

                measure.nodes[nodeIndex] = { ...node, durationInBeats: node.durationInBeats + actualDelta };
                measure.nodes[nodeIndex + 1] = { ...nextNode, durationInBeats: nextNode.durationInBeats - actualDelta };
            } else {
                if (nodeIndex <= 0) return prev;
                const prevNode = measure.nodes[nodeIndex - 1];
                
                const actualDelta = Math.max(-node.durationInBeats + 0.5, Math.min(prevNode.durationInBeats - 0.5, durationDelta));
                if (actualDelta === 0) return prev;

                measure.nodes[nodeIndex] = { ...node, durationInBeats: node.durationInBeats + actualDelta };
                measure.nodes[nodeIndex - 1] = { ...prevNode, durationInBeats: prevNode.durationInBeats - actualDelta };
            }

            return newDoc;
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const over = event.over;
        const dragData = event.active.data.current as
            | { type: 'new'; coreDegree: string; harmonicFunction: HarmonicFunction }
            | { type: 'move'; node: ChordNode; sourceMeasureId: string }
            | undefined;

        if (!over || !dragData) return;

        const overData = over.data.current as { type?: 'measure' | 'node'; measureId?: string; nodeIndex?: number; insertIndex?: number } | undefined;
        const targetMeasureId = overData?.measureId || (typeof over.id === 'string' && over.id.startsWith('m-') ? String(over.id) : undefined);

        if (!targetMeasureId) return;

        setProgressionDoc((prev) => {
            const newDoc = cloneDoc(prev);
            const targetMeasure = newDoc.measures.find((measure) => measure.id === targetMeasureId);
            if (!targetMeasure) return prev;

            let finalNodeId: string;
            const rawTargetIndex = typeof overData?.insertIndex === 'number'
                    ? overData.insertIndex
                    : overData?.type === 'node'
                        ? overData.nodeIndex
                        : targetMeasure.nodes.length;
            const safeRawTargetIndex = clampIndex(rawTargetIndex ?? targetMeasure.nodes.length, targetMeasure.nodes.length);

            if (dragData.type === 'move') {
                const sourceMeasure = newDoc.measures.find(m => m.id === dragData.sourceMeasureId);
                const sourceIndex = sourceMeasure?.nodes.findIndex(n => n.id === dragData.node.id) ?? -1;
                if (sourceMeasure) {
                    sourceMeasure.nodes = sourceMeasure.nodes.filter(n => n.id !== dragData.node.id);
                }
                const targetIndex = sourceMeasure?.id === targetMeasure.id && sourceIndex !== -1 && sourceIndex < safeRawTargetIndex
                    ? safeRawTargetIndex - 1
                    : safeRawTargetIndex;

                finalNodeId = insertNodeIntoMeasure(
                    targetMeasure,
                    dragData.node.displayDegree,
                    dragData.node.coreDegree,
                    dragData.node.harmonicFunction,
                    dragData.node.isSecondary,
                    dragData.node.id,
                    targetIndex,
                    dragData.node.durationInBeats
                );
            } else {
                finalNodeId = insertNodeIntoMeasure(
                    targetMeasure,
                    String(event.active.id),
                    dragData.coreDegree,
                    dragData.harmonicFunction,
                    false,
                    undefined,
                    safeRawTargetIndex
                );
            }

            setFocusedNodeId(finalNodeId);
            return newDoc;
        });
    };

    const addSecondaryDominant = (targetNodeId: string) => {
        setProgressionDoc(prev => {
            const { newDoc, newNodeId } = injectSecondaryDominant(prev, targetNodeId);
            if (newNodeId) setFocusedNodeId(newNodeId);
            return newDoc;
        });
    };

    const addTritoneSubstitution = (targetNodeId: string) => {
        setProgressionDoc(prev => {
            const { newDoc, newNodeId } = injectTritoneSubstitution(prev, targetNodeId);
            if (newNodeId) setFocusedNodeId(newNodeId);
            return newDoc;
        });
    };

    const removeNode = (nodeId: string) => {
        setProgressionDoc(prev => {
            const newDoc = cloneDoc(prev);
            for (const measure of newDoc.measures) {
                const targetIdx = measure.nodes.findIndex(n => n.id === nodeId);
                if (targetIdx !== -1) {
                    measure.nodes.splice(targetIdx, 1);
                    if (focusedNodeId === nodeId) setFocusedNodeId(null);
                    break;
                }
            }
            return newDoc;
        });
    };

    const removeMeasure = (measureId: string) => {
        setProgressionDoc(prev => {
            const newDoc = cloneDoc(prev);
            const mIdx = newDoc.measures.findIndex(m => m.id === measureId);
            if (mIdx !== -1) {
                const deletedMeasure = newDoc.measures[mIdx];
                for (const n of deletedMeasure.nodes) {
                    if (focusedNodeId === n.id) setFocusedNodeId(null);
                }

                newDoc.measures.splice(mIdx, 1);
                for (let i = 0; i < newDoc.measures.length; i++) {
                    newDoc.measures[i].index = i;
                }

                if (newDoc.measures.length === 0) {
                    for (let i = 0; i < 4; i++) {
                        newDoc.measures.push({ 
                            id: `m-${i}-${Date.now()}`, index: i, timeSignature: [4, 4], nodes: [] 
                        });
                    }
                }
            }
            return newDoc;
        });
    };

    const clearMeasure = (measureId: string) => {
        setProgressionDoc(prev => {
            const newDoc = cloneDoc(prev);
            const measure = newDoc.measures.find(m => m.id === measureId);
            if (measure) {
                if (focusedNodeId && measure.nodes.some(n => n.id === focusedNodeId)) {
                    setFocusedNodeId(null);
                }
                measure.nodes = [];
            }
            return newDoc;
        });
    };

    const appendMeasure = () => {
        setProgressionDoc((prev) => {
            const newDoc = cloneDoc(prev);
            const nextIndex = newDoc.measures.length;
            newDoc.measures.push({
                id: `m-${nextIndex}-${Date.now()}`,
                index: nextIndex,
                timeSignature: [4, 4],
                nodes: [],
            });
            return newDoc;
        });
    };
    
    const applyPreset = (presetId: string) => {
        const newMeasures = parsePresetToMeasures(presetId, PROGRESSION_LIBRARY);
        if (newMeasures.length === 0) return;

        setProgressionDoc({ measures: newMeasures });
        setProgressionName(presetId);
        if (newMeasures[0]?.nodes[0]) {
            setFocusedNodeId(newMeasures[0].nodes[0].id);
        }
    };

    const clearAllNodes = () => {
        setProgressionDoc({
            measures: [
                { id: `m-0-${Date.now()}`, index: 0, timeSignature: [4, 4], nodes: [] },
                { id: `m-1-${Date.now()}`, index: 1, timeSignature: [4, 4], nodes: [] },
                { id: `m-2-${Date.now()}`, index: 2, timeSignature: [4, 4], nodes: [] },
                { id: `m-3-${Date.now()}`, index: 3, timeSignature: [4, 4], nodes: [] },
            ]
        });
        setFocusedNodeId(null);
    };

    return {
        progressionName,
        setProgressionName,
        progressionDoc,
        setProgressionDoc,
        focusedNodeId,
        setFocusedNodeId,
        handleDragEnd,
        addSecondaryDominant,
        addTritoneSubstitution,
        removeNode,
        removeMeasure,
        clearMeasure,
        clearAllNodes,
        appendMeasure,
        applyPreset,
        updateNodeDuration,
    };
};
