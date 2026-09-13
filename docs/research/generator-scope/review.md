# Generator Scope review

Baseline: `a79007f0919b5b7f34657caa99f6d30a787c2a49`. The working HEAD matches this commit; tracked production source was unchanged when inspected and measured. Historical roadmaps and phase numbering have no authority in this review. Three independent agents reconstructed invariants, audited exclusion history, and challenged coverage/cost; the lead checked the source, a concrete witness, and the census.

## Decision

Generation should enumerate a structurally valid superset **within an explicit finite instrument and harmonic request**. Keep coordinate/pitch consistency, declared harmonic obligations and proven set-preserving pruning. Move hand admission out of generation. Remove string-order pitch monotonicity from the structural contract: it is neither necessary nor set-preserving. Resolve implicit harmonic/style policies separately instead of silently broadening or narrowing the meaning of a chord.

This is a scope recommendation, not authorization to deploy changed admission. Production code remains unchanged. The only implementation is an isolated offline census of existing gates.

## Minimal structurally valid candidate

For an ordinary fretted-note representation, a candidate is a string-state vector plus its harmonic interpretation, relative to a request specifying instrument/tuning, finite fret domain, allowed tones, and required harmonic obligations.

1. Each modeled string has exactly one state: muted, open, or stopped at one integer fret in the declared domain. At least one string sounds. Harmonics, bends, temporal sequences, and finger assignments are outside this representation.
2. Every sounding pitch equals that string's declared open MIDI pitch plus fret. Pitch class and degree interpretation agree with it.
3. Sounding notes belong to the request's allowed vocabulary. All explicit required-degree/coverage obligations hold. Explicit exclusions or bass predicates hold when the request actually contains them.
4. Candidate identity preserves the instrument/tuning and complete string allocation. Equal pitch collections on different strings are different candidates. Repeated pitches/degrees are allowed. Exact duplicate allocations may be merged while retaining their interpretations.

No ordering of sounding pitches by string index follows from these conditions. Bass is the minimum sounding pitch; top is the maximum. Neither a hand assignment nor popularity, comfort, conventional shape, or rank is required to create a structural candidate.

The nonempty rule does **not** mean that any single chord tone should be advertised as a complete chord. A chord-associated realization must meet a declared harmonic contract. The mechanism enforcing that contract can be structural while the defaults chosen for the contract remain musical policy. Calling a hidden prior an input does not justify continuing to exclude it from the broad pool.

## Constraint map

Categories: **1** structural necessity; **2** provably safe computational pruning; **3** physical-feasibility proxy; **4** empirical/conventionality prior; **5** historical/accidental restriction. Where a rule changes category when explicitly requested, that distinction is intentional.

