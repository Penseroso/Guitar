# Engine v1 migration

The live CHORD path selects `guitar-engine/1` through `LIVE_ENGINE_VERSION`. Its worker, controller, selected snapshot, page panel and audio adapter are one atomic application version. Rollback requires an explicit application version rollback with disclosure of the old search scope; query failure only offers Retry.

The initial exact page contains six records; subsequent pages replace it with twelve. History stores cursors. Selection has its own snapshot and remains usable outside a view or page. Context changes revalidate it; root/quality changes reset it. Pending revalidation is visible and disables playback. Every playback uses the allocation's actual MIDI multiset, including repeated pitches.

PASS is the named generic static-fretting heuristic; UNCERTAIN is retained and independently filterable. Details show specific reasons, profile/default provenance, omissions and every deterministic ledger term. Neither a score nor PASS establishes human playability, comfort or preference improvement. Human validation is absent. The five-player check remains future formative validation, outside current rollout gates.

New consumers use the engine request/session APIs. `engine/legacyAdapters.ts` provides explicit migration notices for old IDs, spacing aliases, bass-only drop semantics and deprecated Physical options. Saved route IDs require explicit saved tuning. Complete collectors are opt-in CLI/test APIs with an explicit byte budget; exhaustion returns a typed failure, never a successful truncated pool. The eligibility boolean adapter carries its assessment and mandatory deprecation text. None is imported by the browser path.

Recognition, SCALE and progression contracts remain separate. Engine diminished-7 labels use `bb7`; recognition retains its historical vocabulary through scoped translation. Existing baseline search/scorer sources remain available for offline controls pending the specification's conditional retirement stage.

Validation evidence and rollout status are recorded in `engine-progress.md` and the final integration report. This local cutover is not deployment authorization.
