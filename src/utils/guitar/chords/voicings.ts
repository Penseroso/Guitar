import { buildChordDefinitionFromRegistryEntry, buildChordTonesFromRegistryEntry, resolveChordRegistryEntry } from './helpers';
import { getArchetypeGeneratedVoicingTemplatesForChord } from './archetype-generated';
import { getCuratedVoicingTemplatesForChord } from './curated';
import {
    getGeneratedVoicingTemplatesForChord,
    getPrimaryGeneratedVoicingTemplatesForChord,
} from './generated';
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
    dedupeResolvedCandidates?: boolean;
    maxCandidates?: number;
    rankingMode?: VoicingRankingMode;
    applyChordModeSurfacing?: boolean;
    generatedTemplateCollectionMode?: 'primary' | 'exploration';
    includeCuratedCandidates?: boolean;
    includeArchetypeGeneratedCandidates?: boolean;
    includeGeneratedCandidates?: boolean;
    includeLegacyCandidates?: boolean;
}

const TOP_SET_TRIAD_IDS = new Set(['major', 'minor']);

export interface VoicingTemplateSourceCollection {
    legacyTemplates: VoicingTemplate[];
    curatedTemplates: VoicingTemplate[];
    archetypeGeneratedTemplates: VoicingTemplate[];
    generatedTemplates: VoicingTemplate[];
    allTemplates: VoicingTemplate[];
}

export interface ChordModeTemplateRoleCollection {
    reviewedTemplates: VoicingTemplate[];
    explorationTemplates: VoicingTemplate[];
    fallbackTemplates: VoicingTemplate[];
    primaryTemplates: VoicingTemplate[];
}

