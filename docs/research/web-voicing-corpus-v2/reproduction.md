# Reproduction and artifact versions

Final report aggregation commands (no model fitting or reranking):

```powershell
node scripts/web-voicing-corpus-v2/assemble-manifest.mjs
node scripts/web-voicing-corpus-v2/summarize.mjs
node scripts/web-voicing-corpus-v2/register-slices.mjs
```

These write the unified manifests, compact evaluation summary, protected-slice Markdown and post-run descriptive register table. The register aggregation verifies exact agreement with all 20 original aggregate metric combinations before writing its table. It does not modify immutable mapping/evaluation inputs. Run in an isolated reproduction workspace if preserving final artifact timestamps/hashes.

The frozen baseline is HEAD `32f9d3f8a71dc0d2a5f18520bfad738e67ba26c0`. All commands below are project-root commands for `C:\Projects\Guitar` and its installed dependencies. The study does not change production code or configuration. Existing acquisition, mapping and evaluation evidence is retained; do not run output-producing commands against those completed directories merely to inspect them.

## Existing evidence and version boundaries

| Artifact | Recorded role |
|---|---|
| [open-acquisition-lock.json](open-acquisition-lock.json) | Pinned Git revisions, source URLs, byte sizes and SHA-256 hashes for reused reference files. Source bytes are under `.research/web-voicing-corpus-v2/acquired`. |
| [curated-voicings.json](curated-voicings.json) | 51 source rows, two conservative families, with input hashes for both audited educational files. |
| [.research/web-voicing-corpus-v2/reference-mapping](../../../.research/web-voicing-corpus-v2/reference-mapping/summary.json) | Original reference parser version; 7,070 rows, 1,691 mapped, 349 queries and 6,417,643 per-query survivors. |
| [.research/web-voicing-corpus-v2/curated-mapping](../../../.research/web-voicing-corpus-v2/curated-mapping/summary.json) | Retained initial curated mapping: 44 targets before recognizing three source-explicit `Maj7` spellings. This is not the evaluator input. |
| [.research/web-voicing-corpus-v2/curated-mapping-v2](../../../.research/web-voicing-corpus-v2/curated-mapping-v2/summary.json) | Final corrected input to evaluation: 51 rows, 47 mapped, four ambiguous exclusions, 39 queries and 999,184 survivors. |
| [.research/web-voicing-corpus-v2/evaluation](../../../.research/web-voicing-corpus-v2/evaluation/complete.json) | Completed fixed exploratory evaluation. Contains `protocol.json`, `results.json`, `canonicality.json`, `displacement.json`, `ranks.jsonl` and `complete.json`. 880 complete ranking lists passed conservation checks. |
| [analysis.json](analysis.json) | Descriptive source/mapping/geometry summaries, with DadaGP comparison only when the separately certified local inputs are available and hash-verified. |

Each mapping directory includes original-row-preserving `rows.jsonl`, `summary.json`, ordered universe caches and `verification.json`. The summary records the input hash, baseline, engine/research source hashes and cache path/hash per query. Cache paths are absolute paths from this run; moving an artifact bundle requires rebasing paths explicitly while retaining the original manifests. Output timestamps and absolute paths are not expected to be byte-identical in a fresh checkout; content/control comparisons must account for that provenance metadata.

The [notation correction ledger](notation-corrections.json) records the sole parser correction before evaluation. The original mapper snapshot is [engine-map-before-Maj7.ts](../../../.research/web-voicing-corpus-v2/engine-map-before-Maj7.ts), SHA-256 `6c778fc2b8a21689c4e3c6d92dda8af9a789af5a6cbe25f4874d5b2ee0021a29`; it exactly matches the reference manifest. The final mapper hash is `a326e84bbcf72645f4f682dc85e427c54c6030f6f690a67be1c1dbfaad5afb98`. No reference label contains `Maj7`, so the original reference mapping was not rerun. Both initial and final curated results remain available.

The completed evaluator hash is `c93d70272e9bf0e288ab21fed7859ede1ae473929a5cf3ba1dacad1c6357c4b7`. Its manifest identifies final curated `summary.json` hash `91d3a003133ede6b2b02804a71511cfc2c7745dc6d0cd93b0265acdf00cd0c44` and `rows.jsonl` hash `972a06f4e9185998c874f806c4e666718415e4b9a13a4921c638d8d2bdce2418`. The evaluator completed at `2026-09-13T04:48:42.481Z`; it was not rerun during documentation work. Its protocol includes fold-aware source/trial/query NDCG contexts, global physical-family withholding and a same-quality/declared-context two-source guard. These definitions were fixed before evaluation outcomes.

## Read-only code verification

These commands check the research implementation without recreating corpus outputs:

```powershell
node_modules/.bin/tsc.cmd --noEmit -p scripts/web-voicing-corpus-v2/tsconfig.json
node_modules/.bin/tsx.cmd scripts/web-voicing-corpus-v2/verify-mapping.ts
```

Both passed after the final parser correction. The synthetic check includes `CMaj7`/`CM7` versus `Cm7`, unsupported `Cadd9`, slash spelling, ambiguous/null/capo/fret/conflicting-label exclusions, open-exact and closed-relative family identity, target membership, ledger identity and an independently sorted full C-major universe. That control has 13,331 survivors, 992 PASS, 12,339 UNCERTAIN and classic rank 8 for `[0,1,0,2,3,-1]`. No synthetic control enters the corpus.

