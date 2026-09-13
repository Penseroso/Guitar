# Stage 10 production cleanup

Status: **COMPLETE**. Classification was recorded before removal or archival. This cleanup follows the release-gate GO recorded in `release-gate-closure.md`. It does not change `guitar-engine/2`, Product Policy v2.1, Physical thresholds, practical vocabulary, Recommended membership, or `classic-v1` ranking.

## Pre-cleanup source identity

- HEAD: `9e793f1b407fef6da336ae2ca6a948b8143fe528`
- Accepted implementation: `4187903b3a97c788c870e93bd274bbb3a68f0565`
- Production `src` tree: `d0186978862058d07de6debb676fa1ccbab8fb02`
- Existing release build: `FMjDGjRhqWxf4MVLwfgcT`
- Tracked production files were unchanged at inspection. The uncommitted release-closure documentation, diagnostics, and restored frozen references were preserved for this cleanup.

## Classification and incoming-reference audit

| Classification | Paths | Incoming references and disposition |
|---|---|---|
| **ACTIVE** | `src/domain/chord/engine/**` except `legacyAdapters*`; `engine.worker.ts`; `engineClient.ts`; `explorationController.ts`; `useChordExploration.ts`; current chord UI/audio; shared chord registry/recognition/semantics; scale/progression domains | These form the current `guitar-engine/2` request → worker → session → Structural → Physical → classic-v1 → Recommended/All → presentation path. Shared chord types and recognition remain legitimate callers outside chord exploration. |
| **ACTIVE VALIDATION** | focused engine tests; `product-conformance.ts`; Stage-10 Recommended/All smoke; build/hash and manual physical-mobile collectors with their harness dependencies | Current contracts or the explicitly retained post-release manual-device procedure use these. They do not import research data at runtime. |
| **FROZEN REFERENCE** | `docs/architecture/engine-specification.md`; `docs/architecture/product-policy-v2.md`; final readiness/baseline/release-closure summaries; final research reviews and study records under `docs/research/` | These explain the frozen decisions and release evidence. They are documentation/evidence, never production imports. Supporting frozen research is retained byte-for-byte. |
| **ARCHIVE** | research acquisition/analysis scripts; old comparison controls; superseded Stage 1–9 diagnostic scripts; bulky/intermediate implementation measurements and duplicate screenshots | They have no production caller. Local copies move under `.research/stage-10-archive/` with their relative paths preserved. Tracked history remains recoverable from Git; final conclusions stay in `docs/`. |
| **OBSOLETE** | `chord-exploration.worker.ts`; `bridge.ts`; old `exploration`/`voicingSearch`/`rankedVoicingSearch`/`deductiveRanking`/`descriptor`/`fretGeometry`/`voicingStyles` pipeline and its tests; `engine/legacyAdapters*`; old domain-barrel exports; `migrateAllocationId`; `legacy-bass-subset`; retired research package scripts and the chords-db fixture dependency | The old worker is referenced only by itself and is explicitly excluded by the live boundary guard. `bridge.ts` is referenced only by `bridge.test.ts`; the live client has no caller. The old domain cluster is reached only from that worker, its own tests, barrel re-exports, and offline scripts. `legacyAdapters.ts` is reached only by `legacyAdapters.test.ts`; `migrateAllocationId` is reached only by the adapter and one migration assertion; `legacy-bass-subset` is constructed only by that adapter. The chords-db package is reached only by the retired legacy fixture test. These paths are removed from the active source/package surface after their local archival copy is made. |

`classicFeatures.ts`, its `legacy-rank-features-v1` contract, and the word “legacy” inside the frozen `classic-v1` feature vocabulary remain **ACTIVE**. They define the current ranking inputs and are not the retired engine-v1 pipeline. The `shape-v1` identity format also remains active; only conversion from pre-v1 IDs is retired.

## Archive layout

Local archive root: `.research/stage-10-archive/`. The archive is intentionally excluded from production compilation, lint, packaging, and Git. It preserves removed working copies for local inspection; committed Git history is the durable source for previously tracked bytes. Final public-facing architecture, policy, research decisions, readiness summaries, and this inventory remain in `docs/`.

The completed local archive contains 121 files: 22 retired source/test files (202,305 bytes), 92 research or diagnostic scripts (793,893 bytes), and seven intermediate documentation artifacts (12,171,741 bytes). The documentation group is the five superseded Stage-9 performance iterations, the failed release-memory harness setup output, and the archived web-corpus acquisition program. The cleanup commit deletes 63 formerly tracked paths: 22 under `src`, 36 under `scripts`, and five intermediate evidence files under `docs/implementation`.

