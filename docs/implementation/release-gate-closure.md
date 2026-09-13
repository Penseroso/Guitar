# Guitar release gate closure

Release engineering on the frozen implementation. The user's final instruction stops exhaustive WebKit benchmarking and replaces it with bounded characterization and an explicit performance-SLO proposal. Original failed measurements remain evidence. No deployment or Stage 10 cleanup is authorized by this record.

## Frozen source and environment

Starting HEAD: `9e793f1b407fef6da336ae2ca6a948b8143fe528` (`docs: freeze Guitar pre-release baseline`). Accepted implementation: `4187903b3a97c788c870e93bd274bbb3a68f0565`; required ancestors `e25cc9272506aff376ee76e8a15ff02be99f6fd0` and `00dc4895b8e366692c283eed3c16aa2b78ba51b3` remain present. The index/tracked worktree initially contained no partial implementation. The 114 established untracked research files/scripts were preserved.

Production source is unchanged. Its Git tree is `d0186978862058d07de6debb676fa1ccbab8fb02`; the 170-file source SHA-256 is `56067011aa7d5ddf70303e3bf70f91addaa8ef6fdeb21c9fc542c5dcd65eaecf`. Existing release build: `FMjDGjRhqWxf4MVLwfgcT`; 162-asset build SHA-256: `1c1bdd7b892d10c2d91a4ca3b81cb3bde20d019434b284532240b82de60f30aa`. [Build identity](release-build-identity.json) records every asset hash and the exact path/NUL/bytes/NUL digest definition. No rebuild was necessary for offline fixtures/documentation.

Active versions remain `guitar-engine/2`, `engine-worker-v2`, `product-policy-v2.1`, `physical-demand-policy-v1`, `demand-geometry-um-v1`, `practical-vocabulary-v1`, `practical-exact-translation-v1`, `recommended-surface-v2`, `surface-request-v2`, `surface-cursor-v2`, and `classic-v1`. Structural/realization/Physical/geometry/features/numeric versions remain `structural-v1`, `identity-v1`, `physical-screen-v1`, `geometry-um-v1`, `legacy-rank-features-v1`, `rank-int-v1`. Empirical runtime remains disabled; the production certificate registry remains empty.

Host: Windows `10.0.26200`, AMD Ryzen 5 7500F (6 cores/12 logical processors), 34,025,402,368 physical RAM bytes; Node `22.16.0`, Next `16.1.6`, React `19.2.3`, Playwright `1.62.1`. Browsers: Chromium `152.0.7977.84`, Firefox `153.0`, WebKit `26.5`. The existing production build was served locally on port 3004. Desktop viewport: 1440×1000, headless, no CPU emulation. Measurement timestamps are UTC in the linked JSON.

## Release gate matrix

| Engineering item | Classification | Release disposition |
|---|---|---|
| Current production correctness, layer contracts and cross-runtime determinism | PASS | Accepted Stage-9/Product evidence carried forward; new measured requests retain exact census |
| Functional accessibility and truthful uncertainty presentation | PASS | Previously measured scope carried forward; no new claim of universal AT coverage |
| V07 synthetic scoped verifier and empty production registry | PASS | 29-test combined contract suite |
| V22 isolated optional-extension fallback and disabled runtime | PASS | Ordered deterministic rows/ledgers unchanged under every tested fallback |
| Worker stability | PASS | 20 unchanged-timeout serial runs plus six controlled-load runs |
| Observed embedder-heap attribution | PASS | Native empty radio-group retention isolated; application result digest unchanged |
| Chrome historical release latency | PASS | Completed accepted matrix, with its original build scope retained |
| Firefox historical universal latency SLO | FAIL | One next-page p95 miss; performance SLO debt, separate from correctness |
| WebKit historical universal latency SLO | FAIL | Measured overruns retained; bounded follow-up replaces exhaustive completion |
| Completion of the abandoned WebKit 480×30 run | NOT APPLICABLE WITH JUSTIFICATION | Explicitly cancelled by the user; do not resume merely to accumulate violations |
| Physical-device mobile performance | NON-BLOCKING POST-RELEASE / MANUAL VALIDATION DEBT | Unmeasured because no representative physical device is available; no emulation substituted and no validation claimed |
| Exact source-review and available frozen-input rechecks | PASS | Four review/decision hashes, recovered comparisons and available validation inputs match |
| Missing historical Physical provenance as a current release gate | NOT APPLICABLE WITH JUSTIFICATION | User explicitly reclassified it as non-blocking reproducibility debt; its hash is still unverified |
| Research/archive-wide lint as a production gate | NOT APPLICABLE WITH JUSTIFICATION | Existing 357 errors/9,456 warnings are outside the passing product scope; no frozen artifact was edited to hide them |

