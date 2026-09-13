# Reproducing Physical Envelope Study v2

Run from `C:\Projects\Guitar` at exact HEAD `32f9d3f8a71dc0d2a5f18520bfad738e67ba26c0`. These scripts write only research outputs and import unchanged production modules only for offline comparison. No ranker, browser, server or deployment is involved. The census intentionally fails on a different HEAD: adapting it to a future baseline requires a separately identified study, not deleting its provenance guard.

## Node analysis

The completed run used Node22.16.0 and repository-installed tsx4.23.13 (package manifest range `^4.23.13`). No dependency or runtime-manifest edits were made. Run commands separately in this order:

```powershell
git rev-parse HEAD
git status --short
node --import tsx scripts/physical-envelope-v2/validate.ts
node --import tsx scripts/physical-envelope-v2/sensitivity.ts
node --import tsx scripts/physical-envelope-v2/census.ts
node --import tsx scripts/physical-envelope-v2/warning-boundary.ts
node scripts/physical-envelope-v2/verify-artifacts.mjs
```

In the managed Windows environment, tsx's esbuild child process needed execution outside the restricted sandbox. The authorized executions were limited to these research scripts; no installation or runtime modification was required. Outside that environment, use ordinary execution permissions.

The full census completed in96.0s with207.4MiB maximum observed RSS. It streams480 requests through batches of8192 traversal nodes. The exact row/status checks target `docs/implementation/engine-integrated-census.json`. All statistics except the explicit unique-allocation count retain request multiplicity. `--limit`/partial operation, if used for development, is not the full study evidence; use the unqualified command for the archived result.

Outputs:

- `validation.json`: internal geometric/unit/contact checks, not human validation.
- `sensitivity-results.json` and `sanity-examples.md`:14 examples×3profiles,12 one-axis parameter values,3contact windows.
- `census-results.json` and `census-analysis.md`: full universe, provenance hashes, original verdict strata, histograms/correlations/slices.
- `warning-boundary.json` and `warning-boundary.md`:210 critical-scale calculations, strict/integer comparator distinction and7quality slices.

Instrument inputs are in `instrument-profiles.json`. Three fully numeric **analysisProfiles** are used; partial/reference source records elsewhere in that file are not silently completed. Constructed values remain assumption-labeled. The primary geometry tables cover frets0–15 only. Radius null means an explicitly flat scenario. Restricted contact windows alter planar/transverse bounds only; full-cell gap and midpoint reference retain their definitions.

## Human reference-data analysis

Python requires pandas, numpy and openpyxl. The completed source aggregates used pandas3.0.1 and numpy2.3.5. The bundled interpreter available in this session is shown below; a normal Python environment with these packages can use `python` instead.

```powershell
& 'C:\Users\pense\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/physical-envelope-v2/anthropometry-analysis.py
```

Input `sabahan-source.xlsx` is the public [Khazri et al.2022 S1 workbook](https://journals.plos.org/plosone/article/file?id=10.1371/journal.pone.0273840.s001&type=supplementary), under the source article's CC BY attribution. The small44,594-byte workbook is retained alongside compact derived aggregates to allow a hash-identical reanalysis. It contains no identifier column. SHA256 must equal `3f2847df30f9180029a3e4f62d63f467377455750f076796ee3750b6fc550aea`.

The script's optional `--download --input <new-path.xlsx>` acquires that exact URL when the named destination does not exist. It refuses to overwrite a source and fails if the hash changes. Network access may require normal environment permission; the archived source makes reanalysis network-independent.

The script validates368 complete rows, eight46-person sex/ethnicity strata and units; retains all observations; converts cm→mm; computes sample covariance/SD with n−1 and empirical linear-interpolated quantiles; emits only aggregate JSON/Markdown. An independent openpyxl+numpy recomputation checked covariance and medians in this session. No source-record synthetic people, normal-tail extrapolation or execution probabilities are produced.

## Evidence and integrity

Read `study.md` as the complete synthesis. Its evidence appendices are anthropometry, functional reach, ROM/mechanics, instrument geometry and prior-model audit. Source-access failures and old model files missing from the checkout are explicit. Historical verification recorded in the retained physical shadow is not new verification of those unavailable files.

`integrity.json` records final baseline/scope checks and SHA256 values for new research artifacts. It excludes itself from its file digest list. Census and sensitivity JSONs separately contain their input hashes. Timestamps and measured runtime can differ on rerun; arithmetic/count outputs should agree within their stated floating-point conventions.

The source review and geometry vector do not form a calibrated population fretting model. Human predictive validity remains ABSENT. Reproduction does not authorize production verdict, generator, ranking or presentation changes.