function compareChordSurfaceCandidateOrder(left: VoicingCandidate, right: VoicingCandidate): number {
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
        case 'archetype-generated':
            return 2;
        default:
            return 3;
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

function dedupeVoicingCandidatesBySignature(candidates: VoicingCandidate[]): VoicingCandidate[] {
    const deduped = new Map<string, VoicingCandidate>();

    for (const candidate of candidates) {
        const signature = getResolvedVoicingSignature(candidate.voicing);

        if (!deduped.has(signature)) {
            deduped.set(signature, candidate);
        }
    }

    return Array.from(deduped.values());
}

// Engine sanity filter: formula-invalid resolutions are not useful exploration candidates,
// regardless of whether the source was generated, curated, or legacy-preserved.
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

function applyChordSurfacePolicies(voicings: ResolvedVoicing[]): ResolvedVoicing[] {
    return voicings.filter((voicing) => shouldSurfaceChordModeVoicing(voicing));
}

export function collectVoicingTemplateSourcesForChord(
    entryInput: string | ChordRegistryEntry,
    options: GetRankedVoicingsOptions = {}
): VoicingTemplateSourceCollection {
    const legacyTemplates = options.includeLegacyCandidates === false
        ? []
        : getLegacyVoicingTemplatesForChord(entryInput);
    const curatedTemplates = options.includeCuratedCandidates === false
        ? []
        : getCuratedVoicingTemplatesForChord(entryInput);
    const archetypeGeneratedTemplates = options.includeArchetypeGeneratedCandidates === true
        ? getArchetypeGeneratedVoicingTemplatesForChord(entryInput)
        : [];
    const generatedTemplates = options.includeGeneratedCandidates === false
        ? []
        : options.generatedTemplateCollectionMode === 'exploration'
            ? getGeneratedVoicingTemplatesForChord(entryInput)
            : getPrimaryGeneratedVoicingTemplatesForChord(entryInput);

    return {
        legacyTemplates,
        curatedTemplates,
        archetypeGeneratedTemplates,
        generatedTemplates,
        allTemplates: [...legacyTemplates, ...curatedTemplates, ...archetypeGeneratedTemplates, ...generatedTemplates],
    };
}

export function collectChordModeTemplateRolesForChord(
    entryInput: string | ChordRegistryEntry,
    options: GetRankedVoicingsOptions = {}
): ChordModeTemplateRoleCollection {
    const sources = collectVoicingTemplateSourcesForChord(entryInput, options);

    return {
        reviewedTemplates: sources.curatedTemplates,
        explorationTemplates: [...sources.archetypeGeneratedTemplates, ...sources.generatedTemplates],
        fallbackTemplates: sources.legacyTemplates,
        primaryTemplates: [
            ...sources.curatedTemplates,
            ...sources.archetypeGeneratedTemplates,
            ...sources.generatedTemplates,
        ],
    };
}

export function orderChordSurfaceVoicingCandidates(candidates: VoicingCandidate[]): VoicingCandidate[] {
    // Current chord mode is a fret-position browser. Keep engine ranking metadata intact,
    // but present visible candidates in stable fret-first order.
    return [...candidates].sort(compareChordSurfaceCandidateOrder);
}

function getResolvedVoicingPoolForChord(
    entryInput: string | ChordRegistryEntry,
    rootPitchClass: number,
    options: GetRankedVoicingsOptions = {}
): ResolvedVoicing[] {
    const entry = resolveChordRegistryEntry(entryInput);
    const chord = buildChordDefinitionFromRegistryEntry(entry, rootPitchClass, {
        slashBassPitchClass: options.slashBassPitchClass,
    });
    const tones = buildChordTonesFromRegistryEntry(entry, rootPitchClass);
    const templateSources = collectVoicingTemplateSourcesForChord(entry, options);
    const resolvedVoicings = options.resolveAcrossPositions === false
        ? resolveVoicingTemplates(chord, tones, templateSources.allTemplates, options)
        : resolveVoicingTemplatesAcrossPositions(chord, tones, templateSources.allTemplates, options);
    const semanticallyValidResolvedVoicings = excludeFormulaInvalidVoicings(resolvedVoicings);
    const surfacedResolvedVoicings = options.applyChordModeSurfacing === false
        ? semanticallyValidResolvedVoicings
        : applyChordSurfacePolicies(semanticallyValidResolvedVoicings);
    const dedupedResolvedVoicings = options.dedupeResolvedCandidates === false
        ? surfacedResolvedVoicings
        : dedupeResolvedVoicings(surfacedResolvedVoicings);

    return options.includeNonPlayableCandidates === true
        ? dedupedResolvedVoicings
        : dedupedResolvedVoicings.filter((voicing) => voicing.playable);
}

export function getExploratoryVoicingsForChord(
    entryInput: string | ChordRegistryEntry,
    rootPitchClass: number,
    options: GetRankedVoicingsOptions = {}
): ResolvedVoicing[] {
    return getResolvedVoicingPoolForChord(entryInput, rootPitchClass, {
        ...options,
        applyChordModeSurfacing: false,
        generatedTemplateCollectionMode: 'exploration',
        includeCuratedCandidates: false,
        includeLegacyCandidates: false,
        includeArchetypeGeneratedCandidates: false,
    });
}

export function getRankedExploratoryVoicingsForChord(
    entryInput: string | ChordRegistryEntry,
    rootPitchClass: number,
    options: GetRankedVoicingsOptions = {}
): VoicingCandidate[] {
    return getRankedVoicingsForChord(entryInput, rootPitchClass, {
        ...options,
        applyChordModeSurfacing: false,
        generatedTemplateCollectionMode: 'exploration',
        includeCuratedCandidates: false,
        includeLegacyCandidates: false,
        includeArchetypeGeneratedCandidates: false,
    });
}

export function getChordSurfaceVoicingsForChord(
    entryInput: string | ChordRegistryEntry,
    rootPitchClass: number,
    options: GetRankedVoicingsOptions = {}
): VoicingCandidate[] {
    const chordModeRoles = collectChordModeTemplateRolesForChord(entryInput, options);
    const maxCandidates = options.maxCandidates ?? Number.MAX_SAFE_INTEGER;
    const baseOptions = {
        ...options,
        maxCandidates: undefined,
        applyChordModeSurfacing: true,
        generatedTemplateCollectionMode: 'primary',
        includeLegacyCandidates: false,
        includeCuratedCandidates: false,
        includeGeneratedCandidates: false,
        includeArchetypeGeneratedCandidates: false,
    } satisfies GetRankedVoicingsOptions;
    const primaryCandidates = getRankedVoicingsForChord(entryInput, rootPitchClass, {
        ...baseOptions,
        includeCuratedCandidates: chordModeRoles.reviewedTemplates.length > 0,
        includeGeneratedCandidates: chordModeRoles.explorationTemplates.some((template) => template.source === 'generated'),
        includeArchetypeGeneratedCandidates: chordModeRoles.explorationTemplates.some(
            (template) => template.source === 'archetype-generated'
        ),
    });

    if (primaryCandidates.length >= maxCandidates || chordModeRoles.fallbackTemplates.length === 0) {
        return orderChordSurfaceVoicingCandidates(primaryCandidates).slice(0, maxCandidates);
    }

    const fallbackCandidates = getRankedVoicingsForChord(entryInput, rootPitchClass, {
        ...baseOptions,
        includeLegacyCandidates: true,
    });

    return orderChordSurfaceVoicingCandidates(
        dedupeVoicingCandidatesBySignature([...primaryCandidates, ...fallbackCandidates])
    ).slice(0, maxCandidates);
}

export function orderChordModeVoicingCandidates(candidates: VoicingCandidate[]): VoicingCandidate[] {
    return orderChordSurfaceVoicingCandidates(candidates);
}

export function getChordModeVoicingsForChord(
    entryInput: string | ChordRegistryEntry,
    rootPitchClass: number,
    options: GetRankedVoicingsOptions = {}
): VoicingCandidate[] {
    return getChordSurfaceVoicingsForChord(entryInput, rootPitchClass, options);
}

export function getArchetypeGeneratedVoicingsForChord(
    entryInput: string | ChordRegistryEntry,
    rootPitchClass: number,
    options: GetRankedVoicingsOptions = {}
): VoicingCandidate[] {
    return getRankedVoicingsForChord(entryInput, rootPitchClass, {
        ...options,
        includeLegacyCandidates: false,
        includeCuratedCandidates: false,
        includeGeneratedCandidates: false,
        includeArchetypeGeneratedCandidates: true,
    });
}

export function getRankedVoicingsForChord(
    entryInput: string | ChordRegistryEntry,
    rootPitchClass: number,
    options: GetRankedVoicingsOptions = {}
): VoicingCandidate[] {
    const entry = resolveChordRegistryEntry(entryInput);
    const tones = buildChordTonesFromRegistryEntry(entry, rootPitchClass);
    const filteredVoicings = getResolvedVoicingPoolForChord(entry, rootPitchClass, options);
    // Ranking remains an engine utility for future recommendation/surfacing modes.
    const ranked = rankVoicingCandidates(filteredVoicings, entry, tones, {
        mode: options.rankingMode ?? 'balanced',
    });

    if (options.maxCandidates === undefined) {
        return ranked;
    }

    return ranked.slice(0, options.maxCandidates);
}
