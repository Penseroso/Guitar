# P4-A: shared TAB formula-candidate contract

Baseline: P3.3 `af2fb44e5c9a9c1882bffbb594be46c4e481c25b`, on the existing shared
`feat/tab-timing-inspection` branch. This gate precedes P4-B point interpretation.

`buildTabChordCandidates(pitchClasses)` extracts the former private TAB helper into
`src/domain/tab/chord-candidates.ts`. `TabChordCandidate` remains type-importable
from `analysis.ts` through a backwards-compatible re-export. No recognition policy,
registry, required-degree semantics, scale spelling or Harmony rule is replaced.

The helper consumes canonical pitch classes, retains registry alternatives with at
most one extra pitch class, computes omissions against the full formula and keeps
the former exact/incomplete/added-tone stable ordering. Optional fifth omission is
not confused with the recognizer's required-tone-only missing list. Scores are not
probabilities, and no candidate is adopted as the actual harmony.

Observation eligibility remains the caller's responsibility. In particular the
existing source analyzer keeps its single/dyad/chord thresholds and order-only
behavior. A later complete-point caller can inspect two-PC formula alternatives
explicitly, without changing those existing defaults. Octave doubling changes source
occurrence count, not the formula-compatible PC set. Rootless hypotheses outside
the current required-root contract are not silently added.

## Sequential gate

**P4-A: GO.** Root's relevant seven-file suite passed **160 tests**, including the
new helper tests, and whole-project TypeScript passed. Scoped source/test lint passed.

An independent comparison compiled the original helper and analyzer from the exact
baseline Git source. It did not create baseline expected values by calling the new
shared helper:

- **4,096 PC masks**, **6,552 candidate records**, plus nine order/doubling cases:
  JSON candidate contents and order identical; zero input mutations.
- **2,184 Analyze cases** across 26 fixtures, timing variants, reference contexts
  and selections: complete JSON results identical; zero input mutations.
- **129 engine/policy/dependency files** retained baseline source hashes.

This is refactor equivalence, not an empirical claim about actual chord, key or
function recognition accuracy. The first permitted follow-up is a separate P4-B
adapter consuming proven complete nominal points; it must not fabricate a source
score to bypass population/identity checks.

[Independent equivalence report](tab-chord-candidates-validation/report.md) ·
[Summary and fingerprints](tab-chord-candidates-validation/equivalence-summary.json).
