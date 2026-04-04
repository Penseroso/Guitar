import { buildScaleId } from '../scaleSelector';
import { SCALES } from '../scales';
import { resolveChordRegistryEntry } from './helpers';
import type { ChordRegistryEntry } from './registry';

export type ChordScaleSuggestionCategory = 'primary' | 'color' | 'altered' | 'modal';
export interface HarmonicTonalContext {
    selectedKey: number;
    scaleGroup?: string;
    scaleName?: string;
}

export interface ChordRelatedScaleSuggestion {
    scaleId: string;
    group: string;
    name: string;
    category: ChordScaleSuggestionCategory;
    reason: string;
}

interface ScaleOption {
    group: string;
    name: string;
}

const SCALE_LOOKUP_BY_NAME = Object.entries(SCALES).reduce<Record<string, ScaleOption>>((lookup, [group, modes]) => {
    Object.keys(modes).forEach((name) => {
        lookup[name] = { group, name };
    });
    return lookup;
}, {});

function buildSuggestion(
    suggestions: ChordRelatedScaleSuggestion[],
    seen: Set<string>,
    scaleName: string,
    category: ChordScaleSuggestionCategory,
    reason: string
) {
    const scale = SCALE_LOOKUP_BY_NAME[scaleName];
    if (!scale) {
        return;
    }

    const scaleId = buildScaleId(scale.group, scale.name);
    if (seen.has(scaleId)) {
        return;
    }

    seen.add(scaleId);
    suggestions.push({
        scaleId,
        group: scale.group,
        name: scale.name,
        category,
        reason,
    });
}

function prioritizeContextScale(
    suggestions: ChordRelatedScaleSuggestion[],
    tonalContext?: HarmonicTonalContext
): ChordRelatedScaleSuggestion[] {
    if (!tonalContext?.scaleName) {
        return suggestions;
    }

    const contextualIndex = suggestions.findIndex((suggestion) => suggestion.name === tonalContext.scaleName);
    if (contextualIndex <= 0) {
        return suggestions;
    }

    const contextualSuggestion = suggestions[contextualIndex];
    const reweightedSuggestion: ChordRelatedScaleSuggestion = {
        ...contextualSuggestion,
        category: 'primary',
        reason: `Matches the current tonal center directly through ${tonalContext.scaleName}, so it is promoted as the most functionally immediate fit.`,
    };

    return [
        reweightedSuggestion,
        ...suggestions.filter((_, index) => index !== contextualIndex),
    ];
}

