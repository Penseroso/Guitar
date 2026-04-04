import { buildScaleId } from '../scaleSelector';
import { SCALES } from '../scales';
import { resolveChordRegistryEntry } from './helpers';
import type { ChordRegistryEntry } from './registry';
import { interpretChordAgainstTonalCenter, type HarmonicFunctionFit } from './functional-interpretation';

export type ChordScaleSuggestionCategory = 'primary' | 'color' | 'altered' | 'modal';
export interface HarmonicTonalContext {
    selectedKey: number;
    tonicPitchClass?: number;
    scaleGroup?: string;
    scaleName?: string;
}

export interface ChordRelatedScaleSuggestion {
    scaleId: string;
    group: string;
    name: string;
    category: ChordScaleSuggestionCategory;
    fit: HarmonicFunctionFit;
    functionLabel: string;
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
    fit: HarmonicFunctionFit,
    functionLabel: string,
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
        fit,
        functionLabel,
        reason,
    });
}

function promoteContextScale(
    suggestions: ChordRelatedScaleSuggestion[],
    tonalContext: HarmonicTonalContext | undefined,
    functionLabel: string
): ChordRelatedScaleSuggestion[] {
    if (!tonalContext?.scaleName) {
        return suggestions;
    }

    const contextualIndex = suggestions.findIndex((suggestion) => suggestion.name === tonalContext.scaleName);
    if (contextualIndex <= 0) {
        return suggestions;
    }

    const contextualSuggestion = suggestions[contextualIndex];
    return [
        {
            ...contextualSuggestion,
            category: 'primary',
            fit: 'functional',
            functionLabel,
            reason: `The active tonal frame already uses ${tonalContext.scaleName}, so it is promoted as the direct functional fit for this chord reading.`,
        },
        ...suggestions.filter((_, index) => index !== contextualIndex),
    ];
}

