import { buildDeductiveChordTones, deriveRequiredDegrees } from './degreeRequirements';
import { buildChordDefinitionFromRegistryEntry } from './helpers';
import { CHORD_REGISTRY_LIST } from './registry';
import type { ChordInterpretationCandidate, PitchClass } from './types';

function normalizePitchClass(value: number): number {
    return ((value % 12) + 12) % 12;
}

/**
 * Reverse of the forward generator (voicingSearch.ts): given a set of pitch classes actually
 * being played, finds every (chord id, root) reading that's harmonically consistent with them —
 * i.e. every required degree for that reading is present. Genuinely different chords can share
 * every note (e.g. Am7 and C6 are both {A, C, E, G}); this returns all such readings tied at the
 * top confidence rather than picking one, since the notes alone don't disambiguate them — that
 * needs surrounding harmonic context, which is out of scope here.
 *
 * Purely a function of CHORD_REGISTRY_LIST + deriveRequiredDegrees — no new "truth" or per-chord
 * tables, and no runtime dependency on the forward generator.
 */
export function identifyChordsForPitchClasses(playedPitchClasses: PitchClass[]): ChordInterpretationCandidate[] {
    const uniquePlayed = Array.from(new Set(playedPitchClasses.map(normalizePitchClass)));
    if (uniquePlayed.length === 0) {
        return [];
    }

    const candidates: ChordInterpretationCandidate[] = [];

    for (let rootPitchClass = 0; rootPitchClass < 12; rootPitchClass++) {
        for (const entry of CHORD_REGISTRY_LIST) {
            const formulaPitchClasses = entry.formula.intervals.map((interval) => normalizePitchClass(rootPitchClass + interval));
            const requiredDegrees = new Set(deriveRequiredDegrees(entry));
            const requiredPitchClasses = entry.formula.degrees
                .map((degree, index) => ({ degree, pitchClass: formulaPitchClasses[index] }))
                .filter(({ degree }) => requiredDegrees.has(degree))
                .map(({ pitchClass }) => pitchClass);

            const matchedPitchClasses = uniquePlayed.filter((pitchClass) => formulaPitchClasses.includes(pitchClass));
            const missingPitchClasses = requiredPitchClasses.filter((pitchClass) => !uniquePlayed.includes(pitchClass));
            const extraPitchClasses = uniquePlayed.filter((pitchClass) => !formulaPitchClasses.includes(pitchClass));

            // Every required degree must sound for this to be a valid reading at all.
            if (missingPitchClasses.length > 0 || matchedPitchClasses.length === 0) {
                continue;
            }

            // Confidence = average of "how much of the chord's full identity is heard" and "how
            // much of what's actually played belongs to this chord" — 1.0 only for an exact,
            // complete match in both directions. Deliberately symmetric so e.g. Am7 and C6 tie.
            const coverageOfFormula = matchedPitchClasses.length / formulaPitchClasses.length;
            const coverageOfPlayed = matchedPitchClasses.length / uniquePlayed.length;
            const confidence = (coverageOfFormula + coverageOfPlayed) / 2;

            candidates.push({
                definition: buildChordDefinitionFromRegistryEntry(entry, rootPitchClass),
                tones: buildDeductiveChordTones(entry, rootPitchClass),
                matchedPitchClasses,
                missingPitchClasses,
                extraPitchClasses,
                confidence,
            });
        }
    }

    return candidates.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
}
