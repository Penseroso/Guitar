import {
    getVoicingTechniqueTag,
    rankVoicingCandidates,
    type ScoreResolvedVoicingOptions,
    type VoicingTechniqueTag,
} from './deductiveRanking';
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
    maxCandidates?: number;
    styles?: VoicingPosition[];
    maxHandSpanMm?: number;
    allowThumbOnLowE?: boolean;
    scaleLengthMm?: number;
}

// Each technique that has any candidates at all keeps at least this many of its own top-ranked
// voicings in the result, so a technique never silently disappears from the surface (and from
// any UI that groups/filters by technique) just because a different technique dominates the
// global ranking — e.g. a chord whose best-scoring shapes are mostly Open could otherwise crowd
// every Barre voicing out of the top maxCandidates even when good barre shapes exist.
const MIN_PER_TECHNIQUE = 3;

/**
 * Step 4 live-surface entry point: searches every voicing style (close/drop-2/drop-3/shell),
 * merges and dedupes the results, then ranks them once as a single pool so styles compete on
 * equal footing. Selection (which candidates make the maxCandidates cut) is technique-aware —
 * see MIN_PER_TECHNIQUE — but the returned order is still pure global rank, since each voicing's
 * score never depends on which other voicings are in the pool.
 */
export function getDeductiveChordSurfaceVoicingsForChord(
    entryInput: string | ChordRegistryEntry,
    rootPitchClass: number,
    options: DeductiveChordSurfaceOptions = {}
): VoicingCandidate[] {
    const entry = resolveChordRegistryEntry(entryInput);
    const styles = options.styles ?? DEFAULT_CHORD_SURFACE_STYLES;
    const maxCandidates = options.maxCandidates ?? 12;
    const searchOptions: VoicingSearchOptions = {
        maxFret: options.maxFret ?? 15,
        maxHandSpanMm: options.maxHandSpanMm,
        allowThumbOnLowE: options.allowThumbOnLowE,
    };

    const allVoicings = styles.flatMap((position) =>
        searchDeductiveVoicings(entry, rootPitchClass, { position }, searchOptions)
    );
    const deduped = dedupeBySignature(allVoicings);
    const tones = buildDeductiveChordTones(entry, rootPitchClass);
    const ranked = rankVoicingCandidates(deduped, entry, tones, {
        maxHandSpanMm: options.maxHandSpanMm,
        scaleLengthMm: options.scaleLengthMm,
    });

    const byTechnique = new Map<VoicingTechniqueTag, VoicingCandidate[]>();
    for (const candidate of ranked) {
        const tag = getVoicingTechniqueTag(candidate.voicing);
        const list = byTechnique.get(tag) ?? [];
        list.push(candidate);
        byTechnique.set(tag, list);
    }

    // Scale the per-technique guarantee down if maxCandidates is too small to fit
    // MIN_PER_TECHNIQUE for every technique present, so the guarantee never blows the cap.
    const perTechniqueGuarantee = byTechnique.size > 0
        ? Math.max(1, Math.min(MIN_PER_TECHNIQUE, Math.floor(maxCandidates / byTechnique.size)))
        : 0;

    const selectedIds = new Set<string>();
    for (const candidates of byTechnique.values()) {
        for (const candidate of candidates.slice(0, perTechniqueGuarantee)) {
            selectedIds.add(candidate.voicing.id);
        }
    }
    for (const candidate of ranked) {
        if (selectedIds.size >= maxCandidates) {
            break;
        }
        selectedIds.add(candidate.voicing.id);
    }

    return ranked.filter((candidate) => selectedIds.has(candidate.voicing.id));
}
