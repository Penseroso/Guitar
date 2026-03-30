import { buildChordDefinitionFromRegistryEntry, buildChordTonesFromRegistryEntry, resolveChordRegistryEntry } from './helpers';
import { rankVoicingCandidates } from './ranking';
import { resolveVoicingTemplates, type ResolveVoicingOptions } from './resolver';
import { getVoicingTemplatesForChord } from './templates';
import type { ChordRegistryEntry } from './registry';
import type { VoicingCandidate } from './types';

export interface GetRankedVoicingsOptions extends ResolveVoicingOptions {}

export function getRankedVoicingsForChord(
    entryInput: string | ChordRegistryEntry,
    rootPitchClass: number,
    options: GetRankedVoicingsOptions = {}
): VoicingCandidate[] {
    const entry = resolveChordRegistryEntry(entryInput);
    const chord = buildChordDefinitionFromRegistryEntry(entry, rootPitchClass);
    const tones = buildChordTonesFromRegistryEntry(entry, rootPitchClass);
    const templates = getVoicingTemplatesForChord(entry);
    const resolvedVoicings = resolveVoicingTemplates(chord, tones, templates, options);

    return rankVoicingCandidates(resolvedVoicings, entry, tones);
}
