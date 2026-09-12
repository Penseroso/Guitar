import {
    rankVoicingCandidates,
    type ScoreResolvedVoicingOptions,
} from './deductiveRanking';
import { buildDeductiveChordTones } from './degreeRequirements';
import { searchDeductiveVoicings, type VoicingSearchOptions } from './voicingSearch';
import type { VoicingStyleSpec } from './voicingStyles';
import type { ChordRegistryEntry } from './registry';
import type { VoicingCandidate } from './types';

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
