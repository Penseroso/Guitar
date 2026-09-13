# Product Policy v2.1 integration

Implementation baseline: `32f9d3f8a71dc0d2a5f18520bfad738e67ba26c0` (Stage 9). Baseline inspection found no tracked/staged changes or incomplete production edits. Existing policy/research files were preserved. No research, acquisition, fitting, history reset or deployment occurred.

Policy lock: [product-policy-v2.md](../architecture/product-policy-v2.md), commit `e25cc92`. Atomic implementation: `00dc489`. This report supplements, and does not rewrite, the [Stage-9 readiness evidence](engine-readiness.md).

## 1. Final policy and version identity

`product-policy-v2.1`, `physical-demand-policy-v1`, `demand-geometry-um-v1`, `practical-vocabulary-v1`, `practical-exact-translation-v1`, `recommended-surface-v2`, `surface-request-v2`, `surface-cursor-v2`, `guitar-engine/2`, `engine-worker-v2`.

Unchanged: `structural-v1`, `identity-v1`, allocation identity, `physical-screen-v1`, `geometry-um-v1`, `classic-v1`, `legacy-rank-features-v1`, `rank-int-v1`. No product tuning pass has been used.

## 2. Independent Layer-2 output

The existing Physical assessment still supplies PASS/UNCERTAIN/REJECT semantics, reason codes, evidence and original stopped-wire span. Production certificate registry remains empty. The separate demand record contains:

```
version, geometryVersion,
J, T, G, G1, Nstop, K, U, Uop, tier, reasons,
assumptions { scaleLengthUm, nutSpacingUm:35000,
              bridgeSpacingHalfUm:104775, cells:'full',
              contacts:'partial-cover-v1' }
```

J/T are integer micrometres. Exact pinned-table/full-cell/taper equations and G/G1 barriers are in the policy lock. Compact remains `!Uop && J<=55000 && T<=42000 && G<=4 && G1<=4`; extended remains supported/noncompact `J<=110000 && T<=50000 && G<=5`; remaining supported cases are wide-or-complex; Uop is unsupported. `U` means compact only. Status does not enter the tier calculation.

All geometry products and signed interval arithmetic use BigInt before multiplication/division. Precomputed final pair T values use the identity `R(max(gaps)) = max(R(gaps))` for monotone half-up rounding. No coordinate/intermediate is rounded at an additional step. One retained geometry table uses 202,612 typed-array bytes (37² J entries and 222² T entries), independent of request history; live request projectors retain their own compatible table. This storage is separate from the unchanged 32-MiB packed-row accounting and remains within the 64-MiB engine budget for the measured runtime scope.

## 3. Independent Layer-3 contract and production data

Input is structural/interpretation metadata and six high-to-low states. Output is `{version, translationVersion, V, match:null|{id,kind,placement}}`. It reads no Physical profile, status, demand threshold or score. Scope is standard six-single-string tuning, implicit capo0, modeled frets0..15 with full0..15 domains, standalone identity, no explicit slash, supported20 qualities/12 roots. Outside scope V=false.

The production manifest contains only abstract quality-specific offsets/mutes, anchors/bounds, exact A/C restrictions, exact open forms and identifiers/versions. B uses root=(anchor+p)%12 and p=1..15-max(offset). A admits only enumerated root/position pairs; C is the exact F-major exception. Open forms are exact, never transposed. No source assets, prose, audio, finger annotations, URLs, branding or root-by-root observation database enters the product bundle.

The frozen proposal JSON also contains historical `U && V` classification and demand-filter prose. Those proposal-only policy fields are deliberately excluded from extraction: the user's final v2.1 lock supersedes them with the explicit P/U/V composition below. The abstract template data is unchanged and the frozen proposal is not rewritten. No implementation contradiction required a new policy decision.

Observed/extrapolated distinctions remain in frozen research validation sidecars. Runtime vocabulary membership makes neither claim. The optional rights-cleared reference namespace is not shipped by this implementation; it has no score/tie/eligibility/order effect and no primary card badge. DadaGP runtime remains disabled, with zero score, eligibility and tie-break contribution.

## 4. Exact late composition

M means a current Physical survivor satisfying explicit ordinary filters; P means PASS; O means Uop. With independent U and V:

```
recommendedRepresentative = M && V && !O && (P || U)
recommendedFallback       = M && !V && U
allOnly                   = M && !recommendedRepresentative
                              && !recommendedFallback
```

Only `recommendedSurface.ts` combines these outputs; it imports their type contracts only. L2/L3/score import guards and the existing live legacy-boundary guard pass.

## 5. Surface, order and access behavior