The previously accepted Stage-9/Product Policy correctness, layer invariants, accessibility and truthful-presentation evidence is carried forward because production source/build semantics did not change. This is not a new claim of complete assistive-technology coverage. Research-wide lint debt remains separately disclosed; no frozen research was changed to manufacture passing checks. Scientific uncertainty and absent human preference/playability/comfort validation are not rollout blockers and do not authorize those claims.

## Browser latency

The retained WebKit dominant-11 accompaniment slice has aggregate p50/p95/max (ms): first **1,751 / 2,468 / 2,809** (300 samples); next **410 / 466 / 482**; filter **417 / 528 / 556**; card selection **41 / 46 / 60** (25 each). Worst first-page request is C, p95 **2,719 ms**. C, D, G and A miss the historical first-page target; C's next-page/filter miss 200 ms. Maximum message **104,843 bytes**, mounted cards **12**, accounted packed storage **10,813,440 bytes**. No recorded correctness error or timeout. [Original partial WebKit measurements](release-performance-webkit.json) remain failed against their original targets.

The bounded WebKit follow-up completed seven fixtures ×30, **210 measured target requests** with next-page/filter/selection, alternating another root only to ensure a fresh worker. Aggregate p50/p95/max (ms): first **408 / 1,950 / 2,314**; next **93 / 296 / 443**; filter **89 / 330 / 440**; card selection **45 / 60 / 66**. Maximum message **104,904 bytes**, mounted cards **12**, accounted packed storage **5,734,400 bytes**. Zero correctness failures/timeouts. [All targeted samples, per-fixture distributions and stage timing](release-webkit-targeted.json).

| Target fixture (30 samples each) | First-page p95 ms | Next-page p95 ms | Filter p95 ms |
|---|---:|---:|---:|
| C major standalone | 358 | 93 | 105 |
| C major accompaniment | 546 | 123 | 117 |
| E minor standalone | 438 | 137 | 146 |
| E minor accompaniment | 364 | 87 | 99 |
| G dominant-7 standalone | 547 | 122 | 89 |
| G dominant-7 accompaniment | 634 | 136 | 131 |
| G dominant-11 standalone | 2,250 | 442 | 378 |

The additional wide standalone case remains bounded below the accompaniment slice's worst values. Its next-page stage p95 is 1 ms dispatch, 381 ms response delivery, 60 ms validation/render/paint; filter stage p95 is 1 / 346 / 47 ms. Response delivery includes worker execution, scheduling, transport and main-thread event delivery, so this locates most elapsed time before the ready render without pretending to isolate worker CPU. Common-quality page/filter p95 stays ≤146 ms; card-selection p95 is ≤62 ms across the seven fixtures. The results show a workload/browser cost difference, not a universal slow UI or runaway computation.

Firefox targeted follow-up: 30 F# dominant-7-flat-9 accompaniment trials with natural GC yielded next-page p50/p95/max **39 / 42 / 42 ms**; 30 with explicit pre-request GC yielded **39 / 41 / 42 ms**. Natural-GC first-page p95 was 561 ms; filter p95 39 ms; card-selection p95 15 ms. Next-page stage p95 values were dispatch **1 ms**, response delivery **30 ms**, validation/render/paint **14 ms** (component percentiles are not additive). Both conditions passed every census assertion with zero errors. This does **not** establish GC as the cause of the older tail, nor reproduce the original long session's history. It establishes that the request is not persistently slow on the unchanged build. The original 212/239 ms samples remain in the release evidence. [Targeted Firefox samples and stage timing](release-latency-diagnostic.json).

