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

const TOP_SET_TRIAD_IDS = new Set(['major', 'minor']);

function compareChordModeCandidateOrder(left: VoicingCandidate, right: VoicingCandidate): number {
    if (left.voicing.minFret !== right.voicing.minFret) {
        return left.voicing.minFret - right.voicing.minFret;
    }

    const leftRootFret = left.voicing.rootFret ?? Number.MAX_SAFE_INTEGER;
    const rightRootFret = right.voicing.rootFret ?? Number.MAX_SAFE_INTEGER;
    if (leftRootFret !== rightRootFret) {
        return leftRootFret - rightRootFret;
    }

    return left.voicing.id.localeCompare(right.voicing.id);
}

function getResolvedVoicingSignature(voicing: ResolvedVoicing): string {
    return voicing.notes
        .map((note) => `${note.string}:${note.isMuted ? 'x' : note.fret}`)
        .join('|');
}

function getTemplateSourcePriority(voicing: ResolvedVoicing): number {
    switch (voicing.descriptor.provenance.sourceKind) {
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

function excludeFormulaInvalidVoicings(voicings: ResolvedVoicing[]): ResolvedVoicing[] {
    return voicings.filter((voicing) => (voicing.outOfFormulaPitchClasses?.length ?? 0) === 0);
}

function getPlayedVoicingNotes(voicing: ResolvedVoicing) {
    return voicing.notes.filter((note) => !note.isMuted);
}

function isStrictTopSetTriad(voicing: ResolvedVoicing): boolean {
    if (!TOP_SET_TRIAD_IDS.has(voicing.chord.id)) {
        return false;
    }

    const playedNotes = getPlayedVoicingNotes(voicing);
    if (playedNotes.length !== 3) {
        return false;
    }

    const playedStrings = playedNotes
        .map((note) => note.string)
        .sort((left, right) => left - right);
    const playedDegrees = new Set(playedNotes.map((note) => note.degree));
    const expectedThird = voicing.chord.id === 'minor' ? 'b3' : '3';

    return playedStrings.join(',') === '0,1,2'
        && playedDegrees.has('1')
        && playedDegrees.has(expectedThird)
        && playedDegrees.has('5');
}

export function shouldSurfaceChordModeVoicing(voicing: ResolvedVoicing): boolean {
    // This is a chord-mode surfacing policy, not a theory rule. We currently suppress
    // non-representative three-note major/minor fragments so browsing stays explicit.
    if (!TOP_SET_TRIAD_IDS.has(voicing.chord.id)) {
        return true;
    }

    return getPlayedVoicingNotes(voicing).length !== 3 || isStrictTopSetTriad(voicing);
}

export function orderChordModeVoicingCandidates(candidates: VoicingCandidate[]): VoicingCandidate[] {
    // Current chord mode is a fret-position browser. Keep engine ranking metadata intact,
    // but present visible candidates in stable fret-first order.
    return [...candidates].sort(compareChordModeCandidateOrder);
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
    const surfacedResolvedVoicings = excludeFormulaInvalidVoicings(resolvedVoicings)
        .filter((voicing) => shouldSurfaceChordModeVoicing(voicing));
    const dedupedResolvedVoicings = dedupeResolvedVoicings(surfacedResolvedVoicings);
    const filteredVoicings = options.includeNonPlayableCandidates === true
        ? dedupedResolvedVoicings
        : dedupedResolvedVoicings.filter((voicing) => voicing.playable);
    // Ranking remains an engine utility for future recommendation/surfacing modes.
    const ranked = rankVoicingCandidates(filteredVoicings, entry, tones, {
        mode: options.rankingMode ?? 'balanced',
    });

    if (options.maxCandidates === undefined) {
        return ranked;
    }

    return ranked.slice(0, options.maxCandidates);
}
