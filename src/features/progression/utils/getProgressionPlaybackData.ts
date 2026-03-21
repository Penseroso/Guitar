import { getChordFromDegree, getChordTones } from '../../../utils/guitar/logic';
import type { ProgressionDocument } from '../../../utils/guitar/types';

export type ProgressionPlaybackData = {
    currentStepDegree: string;
    stepRoot: number;
    tones: number[];
    type: string;
};

export function getProgressionPlaybackData(
    progressionDoc: ProgressionDocument,
    focusedNodeId: string | null,
    selectedKey: number
): ProgressionPlaybackData | null {
    if (!focusedNodeId) return null;

    let currentStepDegree = '';
    let isSecondary = false;
    let coreDegree = '';
    let harmonicFunction = '';

    for (const measure of progressionDoc.measures) {
        const focusedNode = measure.nodes.find((node) => node.id === focusedNodeId);
        if (!focusedNode) continue;

        currentStepDegree = focusedNode.displayDegree;
        isSecondary = focusedNode.isSecondary;
        coreDegree = focusedNode.coreDegree;
        harmonicFunction = focusedNode.harmonicFunction;
        break;
    }

    if (!currentStepDegree) return null;

    const isModalInterchange = harmonicFunction === 'Modal_Interchange';

    if (!isModalInterchange && (isSecondary || currentStepDegree.startsWith('V7/'))) {
        const targetInfo = getChordFromDegree(coreDegree);
        const targetRoot = (selectedKey + targetInfo.interval) % 12;
        const stepRoot = (targetRoot + 7) % 12;

        return {
            currentStepDegree,
            stepRoot,
            tones: getChordTones('Dominant 7', stepRoot),
            type: 'Dominant 7',
        };
    }

    if (currentStepDegree.startsWith('subV7/')) {
        const targetInfo = getChordFromDegree(coreDegree);
        const targetRoot = (selectedKey + targetInfo.interval) % 12;
        const stepRoot = (targetRoot + 1) % 12;

        return {
            currentStepDegree,
            stepRoot,
            tones: getChordTones('Dominant 7', stepRoot),
            type: 'Dominant 7',
        };
    }

    const info = getChordFromDegree(coreDegree || currentStepDegree);
    const stepRoot = (selectedKey + info.interval) % 12;

    return {
        currentStepDegree,
        stepRoot,
        tones: getChordTones(info.type, stepRoot),
        type: info.type,
    };
}
