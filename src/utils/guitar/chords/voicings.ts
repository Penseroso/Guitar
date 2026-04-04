import { buildChordDefinitionFromRegistryEntry, buildChordTonesFromRegistryEntry, resolveChordRegistryEntry } from './helpers';
import { getGeneratedVoicingTemplatesForChord } from './generated';
import { rankVoicingCandidates } from './ranking';
import {
    resolveVoicingTemplates,
    resolveVoicingTemplatesAcrossPositions,
    type ResolveVoicingOptions,
} from './resolver';
import { getVoicingTemplatesForChord } from './templates';
import type { ChordRegistryEntry } from './registry';
import type { ResolvedVoicing, VoicingCandidate, VoicingRankingMode } from './types';

export interface GetRankedVoicingsOptions extends ResolveVoicingOptions {
    resolveAcrossPositions?: boolean;
    includeNonPlayableCandidates?: boolean;
    maxCandidates?: number;
    rankingMode?: VoicingRankingMode;
    includeGeneratedCandidates?: boolean;
    includeLegacyCandidates?: boolean;
}

function getResolvedVoicingSignature(voicing: ResolvedVoicing): string {
    return voicing.notes
        .map((note) => `${note.string}:${note.isMuted ? 'x' : note.fret}`)
        .join('|');
}

function getTemplateSourcePriority(voicing: ResolvedVoicing): number {
    switch (voicing.provenance.sourceKind) {
        case 'legacy-import':
            return 0;
        case 'curated':
            return 1;
        default:
            return 2;
    }
}

function dedupeResolvedVoicings(voicings: ResolvedVoicing[]): ResolvedVoicing[] {
    const deduped = new Map<string, ResolvedVoicing>();

    for (const voicing of voicings) {
        const signature = getResolvedVoicingSignature(voicing);
        const existing = deduped.get(signature);

        if (!existing || getTemplateSourcePriority(voicing) < getTemplateSourcePriority(existing)) {
            deduped.set(signature, voicing);
        }
    }

    return Array.from(deduped.values());
}

export function getRankedVoicingsForChord(
    entryInput: string | ChordRegistryEntry,
    rootPitchClass: number,
    options: GetRankedVoicingsOptions = {}
): VoicingCandidate[] {
    const entry = resolveChordRegistryEntry(entryInput);
    const chord = buildChordDefinitionFromRegistryEntry(entry, rootPitchClass, {
        slashBassPitchClass: options.slashBassPitchClass,
    });
    const tones = buildChordTonesFromRegistryEntry(entry, rootPitchClass);
    const legacyTemplates = options.includeLegacyCandidates === false
        ? []
        : getVoicingTemplatesForChord(entry);
    const generatedTemplates = options.includeGeneratedCandidates === false
        ? []
        : getGeneratedVoicingTemplatesForChord(entry);
    const templates = [...legacyTemplates, ...generatedTemplates];
    const resolvedVoicings = options.resolveAcrossPositions === false
        ? resolveVoicingTemplates(chord, tones, templates, options)
        : resolveVoicingTemplatesAcrossPositions(chord, tones, templates, options);
    const dedupedResolvedVoicings = dedupeResolvedVoicings(resolvedVoicings);
    const filteredVoicings = options.includeNonPlayableCandidates === false
        ? dedupedResolvedVoicings.filter((voicing) => voicing.playable)
        : dedupedResolvedVoicings;
    const ranked = rankVoicingCandidates(filteredVoicings, entry, tones, {
        mode: options.rankingMode ?? 'balanced',
    });

    if (options.maxCandidates === undefined) {
        return ranked;
    }

    return ranked.slice(0, options.maxCandidates);
}