| Current exclusion or scope condition | Category | Recommended disposition |
|---|---|---|
| Unsupported registry chord, root outside integer 0–11, unsupported context | 1, supported-request boundary | Keep validation; report unsupported requests distinctly from an empty valid result. |
| Six modeled strings, one state per string; frets 0 through configured maximum; tuning-plus-fret pitch consistency | 1, within the declared representation | Keep. Validate coherent finite instrument inputs at the boundary. |
| Default maximum fret 15 and standard tuning | 1 as an explicit bounded request; 5 if presented as universal completeness | Keep a disclosed configurable scope. Frets above 15 are outside this search, not structurally invalid. |
| Formula/style-allowed pitch classes only; empty target or all-muted assignment yields no candidate | 1 relative to vocabulary; style narrowing is conditional | Keep vocabulary and nonempty checks. Do not let an unrequested style shrink the broad pool. |
| Required-degree coverage | 1 as enforcement of explicit harmonic identity | Keep the enforcement; make the harmonic contract visible and versioned. Its exact defaults are not physical truths. |
| Current derivation: root; third/suspension; seventh or 6; altered fifth; natural fifth only without third/suspension/seventh; highest numbered extension | 1 where necessary to the declared interpretation; 4 where imposed as universal completeness | Preserve as the baseline harmonic policy during the gate experiment. Reconsider which omissions are permitted by an explicit request; do not infer structural necessity merely from the word “deductive.” |
| Root required by default standalone; accompaniment permits omission; `requireRoot` overrides | 4 as an implicit universal requirement; 1 if explicitly requested | Rootless realizations are not malformed. Keep only as a declared query obligation or optional selection; root preference belongs after generation. |
| At least 3 distinct pitch classes standalone, 2 accompaniment, capped by formula length | 4 unless explicitly requested | Reconsider as a universal exclusion; permit partial realizations consistent with the chosen harmonic contract. Preserve truthful coverage metadata. |
| Explicit `omitDegrees` | 1 as an intentional vocabulary restriction | Support explicit subset queries. Resolve contradictions with required degrees before enumeration. |
| Silently intersecting required degrees with style candidates, while separately insisting on root | 5 | Reconsider. A non-root required degree can disappear silently, unlike root. Reject a contradictory request or explicitly select a permitted-omission contract. |
| Shell automatically removes optional degrees | 4 style subset; 1 when explicitly requested as exact vocabulary | Keep as an optional subset, not a universal candidate restriction. |
| Shell immediately returns empty when required-set size <3 | 5, inherited from 4 | Reconsider/remove the context-blind pre-gate. It cannot see accompaniment's later two-tone allowance. |
| Drop-2/drop-3 pin bass to the transformed stack's first degree | 4 as an unrequested style prior; 1 for an explicit bass subset | Keep only as explicit subset behavior. This checks bass degree, not the complete drop-voicing pitch structure. |
| Non-decreasing pitch in thick-to-thin played-string order | 3 in asserted purpose; 5 as an inherited assumption | Remove from core generation. It changes the valid allocation set. No replacement hard rule or automatic ranking penalty is justified here. |
| Stopped-note span greater than 180 mm by default | 3 | Move to downstream physical assessment. A user-supplied threshold remains model policy, not coordinate validity. |
| More than 5 inferred finger groups | 3 | Move downstream. Current hard limit is 5, not 4. |
| Barre open-string/lower-fret blocking and partial-barre minimum-group counting | 3, internal to the hand gate | Move with that gate; these do not independently invalidate a target note allocation. |
| Optional thumb: low E only, reach ≤3 frets, allocation triggered above 4 groups only if removing low E leaves ≤4 | 3 | Move with hand assessment. Production exploration does not enable thumb. |
| Uncovered required degrees exceed remaining strings | 2 | Keep: each remaining string supplies at most one represented degree. |
| Repeated string/fret signature rejected | 2 | Keep for physical allocation identity. Preserve alternative interpretations if degree aliases are introduced. |

The search and its final checks are in [voicingSearch.ts](C:/Projects/Guitar/src/domain/chord/voicingSearch.ts:54), style transforms in [voicingStyles.ts](C:/Projects/Guitar/src/domain/chord/voicingStyles.ts:65), harmonic derivation in [semantics.ts](C:/Projects/Guitar/src/domain/chord/semantics.ts:86), and the nested hand checks in [fretGeometry.ts](C:/Projects/Guitar/src/domain/chord/fretGeometry.ts:174).

Important scope qualifications:

- The live exploration pool requests only `position: 'close'`, standard tuning and frets 0–15. Drop, shell and explicit omission paths remain callable API behavior, but do not currently narrow that live pool. See [exploration.ts](C:/Projects/Guitar/src/domain/chord/exploration.ts:108).
- “Close” does not impose close-position spacing. “Spread” adds no separate placement restriction. The octave-stack ordering is discarded except for determining the drop-route bass degree.
- The style object's `maxHandSpanMm` and `allowThumbOnLowE` fields are inert here; only the search-options fields feed the hand gate.
- There is no generation top-N, ban on duplicate chord tones, close-route root-in-bass requirement, internal-muted-string prohibition, contiguous-string requirement, raw fret-span gate, or surviving barre-order hard rejection. UI pagination follows filtering of the full pool at [exploration.ts](C:/Projects/Guitar/src/domain/chord/exploration.ts:175).
- A broad vocabulary is a superset of narrower routes only when their obligations are compatible. Generic omissions can currently weaken required-degree coverage, so the comment claiming close contains all routes is not a universal API theorem.

## Monotonic pitch: direct falsification

Consider C major **`x x 10 9 8 0`**, tab ordered low E to high E. Its sounding pitches are MIDI **60, 64, 67, 64**: C4, E4, G4, E4. Every note is in the formula, all current required degrees are present, three pitch classes sound, and every fret is within the production bound.

The final open high E is below the preceding B-string G4. The generator rejects that crossing at [voicingSearch.ts](C:/Projects/Guitar/src/domain/chord/voicingSearch.ts:227). Direct execution confirmed absence from production output. The existing hand gate nevertheless returns `playable: true`, three groups, no thumb; stopped-note span is **44.516 mm**.

