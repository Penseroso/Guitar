# Integrated engine implementation

Authority: [Engine Specification](../architecture/engine-specification.md), baseline `a79007f0919b5b7f34657caa99f6d30a787c2a49` and its frozen layer reviews. No deployment.

The specification's archived documentation-only authorization note is superseded by the user's explicit integrated-implementation instruction. Frozen evidence files remain untouched. This log records implementation results, not new policy adjudication.

| Stage | Status | Validation |
|---|---|---|
| 1 Contracts | Complete | 3 focused tests passed; new declarations/codec/schema foundation typechecked; no live imports changed |
| 2 Compiler/subsets | Complete | 61 tests across 7 files passed, including all-registry compiler table and independent forward/inverse drop-set equality; scoped engine typecheck |
| 3 Structural iterator | Complete | 502 production tests passed; 480-request frozen census parity, exact 1,647,041 baseline allocations retained, zero duplicates; scoped typecheck/lint |
| 4 Physical assessment | Pending | |
| 5 Classic ranking | Pending | |
| 6 Session/pages | Pending | |
| 7 Worker | Pending | |
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

- Node v22.16.0. Vite requires subprocess access; ordinary sandbox tests fail with `spawn EPERM`, while approved execution passes.
- Baseline full typecheck has 21 errors in archived physical comparator source and TS5097 in `scripts/physical-feasibility/compare.ts`. These are pre-existing and frozen artifacts will not be edited.
- Baseline `eslint src --quiet` passes. Unscoped lint traverses private generated research files and reports 277 errors/9,446 warnings, plus existing research-script errors. Scoped production validation and unscoped failures will be reported distinctly.
