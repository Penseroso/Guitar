# Chord exploration: current production contract

This document describes the post-Stage-10 live path. The authoritative contracts are [Engine Specification](architecture/engine-specification.md) and [Product Policy v2.1](architecture/product-policy-v2.md).

## Active path

The browser creates `src/components/guitar/chord/engine.worker.ts` through `useChordExploration.ts`. The worker delegates to `src/domain/chord/engine/workerService.ts`, which owns one `EngineSession` for the current request. `ChordExplorationPanel.tsx` renders exact worker results, and `voicing-playback.ts` plays the selected candidate's resolved notes.

The session composes the uncapped Structural Generator, independent Physical assessment, `classic-v1` deterministic ranking, `practical-vocabulary-v1`, and `recommended-surface-v2`. The current protocol is `engine-worker-v2`; stale revisions and incompatible cursors fail explicitly. Empirical runtime ranking is disabled.

The old template search, boolean bridge, legacy worker, alternate ranking pipeline, and legacy adapters were retired in Stage 10 after incoming-reference checks found no legitimate production caller.

## Surface and evidence meaning

Recommended means membership in the versioned product recommendation policy. PASS and UNCERTAIN are separate Physical evidence statuses. A candidate can be Recommended + UNCERTAIN, and a PASS candidate can remain outside Recommended. The UI preserves warning reasons on recommended candidates and does not describe outside-Recommended PASS candidates as physically unsuitable.

User-facing language does not claim ease, comfort, hand suitability, human playability, or improved preference. Details may say “Compact under the reference geometry” and expose the declared geometry assumptions. Exact source matches add attributed “Documented reference shape” metadata only; reference status has no score or tie-break effect.

Recommended ordering is exactly `classic-v1` over eligible candidates. All keeps every surviving candidate reachable with the same deterministic ranking contract. Filters operate on the selected surface without silently backfilling compact-empty Recommended requests from deeper tiers.

## Interaction contract

Root, quality, context, fret range, bass, top, sounding-string count, open strings, root inclusion, and formula coverage become validated engine requests. Changing the semantic request starts a fresh worker session; view changes remain within the current session. Pagination uses `surface-cursor-v2` and selection uses stable `shape-v1` allocation IDs.

The UI distinguishes loading, unsupported requests, empty exact results, and failures. Selection is explicit and independent of playback. Audio loads only after a play request and plays the actual selected pitches with octave and doubling preserved. Keyboard focus, visible focus states, dialog recovery, touch targets, reduced motion, and responsive reflow remain part of the product contract.

## Validation status

Stage 9 and Product Policy v2.1 validation established deterministic cross-runtime results, complete Recommended/All reachability, accessibility behavior, and the 480-request Recommended usability gate. Release Gate Closure separated correctness from browser-specific latency SLOs and found no current production blocker. Physical-mobile performance remains unmeasured non-blocking manual validation debt. Five-player task validation is future formative validation and is not a rollout gate; without it, the product must not claim improved preference, human playability, or comfort.

Stage 10 validation is intentionally bounded to the existing unit/integration suite, TypeScript, production lint, release build, architecture/import checks, focused Recommended/All smoke, and the existing lightweight hash/conservation check. See [Stage 10 cleanup](implementation/stage-10-cleanup.md) for the exact result.
