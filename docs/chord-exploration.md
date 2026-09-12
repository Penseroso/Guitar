# Chord selection and exploration

Decision updated 2026-09-12. The CHORD UI revision follows an audit of `3dc7ef8`. Implementation is local; final regression checks, deployment and user-study approval are separate decisions.

## Product contract

A player should be able to choose a first voicing, hear its actual sounding pitches, understand what changes between alternatives, and find candidates that meet their conditions. A short recommendation list must not define the searchable universe.

The selected voicing and its playback are the first task. One ranked candidate pool supports both the starting choices and further exploration. Filters act on the full pool and never replace the selected shape. Applied conditions remain visible and removable even when their controls are closed. Display budgets, card layouts and disclosure placement are UI decisions, not constraints on generation or ranking.

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

## Interaction and design decisions

This revision is limited to CHORD. The shared application header, mode navigation and page shell remain in place. SCALE and PROG retain their layouts and control behavior. CHORD uses the app's dark surfaces, muted borders, rounded controls and clear selected states. Reusing the visual language does not require using a dropdown for every choice. CHORD-specific radio choices and action styles are scoped to its workspace. The shared circle has an opt-in root-only presentation; its default Scale presentation remains unchanged.

The root has one trigger with an expanded state and a linked popup. Opening it shows a stationary circle containing twelve roots near the trigger. It carries no scale-mode context, relative-minor ring or chord-quality meaning. A normal click or tap opens the picker and another selects a root; holding and sliding is an optional shortcut. The manual popover stays open through the opening touch gesture. Arrow keys and Home/End preview roots; Enter or Space confirms. Escape, Close and outside interaction dismiss it; focus returns appropriately without trapping normal Tab navigation. Previewing does not start a worker. Committing changes the root only, and the popup remains usable after scroll or resize.

Chord quality is chosen from visible radio choices. Basic, 6 / 7 and Extended tabs browse families without changing the active chord or starting a search. The current quality name remains visible when browsing another family. Choosing a quality radio commits the request. Family tabs and quality radios have separate keyboard and selected-state semantics. Playing context is explained inside Filters as **Include accompaniment shapes**: it adds rootless and two-note voicings for playing with a bass player or other instruments. Standalone remains the default. An active accompaniment chip stays visible when Filters is closed and can turn the option off.

The fret-range slider is always visible above the results. Its two handles constrain stopped frets from 0 through 15; they cannot cross and remain adjustable when they coincide. Pointer dragging, one-fret arrow steps, Home/End and five-fret Page Up/Down are supported. Open strings have their own condition. One Filters disclosure reveals discrete selection rails for Bass, Top, sounding strings, open strings, root inclusion and chord-tone coverage. Each rail supports direct tap/click, native radio keyboard navigation and horizontal drag. Dragging previews a choice; release commits, and cancellation preserves the previous filter. Vertical touch movement continues to scroll the page. Long note lists scroll within their rail and keep the selected choice visible. View results closes the disclosure and moves focus to the result count. Non-position conditions have removable chips; the slider itself continues to show the applied fret range.

Sounding strings is ordered **2 · 3 · 4 · 5 · 6 · Any**, with a small visual separation before Any. Choosing Any expands the highlight across all counts and briefly sweeps a soft light through it, then settles into a static tint. This means the string-count restriction is removed; all other filters and playing context still apply. It does not enable accompaniment. Reduced-motion preferences disable the sweep and movement transitions. The rails retain discrete radio semantics rather than exposing Any as a numeric slider value.

Bass and Top show note name plus degree in filter choices, active summaries, the selected voicing and candidate cards: for example, `B♭ · ♭7` or `D · 9` in C. Note spelling follows the chosen root letter and chord degree, preserving extensions and necessary double accidentals; F♯ major's seventh is `E♯ · 7`. These are presentation labels. Internal degrees such as `b7` and `9`, filter values, pitch facts and candidate identities are unchanged. Root inclusion is named separately from the root selector, and coverage choices explain whether all formula tones or omissions are required.

The selected shape, chord name, Bass/Top and main Play action form the first information group. Details, Notes/Intervals and Full fretboard are secondary controls. Candidate cards show geometry, position, sounding-string count, Bass/Top, omissions and uncertainty without repeating the position heading. Selection is shown in text as well as styling. A separate compact Play action selects and plays that candidate; selecting alone does not play. Geometry descriptions give diagrams and card actions meaningful accessible names. Details disclose factual pitches, formula coverage and model assumptions for the selected voicing.

Full fretboard opens a content-height modal on desktop and mobile. The neck scrolls horizontally to the selected stopped frets; open strings are also summarized in text so their information remains available when the nut is off-screen. The modal retains selected-shape playback, resolved degree labels including extensions, keyboard scrolling, Escape/Close and trigger focus restoration. Opening or closing it does not change the pool, filters or selection.

