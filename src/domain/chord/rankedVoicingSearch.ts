import {
    getVoicingTechniqueTag,
    rankVoicingCandidates,
    type ScoreResolvedVoicingOptions,
    type VoicingTechniqueTag,
} from './deductiveRanking';
import { getCompleteChordWindow } from './descriptor';
import { buildDeductiveChordTones } from './degreeRequirements';
import { resolveChordRegistryEntry } from './helpers';
import { searchDeductiveVoicings, type VoicingSearchOptions } from './voicingSearch';
import type { VoicingPosition, VoicingStyleSpec } from './voicingStyles';
import type { ChordRegistryEntry } from './registry';
import type { ResolvedVoicing, VoicingCandidate } from './types';

/**
 * Step 3 adapter: pipes the deductive generator (voicingSearch.ts) through the existing
 * classification (descriptor.ts, already invoked inside the search) and the deductive-engine-only
 * scoring layer (deductiveRanking.ts) — a clean rebuild of the old ranking.ts, scoped to the
 * invariants this search actually guarantees (see deductiveRanking.ts's module docstring).
 */
export function searchAndRankDeductiveVoicings(
    entry: ChordRegistryEntry,
    rootPitchClass: number,
    style: VoicingStyleSpec,
    searchOptions: VoicingSearchOptions = {},
    rankOptions: ScoreResolvedVoicingOptions = {}
): VoicingCandidate[] {
    const voicings = searchDeductiveVoicings(entry, rootPitchClass, style, searchOptions);
    const tones = buildDeductiveChordTones(entry, rootPitchClass);

    return rankVoicingCandidates(voicings, entry, tones, rankOptions);
}

const DEFAULT_CHORD_SURFACE_STYLES: VoicingPosition[] = ['close', 'drop-2', 'drop-3', 'shell'];

function getPlayedSignature(voicing: ResolvedVoicing): string {
    return voicing.notes
        .filter((note) => !note.isMuted)
        .map((note) => `${note.string}:${note.fret}`)
        .sort()
        .join('|');
}

/** Same physical shape can come out of more than one style (e.g. 'close' and 'shell' coincide
 *  for a triad where every degree happens to be required) — keep the first-seen occurrence. */
function dedupeBySignature(voicings: ResolvedVoicing[]): ResolvedVoicing[] {
    const seen = new Set<string>();
    const deduped: ResolvedVoicing[] = [];
    for (const voicing of voicings) {
        const signature = getPlayedSignature(voicing);
        if (seen.has(signature)) {
            continue;
        }
        seen.add(signature);
        deduped.push(voicing);
    }
    return deduped;
}

export interface DeductiveChordSurfaceOptions {
    maxFret?: number;
    /** Cap applied independently within each technique bucket (open/barre/shell/standard), not a
     *  total across all of them — see the module-level rationale below. */
    maxPerTechnique?: number;
    styles?: VoicingPosition[];
    maxHandSpanMm?: number;
    allowThumbOnLowE?: boolean;
    scaleLengthMm?: number;
}

const DEFAULT_MAX_PER_TECHNIQUE = 5;

