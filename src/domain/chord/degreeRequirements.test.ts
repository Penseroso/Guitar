import { describe, expect, it } from 'vitest';

import { CHORD_REGISTRY_LIST } from './registry';
import { isRequiredChordDegree } from './semantics';
import { deriveRequiredDegrees } from './degreeRequirements';

describe('deriveRequiredDegrees / isRequiredChordDegree — unified required-degree source', () => {
    // Regression: these used to be two independent implementations (a hand-authored per-chord-id
    // table in semantics.ts, and this deductive rule) that happened to agree everywhere except
    // 'augmented'/'diminished', which had no entry in the old table at all — silently treating
    // every one of their tones as optional. isRequiredChordDegree now delegates to
    // deriveRequiredDegrees directly, so the two can no longer independently drift.
    it('agrees with isRequiredChordDegree for every registry entry, by construction', () => {
        for (const entry of CHORD_REGISTRY_LIST) {
            const deduced = new Set(deriveRequiredDegrees(entry));
            for (const degree of entry.formula.degrees) {
                expect(isRequiredChordDegree(entry, degree)).toBe(deduced.has(degree));
            }
        }
    });

    it('derives sensible required tones for augmented/diminished — the case the old table silently missed', () => {
        const augmented = CHORD_REGISTRY_LIST.find((entry) => entry.id === 'augmented')!;
        const diminished = CHORD_REGISTRY_LIST.find((entry) => entry.id === 'diminished')!;

        // 3-note triads where every tone defines the chord's identity — nothing is optional.
        expect(deriveRequiredDegrees(augmented)).toEqual(['1', '3', '#5']);
        expect(deriveRequiredDegrees(diminished)).toEqual(['1', 'b3', 'b5']);

        expect(isRequiredChordDegree(augmented, '3')).toBe(true);
        expect(isRequiredChordDegree(diminished, 'b5')).toBe(true);
    });
});