Recommended is classic-v1(all representatives), then classic-v1(all fallbacks). There is no bonus, frequency coefficient, anchor, quota or runtime backfill. All=M, retaining exact classic or explicit near-position order. Empty Recommended remains empty, with an All action. Bare view-v1 session callers explicitly retain Stage-9 All semantics; live UI defaults to a separate Recommended wrapper.

Cursor v2 carries complete surface/version context and the last partition plus original rank key. Cross-surface/changed-version cursors restart explicitly. Partition bytes occupy previously reserved packed-row storage without changing row budgets. An All-first cache lazily computes partition metadata when Recommended is requested; a Recommended-first cache preserves every row for All. Overflow discards the entire cache and uses exact replay. Selection/direct lookup/audio remain independent of membership. The only new primary UI concepts are Recommended and All voicings; no demand-tier filter or template/provenance terminology was added.

## 6. Vocabulary validation

All 1,510 observations were checked: 1,454 map, and all56 third-omitting ninth observations remain structural exclusions. The exact inventory is109 B,2 A,1 C and99 open forms. All77 product extrapolations are disjoint from the1,453 unique mapped observed allocations. Their union is exactly1,530 unique vocabulary matches. Exhaustive probes across all240 queries, placements0..16 and translated-open counterexamples matched that expected set with no cross-quality, A/C or open-translation leakage. Out-of-scope requests return V=false.

The explicit offline command `npx tsx scripts/engine-integration/product-frozen-validation.ts` reads the existing frozen files and writes [new verification evidence](product-frozen-validation.json); it does not edit them. Full research-dependent validation requires those supplied artifacts. Ordinary unit tests/builds and the shipping matcher do not depend on untracked research inputs.

## 7. L2 × L3 conflict results

| Frozen mapped observations | Count | Result |
|---|---:|---|
| U-pass | 1,292 | Independent compact admission |
| U-fail + Physical PASS | 141 | Representative, because no Uop applies |
| U-fail + Physical UNCERTAIN | 21 | All only |

All J/T/G/G1/Nstop/K/U/Uop/tier values matched the frozen calculations. No thresholds changed. Of77 extrapolations,73 pass U and4 are PASS beyond compact; all77 are representatives. After the one observed duplicate, the production vocabulary yields1,509 eligible unique representatives and21 All-only matches.

Recommended+UNCERTAIN remains a valid contract combination, demonstrated with a supported profile using a lower warning envelope. Under the480 standard default profiles, the measured Recommended set happens to contain only PASS candidates; this observation is not a new status gate.

## 8–9. Availability gates

[Complete policy census](product-policy-census.json):

| Gate | Required | Actual | Status |
|---|---:|---:|---|
| Standalone queries with a representative | 240/240 | 240/240 | PASS |
| Standard requests with Recommended results | >=432/480 | 480/480 | PASS |
| Minimum Recommended candidates per request | No quota | 50 | Observed |

**Empty Recommended requests: none.** No denominator reduction, incomplete-as-exact result, fallback from All or policy adjustment was used.

Across the480 request/allocation domains:1,509 representatives,290,098 fallbacks and15,652,072 All-only entries. Standalone Recommended contains98,752 entries; accompaniment contains192,855 independent U-based fallbacks, with V=false as required.

## 10–11. Before/after access and composition

Before means Stage-9 complete-All order; after means the new Recommended order. All itself is unchanged. Position-high here means maximum stopped fret13..15; the machine census also records minimum-stopped-position bands. “Non-root bass” is a factual bass/root comparison, including rootless allocations, not an asserted inversion taxonomy. Reduced means <=4 sounding strings.

| Slice | Before first6 | Recommended first6 | Before top18 | Recommended top18 |
|---|---:|---:|---:|---:|
| Representative vocabulary | 197 | 1,121 | 371 | 1,509 |
| Fallback partition | 2,418 | 1,759 | 6,788 | 7,131 |
| Outside Recommended | 265 | 0 | 1,481 | 0 |
| High position | 98 | 256 | 538 | 703 |
| Non-root bass | 12 | 212 | 145 | 934 |
| Reduced strings | 845 | 1,251 | 2,892 | 3,791 |
| Open-string allocations | 1,831 | 1,236 | 5,305 | 4,569 |
| Closed allocations | 1,049 | 1,644 | 3,335 | 4,071 |
| Rootless | 0 | 1 | 0 | 28 |
| Former monotonicity exclusions | 520 | 333 | 1,940 | 1,571 |
| Former hand-control exclusions | 18 | 0 | 136 | 0 |
| Former formula-policy exclusions | 90 | 104 | 262 | 285 |
| Physical UNCERTAIN | 93 | 0 | 793 | 0 |

