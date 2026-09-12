# Chord selection and exploration

Decision updated 2026-09-12. Implementation is local; deployment and user-study approval are separate decisions.

## Product contract

A player should be able to choose a first voicing, hear its actual sounding pitches, understand what changes between alternatives, and find candidates that meet their conditions. A short recommendation list must not define the searchable universe.

The selected voicing and its playback are the first task. One ranked list starts with six candidates and reveals twelve more at a time. Position, bass and top conditions sit beside that list; additional conditions open in one step. Active conditions remain visible as removable chips. Filters act on the full pool and never replace the selected shape.

The search scope is six-string standard tuning, frets 0–15, the current hand model and non-decreasing pitches from thick to thin strings. It is not a claim to cover every human fingering. Stopped fret position excludes open strings and is independent of sounding MIDI register. Open-string usage has its own filter.

Independent-chord context retains the existing root and minimum-tone rules. Accompaniment context permits root omission and two distinct tones, while retaining every required non-root degree, including defining alterations and extensions. This is a realization policy, not a change to the chord formula or an assertion that a partial shape uniquely identifies that chord. Root omission is shown explicitly. Raw formula coverage, context acceptance and hand-model estimates remain distinguishable.

## Boundaries

| Boundary | Responsibility |
| --- | --- |
| Generation | Produce the uncapped candidate pool for the request, instrument scope and playing context. No popularity or UI buckets. |
| Facts | Physical identity from tuning and string/fret/mute geometry; actual MIDI pitches and degrees; omissions, bass/top, open strings and stopped position. |
| Assessment | Estimated finger groups and reach; shapes needing more than four inferred groups or exceeding the comfort reference are explicitly uncertain. No claim of universal playability. |
| Ranking | Keep the existing baseline weights. Physical identity provides a deterministic tie breaker independent of generator routes. |
| Search/surface | Apply all conditions to the full pool, then limit the displayed prefix. Offline comparison policies never remove candidates from this pool. |
| Workspace/UI | Track request, filters and selection; show loading, unsupported requests, empty matches and failures separately. A worker handles generation; superseded workers are terminated. |
| Audio | Play the selected shape's sounding pitches, preserving octaves and doubling. Load audio only after interaction; display failures and allow retry. |

`domain/chord/exploration.ts` owns the pool, facts, query and playback-note contracts. React adapters own worker lifecycle and audio effects. `explorationPolicies.ts` supplies offline comparison policies; it is not imported into the live exploration UI. The former category/quota surface lives only in `scripts/reference/legacyChordSurface.ts` as an offline comparison. It has no product import or domain barrel export.

The UI uses the existing preference function, including its low-position, root-bass and fullness preferences. Facts may be deductively calculated; the preference weights are product choices, not musical truths. Generation and assessment improvements do not silently authorize weight changes.

## Interaction and design contract

Keep the original shared application header and mode tabs above the CHORD body. Reuse SelectPill, KeyButton and TogglePill, with optional comfortable sizing for CHORD rather than overriding their visual styles. Preserve their default appearance in other modes. Action controls use the existing muted, rounded visual treatment.

The root is one KeyButton. Pressing it expands the unchanged Scale-mode CircleOfFifths near the button. The circle stays stationary: hold, point at a key and release to confirm. A short click keeps it open for direct selection or arrow keys and Enter; Escape cancels. A preview does not regenerate candidates. The borrowed circle retains the scale display context, but selecting a key changes only the chord root, never its quality or ranking policy. The helper text makes that distinction explicit. There is no separate Circle button or top alignment marker.

Position uses two range handles for stopped-fret bounds (0 through 15), with one-fret keyboard steps. Handles cannot cross. Open strings are a separate condition. Bass, top, string count, open strings, root and coverage use the shared SelectPill with keyboard selection. Rootless conditions offer a direct focus link to the accompaniment toggle; they never enable it implicitly.

Details are shown once for the selected voicing. Cards show geometry, position, density, bass/top and concise omissions or uncertainty. Playing a card selects it; selecting alone does not play. Full fretboard is an inline desktop expansion or a mobile dialog; its labels use the resolved degrees including extensions. Root or quality changes reset filters and pagination. Context changes retain filters and any still-available selected physical shape, with a notice if the old selection becomes unavailable.

