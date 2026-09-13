# Engine migration status

The live cutover to `guitar-engine/2` is complete. `useChordExploration.ts` starts only `engine.worker.ts`; that worker uses `workerService.ts` and `EngineSession`. The production UI consumes `PresentationCandidate` rows from the v2 worker protocol.

Stage 10 removed the superseded worker, boolean bridge, legacy search/ranking/template modules, adapter-only predicate, allocation-ID migration helper, and their isolated tests after verifying that no legitimate caller remained. The chord-domain barrel no longer exports retired search or ranking APIs. Stable `shape-v1` IDs remain unchanged.

`classicFeatures.ts` and the version label `legacy-rank-features-v1` remain active because they implement the frozen `classic-v1` ranking inputs. Their name does not indicate a retired engine route. Scale/progression chord recognition, registry, helpers, semantics, and presentation types remain active shared domain code.

Research and historical diagnostic tools are archived under the ignored local `.research/stage-10-archive/` tree. Frozen architecture, policy, research decisions, readiness summaries, and final release evidence remain under `docs/`. Production imports from `.research` and research scripts are prohibited by the live boundary test.

No engine, policy, threshold, ranking, vocabulary, PASS/UNCERTAIN/REJECT, or candidate-reachability semantics changed during cleanup.
