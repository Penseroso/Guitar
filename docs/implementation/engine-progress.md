# Integrated engine implementation

Authority: [Engine Specification](../architecture/engine-specification.md), baseline `a79007f0919b5b7f34657caa99f6d30a787c2a49` and its frozen layer reviews. No deployment.

The specification's archived documentation-only authorization note is superseded by the user's explicit integrated-implementation instruction. Frozen evidence files remain untouched. This log records implementation results, not new policy adjudication.

| Stage | Status | Validation |
|---|---|---|
| 1 Contracts | Complete | 3 focused tests passed; new declarations/codec/schema foundation typechecked; no live imports changed |
| 2 Compiler/subsets | Complete | 61 tests across 7 files passed, including all-registry compiler table and independent forward/inverse drop-set equality; scoped engine typecheck |
| 3 Structural iterator | Complete | 502 production tests passed; 480-request frozen census parity, exact 1,647,041 baseline allocations retained, zero duplicates; scoped typecheck/lint |
| 4 Physical assessment | Complete | 57 focused/legacy tests passed; independent 15,625-pattern cover oracle; 88-case shadow 79 PASS/9 UNCERTAIN/0 REJECT; 54 frozen hashes unchanged |
| 5 Classic ranking | Complete | 94 focused/legacy tests; 480 requests/1,647,041 identical baseline survivors; all 20 weights/features match; 45,864 isolated ledger checks |
| 6 Session/pages | Complete | 57 engine tests; cached/replay exact rows, ledgers, cursors and counts; every-node checkpoint recovery; widest-default and larger custom-scope diagnostics |
| 7 Worker | Complete | 74 engine/client tests; 18 real Chrome worker assertions; typed revisions, bounded chunks, task yields, cancellation and pause/Continue |
| 8 Atomic live cutover | Complete | Full suite 630 passed/34 existing skips; final focused 41 passed; 30 real Chrome UI checks; scoped production lint and release build pass in current workspace |
| 9 Integrated verification | Complete with recorded gaps | Full census; 14,400 release Chrome first-page samples and 1,200 page/filter/selection samples each; cross-runtime equality; 632 tests passed/34 skips; scoped lint/build pass; see readiness report for unexecuted checks and external artifact gaps |
| 10 Retirement/readiness | Conditional gate not met | NO-GO: physical mobile unavailable and other explicitly recorded validation/memory-attribution gaps; no retirement or deployment |

## Implementation clarifications

No semantic changes to the authoritative specification are made implicitly. Any necessary resolution will be recorded here with affected contracts and tests.

- The new catalog view canonicalizes diminished-7 `6` to `bb7` while retaining the baseline registry for recognition and the old live pipeline until cutover. New realization obligations are separate from pinned legacy feature obligations.
- Exact drop matching uses the equivalent inverse construction: raise the candidate's lowest voice by an octave, verify strict close position and the restored voice's specified index. The lowered voice of a strict close source is necessarily lowest; independent forward enumeration tests establish equivalence without a large template table.
- `tsconfig.engine.json` is an explicitly scoped new-engine typecheck, not a claim that the baseline repository-wide research typecheck passes.

## Baseline environment findings

Stage 3 census: old-policy structural total 14,152,934; identity-v1 total 15,943,679. The 1,790,745 additions are confined to dominant-11's 24 requests. Largest request: 267,524. Node structural scan plus verification diagnostics: p50 7.785 ms, p95 37.314 ms, max 104.301 ms; these exclude Physical, Ranking and browser costs. Full evidence and exact source hashes are in `engine-census.json`.

Stage 4 shadow: explicit required-damping interpretation yields 77 PASS/11 UNCERTAIN/0 REJECT; only the two archived internal-damping demands change status. All four former boolean exclusions survive as UNCERTAIN. Integer-span drift from archived floating geometry is at most 0.49445 micrometres with no verdict drift. The geometry table is independently reproduced using Decimal power at 80 digits and exp/log at 110 digits. No new solver or human validation was performed. New engine typecheck, scoped lint and diff checks pass; old live geometry/ranking sources remain unchanged.

Stage 5 control: every same-pool score matches after only the specified span quantization (maximum 0.0001650963-point difference). All 480 full orders change under the new integer/tuple comparator; ordered top-6 differs in 129 requests, ordered top-18 in 373. These are ordered-prefix comparisons, not membership or human-preference outcomes. Exact ledger sums, every preference branch, immutable metadata and permutation conservation pass. `engine-ranking-control.json` records source hashes and diagnostics. No live path was changed.

Stage 6: C dominant-11 accompaniment yields 267,524 survivors (8,243 PASS, 259,281 UNCERTAIN, zero REJECT), identical between packed and forced-replay paths. Rows use 32 bytes plus reserved two uint32 indices; this fixture retains 8,650,752 bytes, accounts 10,813,440 bytes, and replay retains zero pool bytes. Single-run Node diagnostics: first page 798 ms compact/784 ms replay; next 12 cached 209 ms/replay 814 ms; direct lookup 0.076/0.047 ms. The cached page result is near/above the desktop browser budget before transport/render, requiring measurement and possibly set-preserving optimization. Frets 0–18 replay completes in 1,758 ms. These are not browser gate results. Checkpoint tests caught and fixed zero-budget false-completion and restoring into an existing complete-cache defects. Evidence: `engine-session-check.json`.