The serialized-artifact verifier reads all original rows and caches, checks cache hashes, complete ordering, uniqueness, status counts, exact target ranks and default-query agreement with the integrated census. Its actual commands were:

```powershell
node scripts/web-voicing-corpus-v2/verify-mapping-artifacts.mjs .research/web-voicing-corpus-v2/reference-mapping
node scripts/web-voicing-corpus-v2/verify-mapping-artifacts.mjs .research/web-voicing-corpus-v2/curated-mapping-v2
```

They passed: 240 reference default queries and all 39 final curated queries match the integrated census counts. Reference additionally has 109 explicit slash queries. This verifier writes `verification.json`; inspect the retained verification reports rather than rerunning it in a preserved output directory. To repeat it, use a copied mapping bundle with explicitly rebased cache/input paths. No production or broad empirical tests are implied by the isolated typecheck.

## Acquisition and normalization reproduction

The structured-reference acquisition reads existing cached bytes by default, downloads missing bytes and verifies them against the lock. `--refresh` asks for fresh network bytes and still rejects hash changes. It pins tombatossals/chords-db at `df06fa7b425cf5fd29485ff6591236b3557e3fac`, ChordPro at `4b25408d830bd3f4c53fc6fb544b2babe4da09e1`, and the UCI archive by DOI/access date plus its recorded hash. These scripts write source/normalized artifacts and should run only in an isolated reproduction workspace:

```powershell
node scripts/web-voicing-corpus-v2/acquire-open.mjs
node scripts/web-voicing-corpus-v2/audit-open.mjs
node scripts/web-voicing-corpus-v2/prepare-curated.mjs
```

`audit-open.mjs --inspect-siege` is an optional network aggregate inspection recorded in the original structural audit; it retains counts/hash, not that source corpus. Running the audit without this option does not recreate that optional field. Neither audit mode establishes manual selection or source independence.

The educational rows are manually reviewed transcriptions, not output of an automated shape parser. Exact source URLs, permanent lesson revisions, page/diagram locators, licenses and available asset hashes are in [educational-sources.json](educational-sources.json), [educational-discovery.md](educational-discovery.md), the normalized rows and [image inventory](educational-wikimedia-image-inventory.json). Reproduction must inspect those source observations with their stated rights. The Kansas PDF hash is `61b3d86cec4158075ba6141cbf1fa1b86b75ca2de471bc230a1757c4573acbac`; original PDF/page images remain in OS temp, not the repository. The Wikimedia helper below discovers provenance/contact-sheet metadata; it does not download or infer every shape:

```powershell
python docs/research/web-voicing-corpus-v2/educational-acquire.py --metadata-only
```

It requires Python with Pillow, writes in the OS temporary `guitar-web-voicing-educational-v2` directory and queries the live lesson. A fresh live result may differ from the recorded permanent revisions. Six of 24 jazz diagram occurrences were actually acquired; the other 18 remain unavailable evidence. `prepare-curated.mjs` only combines the audited educational row files and hashes them; it is not a substitute for manual source verification.

## Mapping and evaluation commands used

The original reference mapping and final curated mapping were produced by the commands below, with per-query logs redirected into `.research/web-voicing-corpus-v2`. These commands write outputs. Reproduce only in a fresh isolated checkout or under new explicit versioned mapping paths; `runMapping` itself does not refuse an existing output directory.

```powershell
node_modules/.bin/tsx.cmd scripts/web-voicing-corpus-v2/engine-map.ts docs/research/web-voicing-corpus-v2/open-voicings.json .research/web-voicing-corpus-v2/reference-mapping
node_modules/.bin/tsx.cmd scripts/web-voicing-corpus-v2/engine-map.ts docs/research/web-voicing-corpus-v2/curated-voicings.json .research/web-voicing-corpus-v2/curated-mapping-v2
node_modules/.bin/tsx.cmd scripts/web-voicing-corpus-v2/evaluate.ts .research/web-voicing-corpus-v2/curated-mapping-v2
node scripts/web-voicing-corpus-v2/analyze.mjs .research/web-voicing-corpus-v2/curated-mapping-v2
```

For exact reference-source reproduction, restore the retained original mapper snapshot to its expected `scripts/web-voicing-corpus-v2/engine-map.ts` location in the fresh workspace before the first command, then restore the final mapper for the curated command. Running the snapshot directly from `.research` would break its relative imports. Current mapper semantics yield the same reference interpretations because that dataset has no corrected spelling, but its source hash is intentionally different.

Always pass the explicit `curated-mapping-v2` argument to `evaluate.ts`; its default points to the earlier curated mapping. The evaluator has a fixed output directory `.research/web-voicing-corpus-v2/evaluation` and refuses to overwrite it. There is no alternate-output CLI argument. Reproducing evaluation therefore requires a fresh workspace where that output directory does not exist; do not delete the completed evaluation to make a rerun fit. The analysis script writes `docs/research/web-voicing-corpus-v2/analysis.json` and can include separately certified local DadaGP descriptive inputs, whose presence/hashes must be matched for equivalent output.

All evaluations remain exploratory development evidence. The normalization and reproduction record does not authorize new source acquisition beyond its rights, product integration, empirical runtime ranking or a change to frozen Generator/Physical decisions.