export function getRelatedScaleSuggestionsForChord(
    entryInput: string | ChordRegistryEntry,
    tonalContext?: HarmonicTonalContext
): ChordRelatedScaleSuggestion[] {
    const entry = resolveChordRegistryEntry(entryInput);
    const suggestions: ChordRelatedScaleSuggestion[] = [];
    const seen = new Set<string>();

    switch (entry.id) {
        case 'major':
        case 'major-7':
        case 'major-9':
            buildSuggestion(suggestions, seen, 'Ionian', 'primary', 'Baseline major-key fit with stable 3 and 7 support.');
            buildSuggestion(suggestions, seen, 'Lydian', 'color', 'Keeps the major shell while adding a brighter #11 color.');
            buildSuggestion(suggestions, seen, 'Major Pentatonic', 'color', 'Strips the harmony down to the cleanest major consonances.');
            break;

        case 'minor':
            buildSuggestion(suggestions, seen, 'Aeolian', 'primary', 'Natural minor gives the most direct minor-triad environment.');
            buildSuggestion(suggestions, seen, 'Dorian', 'color', 'Adds a brighter 6 for a more open modal minor sound.');
            buildSuggestion(suggestions, seen, 'Minor Pentatonic', 'color', 'Keeps the minor identity compact and riff-friendly.');
            break;

        case 'minor-7':
        case 'minor-9':
            buildSuggestion(suggestions, seen, 'Dorian', 'primary', 'Common modern minor-7 color with a natural 6 and flexible pre-dominant pull.');
            buildSuggestion(suggestions, seen, 'Aeolian', 'color', 'Leans darker when the chord wants a more natural-minor backdrop.');
            buildSuggestion(suggestions, seen, 'Jazz Minor', 'color', 'Useful when the minor quality wants a brighter major-7 extension palette nearby.');
            buildSuggestion(suggestions, seen, 'Minor Pentatonic', 'modal', 'Reduced-note option that keeps the minor shell intact.');
            break;

        case 'dominant-7':
            buildSuggestion(suggestions, seen, 'Mixolydian', 'primary', 'Default dominant color with natural 9 and 13 available.');
            buildSuggestion(suggestions, seen, 'Lydian Dominant', 'color', 'Bright dominant option when you want #11 color without full alteration.');
            buildSuggestion(suggestions, seen, 'Altered scale', 'altered', 'High-tension dominant option for stronger pull into resolution.');
            break;

        case 'dominant-9':
        case 'dominant-13':
            buildSuggestion(suggestions, seen, 'Mixolydian', 'primary', 'Natural dominant match that keeps 9 and 13 available.');
            buildSuggestion(suggestions, seen, 'Lydian Dominant', 'color', 'Adds #11 color while keeping the dominant shell readable.');
            buildSuggestion(suggestions, seen, 'Altered scale', 'altered', 'Pushes the dominant toward stronger altered resolution.');
            break;

        case 'hendrix-7-sharp-9':
            buildSuggestion(suggestions, seen, 'Altered scale', 'primary', 'Supports the altered dominant shell and the sharp-nine tension.');
            buildSuggestion(suggestions, seen, 'Whole Tone', 'color', 'Useful for dominant sharp-five style color around the same tension family.');
            buildSuggestion(suggestions, seen, 'Lydian Dominant', 'color', 'A less dense dominant color when full altered tension is too strong.');
            break;

        case 'dominant-7-flat-9':
            buildSuggestion(suggestions, seen, 'Altered scale', 'primary', 'Keeps the dominant core while embracing the flat-nine tension.');
            buildSuggestion(suggestions, seen, 'Phrygian Dominant', 'color', 'Classic b9 dominant flavor with a strong tonal identity.');
            buildSuggestion(suggestions, seen, 'Diminished', 'altered', 'Symmetric dominant tension option for b9-heavy motion.');
            break;

        case 'half-diminished-7':
            buildSuggestion(suggestions, seen, 'Locrian', 'primary', 'Default half-diminished environment with b2, b3, b5, and b7.');
            buildSuggestion(suggestions, seen, 'Locrian ♮2', 'color', 'Common minor iiø color when the line wants a natural 2.');
            break;

        case 'diminished-7':
            buildSuggestion(suggestions, seen, 'Diminished', 'primary', 'Symmetric diminished scale lines up directly with the chord structure.');
            buildSuggestion(suggestions, seen, 'Ultralocrian', 'altered', 'Dark altered option when the diminished sonority acts as a passing dominant color.');
            break;

        case 'sus4':
            buildSuggestion(suggestions, seen, 'Mixolydian', 'primary', 'Supports suspended dominant behavior without forcing the major 3rd immediately.');
            buildSuggestion(suggestions, seen, 'Dorian', 'modal', 'Keeps the suspended fourth active in a more modal environment.');
            buildSuggestion(suggestions, seen, 'Ionian', 'color', 'Useful when the suspension wants to release back into a stable major field.');
            break;

        case 'sus2':
            buildSuggestion(suggestions, seen, 'Ionian', 'primary', 'Natural major environment that preserves the open second.');
            buildSuggestion(suggestions, seen, 'Mixolydian', 'color', 'Adds dominant flexibility while keeping the second available.');
            buildSuggestion(suggestions, seen, 'Major Pentatonic', 'modal', 'Keeps the sus2 shell broad and uncluttered.');
            break;

        case 'power-5':
            buildSuggestion(suggestions, seen, 'Major Pentatonic', 'primary', 'Neutral major-side option when the missing 3rd stays intentionally open.');
            buildSuggestion(suggestions, seen, 'Minor Pentatonic', 'color', 'Neutral minor-side option for riff-based power-chord movement.');
            buildSuggestion(suggestions, seen, 'Mixolydian', 'modal', 'Adds dominant-rock color without overcommitting the harmony.');
            break;

        default:
            buildSuggestion(suggestions, seen, 'Ionian', 'primary', 'General stable major reference for unsupported chord-specific mapping.');
            break;
    }

    return prioritizeContextScale(suggestions, tonalContext);
}