First choice is retained in272/480 requests (45 standalone,227 accompaniment);208 change. Among the291,607 retained Recommended entries,280,445 move earlier,6,411 later and4,751 keep their All ordinal. These deltas compare two deliberately different surfaces; All-only entries have no fabricated Recommended rank. Per-request top18 states, scores, partitions, All/Recommended ordinals and delta quantiles are recorded in the census, along with quality/context/density/root/open/position slices.

All preserves10,986,229 formerly non-monotonic allocations,4,128,837 rootless allocations and every original hand-gated/formula-expansion region documented by Stage9. Recommended retains99,076 non-monotonic,89,372 rootless,73,579 high-maximum-fret and137,601 reduced-string entries. The policy chooses default visibility; it does not delete or label the remaining candidates unsuitable. These counts are product-distribution diagnostics, not improved human preference.

[Additional access slices](product-access-slices.json) run the unchanged former hand/formula/monotonicity controls offline over both first6/top18 sets and report previous-top18 promotion/demotion/outside-policy counts by quality, context, root, density and old admission region. None of those controls is connected to the live path.

## 12. Conservation proof

Every one of the15,943,679 packed state/score/status records was compared to an extracted, unmodified Stage-9 session. Totals remain583,916 PASS +15,359,763 UNCERTAIN +0 REJECT. All candidate records agree in traversal order; complete sorted record hashes agree in classic and near-position12 order for every480 query. The encoding is reversible six-state identity plus integer score and status, with the fixed standard tuning supplied by each query. Thus ordered IDs and their score/verdict bytes agree, not merely the first page.

Live All top18 agrees with both the historical runtime and frozen census. Live Recommended top18 agrees with an independent complete partition sort. Full Recommended paging with varying sizes, cross-surface cache reuse, forced replay, checkpoint restore, cursor tamper rejection, selection and direct lookup tests pass. Generator, request policy, Physical assessment, classic feature/score arithmetic and ordinary view matching production files are unchanged from Stage9. No candidate caps, old pool fallback, monotonicity gate, hand gate or source-absence penalty was introduced.

## 13. Numerics, browser and performance evidence

[Cross-runtime evidence](product-cross-runtime.json): Node22.16, Chrome152.0.7977.84, Firefox153 and WebKit26.5 produce byte-identical results. The suite includes8,020 demand geometry vectors at scales1/647700/650000/2000000µm, a direct BigInt rational oracle,2,450 tier-boundary combinations, Recommended first6/next12 versus uncached18 for three queries, and the existing25 integrated conformance cases/2,597 rows. Result SHA256: `3e6fc5fd0966ad1a37ade38ecb983aa8020efd350729b9a5951c30b106fc9ead`. The19.5MB diagnostic comparison aggregate is not a production message; each actual worker message remains subject to the1MiB protocol ceiling.

[Release UI](product-release-runtime-ui.json):10 checks each in Chrome, Firefox and WebKit, including default membership, keyboard surface switching, restored order, selection,14-term details, rootless context handling, Escape/focus and390px reflow. [Chrome regression](product-ui-browser.json):31 checks including exact empty states, context invalidation, UNCERTAIN playback, touch/keyboard range controls, page history, dialog focus and bounded transport. Maximum observed functional-test message101,727 bytes, maximum12 cards, no uncaught page exception. Unit presentation tests preserve all warning reasons on Recommended+UNCERTAIN.

[Repeated release performance](product-ui-performance.json) completed all 480 requests × 30 runs (14,400 first pages), plus the widest root of each quality/context × 30 (1,200 next-page, filter and card-selection samples each). Every individual request passed its applicable p95 budget; no groups were skipped. Desktop Chrome, no CPU throttle, production build, DOM actions through the next painted exact selection; instrumentation overhead is included.

| Measurement | Samples | Aggregate p50 | Aggregate p95 | Maximum | Worst fixture p95 / budget |
|---|---:|---:|---:|---:|---:|
| First exact rendered page | 14,400 | 159.0 ms | 560.2 ms | 1,236.7 ms | 1,158.0 / 2,000 ms |
| Next page | 1,200 | 30.4 ms | 80.6 ms | 130.7 ms | 126.0 / 200 ms |
| Filter | 1,200 | 24.1 ms | 77.4 ms | 123.3 ms | 121.1 / 200 ms |
| Materialized-card selection | 1,200 | 11.0 ms | 15.4 ms | 32.8 ms | Diagnostic; separate from lookup |

