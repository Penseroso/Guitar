# Harmony relationship explorer

Harmony owns relationships and their conditional explanations. Scale owns pitch collections; Chord owns a single chord and its voicing engine. There is no timeline, recommendation order, progression preset, or fingering optimizer in Harmony.

## Domain contract

- `src/domain/harmony/types.ts`: independent global `TonalFrame`, local `ChordRef` target (including bass), strict `RomanRef`, bounded observation context, and discriminated result status.
- `roman.ts`: shared spelling and canonical Chord engine formulas; unsupported inputs fail explicitly. Roman accidentals are relative to the major reference, including in minor. Applied numerals name the tonicized degree, not its extensions.
- Lens controls **rule applicability only**, not Roman notation. Both Jazz/pop and Classical use the same major-reference accidentals: C minor's E♭, A♭ and B♭ major chords are ♭III, ♭VI and ♭VII. The UI states this fixed notation convention; Classical is not a switch to traditional minor-key Roman spelling.
- `facts.ts`: pitch-class intersection/difference and directed root intervals. These facts do not establish harmonic function.
- `target-policy.ts`: separates key-center root, global tonic-family eligibility, and a local resolution target. A local dominant-quality target may support a possible applied approach without becoming global tonic harmony.
- `connections.ts`: derives and validates canonical-degree voice edges; rendering and line audition consume the same edges. Common-tone neighbor spelling does not change the Chord registry identity. Contract:
  - Every motion example declares its transitions; nothing is paired by array position.
  - A source tone has at most one edge. Several sources may converge on one destination tone (e.g. vii°7 → I).
  - `held` exactly when the pitch class is retained. A common tone is never also drawn as a resolution.
  - `guide` only on the 3rd/7th of a seventh chord in descending-fifth motion or a tritone-substitute dominant. Triads never carry guide tones.
  - Functional basis (`tendency`/`guide-tone`): common tones hold, the leading tone rises to the destination root, a chordal 7th and the leading tone's tritone partner fall by step. Other tones stay unconnected, e.g. the doubling-dependent 3rd of vii°7.
  - Triadic fifth motion uses the `nearest` basis: only the moves that every minimal step-wise one-to-one mapping agrees on. Ties stay unconnected. It is labelled voice leading, not guide tones.
  - Edges are pitch-class correspondences. Destination bass/inversion does not change them.
  - `completeCommonTones` gives curated edges (deceptive, plagal, Phrygian, backdoor) every held common tone. A destination may already receive a resolution; a source never forks. Half/unclassified endings and passing links stay bass-path only by meaning.
- `ending-observation.ts`: pattern-specific evidence requirements for endings, separate from illustrative approaches. An authentic/Picardy V–I pair uses `connectChords`, so its edges equal the dominant relation for the same chords. Explicitly non-final motion is not a cadence; unknown phrase position remains missing context.
- `relations.ts`: deterministic, rule-scoped examples and context checks. Comparison examples do not imply a sequence. Voice edges come from `connections.ts` rules or a rule-curated list (backdoor, common-tone, passing, cadence), never an optimal voice-leading solution.
- `knowledge.ts`: versioned conditions, limitations, and source references. Jazz/pop family rules must not silently become classical claims.
- `audition.ts`: names and MIDI derive from the same resolved chords. Neither playback is a performed or guitar voicing, nor an optimal voice leading. Cancellation prevents later scheduled chords; already-triggered release tails may ring out.
  - **Play relation** is a canonical audition: each formula tone sounds once. The root is at 48+root; simple degrees (≤7) stack within the octave above it; compound degrees (♭9/9/♯9/11/♯11/♭13/13) sit an octave higher, taken from the degree number (registry extension intervals are pitch classes). A formula slash bass leaves the stack and sounds once, just below the rest. The shape is identical in every key.
  - **Hear guide tones / Hear voice lines** realize only the validated edges the diagram draws (guide edges alone when every step has them). A line starts at its chord's canonical pitch and each edge moves to the nearest octave, so the edge's direction and size are audible. Comparisons have no line playback: they are not progressions, and index-paired audio would invent a correspondence.

Statuses: `matched` means the supplied conditions match this bounded rule, not a universal analysis; `possible` preserves alternatives; `insufficient-context` names missing observations; `unsupported` never falls back to tonic/major.

## Shipped scope

Dominant and applied dominant, fifth motion, tritone comparison, ii–V/predominant preparation, major tonic-family alternatives, parallel-minor subdominant families, jazz/pop backdoor approaches, leading-tone/common-tone/passing diminished, and bounded authentic, deceptive, plagal, half-cadence, Picardy-third and Phrygian-ending observations.

