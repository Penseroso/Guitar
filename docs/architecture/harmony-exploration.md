# Harmony relationship explorer

Harmony owns relationships and their conditional explanations. Scale owns pitch collections; Chord owns a single chord and its voicing engine. There is no timeline, recommendation order, progression preset, or fingering optimizer in Harmony.

## Domain contract

- `src/domain/harmony/types.ts`: independent global `TonalFrame`, local `ChordRef` target (including bass), strict `RomanRef`, bounded observation context, and discriminated result status.
- `roman.ts`: shared spelling and canonical Chord engine formulas; unsupported inputs fail explicitly. Roman accidentals are relative to the major reference, including in minor. Applied numerals name the tonicized degree, not its extensions.
- `facts.ts`: pitch-class intersection/difference and directed root intervals. These facts do not establish harmonic function.
- `relations.ts`: deterministic, rule-scoped examples and context checks. Comparison examples do not imply a sequence. Guide paths are supplied illustrations, not an optimal voice-leading solution.
- `knowledge.ts`: versioned conditions, limitations, and source references. Jazz/pop family rules must not silently become classical claims.
- `audition.ts`: names and MIDI derive from the same resolved chords. Playback is illustrative keyboard-register audio, not guitar fingering. Cancellation prevents later scheduled chords; already-triggered release tails may ring out.

Statuses: `matched` means the supplied conditions match this bounded rule, not a universal analysis; `possible` preserves alternatives; `insufficient-context` names missing observations; `unsupported` never falls back to tonic/major.

## Shipped scope

Dominant and applied dominant, fifth motion, tritone comparison, ii–V/predominant preparation, major tonic-family alternatives, parallel-minor subdominant families, leading-tone/common-tone/passing diminished, and bounded cadence observations.

Targets currently require a major/minor third and natural fifth. Non-formula slash bass and unsupported accidental spellings are explicit unsupported results. Tonic-family, tritone, and borrowed seventh-chord family comparisons are scoped to jazz/pop. Passing diminished requires before/middle/target; it does not infer rhythm or actual bass from roots. Authentic-cadence labels require observed phrase ending, bass confirmation, final chord-tone soprano, basic V/V7, and a tonic triad. Larger phrase interpretation remains outside this window.

Scale links identify a **tonic reference or named source collection**, not a compatible-scale recommendation for the complete example. In particular, natural minor does not contain a raised leading tone or every chromatic approach.

## UI and mode boundaries

`components/guitar/harmony` provides key/root dials, compact swipe pickers, a single active relation, note/degree strips, illustrative guide movement, and cancellable audition. Swipe distance can traverse several values; vertical movement remains page scrolling. Sources and rule limits remain domain metadata, not a permanent UI disclosure. Context fields only appear for passing diminished and cadence. No reorder/add-bar/beat/preset controls exist.

`features/harmonic-workspace/links.ts` owns explicit transfers. Importing a new target clears stale observations and preserves the global key. A source ScaleRef remains provenance until the user explicitly adopts an Ionian/Aeolian key frame. Chord transfers preserve selected interpretation and bass; unsupported bass is not discarded. Harmony-to-Chord bass uses the existing filter, without changing Recommended/All ranking. Returning retains Harmony context; links do not globally synchronize roots or tonics.

## Deprecation and verification

The Progression entry point, editor state, timeline/presets, playback adapter, legacy domain implementation, and dnd-only dependencies are removed. Their previous revision remains recoverable in Git. Roman/spelling regression scenarios were rebuilt against strict Harmony contracts rather than copying legacy fallback or playback behavior.

Tests cover transposition/spelling, applied targets, minor subV, diminished ambiguity, missing context, cadence exclusions, exact MIDI, cancellation/error paths, explicit source adoption, and mode round trips. Keep the existing Scale/Chord suite intact. For UI changes run tests, lint, production build, and real-browser checks at 390/768/1335px, including keyboard focus, 44px targets, and reduced motion.