Do not equate loading audio with playback duration. All primary controls have a 44px minimum hit height (48px for the main play action) and visible keyboard focus. The mobile page must expose the selected shape and playback in the first viewport and must not clip mode tabs. Visual disclosure must preserve candidate identity and search state.

User task validation with five guitar players remains pending: first playback, alternative comparison, position/bass/top discovery and understanding rootless accompaniment. Automated checks do not establish human usability.

## Ranking and coverage audit

Run `npm run audit:chord` (or add `-- --details` for per-query diagnostics). The audit is read-only and prints results to stdout. It operates on generated candidates and does not infer the deployed revision. Capture the checked-out diff alongside the printed base revision when archiving a run.

The baseline is frozen independently in `scripts/chord-baseline.ts`. A position-emphasis profile is kept only as a sensitivity comparator. The audit checks all 20 registry qualities × 12 roots, compares current and frozen scores/order on identical candidates, and verifies that the unrestricted search preserves the union of legacy style routes and all legacy surface choices.

Observed local run on base revision `5ea2d0e` plus this implementation:

- 23 current weights equal the frozen baseline; 0 of 240 queries change score/order against it.
- 561,216 standalone candidates across 240 queries; 0 pool or legacy-reachability failures.
- The position-emphasis comparator changes the ordered top six in 233 of 240 queries. This is a difference measure, not a quality gain.
- Generation + ranking: p50 61 ms, p95 121 ms, max 199 ms on this machine. Worker transport, rendering and other machines are outside this timing.
- Local decision: **keep frozen baseline**. Deployment revision remains unaudited.

If current weights or ranking behavior differ, the audit exits nonzero and requests a maintain/correct/revert decision. Inspect production call sites and overrides as well as constants. Compare an actually adopted profile against the frozen control on identical pools and surface budgets. Keep generator correctness changes separate from preference changes during any revert.

| Outcome | Required action |
| --- | --- |
| Benefit and major-slice non-regression demonstrated | Keep the adopted profile. |
| Useful benefit with a localized failure | Develop a correction and evaluate on independent data. |
| Frozen criteria fail, with no validated correction | Revert only the adopted preference changes. |
| Insufficient provenance or evaluation | Mark decision pending; do not describe current behavior as validated. |

## Validation and next gate

Implemented regressions cover legacy-pool reachability, composed filters, empty results, pagination, rootless guide-tone semantics, altered/extended required tones, stable shape identity, sounding-pitch playback, explicit UI states and selection outside the initial list. The old surface tests remain with the offline comparator. Product regressions assert factual presentation and a shared default/exploration path.

`npm run test:chord:browser` exercises the built app on localhost:3003 against a dedicated headless Chrome debugging instance on localhost:9333. Start that browser with a temporary profile, never a personal profile. It checks the real worker, pool identity, pagination, selected-shape preservation, accompaniment, playback selection, the anchored root picker, full-neck access and control bounds at five viewport widths. Screenshots are saved under `.next/`. Human listening and preference evaluation remain separate.

The audit compares baseline top-K, nearest-position selection (target fret 12) and a bounded diversity hypothesis at K=6 and K=12. The diversity hypothesis retains the first choice and greedily selects differing bass/top pitches, degrees, density and omissions only within the best 2K baseline candidates. This quality bound can itself restrict high-position access. No policy is promoted by these geometry diagnostics.

Initial per-query means:

| Policy | K | Distinct bass pitches | Distinct top pitches | High-position choices (minimum stopped fret ≥11) |
| --- | ---: | ---: | ---: | ---: |
| Baseline | 6 | 1.27 | 3.12 | 0.25 |
| Near fret 12 | 6 | 2.04 | 2.42 | 2.67 |
| Diversity hypothesis | 6 | 1.57 | 4.17 | 0.34 |
| Baseline | 12 | 1.57 | 4.30 | 0.62 |
| Near fret 12 | 12 | 2.65 | 3.22 | 4.43 |
| Diversity hypothesis | 12 | 2.30 | 5.54 | 0.89 |

These do not measure physical ease or user success. Before promoting an alternative selection policy or changing weights, fix the evaluation tasks, acceptance thresholds and sample size. Test first-choice selection, a requested position, changing bass/top, and accompaniment omissions; measure success, time, actions and correct understanding. Require exploration improvement with non-inferior first-choice performance across chord/root, stopped position, actual register and texture. Use separate examples for selecting and validating a correction.

Production deployment, human playability evaluation and progression-context validation remain separate work.