Maximum UI-run message: 104,905 bytes; maximum cards: 12; maximum accounted packed storage: 10,813,440 bytes. No uncaught page errors or observed main-thread long tasks occurred in the measured windows. The 54.19-minute run used build `3fHUumjimZ00cc3RW8VQP`, prepared at implementation commit `00dc489`. After that run began, the only production edit was Details copy clarifying that classic-v1 is the base preference and Recommended uses a separate policy. No engine/worker/order code changed. The final build passed the three-browser functional suite and the separate final UI census described below; the 30-repeat evidence is explicitly scoped to its recorded build, not relabeled as a new-build measurement.

Main-page post-GC JS used heap was 4,591,032 bytes initially, 5,921,140 after 100 requests and 5,906,628 after 14,400 (maximum 6,095,684). Backing storage was 1,262,631 initially and 1,265,023 at the end. **Embedder heap grew from 2,574,424 to 10,098,808 bytes** (2,808,376 at 100 requests). This is not flat total memory. Its cause and engine/application/browser attribution remain unresolved; the isolated worker result does not explain away this growth.

[Actual worker diagnostics](product-worker-cost.json) passed all protocol/lifecycle/buffer assertions. Thirty distinct direct lookups each for C major standalone and C dominant-11 accompaniment measured p95 0.90/0.70 ms, including main-thread production validation. The widest complete pool retained 8,650,752 packed bytes; post-GC worker JS used heap was 874,972 bytes and backing storage 9,024,581 bytes. After 100 completed query/context/view changes and returning to the same wide request, backing storage was unchanged and JS used heap was 1,059,800 (+184,828); the isolated harness page grew 55,108 bytes. These are runtime/bundle/harness-inclusive endpoints, not an exhaustive leak proof.

The fret-36 forced-replay request paused truthfully after 10,003.6 ms and 2,164,639 visited structural allocations, with partial/unknown completion and zero retained/accounted row buffers. It was then cancelled; no exact total was fabricated. Post-GC replay worker JS used heap was 792,064 bytes and backing storage 373,849 bytes. Maximum worker-diagnostic message was 249,775 bytes, below 1 MiB. Physical-mobile evidence and complete heap attribution remain unavailable/unresolved.

The [final release UI census](product-ui-census.json) **passed all 480 requests** on build `FMjDGjRhqWxf4MVLwfgcT`. Every request's Recommended count and first-six allocations agreed with the complete offline census, alongside Stage-9 structural/verdict counts. No page errors or observed long tasks occurred. It is a one-run correctness matrix, separate from the 30-repeat performance gate.

## 14. Build and checks

Final complete suite: **642 passed, 34 existing skips, 89 files**. Two research-dependent checks were moved intact into the explicit offline validator, which also passed; the PASS-outside-Recommended presentation fixture was added. Existing research checkout tests remain included in the complete suite. Only the newly generated Stage-9 comparison snapshot is excluded from current unit discovery; its engine was executed separately by the conservation census.

TypeScript `--noEmit --incremental false`: PASS. Final Next production build: PASS. Scoped ESLint (`src scripts/engine-integration --max-warnings 0`): PASS, zero warnings. Script syntax and diff whitespace checks pass. All 31 engine-source hashes recorded by cross-runtime validation still match; the production abstract manifest is byte-identical to a fresh in-memory extraction from the frozen proposal, and all five recorded frozen-validation input hashes match.

One full-suite attempt, run concurrently with typecheck/lint, timed out the existing worker pause/continue test at its 5-second wall-clock limit (6.02 seconds observed). The complete suite rerun without concurrent checks passed unchanged; that test took 4.34 seconds. No production fix, timeout increase, test removal or assertion relaxation was used. This host-load sensitivity remains a test-harness risk.

Repository-wide ESLint remains **FAIL: 357 errors and 9,456 warnings in 58 files**, excluding only the generated `.tmp-policy-baseline` snapshot. There are 271 errors in pre-existing `.research` material and 86 in the supplied frozen Physical/Web study scripts; warnings also include archived generated builds/browser-profile material. None is in the passing product/integration-script scope. Frozen research was neither edited nor excluded to manufacture a clean repository-wide result. See [check summary](product-checks.json).

## 15. Changes, commits and reproduction

- `e25cc92`: coherent Product Policy v2.1 lock before production edits.
- `00dc489`: independent demand/vocabulary modules and abstract manifest, output-only surface composition, bounded partition caching, versioned cursor/protocol, atomic UI default and switch, architecture/numeric/paging/presentation guards.
- The final validation commit contains reproducible scripts, new evidence, this readiness report, the independent test refinements and the Details-only explanation change. Frozen research directories remain preserved in their original untracked state.