Backdoor offers ♭VII7–I and iv7–♭VII7–I only for an eligible major tonic family under the jazz/pop lens. It remains `possible`, not a next-chord recommendation. Common-tone diminished exposes retained and neighboring voices, including converging voices. Passing and leading-tone readings may coexist with independent statuses; confirmed chromatic bass alone is insufficient without an observed passing rhythmic role. Ending rules do not require soprano for every family, but authentic PAC/IAC differentiation does. Plagal closure and deceptive-cadence terminology remain explicitly convention-dependent.

Targets currently require a major/minor third and natural fifth. Non-formula slash bass and unsupported accidental spellings are explicit unsupported results. Tonic-family, tritone, and borrowed seventh-chord family comparisons are scoped to jazz/pop. Passing diminished requires before/middle/target; it does not infer rhythm or actual bass from roots. Authentic-cadence labels require observed phrase ending, bass confirmation, final chord-tone soprano, basic V/V7, and a tonic triad. Larger phrase interpretation remains outside this window.

Root at the key center is a pitch fact, not tonic function. Tonic-oriented examples explicitly allow major, maj7, 6, maj9, add9 and 6/9 targets; minor, m7, m6, m(maj7), m9, m(add9), m11 and m13 targets form the minor family. These are bounded-rule eligibility lists, not universal functional analyses. Global tonic eligibility additionally requires the frame's root and mode to match. Tonic-substitute and subdominant-minor families require a major tonic-family target in a major frame. Cadential tonic rules remain narrower (authentic: triad only).

Other third-and-fifth targets such as C7/C9/C7♭9 retain illustrative dominant/preparation/leading-tone/tritone approaches with `possible` status and an explicit context caveat, never automatic tonicization or tonic-family substitution. A same-key-center non-tonic-family target keeps structural source Romans; a non-key-center local target can name a possible applied destination (D7 → G7 in C: V7/V). Same-root parallel-mode tonic-family targets retain V7/i or V7/I. No blues-tonic function is inferred solely from the target quality.

Results carry per-reading evidence, missing context and pass/fail/unknown checks. An example is explicitly an illustration or a supplied chord observation; even an observed chord sequence's voice paths are illustrative, not a transcription of performed voices. Contradictory evidence is not represented as merely missing evidence. No dominant-succession editor, turnaround generator, pivot/modulation analyzer or automatic voicing optimizer is included.

Scale links identify a **tonic reference or named source collection**, not a compatible-scale recommendation for the complete example. In particular, natural minor does not contain a raised leading tone or every chromatic approach.

## UI and mode boundaries

`components/guitar/harmony` provides key/root dials, compact swipe pickers, a single active relation, note/degree strips, a role-based correspondence diagram, and cancellable audition.

The diagram claims harmonic role and tone correspondence only, never pitch height or register. Each chord stacks its own formula roles (root, 3rd, 5th, 7th, extensions) with the root on the bottom row; a tone never moves to straighten a line, so line slope is not melodic direction. Selection detail states direction in words (½ step up, whole step down, common tone). A supplied slash bass keeps its role row and carries a `bass` badge (analytical bass state). Actual guitar voicing, inversion shapes and fret/string allocation belong to Chord. Swipe distance can traverse several values; vertical movement remains page scrolling. Sources and rule limits remain domain metadata, not a permanent UI disclosure. Context fields only appear for passing diminished and cadence. No reorder/add-bar/beat/preset controls exist.

`features/harmonic-workspace/links.ts` owns explicit transfers. Importing a new target clears stale observations and preserves the global key. A source ScaleRef remains provenance until the user explicitly adopts an Ionian/Aeolian key frame. Chord transfers preserve selected interpretation and bass; unsupported bass is not discarded. Harmony-to-Chord bass uses the existing filter, without changing Recommended/All ranking. Returning retains Harmony context; links do not globally synchronize roots or tonics.

Changing an observed bass preserves neighboring chords but invalidates prior bass/rhythm confirmation. Root or quality changes to the target reset observation context. Conditions and alternate-reading evidence are progressively disclosed; uncertainty remains visible when collapsed.

## Deprecation and verification

The Progression entry point, editor state, timeline/presets, playback adapter, legacy domain implementation, and dnd-only dependencies are removed. Their previous revision remains recoverable in Git. Roman/spelling regression scenarios were rebuilt against strict Harmony contracts rather than copying legacy fallback or playback behavior.

Tests cover transposition/spelling, applied targets, minor subV, diminished ambiguity, missing context, cadence exclusions, exact MIDI, cancellation/error paths, explicit source adoption, and mode round trips. Keep the existing Scale/Chord suite intact. For UI changes run tests, lint, production build, and real-browser checks at 390/768/1335px, including keyboard focus, 44px targets, and reduced motion.
