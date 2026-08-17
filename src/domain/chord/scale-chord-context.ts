import { buildScaleId, getModalSiblings, SCALES } from '@/domain/scale';
import { identifyChordsForPitchClasses } from './chordRecognition';
import { CHORD_REGISTRY_LIST, getChordRegistryEntry } from './registry';
import { getRelatedScaleSuggestionsForChord, type ChordScaleSuggestionCategory } from './related-scales';
import type { ChordInterpretationCandidate, PitchClass } from './types';

export interface ScaleChordContextSuggestion {
    chordId: string;
    chordSymbol: string;
    chordDisplayName: string;
    category: ChordScaleSuggestionCategory;
    reason: string;
}

const CATEGORY_ORDER: Record<ChordScaleSuggestionCategory, number> = {
    primary: 0,
    color: 1,
    altered: 2,
    modal: 3,
};

/**
 * Inverts chords/related-scales.ts's hand-curated "chord -> which scales fit it" table into
 * "scale -> which chord qualities it fits over". Built once at module load from the same
 * source of truth so the two directions can't drift apart. `fit`/`functionLabel` from the
 * source suggestions are context-dependent (computed against a default tonal center) and
 * dropped here — only the context-independent `category`/`reason` survive the inversion.
 */
const SCALE_TO_CHORD_CONTEXTS: Map<string, ScaleChordContextSuggestion[]> = (() => {
    const map = new Map<string, ScaleChordContextSuggestion[]>();

    for (const entry of CHORD_REGISTRY_LIST) {
        const suggestions = getRelatedScaleSuggestionsForChord(entry.id);

        for (const suggestion of suggestions) {
            const scaleId = buildScaleId(suggestion.group, suggestion.name);
            const list = map.get(scaleId) ?? [];
            list.push({
                chordId: entry.id,
                chordSymbol: entry.symbol,
                chordDisplayName: entry.displayName,
                category: suggestion.category,
                reason: suggestion.reason,
            });
            map.set(scaleId, list);
        }
    }

    for (const list of map.values()) {
        list.sort((a, b) => CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category]);
    }

    return map;
})();

export function getChordContextsForScale(scaleGroup: string, scaleName: string): ScaleChordContextSuggestion[] {
    return SCALE_TO_CHORD_CONTEXTS.get(buildScaleId(scaleGroup, scaleName)) ?? [];
}

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
 * The complementary direction to getChordContextsForScale: not "which chord qualities pair with
 * this scale at its own tonic" but "this exact note collection, played from a different starting
 * note, is a different valid chord" — e.g. C Ionian's notes also form a complete Dm7 rooted at D
 * (Dorian's degree), a complete G7 rooted at G (Mixolydian's degree), and so on.
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