Core files: `src/domain/chord/engine/{physicalDemand,demandContract,practicalVocabulary,vocabularyContract,recommendedSurface,surfaceRequest,session,workerProtocol,workerService,packedStore,versions,types}.ts`, abstract `practicalVocabularyData.json`, the existing chord controller/hook/panel/client, and focused tests. Tests cover rather than activate the offline legacy adapters.

Reproduce using the preserved frozen evidence, Node dependencies and installed local browser binaries:

```
npm test
npx tsc --noEmit
npx eslint src scripts/engine-integration --max-warnings 0
npm run build
node scripts/engine-integration/extract-practical-vocabulary.mjs
npx tsx scripts/engine-integration/product-frozen-validation.ts
npx tsx scripts/engine-integration/product-access-slices.ts
node scripts/engine-integration/product-worker-cost.mjs
node scripts/engine-integration/product-runtime-ui.mjs
node scripts/engine-integration/product-ui-browser.mjs
node scripts/engine-integration/product-ui-census.mjs
node scripts/engine-integration/product-ui-performance.mjs
```

The extraction must produce an identical production manifest. For the offline historical comparison, create `.tmp-policy-baseline`, run `git archive 32f9d3f --output=.tmp-policy-baseline/source.tar src`, extract that archive into `.tmp-policy-baseline`, then run `npx tsx scripts/engine-integration/product-policy-census.ts`. This generated historical checkout is not a runtime/build dependency. Cross-runtime: `node scripts/engine-integration/product-cross-runtime.mjs`. Release server: `node node_modules/next/dist/bin/next start --port 3004`. Browser scripts use localhost:3004 and an isolated existing Chrome CDP target at127.0.0.1:9333; Playwright browser binaries use `.tmp-engine-browsers`. No deployment or network research is part of reproduction.

## 16. Remaining engineering gates

Carry forward the concrete Stage-9 gaps: representative physical-mobile performance, repeated Firefox/WebKit latency percentiles, attribution of browser embedder-heap growth, the unexecuted synthetic certificate/optional-extension validation subchecks and unavailable historical source-review files for fresh hash verification. The optional extension and certificate provider are not activated by this policy. Current frozen Physical/Web/DadaGP evidence remains preserved; missing older inputs are not silently reconstructed.

This step does not certify flat total memory, full assistive-technology coverage or real mobile performance from desktop/reflow measurements. Repository-wide research lint debt and the host-load-sensitive worker test are reported separately from the passing production scope. No scientific uncertainty or absence of player trials is a NO-GO reason.

## 17. Product claims

Permitted: selected by the versioned recommendation policy; explicit abstract vocabulary membership internally; descriptive reference geometry; original reason-specific Physical evidence; exact complete All reachability. Recommended+UNCERTAIN and PASS outside Recommended are valid independent combinations.

Prohibited without corresponding human evidence: easy, comfortable, playable, suited to the user's hand, anatomically normal, human validated, improved preference/success probability. This single-family vocabulary also supplies no popularity, canonicality or independent consensus claim. Five-player task checks remain future formative validation, not a rollout gate.

## 18. Decision

**GO for the scoped Product Policy v2.1 implementation:** the frozen rules, layer independence, vocabulary, conflict resolution, availability, conservation, exact numerics and measured desktop latency gates pass. No policy-adjustment pass was used.

| Validation family | Status |
|---|---|
| Policy contract, independence and production-data boundary | PASS |
| Frozen vocabulary, 162 conflicts, 240/480 availability | PASS |
| Full candidate/verdict/All-order conservation | PASS |
| Exact arithmetic and four-runtime determinism | PASS |
| Unit tests, typecheck, build, scoped lint | PASS; prior load-sensitive test timeout recorded |
| Final 480-request UI census and three-browser functional accessibility | PASS for measured scope |
| Repeated desktop Chrome latency, transport and packed-buffer limits | PASS |
| Total heap attribution and representative physical-mobile performance | OPEN — release gate |
| Repeated Firefox/WebKit latency and carried Stage-9 subchecks/source verification | OPEN — release gate |
| Repository-wide lint over preserved research/archive inventory | FAIL; product/integration scope passes |

**NO-GO for unrestricted integration/rollout signoff:** representative physical-mobile measurements, repeated Firefox/WebKit latency, attribution of observed embedder-heap growth and the explicitly carried Stage-9 engineering subchecks/source-verification gaps remain unresolved. This is a concrete engineering evidence limitation, not a scientific-uncertainty or human-validation veto. No deployment was performed.