Stage 7: real Chrome 152 DedicatedWorker smoke passes 18 assertions. Latest single-run timings: major first page 82.7 ms; widest dominant-11 1,165.7 ms; next page 15.7 ms; completed-pool view 10.8 ms; lookup 0.3 ms; cancellation acknowledgement 4.1 ms. Largest message 93,150 bytes. This isolated production-domain bundle smoke is not a release UI, repeated-performance, cross-browser or real-mobile gate pass. Source hashes and scope are recorded in `engine-worker-browser.json`. Worker/client tests also exercise maximum 128-row transport, stale messages, creation/crash/decode errors and 100-ms cancellation termination. Rich page materialization yields between candidates. BigInt construction now uses function syntax compatible with the repository's ES2017 TypeScript target; arithmetic/table policy is unchanged. No new full-repository type errors remain beyond the recorded archived research failures. Old live UI is still unchanged.

- Node v22.16.0. Vite requires subprocess access; ordinary sandbox tests fail with `spawn EPERM`, while approved execution passes.
- Baseline full typecheck has 21 errors in archived physical comparator source and TS5097 in `scripts/physical-feasibility/compare.ts`. These are pre-existing and frozen artifacts will not be edited.
- Baseline `eslint src --quiet` passes. Unscoped lint traverses private generated research files and reports 277 errors/9,446 warnings, plus existing research-script errors. Scoped production validation and unscoped failures will be reported distinctly.

## Stage 8 integration notes

The `guitar-engine/1` browser version uses the new worker, bounded session controller, independent selection, replacement pages and actual-MIDI audio together. A transitive TypeScript import guard excludes legacy search/boolean eligibility, array adapters and offline models from these live roots. Compatibility adapters are opt-in and return explicit notices and typed collection exhaustion.

The initial page has six cards and subsequent pages twelve. Cursor history is bounded to 64 entries (first plus 63 recent); Previous only traverses adjacent retained pages, while First page makes every earlier result reachable again. This engineering storage choice does not change a candidate, view or ordering key. Details preserve all fourteen terms, profile provenance, omissions and reason-specific uncertainty. Request changes and cancellation invalidate pending audio. No human-benefit claim is made.

Slider drags now keep a local accessible preview and send one committed view on release; keyboard changes commit directly. Chrome checks verify zero worker SET_VIEW messages during the drag and one on release. This also resolved a first-touch reset failure exposed by the smoke test. Thirty real-browser assertions pass, including replacement pages, off-page/filter selection, context invalidation, uncertainty playback, details, touch reset, modal focus/Escape and 390-pixel reflow. Maximum observed cards: 12; maximum message: 93,147 bytes. Screenshots and `engine-ui-browser.json` are durable evidence; viewport emulation is not a real-mobile performance measurement.

During stage 8, previously present untracked `docs/research` and some offline comparison files became absent from the shared workspace through an external change. This implementation did not remove them or change TypeScript exclusions. Current full typecheck/build passes therefore do **not** mean the archived baseline errors were fixed. Earlier hash-verified census/shadow/ranking evidence remains recorded; fresh verification of missing frozen inputs is unavailable and will be disclosed in readiness evidence.

## Stage 9 findings

The integrated 480-request census passes with S=15,943,679, PASS=583,916, UNCERTAIN=15,359,763 and REJECT=0. Every one of the 1,647,041 old production allocations remains reachable. The offline diagnostic reports protected-slice composition and demotion separately from the identical-pool score control. Nine pinned legacy-source hashes still match; unavailable original frozen files are explicitly recorded.

Node, Chrome, Firefox and WebKit agree byte-for-byte on 25 cross-runtime cases/2,597 rows plus numeric and Physical boundary vectors. Release UI checks exposed and fixed WebKit dialog focus restoration by supplying an explicit opener ref. The test evidence preserves the original failure and passing rerun.

Thirty samples exposed a widest-request cached page/filter performance failure at p95 246.4/228.6 ms. Fixed-size packed decoding now uses six direct byte reads instead of Array.from callbacks, retaining fresh snapshots and every validation. The exact cross-runtime output hash is unchanged; a new 8,200-row signed-coordinate/chunk/snapshot test passes. No scope, set, physical or ranking policy changed. Latest full tests: 632 passed, 34 existing skips; production and integration-script lint have zero warnings; release build passes.

Final release Chrome measurements cover every standard request thirty times (14,400 first pages), with 1,200 measurements each for page/filter/card selection across the widest root of each quality/context. Worst-request p95: first page 1,012.7 ms, next page 122.1 ms, filter 119.5 ms, card selection 13.9 ms. No observed long tasks or per-request desktop p95 violations. Source/build identity and disjoint complete segments verify. Actual mobile remains unavailable; Firefox/WebKit have conformance/UI and diagnostic evidence, not repeated release percentiles.

Post-GC page JS heap grows only 102,820 bytes from request 100 to 14,000, but browser embedder heap grows from 2,934,648 to 6,860,240 bytes and its attribution is unresolved. The V07 synthetic certificate-verifier and V22 future mocked-extension subchecks are also explicitly unexecuted. [Release readiness](engine-readiness.md) records these gaps, unavailable frozen originals and unscoped research lint failures. Rollout and stage-10 retirement are NO-GO; the five-player study remains future formative validation, not a gate.
