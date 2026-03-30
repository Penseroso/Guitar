import { buildChordDefinitionFromRegistryEntry, buildChordTonesFromRegistryEntry, resolveChordRegistryEntry } from './helpers';
import { rankVoicingCandidates } from './ranking';
import {
    resolveVoicingTemplates,
    resolveVoicingTemplatesAcrossPositions,
    type ResolveVoicingOptions,
} from './resolver';
import { getVoicingTemplatesForChord } from './templates';
import type { ChordRegistryEntry } from './registry';
import type { VoicingCandidate } from './types';

export interface GetRankedVoicingsOptions extends ResolveVoicingOptions {
    resolveAcrossPositions?: boolean;
    includeNonPlayableCandidates?: boolean;
    maxCandidates?: number;
}

export function getRankedVoicingsForChord(
    entryInput: string | ChordRegistryEntry,
    rootPitchClass: number,
    options: GetRankedVoicingsOptions = {}
): VoicingCandidate[] {
    const entry = resolveChordRegistryEntry(entryInput);
    const chord = buildChordDefinitionFromRegistryEntry(entry, rootPitchClass);
    const tones = buildChordTonesFromRegistryEntry(entry, rootPitchClass);
    const templates = getVoicingTemplatesForChord(entry);
    const resolvedVoicings = options.resolveAcrossPositions === false
        ? resolveVoicingTemplates(chord, tones, templates, options)
        : resolveVoicingTemplatesAcrossPositions(chord, tones, templates, options);
    const filteredVoicings = options.includeNonPlayableCandidates === false
        ? resolvedVoicings.filter((voicing) => voicing.playable)
        : resolvedVoicings;
    const ranked = rankVoicingCandidates(filteredVoicings, entry, tones);

    if (options.maxCandidates === undefined) {
        return ranked;
    }

    return ranked.slice(0, options.maxCandidates);
}
