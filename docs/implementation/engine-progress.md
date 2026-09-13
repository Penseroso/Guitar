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
| 8 Atomic live cutover | Pending | |
| 9 Integrated verification | Pending | |
| 10 Retirement/readiness | Pending | |

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
