import { getModalSiblings, SCALES } from '@/domain/scale';
import { identifyChordsForPitchClasses } from './chordRecognition';
import { getChordRegistryEntry } from './registry';
import type { ChordInterpretationCandidate, PitchClass } from './types';

export interface ModalSiblingChordSuggestion {
    rootPitchClass: PitchClass;
    chordId: string;
    chordSymbol: string;
    chordDisplayName: string;
    siblingScaleGroup: string;
    siblingScaleName: string;
}

function normalizePitchClass(value: number): PitchClass {
    return ((value % 12) + 12) % 12;
}

/**
 * Modal-sibling chords: "this exact note collection, played from a different starting note, is a
 * different valid chord" — e.g. C Ionian's notes also form a complete Dm7 rooted at D (Dorian's
 * degree), a complete G7 rooted at G (Mixolydian's degree), and so on.
 *
 * Not surfaced in the Scale panel today: it answers neither "play this scale over" (same root)
 * nor "chords built from this scale" (degree-stacked). Kept, tested, as the seed for a future
 * related-scales UI.
 *
 * Fully deductive: getModalSiblings finds the other scale-degree starting points structurally
 * (same parent-scale rotation, no new data), and identifyChordsForPitchClasses — already built
 * for the reverse notes-to-chord direction — decides what actually fits at each one. No new
 * per-chord or per-scale table.
 */
export function getModalSiblingChordsForScale(
    scaleGroup: string,
    scaleName: string,
    tonicPitchClass: PitchClass
): ModalSiblingChordSuggestion[] {
    const siblings = getModalSiblings(scaleGroup, scaleName);
    if (siblings.length === 0) {
        return [];
    }

    const scaleIntervals = SCALES[scaleGroup]?.[scaleName] ?? [];
    if (scaleIntervals.length === 0) {
        return [];
    }

    const scalePitchClasses = scaleIntervals.map((interval) => normalizePitchClass(tonicPitchClass + interval));
    const candidates = identifyChordsForPitchClasses(scalePitchClasses);

    // Candidates already arrive confidence-sorted (richest fully-valid match first per root —
    // e.g. a complete 7th chord outranks a bare triad when both fit), so the first candidate seen
    // for a root is its best match.
    const bestByRoot = new Map<PitchClass, ChordInterpretationCandidate>();
    for (const candidate of candidates) {
        const root = candidate.definition.rootPitchClass;
        if (!bestByRoot.has(root)) {
            bestByRoot.set(root, candidate);
        }
    }

    const suggestions: ModalSiblingChordSuggestion[] = [];
    for (const sibling of siblings) {
        const rootPitchClass = normalizePitchClass(tonicPitchClass + sibling.tonicOffset);
        const best = bestByRoot.get(rootPitchClass);
        if (!best) {
            continue;
        }

        const entry = getChordRegistryEntry(best.definition.id);
        suggestions.push({
            rootPitchClass,
            chordId: best.definition.id,
            chordSymbol: best.definition.symbol,
            chordDisplayName: entry?.displayName ?? best.definition.symbol,
            siblingScaleGroup: sibling.group,
            siblingScaleName: sibling.name,
        });
    }

    return suggestions;
}
