import { SCALES } from './scales';
import { buildScaleId } from './scaleSelector';

/** A Scale workspace selection. Its tonic is not the root selected in another mode. */
export interface ScaleRef {
    group: string;
    scaleId: string;
    tonic: number;
}

export function createScaleRef(group: string, name: string, tonic: number): ScaleRef {
    return { group, scaleId: buildScaleId(group, name), tonic: ((tonic % 12) + 12) % 12 };
}

/** Resolve only registered identities; display labels are never used as identifiers. */
export function resolveScaleRef(ref: ScaleRef): { group: string; name: string; tonic: number } | null {
    if (!Number.isInteger(ref.tonic) || ref.tonic < 0 || ref.tonic > 11) return null;
    const name = Object.keys(SCALES[ref.group] ?? {}).find(name => buildScaleId(ref.group, name) === ref.scaleId);
    return name ? { group: ref.group, name, tonic: ref.tonic } : null;
}

export function sameScaleIdentity(left: ScaleRef, right: ScaleRef): boolean {
    return left.group === right.group && left.scaleId === right.scaleId;
}