The hand result isolates monotonicity's effect; it is not proof of human playability. Coordinate and harmonic consistency already establish structural validity. Sorting the notes for display does not recover the excluded string allocation.

Independent checks also found Am7 `x 0 7 0 8 8` and the entirely stopped Em7 `x x 9 9 3 3`. Both pass baseline harmonic and hand gates but cross in pitch. An open-string-only exception would therefore still be incomplete.

The code already computes actual bass/top by MIDI at [descriptor.ts](C:/Projects/Guitar/src/domain/chord/descriptor.ts:209), [exploration.ts](C:/Projects/Guitar/src/domain/chord/exploration.ts:68), and the drop bass check. These inspected operations do not require monotonicity. Tunings with re-entrant pitch order provide another reason not to confuse string order with pitch order, but are not needed for the counterexample.

## Original purposes: evidence, not authority

- `bea6b2b` introduced monotonicity with the engine. Its description claimed coverage and playability were the constraints, while the source also checked pitch ordering. No proof of safe pruning or performance experiment accompanied that introduction. The present test calls monotonicity a “physical constraint.” The classification as a physical proxy follows this evidence; its precise original author intent remains an inference.
- `ea83f1e` introduced the three-PC floor and shell pre-gate, explicitly describing root-plus-third as a double-stop rather than a chord. It replaced a positive minimal-dyad test. This was a change in admission policy, not a newly discovered string-coordinate invariant.
- `3dc7ef8` added accompaniment root omission and two-tone admission but left the shell pre-gate unchanged.
- `6bb7923` widened hand span from 95 to 180 mm, changed the hard inferred-group limit from four to five, added partial-barre decomposition and removed the old barre-order rejection. Historical impossibility labels should therefore not be treated as proofs.

P5 is a separate admission policy: it retains the old hand gate and admits crossings only through its additional group/span conditions. The explicit physical model is another downstream artifact. Neither defines the structural candidate set, and neither was used as the census oracle.

## Recommended boundary

**Explicit instrument + harmonic request → structural generator → physical feasibility → empirical/ranking.**

The request should state the modeled strings/tuning/fret domain, allowed pitch/degree interpretations, required coverage, and any explicit subset predicates. Resolve incompatible requirements before search. The broad generator emits compact allocations and factual pitches/coverage, with no claim that a hand can realize them. Physical assessment owns model-dependent admission. Ranking consumes the resulting candidates; its design is outside this review.

Keep distinct string allocations and derive bass/top from sounding pitch. Use exact per-string domains, required-degree capacity pruning, and unique allocation identity. A suffix union of reachable degrees can safely reject a branch when some obligation is unreachable. A necessary matching of uncovered degrees to distinct remaining strings is another sound option under the current representation. Neither optimization is needed to justify removing an invalid restriction.

Time budgets, beam limits, arbitrary candidate caps, and rank-based early retention are not category 2. If execution is interrupted, expose an incomplete result with continuation rather than claiming complete enumeration. A complete stream can remain bounded in working memory without changing the mathematical set.

Integration must respect the new boundary: [voicingSearch.ts](C:/Projects/Guitar/src/domain/chord/voicingSearch.ts:191) currently sets `playable: true`; [exploration.ts](C:/Projects/Guitar/src/domain/chord/exploration.ts:82) repeats the hand checker and throws on rejection; the ranker documents physical acceptance as an input invariant at [deductiveRanking.ts](C:/Projects/Guitar/src/domain/chord/deductiveRanking.ts:20). A structural candidate needs its own unassessed status/type and must pass through the physical stage before the existing accepted-candidate adapters. Changing only one generator `if` would not complete that separation.

## Candidate-space and cost results

The census covers **20 registry chords × 12 roots × 2 contexts = 480 requests**, all at standard tuning and frets 0–15. Exact production-signature parity passed for **480/480** requests. The table sums candidate counts across requests: it is not a globally deduplicated collection, and standalone/accompaniment naturally overlap.

| Monotonic gate | Existing hand gate | Candidate total | Relative to production |
|---|---|---:|---:|
| On | On | 1,647,041 | 1.00× |
| Off | On | 2,813,420 | 1.71× |
| On | Off | 4,400,294 | 2.67× |
| Off | Off | 14,152,934 | 8.59× |

Removing monotonicity alone adds **1,166,379** request-level candidates that even the old hand gate accepts. The two gates interact strongly; their ratios must not be multiplied. With both removed, **12,505,893** additional candidates reach the downstream boundary under unchanged harmonic policy. This does not mean those additional shapes are physically feasible.