Root or quality changes reset filters and pagination. Context changes retain filters and any still-available selected physical shape, with a notice if that selection becomes unavailable. Clear filters and Reset conditions change conditions only; they do not reset the playing context. If root omission or two-note conditions yield no standalone matches, an explicit Enable accompaniment action explains and changes the context. No filter implicitly enables accompaniment or relaxes another condition.

Audio loads only after a play request. Only the latest request may play or update its loading/error state; unmount cancels pending work. Import/start failures expose a retry through Play. Loading indicates preparation, not playback duration. Controls need visible keyboard focus and usable hit areas in both dimensions, including actual circle targets and slider handles, rather than only a tall bounding box.

The current display starts with six candidates and adds twelve on Show more. Desktop pairs the selected shape with the browser; mobile places the selected shape before the browser. These budgets and layouts may change independently of the domain contracts. The first-screen design target is access to the selected shape and playback in ordinary mobile portrait sizes. At smaller heights or enlarged text, readable, reachable content and unclipped mode navigation take priority over preserving a fixed pixel arrangement.

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

The test suite distinguishes contracts from an earlier screen design:

| Classification | Treatment |
| --- | --- |
| Product functionality, state and accessibility | Preserve full-pool filtering, candidate identity, pagination reachability, selection retention, explicit context, distinct loading/error/empty states, actual-note playback, keyboard operation, focus recovery and control reachability. |
| Implementation-specific layout and style | Replace exact RGB values, SVG viewBox/transform counts, popup pixel offsets, fixed card counts, exact helper text and inline-versus-modal assumptions with acceptance checks for the chosen interaction and readable responsive layout. |
| Legacy constraints | Remove UI tests that prohibit old heading strings or count pressed controls as a proxy for architecture. Keep old category/quota tests only with the offline comparator; they do not prescribe live CHORD categories or card quotas. |

Domain regressions and the frozen-weight audit remain separate protection for pool reachability, composed conditions, rootless guide-tone semantics, altered/extended required tones, physical identity and sounding pitches. UI label tests check all registry qualities across twelve roots without changing ASCII degree values. Audio coordinator tests inspect actual engine arguments and state callbacks for out-of-order imports/starts, cancellation, failures and retry. They do not infer audible success from the absence of an alert.

`npm run test:chord:browser` targets the built app on localhost:3003 and a dedicated headless Chrome debugging instance on localhost:9333. Start that browser with a temporary profile, never a personal profile. Acceptance uses real pointer, touch and keyboard input for root opening/selection, family browsing versus quality commitment, fret adjustment, filtering, card selection/playback and modal access. It checks meaningful state and candidate IDs rather than old copy or layout selectors. Include short mobile viewports, desktop, enlarged text/reflow, open disclosures and popups, reachable close/actions, and full-fretboard scrolling. Screenshots under `.next/` support visual review; their creation alone does not prove usability or visual consistency.

Validation on 2026-09-12, base `3dc7ef8` plus this UI working tree:

- 33 test files / 265 tests passed; ESLint and the production build passed.
- The current-source audit checked 240 queries and 561,216 candidates with no coverage failures, no changed ranking queries and no differences in the 23 frozen weights. Decision: keep the baseline. Generation/ranking p50 was 55 ms, p95 111 ms, maximum 164 ms on this machine.
- Chromium acceptance passed against the production build at 320×568, 390×667, 390×844, 768×900, 1024×900 and 1440×900, plus 720×450 reflow. It covered family browsing, direct choices, composed filters/context, physical selection, playback selection, overlapping slider handles, root tap/keyboard/hold, high stopped frets with open strings, worker failure/retry and cancellation. There were no browser exceptions or page overflow. The selected Play action ended at y=672 in the 390×844 viewport; smaller heights require scrolling.
- Native dialog checks prevent background controls receiving focus and verify Escape/trigger recovery. Browser chrome may receive focus during Tab traversal; this is not a background-page focus escape. Touch-drag acceptance uses a timed movement trajectory rather than a single instantaneous jump.
- Audio engine arguments and race/error handling are covered by unit tests; browser activation without an error is not a listening test. Screenshots were visually inspected for CHORD and the existing SCALE/PROG surfaces.

Local implementation/regression gate: **GO**. Release claims of improved human usability or playability remain **pending** until the five-player task validation and listening checks are completed. Automated checks, human listening and preference evaluation are distinct evidence.

Follow-up on base `a133ff5`: accompaniment moved into Filters and the six detailed controls became selection rails. All 265 unit tests, lint and production build passed. Production Chromium acceptance also passed, including timed touch-drag preview/commit, cancellation, keyboard access to terminal Any, reduced-motion behavior, accompaniment switching and Clear filters preserving context. The same viewport matrix remains free of page overflow; mobile selected playback now ends at y=592. A C13 Top rail was also checked with keyboard navigation through its final `A · 13` choice, which remained visible. Generation, ranking and filter predicates were not changed in this follow-up.

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
