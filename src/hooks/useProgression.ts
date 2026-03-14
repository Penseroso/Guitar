import { useState } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import { HarmonicFunction, ChordNode, Measure, ProgressionDocument } from '../utils/guitar/types';
import { PROGRESSION_LIBRARY } from '../utils/guitar/theory';

export const useProgression = () => {
    const [progressionName, setProgressionName] = useState('pop-punk');
    const [progressionDoc, setProgressionDoc] = useState<ProgressionDocument>({
        measures: [
            {
                id: 'm-0',
                index: 0,
                timeSignature: [4, 4],
                nodes: []
            },
            { id: 'm-1', index: 1, timeSignature: [4, 4], nodes: [] },
            { id: 'm-2', index: 2, timeSignature: [4, 4], nodes: [] },
            { id: 'm-3', index: 3, timeSignature: [4, 4], nodes: [] },
        ]
    });
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

    const cloneDoc = (doc: ProgressionDocument): ProgressionDocument => ({
        ...doc,
        measures: doc.measures.map((measure) => ({
            ...measure,
            nodes: measure.nodes.map(node => ({ ...node })),
        })),
    });

    const clampIndex = (value: number, max: number) => Math.max(0, Math.min(value, max));

    const createNode = (
        displayDegree: string,
        coreDegree: string,
        harmonicFunction: HarmonicFunction,
        durationInBeats: number,
        isSecondary: boolean = false,
        id?: string
    ): ChordNode => ({
        id: id || `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        displayDegree,
        coreDegree,
        durationInBeats,
        harmonicFunction,
        isSecondary,
    });

    const insertNodeIntoMeasure = (
        measure: Measure,
        displayDegree: string,
        coreDegree: string,
        harmonicFunction: HarmonicFunction,
        isSecondary: boolean = false,
        preferredId?: string,
        targetIndex?: number,
        duration?: number
    ) => {
        const totalBeats = measure.timeSignature[0];
        const usedBeats = measure.nodes.reduce((sum, node) => sum + node.durationInBeats, 0);
        let durationToUse = duration || 4; 

        if (!duration) {
            if (measure.nodes.length === 0) {
                durationToUse = totalBeats;
            } else {
                const remainingBeats = totalBeats - usedBeats;
                if (remainingBeats > 0) {
                    durationToUse = remainingBeats;
                } else {
                    const splitIdx = targetIndex !== undefined ? Math.max(0, targetIndex - 1) : measure.nodes.length - 1;
                    const nodeToSplit = measure.nodes[splitIdx];
                    durationToUse = Math.max(0.5, nodeToSplit.durationInBeats / 2);
                    nodeToSplit.durationInBeats = durationToUse;
                }
            }
        }

        const newNode = createNode(displayDegree, coreDegree, harmonicFunction, durationToUse, isSecondary, preferredId);
        
        const safeTargetIndex = targetIndex !== undefined ? clampIndex(targetIndex, measure.nodes.length) : undefined;

        if (safeTargetIndex !== undefined) {
            measure.nodes.splice(safeTargetIndex, 0, newNode);
        } else {
            measure.nodes.push(newNode);
        }
        return newNode.id;
    };

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

        if (!over || !dragData) {
            return;
        }

        const overData = over.data.current as { type?: 'measure' | 'node'; measureId?: string; nodeIndex?: number; insertIndex?: number } | undefined;
        const targetMeasureId = overData?.measureId || (typeof over.id === 'string' && over.id.startsWith('m-') ? String(over.id) : undefined);

        if (!targetMeasureId) return;

        setProgressionDoc((prev) => {
            const newDoc = cloneDoc(prev);
            const targetMeasure = newDoc.measures.find((measure) => measure.id === targetMeasureId);

            if (!targetMeasure) return prev;

            let nodeToInsert: ChordNode;
            let finalNodeId: string;
            const rawTargetIndex =
                typeof overData?.insertIndex === 'number'
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
                nodeToInsert = { ...dragData.node };
                finalNodeId = insertNodeIntoMeasure(
                    targetMeasure,
                    nodeToInsert.displayDegree,
                    nodeToInsert.coreDegree,
                    nodeToInsert.harmonicFunction,
                    nodeToInsert.isSecondary,
                    nodeToInsert.id,
                    targetIndex,
                    nodeToInsert.durationInBeats
                );
            } else {
                const targetIndex = safeRawTargetIndex;
                finalNodeId = insertNodeIntoMeasure(
                    targetMeasure,
                    String(event.active.id),
                    dragData.coreDegree,
                    dragData.harmonicFunction,
                    false,
                    undefined,
                    targetIndex
                );
            }

            setFocusedNodeId(finalNodeId);
            return newDoc;
        });
    };

    const addSecondaryDominant = (targetNodeId: string) => {
        setProgressionDoc(prev => {
            const newDoc = { ...prev, measures: [...prev.measures.map(m => ({ ...m, nodes: [...m.nodes] }))] };
            
            for (const measure of newDoc.measures) {
                const targetIdx = measure.nodes.findIndex(n => n.id === targetNodeId);
                if (targetIdx !== -1) {
                    const targetNode = measure.nodes[targetIdx];
                    if (targetNode.durationInBeats < 2) return prev;
                    
                    const splitDuration = Math.ceil(targetNode.durationInBeats / 2);
                    targetNode.durationInBeats -= splitDuration;
                    
                    const secDomNode: ChordNode = {
                        id: `n-sec-${Date.now()}`,
                        displayDegree: `V7/${targetNode.coreDegree}`,
                        coreDegree: targetNode.coreDegree,
                        durationInBeats: splitDuration,
                        harmonicFunction: 'Applied_Dominant',
                        targetNodeId: targetNodeId,
                        isSecondary: true
                    };
                    
                    measure.nodes.splice(targetIdx, 0, secDomNode);
                    setFocusedNodeId(secDomNode.id);
                    break;
                }
            }
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
                    if (focusedNodeId === nodeId) {
                        setFocusedNodeId(null);
                    }
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
                            id: `m-${i}-${Date.now()}`, 
                            index: i, 
                            timeSignature: [4, 4], 
                            nodes: [] 
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
        const prog = PROGRESSION_LIBRARY.find(p => p.id === presetId);
        if (!prog) return;

        const newMeasures: Measure[] = prog.degrees.map((degree, index) => {
            let coreDegree = degree;
            let displayDegree = degree;
            let harmonicFunction: HarmonicFunction = 'Tonic';
            let isSecondary = false;

            if (degree.startsWith('V7 of ')) {
                const targetDegree = degree.replace('V7 of ', '');
                coreDegree = targetDegree;
                displayDegree = `V7/${targetDegree}`;
                harmonicFunction = 'Applied_Dominant';
                isSecondary = true;
            } else {
                if (degree.includes('V') && !degree.includes('IV')) harmonicFunction = 'Dominant';
                else if (degree.includes('IV') || degree.includes('ii')) harmonicFunction = 'Subdominant';
            }

            return {
                id: `m-preset-${index}-${Date.now()}`,
                index,
                timeSignature: [4, 4],
                nodes: [{
                    id: `n-preset-${index}-${Date.now()}`,
                    displayDegree,
                    coreDegree,
                    durationInBeats: 4,
                    harmonicFunction,
                    isSecondary
                }]
            };
        });

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
        removeNode,
        removeMeasure,
        clearMeasure,
        clearAllNodes,
        appendMeasure,
        applyPreset,
        updateNodeDuration,
    };
};
