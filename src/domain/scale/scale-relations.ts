import { createScaleRef, resolveScaleRef, type ScaleRef } from './scale-ref';
import { SCALES, SCALE_REGISTRY, getModalSiblings } from './scales';

export interface RelatedScale {
    scaleRef: ScaleRef;
    name: string;
}

export interface ScaleRelations {
    siblings: RelatedScale[];
    parent: (RelatedScale & { subset: boolean }) | null;
    /** Nonzero transpositions preserving the collection; not equivalent harmonic functions. */
    symmetryOffsets: number[];
}

export interface ParallelScaleComparison {
    /** Comparison destination at the current tonic, regardless of the supplied target tonic. */
    scaleRef: ScaleRef;
    shared: number[];
    added: number[];
    removed: number[];
}

const normalize = (value: number) => ((value % 12) + 12) % 12;
const pitchClasses = (group: string, name: string, tonic: number) =>
    SCALES[group][name].map((interval) => normalize(tonic + interval)).sort((a, b) => a - b);

/** Structural difference only. This function never assigns characteristic-tone meaning. */
export function compareParallelScales(current: ScaleRef, target: ScaleRef): ParallelScaleComparison | null {
    const from = resolveScaleRef(current);
    const to = resolveScaleRef(target);
    if (!from || !to) return null;
    const currentNotes = pitchClasses(from.group, from.name, from.tonic);
    const targetNotes = pitchClasses(to.group, to.name, from.tonic);
    return {
        scaleRef: createScaleRef(to.group, to.name, from.tonic),
        shared: currentNotes.filter((note) => targetNotes.includes(note)),
        added: targetNotes.filter((note) => !currentNotes.includes(note)),
        removed: currentNotes.filter((note) => !targetNotes.includes(note)),
    };
}

/** Registry relationships: no chord recognition, functional ranking, or fallback scale. */
export function getScaleRelations(ref: ScaleRef): ScaleRelations | null {
    const selected = resolveScaleRef(ref);
    if (!selected) return null;
    const { group, name, tonic } = selected;
    const entry = SCALE_REGISTRY[group][name];
    const siblings = getModalSiblings(group, name).map((sibling) => ({
        name: sibling.name,
        scaleRef: createScaleRef(sibling.group, sibling.name, normalize(tonic + sibling.tonicOffset)),
    }));

    let parent: ScaleRelations['parent'] = null;
    for (const [parentGroup, modes] of Object.entries(SCALE_REGISTRY)) {
        const found = Object.entries(modes).find(([, candidate]) =>
            candidate.parent === entry.parent && candidate.rootOffsetIndex === 0 && !candidate.subset);
        if (!found) continue;
        const [parentName] = found;
        // Parent root positions come from the complete registered parent, never a subset.
        const rootOffset = SCALES[parentGroup][parentName][entry.rootOffsetIndex];
        parent = {
            name: parentName,
            scaleRef: createScaleRef(parentGroup, parentName, normalize(tonic - rootOffset)),
            subset: Boolean(entry.subset),
        };
        break;
    }

    const notes = pitchClasses(group, name, tonic);
    const symmetryOffsets = Array.from({ length: 11 }, (_, index) => index + 1)
        .filter((offset) => notes.every((note) => notes.includes(normalize(note + offset))));
    return { siblings, parent, symmetryOffsets };
}
