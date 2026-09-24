import { resolveScaleRef, type ScaleRef } from './scale-ref';
import { getScaleEngineIntervalLabels, SCALES } from './scales';
import { getKeyName } from '@/domain/shared/keys';
import { parseDegreeLabel, parseNoteName, spellDegree } from '@/domain/shared/spelling';

export interface ScaleStructuralTone {
    pitchClass: number;
    interval: number;
    scaleDegree: string;
    scaleNoteName: string;
}

/**
 * Facts about the registered collection, independent of chord context or interpretation.
 * Each tone is spelled from its structural degree; repeated generic degrees are valid
 * for non-heptatonic collections. No enharmonic pitch-class-name fallback is used.
 */
export function getScaleStructuralTones(ref: ScaleRef): ScaleStructuralTone[] | null {
    const scale = resolveScaleRef(ref);
    if (!scale) return null;
    const root = parseNoteName(getKeyName(scale.tonic));
    if (!root) return null;
    const labels = getScaleEngineIntervalLabels(scale.group, scale.name);
    const tones: ScaleStructuralTone[] = [];
    for (const interval of SCALES[scale.group][scale.name]) {
        const pitchClass = (scale.tonic + interval) % 12;
        const scaleDegree = labels[interval];
        const degree = scaleDegree ? parseDegreeLabel(scaleDegree) : null;
        if (!scaleDegree || !degree) return null;
        const note = spellDegree(root, degree.number, pitchClass);
        if (!note) return null;
        tones.push({ pitchClass, interval, scaleDegree, scaleNoteName: note.name });
    }
    return tones;
}