| Context | Production | No monotonicity; old hand retained | Neither gate | Neither / production |
|---|---:|---:|---:|---:|
| Standalone | 561,216 | 997,891 | 5,182,774 | 9.23× |
| Accompaniment | 1,085,825 | 1,815,529 | 8,970,160 | 8.26× |

Per request, removing monotonicity with hand unchanged ranges from **1.00× to 2.83×**; removing both ranges from **2.71× to 16.79×**. C-major standalone goes from **2,340 → 3,460 → 13,331**, where the middle count removes monotonicity and the last removes both gates. The largest resulting harmonic pool is **147,154** candidates, attained by C dominant-11 and G dominant-13 in accompaniment. The largest baseline pool is **13,348**, for G dominant-13 accompaniment.

For allowed pitch-class set A and fret domain F, the raw assignment count is exactly

`product over strings s of (1 + count of frets f in F whose pitch class (tuning[s]+f) belongs to A)`.

The 1 represents muting. This count precedes nonempty and harmonic-coverage rejection. At this baseline it is at most **729,000 per request**; C-major has **22,500**, C dominant-7 **86,436**. More strings increase the exponent; increasing fret range or allowed vocabulary increases each factor. The result is finite, but broad materialized pools are large enough to require deliberate memory/transport handling.

The isolated counter visited **44,874,945 recursion nodes** across all requests, including **24,605,041 capacity-pruned nodes**, and evaluated the existing hand gate **14,152,934 times**. Its counting work took about **46.50 seconds**, production generation used for parity about **23.22 seconds**, and the full run about **70.56 seconds**, on this local Node v22.16.0 process. These are single-run diagnostics, not performance guarantees.

The monotonic gate currently prunes early in recursion. The hand gate rejects only after a complete harmonically acceptable assignment, so moving it does not by itself expand the existing recursive search tree; it changes how many results are constructed. Removing the monotonic gate increases traversal and potential leaf checks. Removing hand evaluation from the generator can save generator work but transfers evaluation to the next stage. Materializing descriptors, retaining arrays, and worker serialization of the broad pool can increase cost substantially. A compact stream feeding physical assessment avoids requiring every broad candidate to become a fully materialized UI object. Peak memory, cancellation behavior and browser latency were not measured.

The counter also found **14,259,302** placements satisfying current required coverage before the distinct-PC floor, **106,368** more than the harmonic total. This is a limited floor diagnostic; it leaves root and all other required-degree defaults intact. The 8.59× figure therefore describes gate removal under **current harmonic admission**, not the size of a future pool after revising all category-4 policies. Broader root/omission semantics need their own explicit definition before claiming a final size.

## Isolated experiment and reproducibility

One experiment is warranted and was run: an offline **2×2 census of monotonicity and the existing hand gate**, with harmonic policy, tuning, fret domain and all other live-route conditions fixed. It does not implement P5, redesign a hand model, alter ranking, or connect broader output to the UI.

The harness independently enumerates each string's allowed fret domain, with the existing sound capacity prune. It checks every registry formula has unique pitch classes, so its degree bitmask and physical-signature identity are valid for this baseline. For every chord/root/context request it asserts **exact physical-signature set equality**, not only count equality, between its monotonic-plus-hand cell and production. Other cells measure the set admitted when either or both gates are absent. `identityOnly` separately counts coverage-valid placements before the distinct-PC floor, without relaxing required-degree defaults.

Files: [audit.ts](C:/Projects/Guitar/scripts/generator-scope/audit.ts), [run.cjs](C:/Projects/Guitar/scripts/generator-scope/run.cjs), and [census.json](C:/Projects/Guitar/docs/research/generator-scope/census.json). The output records baseline label, source hashes, configuration and per-request counts/timings. Before reproducing, verify `git rev-parse HEAD` matches the baseline and `git diff --exit-code a79007f0919b5b7f34657caa99f6d30a787c2a49 -- src` succeeds, then run `node scripts/generator-scope/run.cjs` from the repository. The loader transpiles in process because the environment rejected the usual tsx/esbuild subprocess; it does not type-check or alter production modules on disk.

Counts establish scope differences. Single-run harness and production timings are diagnostic only: the harness avoids full descriptors but evaluates the old hand gate across the widest harmonic set. They are not an apples-to-apples benchmark or a prediction of UI latency. No production behavior should change on timing evidence alone.
