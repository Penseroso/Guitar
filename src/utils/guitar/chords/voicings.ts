import { buildChordDefinitionFromRegistryEntry, buildChordTonesFromRegistryEntry, resolveChordRegistryEntry } from './helpers';
import { getCuratedVoicingTemplatesForChord } from './curated';
import { getGeneratedVoicingTemplatesForChord } from './generated';
import { rankVoicingCandidates } from './ranking';
import {
    resolveVoicingTemplates,
    resolveVoicingTemplatesAcrossPositions,
    type ResolveVoicingOptions,
} from './resolver';
import { getLegacyVoicingTemplatesForChord } from './templates';
import type { ChordRegistryEntry } from './registry';
import type { ResolvedVoicing, VoicingCandidate, VoicingRankingMode, VoicingTemplate } from './types';

export interface GetRankedVoicingsOptions extends ResolveVoicingOptions {
    resolveAcrossPositions?: boolean;
    includeNonPlayableCandidates?: boolean;
    maxCandidates?: number;
    rankingMode?: VoicingRankingMode;
    includeGeneratedCandidates?: boolean;
    includeLegacyCandidates?: boolean;
}

const TOP_SET_TRIAD_IDS = new Set(['major', 'minor']);

export interface VoicingTemplateSourceCollection {
    legacyTemplates: VoicingTemplate[];
    curatedTemplates: VoicingTemplate[];
    generatedTemplates: VoicingTemplate[];
    allTemplates: VoicingTemplate[];
}

// Candidate-source preservation: legacy CHORD_SHAPES and generated templates both remain
// intentional engine inputs in this phase. We are only clarifying policy boundaries here.
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

function getTemplateSourceDedupePriority(voicing: ResolvedVoicing): number {
    switch (voicing.descriptor.provenance.sourceKind) {
        // Curated inventory is the reviewed source layer, so exact duplicates should retain
        // curated provenance before falling back to preserved legacy imports or generated seeds.
        case 'curated':
            return 0;
        case 'legacy-import':
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

        if (!existing || getTemplateSourceDedupePriority(voicing) < getTemplateSourceDedupePriority(existing)) {
            deduped.set(signature, voicing);
        }
    }

    return Array.from(deduped.values());
}

// Semantic filtering: formula-closed families should not leak extra pitch classes into
// the surfaced pool, regardless of template provenance.
function excludeFormulaInvalidVoicings(voicings: ResolvedVoicing[]): ResolvedVoicing[] {
    return voicings.filter((voicing) => (voicing.outOfFormulaPitchClasses?.length ?? 0) === 0);
}

function getPlayedVoicingNotes(voicing: ResolvedVoicing) {
    return voicing.notes.filter((note) => !note.isMuted);
}

// Chord-mode surfacing policy: keep only representative three-note major/minor fragments.
function isRepresentativeChordModeTriadFragment(voicing: ResolvedVoicing): boolean {
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

    return getPlayedVoicingNotes(voicing).length !== 3 || isRepresentativeChordModeTriadFragment(voicing);
}

function applyChordModeSurfacingPolicies(voicings: ResolvedVoicing[]): ResolvedVoicing[] {
    return excludeFormulaInvalidVoicings(voicings)
        .filter((voicing) => shouldSurfaceChordModeVoicing(voicing));
}

export function collectVoicingTemplateSourcesForChord(
    entryInput: string | ChordRegistryEntry,
    options: GetRankedVoicingsOptions = {}
): VoicingTemplateSourceCollection {
    const legacyTemplates = options.includeLegacyCandidates === false
        ? []
        : getLegacyVoicingTemplatesForChord(entryInput);
    const curatedTemplates = getCuratedVoicingTemplatesForChord(entryInput);
    const generatedTemplates = options.includeGeneratedCandidates === false
        ? []
        : getGeneratedVoicingTemplatesForChord(entryInput);

    return {
        legacyTemplates,
        curatedTemplates,
        generatedTemplates,
        allTemplates: [...legacyTemplates, ...curatedTemplates, ...generatedTemplates],
    };
}

export function orderChordModeVoicingCandidates(candidates: VoicingCandidate[]): VoicingCandidate[] {
    // Current chord mode is a fret-position browser. Keep engine ranking metadata intact,
    // but present visible candidates in stable fret-first order.
    return [...candidates].sort(compareChordModeCandidateOrder);
}

export function getChordModeVoicingsForChord(
    entryInput: string | ChordRegistryEntry,
    rootPitchClass: number,
    options: GetRankedVoicingsOptions = {}
): VoicingCandidate[] {
    // Chord mode currently consumes the same engine candidates as future ranking-aware
    // surfaces, but applies its own explicit fret-first browsing order.
    return orderChordModeVoicingCandidates(getRankedVoicingsForChord(entryInput, rootPitchClass, options));
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
    const templateSources = collectVoicingTemplateSourcesForChord(entry, options);
    const resolvedVoicings = options.resolveAcrossPositions === false
        ? resolveVoicingTemplates(chord, tones, templateSources.allTemplates, options)
        : resolveVoicingTemplatesAcrossPositions(chord, tones, templateSources.allTemplates, options);
    const surfacedResolvedVoicings = applyChordModeSurfacingPolicies(resolvedVoicings);
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