Firefox completed all **14,400 first pages** and **1,200 samples each** for next-page, filter and card selection, with zero errors/timeouts or census mismatches. Aggregate p50/p95/max (ms): first **240 / 849 / 2,056**; next **32 / 84 / 239**; filter **29 / 82 / 163**; card selection **13 / 44 / 244**. Worst per-request p95: first **1,991** (C dominant-11 accompaniment), next **212** (F# dominant-7-flat-9 accompaniment), filter **141** (C dominant-11 accompaniment), card selection **216** (F# dominant-7-flat-9 standalone; diagnostic only). Maximum message **104,905 bytes**, mounted cards **12**, accounted packed storage **10,813,440 bytes**. [All Firefox samples](release-performance-firefox.json).

**Firefox historical desktop latency SLO: FAIL.** F# dominant-7-flat-9 accompaniment next-page p95 is **212 ms >200 ms**; the 30 samples include 212 and 239 ms at zero-based repetitions 10 and 24. Aggregate p95 cannot hide that individual request's failure. First-page's worst request passes with only 9 ms margin; its 2,056 ms maximum is retained, while the contractual threshold is p95. The engineering SLO proposal below does not rewrite those original results; no candidate reduction or backfill is introduced.

Method: the runner imports the exact DOM controls and Worker-byte/card instrumentation from `product-ui-performance.mjs`. Firefox completed 480 standard requests ×30 first-page measurements, plus 40 widest quality/context requests ×30 next-page/filter/card-selection measurements. WebKit's exhaustive run was stopped by the user: **300 persisted samples** cover all 12 dominant-11 accompaniment roots ×25, with 25 ancillary samples on its widest root C. Console progress reached 312; the final 12 uncheckpointed raw timings are unavailable and excluded. The saved JSON remains unchanged, `complete:false`; [cancellation record and original file hash](release-webkit-stop.json) distinguish intentional cancellation from a product timeout. Only seven additional representative/worst-case fixtures are measured in the bounded follow-up. Every retained measured result checks the frozen structural/PASS/UNCERTAIN/REJECT census, message size, rendered-card count and buffer bounds. Cards means mounted current-page result cards, including those reachable by scrolling, matching the Chrome methodology; this is not a separate pixel-intersection census. The timer ends after a paint frame with the exact current page, a fresh selected snapshot and enabled Play. It does not measure actual audio onset or infer human playability.

HTTP/module caches are warmed by setup; each root starts a new worker. The Firefox and WebKit matrices run serially. Long memory stress and loaded worker tests run between them. Short read/hash/script checks occurred during Firefox; raw samples, including slow maxima, are retained. No outlier removal or threshold reduction is used. These matrices use natural GC and collect no comparable heap counters; the historical Chrome matrix requested GC every 100 requests. Local Playwright code confirms a separate `page.requestGC()` API, reserved here for an explicitly labeled diagnostic control, not a way to erase a failed natural-GC measurement. Firefox/WebKit unsupported `longtask` entries are **NOT MEASURED**, not zero. Card selection is separate from direct LOOKUP; the accepted Chromium worker diagnostic covers 30 distinct lookups each for C major and C dominant-11 accompaniment.

The **historical** targets are per-request p95 ≤2,000 ms first page and ≤200 ms compact page/filter on desktop; direct lookup ≤100 ms. Failures against them are not retroactively relabeled PASS. The explicit SLO proposal below is separate from Product Policy and preserves those original results. The prior accepted Chrome matrix is reused, not rerun merely to create another copy: first-page aggregate p50/p95/max 159/560.2/1236.7 ms, worst request p95 1158 ms; next-page p95 80.6 ms, worst request 126 ms; filter p95 77.4 ms, worst request 121.1 ms. Its source/build scope and final-build conservation checks remain as recorded in [Product readiness](product-readiness.md).

## Memory attribution

The specific retained object class is Chromium/Blink's **empty native `RadioButtonGroup` and associated group-member hash backing**, retained by the live document's radio-group map. The strong snapshot path is `HTMLDocument → BasicHeapHashMap<AtomicString, RadioButtonGroup> → HashTableBacking → RadioButtonGroup`. The groups have no surviving input members. This is retention evidence, not a conclusion drawn solely from a monotonic heap counter.

The application remounts `ChordExplorationPanel` using its chord/root key (`ClientApp.tsx:408`). `ChoiceGroup` uses React `useId()` for isolated native radio names. Normal remounting removes those inputs, but this Chromium runtime retains empty groups under the old names. In the 1,200-root fixed-quality run, radio groups rose from 12 to 2,412; empty groups rose from 9 to 2,409. Live DOM remained 644–652 nodes, two documents, 335 event listeners and six cards. Main-target JS used heap warmed from 4,964,040 to 6,044,008 bytes and approached a plateau (6,034,044 at 800 changes); backing storage stayed 1,264,461–1,264,468 bytes. Embedder readings varied with GC: 3,125,648 immediately after 1,200 changes versus 2,962,072 after snapshot/idle/repeated GC, from a 2,750,840 baseline.

Controlled standalone experiment: append/remove 4,000 radio inputs on a blank page, changing only unique versus reused group names. Unique names retain 4,000 **empty** groups; the reused name retains one. There is no React, application worker, message channel, observer/listener, cursor/session, selection/details, or audio. The same 4,000-versus-one result occurs when the page completes all churn **before** Runtime/HeapProfiler attachment. Thus application worker/message/history retention and page-debugger attachment are not necessary causes of this native retention. Normal browser-level target control is still used to retrieve the finished page; this is not a claim of an entirely uninstrumented process.

The paired full-workflow controls each completed **1,440 requests (all 480 fixtures ×3)**, including next-page/filter/selection actions. Baseline native groups rose **12 → 4,698**, with empty groups **9 → 4,695**. The name-reuse control stayed **10 → 11**, with empty groups **7 → 8**: a bounded additional group for the expanded control vocabulary. Both runs produced the same observed-result SHA-256, **`5f92d33607995f36fa71643afbd9ab0abcbd6ff313733399081b3c4cd0097e7b`**, over fixtures, verdict counts, current card IDs and selected IDs. Every structural/Physical census check and message/card/buffer bound passed.

After the final snapshot, baseline main-target JS/embedder/backing counters were 5,734,236 / 3,516,216 / 1,265,065 bytes; control counters were 5,745,780 / 2,750,752 / 1,265,091. After idle/repeated GC the embedder readings were 3,915,400 versus 2,748,624. The differing GC-time readings are retained rather than selected to manufacture a flat curve. DOM and listener checkpoints matched between controls. [Baseline matrix](release-memory-baseline-matrix.json) and [name control](release-memory-reuse-radio-names-matrix.json) isolate native group-name retention while exercising the real application lifecycle.

**Memory-attribution gate: PASS.** The observed growing class belongs to the browser's native document cache, triggered by normal app remounts; the blank-page and pre-debugger controls establish that neither React nor retained worker messages are necessary. The original Chrome matrix's approximately 7.5 MB embedder increase is consistent with repeated native empty-group retention, but these controls do not assign every byte of that older run to a reconstructed snapshot. No application-owned DOM, listener, cursor, snapshot or audio leak was demonstrated. Browser-level retention during very long sessions remains a documented runtime risk; attribution is closed under the user's explicit browser/runtime disposition, without claiming flat total memory or shipping the diagnostic control.

The `reuse-radio-names` counterfactual exists only in the diagnostic page injection. On this single-panel fixture, it derives stable radio names from the existing fieldset legends and normalizes them before DOM insertion/across updates. The request universe, workers, callbacks, observers, page/filter/selection actions and production files remain intact. It is not a shipped mitigation or policy change.

Memory quantities are separate: `Runtime.getHeapUsage.usedSize` is the measured main target's JS used heap; backing storage and `embedderHeapUsedSize` are their named counters, not OS process RSS/PSS or total browser memory. Heap-snapshot native self-sizes use different accounting and must not simply be added to those counters. Dedicated workers have separate heaps. The accepted real-worker diagnostic found +184,828 used-heap bytes and **zero backing-storage growth** after 100 query/context/view changes, with the same wide request at both endpoints. It also verified bounded replay and explicit pause/cancel. The new main-page controls do not substitute for worker-memory measurements.

See [retention samples](release-memory-baseline.json), [native controls](release-radio-retention.json), [snapshot class counts and strong paths](release-heap-analysis.json), and the full-matrix controls linked above. Raw snapshots are preserved locally under `.tmp-release-memory/`; their SHA-256 hashes and a reproducer are recorded, while aggregate evidence is reviewable without committing large local profiler files. No claim of universally flat browser/process memory or absence of every possible leak is made.

An initial memory harness attempt timed out because the census interleaves contexts: preparing every row set root B, then measuring B waited for a nonexistent new request. Sorting by quality/context/root corrected the diagnostic. The original failed attempt is retained in the local Stage 10 archive with its hash in the [release evidence retention index](release-evidence-archive.md); no product timeout or semantics change was involved.

## V07 / V22 and worker stability

The isolated [contract fixtures](../../scripts/engine-integration/release-contract-fixtures.test.ts) implement no runtime extension. V07 independently checks an exact finite-integer necessary-condition proof, artifact hash/checker identity, complete realization-domain coverage and justified assumptions. Missing/corrupt/unsound/numerically invalid/narrow-scope or unsupported-operation evidence abstains. All 127 nonempty subsets of the synthetic seven-point domain are checked against an independent witness oracle. A restricted proof cannot exclude an allowed witness outside its coverage. REJECT is a synthetic checker result only; the frozen production provider registry remains empty.

V22 builds a complete actual engine fixture containing both PASS and UNCERTAIN candidates, then exercises unsupported versions/distribution/context/features/any-candidate support, inference exceptions, nonfinite outputs, missing/duplicate/foreign IDs, mutation followed by failure, and a deterministic simulated timeout. Every fallback preserves the **entire serialized deterministic row list**, including ordered IDs, all 14 ledger terms, notes and Physical evidence. Corrupt deterministic input throws outside fallback. A successful mock permutation tests conservation only and does not select a displacement policy or activate a model. A production-source guard excludes both fixtures.

**V07 and V22: PASS**, 29 focused tests, zero failures. Full TypeScript compilation and scoped ESLint over the new diagnostics/fixtures passed with zero warnings. The accepted full suite/build remains applicable because production files are unchanged; neither was repeated merely to replace valid evidence.

**Worker stability: PASS for the investigated contract.** Twenty serial runs of all five original worker tests passed at the unchanged 5,000 ms test timeout (100 assertions). The sensitive pause/continue case measured min/p50/p95/max **1,635.1 / 1,734.9 / 1,758.7 / 1,766.5 ms**. Six additional runs with six CPU-burner threads passed all 30 assertions; that case measured **1,958.5 / 1,970.0 / 2,007.9 / 2,007.9 ms**. Those loaded diagnostics explicitly allowed 30 seconds to distinguish timing from assertion failure, but every measured case also finished below the original five-second limit. No production deadline or checked-in test timeout changed.

The historical 6.02-second full-suite failure occurred with concurrent typecheck/lint and passed unchanged on rerun at 4.34 seconds. This session reproduces load-related slowdown, not the exact timeout. Across 26 runs there was no incorrect page, lost/stale result, cancellation failure or nondeterminism. The evidence supports environmental/harness wall-clock sensitivity rather than a demonstrated product race; it does not prove that no future overloaded host can exceed a test deadline. [All per-run assertions and timings](release-worker-stability.json), [contract results](release-contract-checks.json), and [validation exits](release-run-log.json) retain that distinction.

## Frozen-artifact recovery

The three missing §2 reviews were recovered from exact local Git blobs, with every recorded SHA-256 matching:

| Input | SHA-256 | Recovery blob |
|---|---|---|
| Generator review | `706b34e683d1a3415c61fae332d379e975ff99a3407893e7d362343f75e7774e` | `91558c76a532553abcac0987b04f49ffde922a13` |
| Physical review | `c7ae4d4151e2f2ea38562a0fe53c6c34c976aed466cbea280fe27ca26f2fb12e` | `0cb22390a69159a51d4b56a14bc9a19405049638` |
| Ranking current audit | `f2eaf8477565dd2ed408966f518fd860f92fd9f2b5264cc744674a1b93444724` | `0c996d7429a2ec594fa8bd8d5612054f328d0b23` |

The already-present Ranking decision also matches `72f38baba30c99ee0ed9b9e580a55b9d03ed77196bac5b8cf0a40baf58cd5ba4`. The three archived comparison JSON inputs were recovered byte-for-byte. All five Product frozen-validation inputs and all 31 cross-runtime engine-source hashes match. Recovery does not reinterpret the findings or run a solver/model/corpus investigation.

The existing `.research/physical-feasibility/physical-feasibility-frozen.zip` has SHA-256 `19d71b98f82412ad319bda1c30b5f74e285761ced39aa50054bcafcbbd38d4b7`. All 54 contained files match its internal manifest; the contained `final-freeze.json` hash is `b69ee2e00027ead1c62b399843026afebe44ae7f13905e0298dbf34f7e0cb4ec`. Archived source was verified inside the archive, not executed or moved into the production compilation scope.

One historical link remains unavailable: `docs/research/physical-model-reassessment/reanalysis-provenance.json`, expected SHA-256 **`5060309901c6f6a12c0d11c3d4ce95bc6ead3efbc8686791d786eef2667b7bc5`**. Search covered all 1,350 local Git blobs, including unreachable objects, project text/data, registered Guitar worktrees and the existing Physical archive. No exact bytes were found. The historical [88-case shadow](engine-physical-shadow.json) records that this provenance and 54 frozen-file hashes passed then. Archive-internal verification now does not establish the missing independently pinned provenance-to-manifest link, and the original shadow command cannot freshly reproduce its initial provenance assertion. Per the user's final instruction, this is **non-blocking reproducibility debt**, not a current product correctness failure or Stage 10 veto. Its availability is externally blocked and its hash remains unverified; that evidence status has not become PASS. Do not synthesize the missing JSON. Full details: [reverification evidence](release-artifact-reverification.json).

## Physical mobile validation debt

**NON-BLOCKING POST-RELEASE / MANUAL VALIDATION DEBT — NOT MEASURED.** The [device inventory](release-device-availability.json) found no available physical mobile browser/bridge. No emulated desktop result is substituted, and this record makes no claim that physical-mobile performance was validated. Chrome's exhaustive release matrix passed; Firefox showed no correctness or stability defect; targeted WebKit evidence showed bounded browser-specific slowdown; cross-runtime determinism, functional UI, responsive/reflow and browser UI checks pass. With no demonstrated production defect, the unavailable device evidence is not a mandatory automated release blocker.

**Physical-mobile performance remains unmeasured and should be manually checked after deployment or when a representative device is available.** The [exact external-device protocol](release-mobile-protocol.md) provides source/build checks, hardware/OS/browser/state records, USB forwarding, 480×30 UI measurements, separate direct-lookup/worker memory collection, unchanged thresholds, cancellation checks and evidence outputs. The prepared collectors are a reproducible future procedure, not device evidence.

## Reproduction and changes

Commands run from `C:\Projects\Guitar`, using the installed local dependencies and browsers:

```powershell
git status --short
git rev-parse HEAD
git rev-parse HEAD:src
git log --all --oneline -- docs/research/generator-scope/review.md docs/research/physical-layer-review/review.md docs/research/empirical-ranking-current-audit.md
git fsck --full --no-reflogs --unreachable
git worktree list --porcelain
node node_modules/next/dist/bin/next start --port 3004
node scripts/engine-integration/release-build-identity.mjs
node scripts/engine-integration/release-artifact-reverification.mjs --restore
node scripts/engine-integration/release-artifact-reverification.mjs
$env:RELEASE_BROWSER='firefox'; node scripts/engine-integration/release-browser-performance.mjs
# Historical invocation below was CANCELLED by the user; do not resume it.
$env:RELEASE_BROWSER='webkit'; node scripts/engine-integration/release-browser-performance.mjs
node scripts/engine-integration/release-latency-diagnostic.mjs
node scripts/engine-integration/release-webkit-targeted.mjs
node scripts/engine-integration/release-radio-retention.mjs
$env:MEMORY_RUNS='1200'; node scripts/engine-integration/release-memory.mjs
$env:MEMORY_RUNS='1440'; $env:MEMORY_FIXTURES='matrix'; $env:MEMORY_MODE='baseline'; node scripts/engine-integration/release-memory.mjs
$env:MEMORY_MODE='reuse-radio-names'; node scripts/engine-integration/release-memory.mjs
node scripts/engine-integration/release-worker-stability.mjs
node node_modules/vitest/vitest.mjs run scripts/engine-integration/release-contract-fixtures.test.ts --maxWorkers 1 --reporter=json --outputFile=docs/implementation/release-contract-checks.json
node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false
node node_modules/eslint/bin/eslint.js scripts/engine-integration/release-*.mjs scripts/engine-integration/release-contract-fixtures.test.ts scripts/engine-integration/prepare-mobile-worker-cost.mjs --max-warnings 0
node scripts/engine-integration/prepare-mobile-worker-cost.mjs
git diff --check
git diff HEAD -- src
```

The heap-analysis command and each serial validation subprocess/environment are recorded in `release-run-log.json`; raw per-trial worker commands are in `release-worker-stability.json`. Heavy runs are serialized; the two browser commands above are not instructions to run them concurrently. Restore `MEMORY_MODE`/`MEMORY_FIXTURES` or use a fresh shell before repeating a different memory control. Mobile execution requires the external-device protocol and was not run here.

The memory profiler attached to the pre-existing Chrome CDP browser at `http://127.0.0.1:9333`, launched as `chrome.exe --headless=new --remote-debugging-port=9333 --user-data-dir=C:\Users\pense\AppData\Local\Temp\modus-chord-ui-review --no-first-run --no-default-browser-check about:blank`. Each diagnostic created and closed its own target; it did not close that browser or other tabs. A future reproduction should use an isolated profile and free CDP port. The timing matrices use installed Playwright binaries from `.tmp-engine-browsers`; no browser download or web research was performed.

Changes are limited to offline diagnostics/tests, recovered frozen bytes, this evidence/documentation, an ignore entry for this session's raw profiler files, and exact-byte Git attributes for the six recovered inputs. This host uses `core.autocrlf=true`; the narrowly scoped `-text` attributes prevent future checkouts from changing their pinned hashes. Production behavior, vocabulary, thresholds, PASS/UNCERTAIN/REJECT, candidate reachability, classic ordering and all policy versions are unchanged. No candidate caps, fallback pools, empirical activation, Stage 10 retirement or deployment occurred.

Final HEAD remains `9e793f1b407fef6da336ae2ca6a948b8143fe528`. Closure additions are left uncommitted: one tracked `.gitignore` edit and 40 new paths, including the six recovered frozen inputs, alongside the 114 preserved pre-existing untracked research paths. There is no production-source delta or partial production implementation. All owned benchmark/browser processes and the local release server were stopped; the pre-existing Chrome CDP browser was preserved.

[Final verification](release-final-checks.json) records fresh syntax/scoped lint checks for the authored diagnostics, all 162 build-asset hashes, unchanged source identity, 43 available frozen hashes and retention of the original stopped WebKit file's SHA-256. The 29 contract tests and 130 worker assertions remain the completed focused validation, not substituted by these hash checks.

## CURRENT PRODUCTION BLOCKERS

**None demonstrated.** No current correctness, determinism, runtime-functionality, worker-stability, application-owned memory-leak, accessibility or licensing defect was found in this closure scope. Passing assertions and exact identities are evaluated separately from latency targets. The historical browser-specific latency misses remain SLO debt under the amendment below. Physical-mobile performance remains unmeasured and is classified as non-blocking post-release/manual validation debt. No further exhaustive desktop benchmarking is required by this closure.

## PERFORMANCE SLO DEBT / AMENDMENT

**Assessment: bounded browser-specific performance variance, not a demonstrated pathological product regression.** Firefox's only mandatory ancillary miss is 12 ms (6%) above the historical target; its fresh-page follow-up is consistently near 40 ms. WebKit's wide-case cost is materially larger than 200 ms—up to 528 ms p95 for filtering—so it should not be described as merely a rounding error. It is nevertheless bounded, subsecond ancillary work with exact results and no hang, timeout or escalating correctness/stability failure. Representative common qualities are substantially faster. No earlier equivalent WebKit baseline establishes a version-to-version regression. The evidence supports a browser-dependent engineering target rather than an inference that the candidate universe or frozen policy is defective.

Propose **`desktop-release-slo-v2`**, **PROPOSED ONLY**, for this reference desktop class and the tested browser families. This document does not activate it, edit the architecture/policy specification or relabel old failures. The numeric targets are engineering selections with explicit headroom, not empirical claims about humans or universal device guarantees.

| Reference desktop browser | First exact painted page p95 | Completed compact next-page/filter p95 | Basis / selected headroom |
|---|---:|---:|---|
| Chrome | 2,000 ms | 200 ms | Retain the passing historical targets; worst measured 1,158 / 126 ms |
| Firefox | 2,250 ms | 250 ms | Measured worst 1,991 / 212 ms; approximately 13% / 18% headroom |
| WebKit Windows test port | 3,000 ms | 600 ms | Measured wide accompaniment 2,719 / 528 ms; approximately 10% / 14% headroom |

Keep direct LOOKUP at **100 ms desktop**; materialized-card selection remains a separate reported diagnostic. Do not infer Firefox/WebKit direct-lookup or physical Safari timings from these card-selection numbers. Preserve ≤1 MiB messages, ≤48 mounted cards, row/engine buffer budgets, exact cancellation/stale-result behavior and all correctness contracts. Mobile's existing 5,000/500/250 ms targets remain unchanged and unmeasured. No candidate cap, alternate pool, score/order change, reduced precision or runtime fallback is permitted to satisfy an SLO.

For future bounded SLO checks, retain the same warm-HTTP/fresh-worker painted endpoints, all raw samples, nearest-rank per-fixture p95 and maxima. Use the major/minor/dominant-7 fixtures in both contexts, the widest dominant-11 fixtures and previously failing Firefox F# 7b9 fixture, with 30 measured repetitions; keep correctness/determinism validation separate. The existing WebKit wide slice has **25**, not 30, repetitions and remains labeled as such. No full 480×30 WebKit rerun is required here. Explicit-GC measurements remain diagnostics, not replacements for natural-GC tails. These targets are provisional for the measured reference host and Windows WebKit port, not a claim of exhaustive Safari or hardware coverage.

The tradeoff is explicit: accept slower but bounded exact processing on the measured WebKit runtime, while retaining Chrome's faster target and reporting Firefox tails honestly. The SLO version is reversible through a later engineering amendment; all active engine, ranking and Product Policy versions remain unchanged. Historical universal-target misses stay **FAIL as measurements / non-blocking SLO debt** under the user's targeted-closure instruction. A correctness fault, timeout/hang, unstable cancellation, memory defect or sustained pathological slowdown would still be a production blocker. None was demonstrated in this bounded scope.

## NON-BLOCKING REPRODUCIBILITY DEBT

The one missing historical provenance JSON and its recorded hash remain openly unverified. Exact local recovery was exhausted without inventing bytes. Its historical 54-file/88-case verification is preserved as a historical claim, while all available source-review and current validation-input hashes match. Under the user's final instruction this debt is **non-blocking** for current production correctness and Stage 10. Recover and hash the original artifact if it becomes available; no new research or reconstruction is authorized.

## READY FOR STAGE 10

**RELEASE-GATE GO**

**READY FOR STAGE 10 CLEANUP**

No demonstrated current production blocker remains. The historical universal latency misses are disclosed performance-SLO debt with an explicit amendment proposal; physical-mobile performance is unmeasured non-blocking post-release/manual validation debt; the missing historical provenance is non-blocking reproducibility debt. None is represented as validated evidence or a current correctness failure.

Production source, candidate universe, architecture, policy and observable semantics are unchanged. No Stage 10 cleanup or deployment was performed.