export function getRelatedScaleSuggestionsForChord(
    entryInput: string | ChordRegistryEntry,
    tonalContext?: HarmonicTonalContext,
    chordRootPitchClass?: number
): ChordRelatedScaleSuggestion[] {
    const entry = resolveChordRegistryEntry(entryInput);
    const effectiveChordRoot = chordRootPitchClass ?? tonalContext?.selectedKey ?? 0;
    const interpretation = interpretChordAgainstTonalCenter(entry, effectiveChordRoot, {
        selectedKey: effectiveChordRoot,
        tonicPitchClass: tonalContext?.tonicPitchClass ?? tonalContext?.selectedKey ?? effectiveChordRoot,
        scaleGroup: tonalContext?.scaleGroup ?? 'Diatonic Modes',
        scaleName: tonalContext?.scaleName ?? 'Ionian',
    });
    const suggestions: ChordRelatedScaleSuggestion[] = [];
    const seen = new Set<string>();
    const functionLabel = interpretation.roleLabel;

    switch (entry.id) {
        case 'major':
        case 'major-7':
        case 'major-9':
            buildSuggestion(suggestions, seen, 'Ionian', 'primary', interpretation.harmonyKind === 'tonic' ? 'functional' : 'color', functionLabel, 'Stable major-tonic fit with clear 3 and 7 support.');
            buildSuggestion(suggestions, seen, 'Lydian', 'color', interpretation.harmonyKind === 'modal-center' ? 'functional' : 'color', functionLabel, 'Bright major option when the harmonic reading welcomes #11 color.');
            buildSuggestion(suggestions, seen, 'Major Pentatonic', 'color', 'color', functionLabel, 'Reduces the color to the cleanest major consonances.');
            break;

        case 'minor':
        case 'minor-7':
        case 'minor-9':
            buildSuggestion(suggestions, seen, 'Dorian', 'primary', interpretation.harmonyKind === 'predominant' ? 'functional' : 'color', functionLabel, 'Flexible minor option that supports both modal and setup readings.');
            buildSuggestion(suggestions, seen, 'Aeolian', 'color', interpretation.harmonyKind === 'modal-center' ? 'functional' : 'color', functionLabel, 'Darker minor frame when the chord behaves more like a tonic area.');
            buildSuggestion(suggestions, seen, 'Jazz Minor', 'color', 'color', functionLabel, 'Adds brighter upper extensions around the minor shell.');
            buildSuggestion(suggestions, seen, 'Minor Pentatonic', 'modal', 'color', functionLabel, 'Keeps the minor function compact and riff-friendly.');
            break;

        case 'dominant-7':
        case 'dominant-9':
        case 'dominant-13':
            buildSuggestion(suggestions, seen, 'Mixolydian', 'primary', interpretation.harmonyKind === 'dominant' || interpretation.harmonyKind === 'modal-center' ? 'functional' : 'color', functionLabel, 'Primary dominant collection with natural extensions intact.');
            buildSuggestion(suggestions, seen, 'Lydian Dominant', 'color', 'color', functionLabel, 'Adds #11 color without committing to full altered tension.');
            buildSuggestion(suggestions, seen, 'Altered scale', 'altered', interpretation.harmonyKind === 'dominant' ? 'functional' : 'color', functionLabel, 'High-tension dominant option when cadential pull should intensify.');
            break;

        case 'hendrix-7-sharp-9':
        case 'dominant-7-flat-9':
            buildSuggestion(suggestions, seen, 'Altered scale', 'primary', interpretation.harmonyKind === 'dominant' ? 'functional' : 'color', functionLabel, 'Best functional fit when the altered tensions are part of the chord identity.');
            buildSuggestion(suggestions, seen, 'Lydian Dominant', 'color', 'color', functionLabel, 'Backs off to a brighter dominant color if full alteration is too dense.');
            buildSuggestion(suggestions, seen, entry.id === 'dominant-7-flat-9' ? 'Phrygian Dominant' : 'Whole Tone', 'altered', 'color', functionLabel, 'Alternative color family that still respects the dominant tension field.');
            break;

        case 'half-diminished-7':
            buildSuggestion(suggestions, seen, 'Locrian', 'primary', 'functional', functionLabel, 'Core half-diminished fit against a minor cadential setup.');
            buildSuggestion(suggestions, seen, 'Locrian ♮2', 'color', 'functional', functionLabel, 'Common jazz/minor-key variation when the line wants a natural 2.');
            break;

        case 'diminished-7':
            buildSuggestion(suggestions, seen, 'Diminished', 'primary', 'functional', functionLabel, 'Symmetric diminished collection fits the full diminished shell directly.');
            buildSuggestion(suggestions, seen, 'Ultralocrian', 'altered', 'color', functionLabel, 'Alternate altered route when the chord behaves as passing tension.');
            break;

        case 'sus4':
        case 'sus2':
            buildSuggestion(suggestions, seen, 'Mixolydian', 'primary', interpretation.harmonyKind === 'modal-center' ? 'functional' : 'color', functionLabel, 'Keeps the suspended shell stable without forcing a major third immediately.');
            buildSuggestion(suggestions, seen, 'Dorian', 'modal', interpretation.harmonyKind === 'modal-center' ? 'functional' : 'color', functionLabel, 'Useful when the suspension belongs to a modal minor frame.');
            buildSuggestion(suggestions, seen, 'Ionian', 'color', 'color', functionLabel, 'Lets the suspension release back into a plain major frame later.');
            break;

        case 'power-5':
            buildSuggestion(suggestions, seen, 'Major Pentatonic', 'primary', interpretation.harmonyKind === 'open' ? 'color' : 'functional', functionLabel, 'Open major-side riff fit when the third remains unstated.');
            buildSuggestion(suggestions, seen, 'Minor Pentatonic', 'color', 'color', functionLabel, 'Open minor-side riff fit when the third remains unstated.');
            buildSuggestion(suggestions, seen, 'Mixolydian', 'modal', 'color', functionLabel, 'Adds rock/modal motion without overcommitting the harmony.');
            break;

        default:
            buildSuggestion(suggestions, seen, 'Ionian', 'primary', 'functional', functionLabel, 'Fallback stable reference inside the current supported inventory.');
            break;
    }

    return promoteContextScale(suggestions, tonalContext, functionLabel);
}
