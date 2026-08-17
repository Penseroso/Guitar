import { buildScaleId } from '@/domain/scale/scaleSelector';
import { CHORD_REGISTRY_LIST } from './registry';
import { getRelatedScaleSuggestionsForChord, type ChordScaleSuggestionCategory } from './related-scales';

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
