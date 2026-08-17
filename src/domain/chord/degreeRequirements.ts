import { deriveChordToneRole, deriveRequiredDegrees } from './semantics';
import type { ChordRegistryEntry } from './registry';
import type { ChordTone, ChordTones } from './types';

// deriveRequiredDegrees itself now lives in semantics.ts (unified with isRequiredChordDegree —
// see that file's comment) — re-exported here since this is where the rest of the deductive
// voicing-search pipeline already imports it from.
export { deriveRequiredDegrees } from './semantics';

function normalizePitchClass(value: number): number {
    return ((value % 12) + 12) % 12;
}

/** Builds a chord's tones at a given root using the deductive required-degree rule above. */
export function buildDeductiveChordTones(entry: ChordRegistryEntry, rootPitchClass: number): ChordTones {
    const requiredDegrees = new Set(deriveRequiredDegrees(entry));
    const tones: ChordTone[] = entry.formula.degrees.map((degree, index) => {
        const interval = entry.formula.intervals[index];
        return {
            degree,
            interval,
            pitchClass: normalizePitchClass(rootPitchClass + interval),
            isRequired: requiredDegrees.has(degree),
            role: deriveChordToneRole(entry, degree),
        };
    });

    return { rootPitchClass, intervals: entry.formula.intervals, tones };
}
