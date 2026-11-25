import { identifyChordsForPitchClasses } from '@/domain/chord/chordRecognition';
import { canonicalTone } from '@/domain/chord/engine/catalog';
import { getChordTypeSuffix } from '@/domain/chord/helpers';
import type { ChordRef } from '@/domain/harmony/types';
import { getKeyName } from '@/domain/shared/keys';
import { formatAccidentals } from '@/domain/shared/spelling';

export interface TabChordCandidate {
    key: string;
    chord: ChordRef;
    name: string;
    /** Formula degrees absent from the observed notes, never inserted into them. */
    omitted: string[];
    added: number[];
    match: 'exact' | 'incomplete' | 'added-tone';
}

/**
 * Shared registry adapter for an observed canonical pitch-class set (0..11).
 * Callers decide observation/population eligibility; formula fit does not choose
 * a harmonic interpretation, establish a bass or measure musical probability.
 */
export function buildTabChordCandidates(pitchClasses: number[]): TabChordCandidate[] {
    const candidates: TabChordCandidate[] = identifyChordsForPitchClasses(pitchClasses)
        .filter(candidate => candidate.extraPitchClasses.length <= 1)
        .map(candidate => {
            const { definition } = candidate;
            const root = getKeyName(definition.rootPitchClass);
            const omitted = candidate.tones.tones
                .filter(tone => !pitchClasses.includes(tone.pitchClass))
                .map(tone => canonicalTone(definition.id, tone.degree));
            const added = [...candidate.extraPitchClasses];
            return {
                key: `${definition.rootPitchClass}:${definition.id}`,
                chord: { root, chordId: definition.id },
                name: formatAccidentals(root + getChordTypeSuffix(definition.id)),
                omitted,
                added,
                match: added.length ? 'added-tone' : omitted.length ? 'incomplete' : 'exact',
            };
        });
    const priority = { exact: 0, incomplete: 1, 'added-tone': 2 };
    // Stable ordering retains equally matching interpretations; none is adopted.
    return candidates.sort((left, right) => priority[left.match] - priority[right.match]);
}
