import { describe, expect, it } from 'vitest';

import { CHORD_REGISTRY_LIST } from './registry';
import { isRequiredChordDegree } from './semantics';
import { deriveRequiredDegrees } from './degreeRequirements';

// augmented/diminished were added this session and have no entry in the legacy
// REQUIRED_DEGREES_BY_ID table — nothing to regress against, covered by the second test instead.
const IDS_WITHOUT_LEGACY_ENTRY = new Set(['augmented', 'diminished']);

describe('deriveRequiredDegrees regression vs. the legacy per-id REQUIRED_DEGREES_BY_ID table', () => {
    it('matches the existing table exactly for every registry entry that has a legacy entry', () => {
        const mismatches: string[] = [];

        for (const entry of CHORD_REGISTRY_LIST) {
            if (IDS_WITHOUT_LEGACY_ENTRY.has(entry.id)) {
                continue;
            }

            const legacyRequired = entry.formula.degrees.filter((degree) => isRequiredChordDegree(entry, degree));
            const deducedRequired = deriveRequiredDegrees(entry);

            const legacySet = new Set(legacyRequired);
            const deducedSet = new Set(deducedRequired);
            const same = legacySet.size === deducedSet.size
                && [...legacySet].every((degree) => deducedSet.has(degree));

            if (!same) {
                mismatches.push(
                    `${entry.id}: legacy=[${legacyRequired.join(',')}] deduced=[${deducedRequired.join(',')}]`
                );
            }
        }

        expect(mismatches).toEqual([]);
    });

    it('derives sensible required tones for the newly-added augmented/diminished triads (no legacy entry to compare against)', () => {
        const augmented = CHORD_REGISTRY_LIST.find((entry) => entry.id === 'augmented')!;
        const diminished = CHORD_REGISTRY_LIST.find((entry) => entry.id === 'diminished')!;

        // 3-note triads where every tone defines the chord's identity — nothing is optional.
        expect(deriveRequiredDegrees(augmented)).toEqual(['1', '3', '#5']);
        expect(deriveRequiredDegrees(diminished)).toEqual(['1', 'b3', 'b5']);
    });
});