The nine retained integration tools have current callers or a defined release/manual role: `stage10-smoke.ts`, `product-conformance.ts`, `release-build-identity.mjs`, `release-contract-fixtures.test.ts`, `release-harness.mjs`, `release-mobile-performance.mjs`, `prepare-mobile-worker-cost.mjs`, and the two harness sources used by the manual collector (`product-ui-performance.mjs`, `product-worker-cost.mjs`). They are validation tools, not production imports.

## Removed and retained behavior surfaces

- Removed from the active tree: the old chord exploration worker; boolean bridge; template/style generator; old deductive ranker, descriptor, fret geometry, exploration and ranked-search wrappers; their isolated tests; `legacyAdapters`; pre-v1 ID migration; adapter-only `legacy-bass-subset`; obsolete package commands; and the chords-db fixture dependency.
- Archived outside active tooling: DadaGP, preference, reference, Physical Envelope v2, Web Voicing Corpus v2, Stage 1–9 comparison programs, release investigation programs, and superseded performance iterations. Original relative paths are preserved beneath `.research/stage-10-archive/`.
- Retained in production: the v2 Structural Generator, Physical screen and demand geometry, `classic-v1` feature projection/ranking, practical vocabulary, Recommended/All surface, worker protocol/service/session, browser controller/hook/UI, selection, presentation, and audio path.
- Retained as frozen reference: final architecture and Product Policy, final Generator/Physical/Ranking reviews, Physical Envelope v2 and Web Voicing Corpus v2 study records, Product readiness, pre-release baseline, release-gate closure, raw final release evidence, and manual physical-mobile protocol.

`classicFeatures.ts`, `legacy-rank-features-v1`, registry legacy labels used by progression compatibility, and stable `shape-v1` allocation IDs remain active. No legitimate caller justified retaining the deleted feature flags or adapters.

## Minimal validation result

Environment: Windows `10.0.26200`, Node `v22.16.0`, Next.js `16.1.6`, TypeScript 5, Vitest `4.1.2`. Release build ID: `7UAPhGtAYC1_gB-tFvbr9`.

| Check | Command | Result |
|---|---|---|
| Unit/integration, including architecture boundaries | `npm.cmd test` | PASS after archive exclusion: 41 files, 268 tests, zero failures. The first cleanup run passed 558 tests but also collected ignored historical trees and reported 14 archive import failures; adding `--exclude .research/**` fixed only that test-discovery boundary. |
| TypeScript | `node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false` | PASS. The first cleanup run exposed old DadaGP imports of retired modules; archiving the research-only DadaGP scripts resolved that cleanup regression. |
| Production-scoped lint | `node node_modules/eslint/bin/eslint.js src <retained integration tools> --max-warnings 0` | PASS, zero warnings. A focused recheck of the two final edited identity/smoke scripts also passed. |
| Release build | `npm.cmd run build` | PASS; static routes `/` and `/_not-found`; build ID above. |
| Production research-import boundary | included in `liveEngineBoundary.test.ts`, plus `rg` audit | PASS; zero production imports from `.research`, research scripts, or `scripts/engine-integration`. All enumerated retired production paths are absent. |
| Recommended/All smoke | `npm.cmd run audit:chord` | PASS for C major standalone and F-sharp dominant-11 accompaniment on both surfaces, with deterministic repeat digests and nonempty exact pages. |
| Conservation/hash | same focused smoke, using existing `productConformance()` | PASS: 8,020 exact geometry cases, 2,450 threshold-boundary cases, three pagination/conservation cases; SHA-256 `615af49d531d211a4311fecf69e6b66b2ffc2c984b97cb0c9dd1402b76270a97`. |
| Source/build identity | `node scripts/engine-integration/release-build-identity.mjs` | PASS: source tree `14890e0f2fe7ab88958fe7386b15dabd6fab593a`, source SHA-256 `7af7b2b7300b2ea008333bd29300af4ec7540b9da9f875f58684b99eee0b8937`, 148 source files, empty production diff at cleanup commit `c733f2b1b064af55474e981c65f70d33348a461c`; build SHA-256 `ce8d061c446d20ff1be53971829662ed67fd613b43e36fce3ec5e1a577d32acc` across 162 assets. |
| Diff hygiene | `git diff --check` | PASS. |

No exhaustive census, browser matrix, memory profile, corpus study, Physical study, or historical research reproducibility suite was run. Physical-mobile performance remains unmeasured non-blocking manual validation debt exactly as recorded by Release Gate Closure.

## Commits

- `bd98c0c` — freeze the completed release-gate evidence and recovered frozen research inputs.
- `c733f2b` — retire the legacy production paths, archive research/diagnostic tooling, update active architecture text, dependency surface, and guards.

Stage 10 is ready to push. Pushing this branch is the only deployment-triggering action in this task.
