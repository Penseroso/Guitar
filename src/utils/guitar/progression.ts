import { HarmonicFunction, ChordNode, Measure, ProgressionDocument } from './types';
import { ProgressionData } from './theory';

export const cloneDoc = (doc: ProgressionDocument): ProgressionDocument => ({
    ...doc,
    measures: doc.measures.map((measure) => ({
        ...measure,
        nodes: measure.nodes.map(node => ({ ...node })),
    })),
});

export const clampIndex = (value: number, max: number) => Math.max(0, Math.min(value, max));

export const createNode = (
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

export const insertNodeIntoMeasure = (
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

export const parsePresetToMeasures = (presetId: string, library: ProgressionData[]): Measure[] => {
    const prog = library.find(p => p.id === presetId);
    if (!prog) return [];

    return prog.degrees.map((degree, index) => {
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
};

export const injectTritoneSubstitution = (doc: ProgressionDocument, targetNodeId: string): { newDoc: ProgressionDocument, newNodeId: string | null } => {
    const newDoc = cloneDoc(doc);
    let newNodeId: string | null = null;
    
    for (const measure of newDoc.measures) {
        const targetIdx = measure.nodes.findIndex(n => n.id === targetNodeId);
        if (targetIdx !== -1) {
            const targetNode = measure.nodes[targetIdx];
            if (targetNode.durationInBeats < 2) return { newDoc: doc, newNodeId: null };
            
            const splitDuration = Math.ceil(targetNode.durationInBeats / 2);
            targetNode.durationInBeats -= splitDuration;
            
            const subV7Node = createNode(
                `subV7/${targetNode.coreDegree}`,
                targetNode.coreDegree,
                'Tritone_Substitute',
                splitDuration,
                true
            );
            
            newNodeId = subV7Node.id;
            measure.nodes.splice(targetIdx, 0, subV7Node);
            break;
        }
    }
    return { newDoc, newNodeId };
};

export const injectSecondaryDominant = (doc: ProgressionDocument, targetNodeId: string): { newDoc: ProgressionDocument, newNodeId: string | null } => {
    const newDoc = cloneDoc(doc);
    let newNodeId: string | null = null;
    
    for (const measure of newDoc.measures) {
        const targetIdx = measure.nodes.findIndex(n => n.id === targetNodeId);
        if (targetIdx !== -1) {
            const targetNode = measure.nodes[targetIdx];
            if (targetNode.durationInBeats < 2) return { newDoc: doc, newNodeId: null };
            
            const splitDuration = Math.ceil(targetNode.durationInBeats / 2);
            targetNode.durationInBeats -= splitDuration;
            
            const secDomNode = createNode(
                `V7/${targetNode.coreDegree}`,
                targetNode.coreDegree,
                'Applied_Dominant',
                splitDuration,
                true
            );
            
            newNodeId = secDomNode.id;
            measure.nodes.splice(targetIdx, 0, secDomNode);
            break;
        }
    }
    return { newDoc, newNodeId };
};
