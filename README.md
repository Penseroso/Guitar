# Guitar

Guitar is a Next.js application for chord, scale, and Harmony relationship exploration. Music theory and engine behavior live in React-free TypeScript under `src/domain`; components render those results and manage interaction.

Scale exploration uses an independent tonic/scale selection, chord-card tone analysis,
source-backed scale identities, and parallel/sibling/parent comparisons. See the
[Scale architecture and interpretation contracts](docs/architecture/scale-exploration.md).

Harmony explores bounded chord relationships in a separate tonal frame. Chord and Scale selections can be opened there explicitly; returning to either workspace preserves the Harmony query. Scale's source collection is retained, with an explicit key-frame action only for Ionian and Aeolian. A supported slash bass opened in Chord becomes its Bass filter.

See the [Harmony contracts, supported scope, and Progression deprecation](docs/architecture/harmony-exploration.md).

UI changes follow the [THE MODUS design language and feature-level review checklist](docs/design-language.md).

## Current chord architecture

The live chord path is `guitar-engine/2`:

1. `useChordExploration.ts` owns the browser lifecycle and starts `engine.worker.ts`.
2. `workerService.ts` validates `engine-worker-v2` messages and owns an `EngineSession`.
3. `session.ts` composes the Structural Generator, Physical assessment, `classic-v1` ranking, and the versioned surface request.
4. `ChordExplorationPanel.tsx` renders Recommended or All results without recomputing engine policy.
5. `voicing-playback.ts` plays the selected candidate's resolved MIDI pitches.

The active default surface is `recommended-surface-v2` under `product-policy-v2.1`. Recommended membership and PASS/UNCERTAIN Physical status are independent. The All surface preserves access to every surviving candidate. Empirical runtime ranking is disabled.

Production code has no dependency on `.research` or research scripts. Frozen architecture, policy, research decisions, and release evidence are under `docs/`. Retired implementations and research tooling are recorded in [the Stage 10 cleanup record](docs/implementation/stage-10-cleanup.md).

See [the engine specification](docs/architecture/engine-specification.md), [Product Policy v2](docs/architecture/product-policy-v2.md), [current chord behavior](docs/chord-exploration.md), and [release-gate closure](docs/implementation/release-gate-closure.md).

## Development

```bash
npm run dev
npm test
npx tsc --noEmit
npm run lint
npm run build
npm run audit:chord
```

`npm run audit:chord` is a focused Recommended/All determinism and identity smoke check. Historical census, browser-matrix, memory, and research commands are intentionally outside the production workflow.