/**
 * Step 4 live-surface entry point: searches every voicing style (close/drop-2/drop-3/shell),
 * merges and dedupes the results, classifies by technique, and ranks + caps *within* each
 * technique bucket independently — rather than ranking one global pool and cutting to a single
 * total, which let whichever technique scored best crowd the others out of the result entirely
 * (e.g. a chord whose best-scoring shapes are mostly Open could leave Barre with zero candidates
 * even when good barre shapes exist). Since Chord mode's UI is filter-driven (a player picks one
 * technique and looks only at its candidates), what matters is that *each* technique's own filter
 * view has real depth, not how techniques compare to each other on a shared scale — so there's no
 * cross-technique competition for a shared budget at all. The 'standard' bucket (deductiveRanking.ts's
 * fallback for "none of the other three") is capped the same way as the rest, even though the UI
 * gives it no dedicated filter button, so it still contributes properly to "All".
 *
 * The complete-chord-window fact (getCompleteChordWindow — "does this voicing's entire formula
 * fit on N consecutive strings", see ChordModeWorkspace.tsx's Triad/Quad filter buttons) gets the
 * same independent-bucket-and-cap treatment, not just the four VoicingTechniqueTag values, and
 * grouped by size (a triad's complete window is 3 strings, a 7th chord's is 4 — "Quad") rather
 * than a single fixed bucket: without it, a complete-window voicing only survived by chance if it
 * *also* happened to rank in its technique's own top maxPerTechnique — competing against every
 * other voicing in that bucket on terms the scorer never rewards "is a complete window" for at
 * all, since it isn't part of scoreResolvedVoicing's criteria. These buckets are additive, not
 * exclusive — a voicing found here can simultaneously be one of its technique's picks too, so
 * selection is deduped by id before the final rank.
 *
 * The final returned order is a fresh rank over just the selected (already-capped) voicings, not
 * the union of already-sorted per-bucket slices — scores are recomputed here for correct combined
 * ordering/tie-breaking, which is cheap since the capped pool is small. Each voicing's score never
 * depends on which other voicings are in the pool, so this doesn't change any individual score,
 * only the final combined ordering.
 */
export function getDeductiveChordSurfaceVoicingsForChord(
    entryInput: string | ChordRegistryEntry,
    rootPitchClass: number,
    options: DeductiveChordSurfaceOptions = {}
): VoicingCandidate[] {
    const entry = resolveChordRegistryEntry(entryInput);
    const styles = options.styles ?? DEFAULT_CHORD_SURFACE_STYLES;
    const maxPerTechnique = options.maxPerTechnique ?? DEFAULT_MAX_PER_TECHNIQUE;
    const searchOptions: VoicingSearchOptions = {
        maxFret: options.maxFret ?? 15,
        maxHandSpanMm: options.maxHandSpanMm,
        allowThumbOnLowE: options.allowThumbOnLowE,
    };
    const rankOptions: ScoreResolvedVoicingOptions = {
        maxHandSpanMm: options.maxHandSpanMm,
        scaleLengthMm: options.scaleLengthMm,
    };

    const allVoicings = styles.flatMap((position) =>
        searchDeductiveVoicings(entry, rootPitchClass, { position }, searchOptions)
    );
    const deduped = dedupeBySignature(allVoicings);
    const tones = buildDeductiveChordTones(entry, rootPitchClass);

    const byTechnique = new Map<VoicingTechniqueTag, ResolvedVoicing[]>();
    const byWindowSize = new Map<number, ResolvedVoicing[]>();
    for (const voicing of deduped) {
        const tag = getVoicingTechniqueTag(voicing);
        const list = byTechnique.get(tag) ?? [];
        list.push(voicing);
        byTechnique.set(tag, list);

        const window = getCompleteChordWindow(voicing);
        if (window) {
            const windowList = byWindowSize.get(window.size) ?? [];
            windowList.push(voicing);
            byWindowSize.set(window.size, windowList);
        }
    }

    const selectedVoicings = new Map<string, ResolvedVoicing>();
    for (const voicings of byTechnique.values()) {
        const rankedWithinTechnique = rankVoicingCandidates(voicings, entry, tones, rankOptions);
        for (const candidate of rankedWithinTechnique.slice(0, maxPerTechnique)) {
            selectedVoicings.set(candidate.voicing.id, candidate.voicing);
        }
    }
    for (const voicings of byWindowSize.values()) {
        const rankedWithinWindowSize = rankVoicingCandidates(voicings, entry, tones, rankOptions);
        for (const candidate of rankedWithinWindowSize.slice(0, maxPerTechnique)) {
            selectedVoicings.set(candidate.voicing.id, candidate.voicing);
        }
    }

    return rankVoicingCandidates([...selectedVoicings.values()], entry, tones, rankOptions);
}
