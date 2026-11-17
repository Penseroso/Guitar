# P4 follow-up: supplied progression → TAB association contract

Plan-only source review of `/workspace/Guitar-p2` at `1339c6c`.
No product/test/repository document or Git changes, no new tests or UI experiments.
User choices about untimed-TAB support and sounding-pitch versus capo-shape symbols
are still pending; the recommendations below do not treat elapsed time as approval.

## Current contract and reusable parts

- [TabMoment](/workspace/Guitar-p2/src/domain/tab/types.ts:26) has a stable local ID,
  mutable index/measure/column, optional start and per-note duration. There is no stable
  Measure entity or persistent harmony part. `TabAnalysisContext` holds only one
  scale/chord/frame ([types:65](/workspace/Guitar-p2/src/domain/tab/types.ts:65)).
- The current selection chord is ephemeral: selection/edit clears it, whole-score
  Analyze ignores it, and edit history omits context. It cannot hold a saved progression.
  See [state:79](/workspace/Guitar-p2/src/features/tab-analysis/state.ts:79),
  [239](/workspace/Guitar-p2/src/features/tab-analysis/state.ts:239),
  [265](/workspace/Guitar-p2/src/features/tab-analysis/state.ts:265).
- The delivered P4-B `If C`/`If Am7` inspector is component-local hypothesis state,
  not user-authored accompaniment. Its existing separation must remain intact:
  [WrittenChordReadings:21](/workspace/Guitar-p2/src/components/guitar/scale/tab-analysis/WrittenChordReadings.tsx:21),
  [integration test:76](/workspace/Guitar-p2/src/components/guitar/scale/tab-analysis/WrittenChordReadings.integration.test.tsx:76).
- Exact score-relative coordinates exist only under an explicit regular-bar model,
  valid shared meter and known authored starts. They are nominal written/base-MIDI,
  not actual sound or general performance time:
  [observeTabAcrossBarsWrittenTime:95](/workspace/Guitar-p2/src/domain/tab/written-time-across-bars.ts:95).

## Placement alternatives

| Alternative | Useful scope | Cost / uncertainty | Recommendation |
| --- | --- | --- | --- |
| Stable position-boundary ranges | Works for order-only TAB; multiple changes within a bar; no invented durations. Connects note occurrences at their source positions to explicitly supplied harmony. | Must define boundary affinity, removed anchors, gaps, overlaps and final end. It proves an order/entry association, not sustained temporal overlap. | Recommended initial contract **if user confirms untimed TAB**. |
| Exact regular-time spans | Can describe a note's nominal overlap with more than one chord, including cross-bar intervals. Reuses exact rational arithmetic. | Requires an explicit timing model, chord placements, note starts/lengths or limited entry-only evidence. Meter edits and changed origins require review. Fails to serve ordinary untimed TAB as its only mode. | A valid alternative if exact-time-first is explicitly selected; otherwise a later separately typed placement mode. |
| Bar-only labels | Easy explicit shortcut for one chord per bar. | Measure numbers change on split/join and permit no within-bar change. Automatic one-input-chord-per-bar would invent alignment. | Useful **entry shortcut** that creates an explicit selected position range; unsuitable as the sole canonical storage contract. |

Do not automatically map `C Am F G` to four bars or uniformly spaced positions.
Text sequence order is not a supplied harmonic segmentation. Unplaced entries can
remain a draft until the user assigns boundaries. A full-bar placement shortcut is
safe only as an explicit action, with visible boundaries.

For a supplied harmony part, necessary information is: its own event identity, raw
input/notation kind, validated chord identity, supplied provenance, owned score
generation, and explicit placement boundaries. These are contract requirements,
not a committed object schema or new engine design.

## Proposed boundary and edit rules

| Situation | Conservative rule to evaluate |
| --- | --- |
| Range boundaries | Define half-open source boundaries, e.g. before a start position to before an end position, so a change-position note is assigned unambiguously. Current inclusive UI selection must be converted explicitly. |
| Gaps | No supplied harmony in the gap. Not NC, silence, previous-chord continuation or a guessed tonic. |
| Overlapping ranges / same-anchor conflict | Keep entered data, show conflict, and require explicit replace/re-boundary. First slice need not invent polychord/parallel-harmony semantics. |
| Next anchor / final open end | An explicit “until next change” rule can derive an end from the next user-placed start, not from guessed beats. A final entry needs an explicit end/“to score end” intention or remains open/unresolved. Do not silently stretch an unspecified last chord across future content. |
| Insert between valid anchors | If the contract is a range between boundaries, inserted positions inside belong to it; insertion outside remains outside. State boundary affinity rather than indexing from a frozen numeric selection. |
| Delete a note / clear last position | Keep the supplied progression. User accompaniment can remain meaningful where TAB has no pitched notes. The current last-position clear retains its position ID. |
| Delete a boundary position | Mark placement unresolved and keep raw chord data. Do **not** reuse cursor's nearest-survivor fallback as a musical repair. User explicitly reattaches it. |
| Split/join a bar | Position IDs survive; keep valid bindings and recompute display labels. Never rebind by old bar number. Existing split/join timing-origin refusal remains unchanged. |
| Replace/import a score | Identical parser IDs do not establish the same score. Detach/review bindings; optionally retain raw progression as unplaced input. Undo must restore the previous score and its bound harmony part atomically. |
| Retune/capo | Keep supplied absolute-pitch chord labels fixed under that chosen input convention; recompute note comparison and invalidate derived results. Never transpose labels silently or add capo to already computed MIDI again. Shape-relative names need a separate explicit conversion convention if requested. |
| Undo/Redo | Persisted supplied harmony edits must join the editable snapshot/transaction contract; existing ephemeral `context.chord` history is insufficient. Undo restores authored part, not stale computed interpretations. |

Existing mechanisms demonstrating these constraints:
[mapSelection:93](/workspace/Guitar-p2/src/features/tab-analysis/state.ts:93) is a cursor
fallback, [insert/delete:65](/workspace/Guitar-p2/src/domain/tab/editing.ts:65) preserves
survivor IDs, [split/join:146](/workspace/Guitar-p2/src/domain/tab/editing.ts:146) changes
bar coordinates, and [retune:175](/workspace/Guitar-p2/src/domain/tab/editing.ts:175)
changes MIDI. Tests already cover [ID/source:41](/workspace/Guitar-p2/src/domain/tab/editing.test.ts:41),
[split/join:18](/workspace/Guitar-p2/src/features/tab-analysis/input-state.test.ts:18),
[import/branch:232](/workspace/Guitar-p2/src/features/tab-analysis/state.test.ts:232).

## Input parsing and Roman provenance

- No generic chord-symbol-to-`ChordRef` parser was found in current product sources.
  Shared `parseNoteName`, canonical registry identities and
  [resolveChord:20](/workspace/Guitar-p2/src/domain/harmony/roman.ts:20) are reusable
  validation/spelling pieces. Either a structured chord entry or a new bounded symbol
  grammar is needed; a display suffix formatter is not already a reverse parser.
- Symbols and Romans must be distinguished before parsing: `C/E` is a supplied slash
  bass, `V7/V` an applied Roman expression. Do not guess unknown input, drop unsupported
  bass, or replace an invalid token with NC/tonic. `resolveChord` currently supports only
  formula-member slash bass; functional-rule applicability is a separate later check.
- [parseRoman:60](/workspace/Guitar-p2/src/domain/harmony/roman.ts:60) and
  [resolveRoman:74](/workspace/Guitar-p2/src/domain/harmony/roman.ts:74) are strict reusable
  primitives. Supported applied syntax is bounded `V7/...`, not arbitrary nested or
  extended/inversion grammar. [roman.test:45](/workspace/Guitar-p2/src/domain/harmony/roman.test.ts:45)
  proves `V7/vi` resolves E7 in C while `romanLabel(E7,C)` is ordinary `III7`: entered
  applied intention and current key-relative coordinate are distinct.
- **Roman alternative 1, recommended initial behavior:** explicitly resolve at commit
  using an input frame; save the resulting absolute `ChordRef`, original Roman and
  copied input frame as provenance. Changing the score's analysis key does not change
  the supplied progression. Primary display is the absolute chord; Details can say
  “entered as V7/ii in C”. New conditional Roman coordinates use the current analysis
  reference separately. Without an explicit input frame, keep the entry unresolved;
  never substitute C.
- **Roman alternative 2:** save a frame-linked expression whose resolution changes
  with key. This can be useful for deliberate transposition, but would make today's
  reference control rewrite authored progression content. Current frame changes are
  outside Undo snapshots, so quietly adopting this behavior is unsafe. Evaluate only
  as a later explicit reinterpret/transpose command with preview and one undoable edit.
- This preserves the frozen distinction that pinned key is a reference, not an input
  ranking prior or automatic rewrite of observed facts:
  [tonal-reference policy:228](/workspace/Guitar-p2/docs/architecture/tab-analysis.md:228).

## UI and note association boundaries

Prefer one contextual progression editor/lane near the score, selected range and short
resolved chord label, with parsing/frame/provenance details on demand. Reuse existing
selection gestures and root/quality controls where suitable; do not add a second global
key rail, separate analysis-scope toolbar or persistent explanation sidebar by default.
The supplied progression must visually differ from generated `?` alternatives and the
ephemeral `If ...` lens. Explicit Apply/Cancel is necessary for textual/IME drafts.

- Opening/reading/binding actions must not blur-commit a fret, discard a fractional
  start or run after IME composition finishes automatically. Reuse the capture-order
  protection in [TabScoreView:132](/workspace/Guitar-p2/src/components/guitar/scale/tab-analysis/TabScoreView.tsx:132)
  and [535](/workspace/Guitar-p2/src/components/guitar/scale/tab-analysis/TabScoreView.tsx:535),
  preserve Enter/Tab/Escape and restore focus to the originating range/action. Existing
  protection regressions: [integration:103](/workspace/Guitar-p2/src/components/guitar/scale/tab-analysis/WrittenChordReadings.integration.test.tsx:103).
- In untimed position mode, a note's entry position can identify the supplied chord
  for comparison. “Note entry” is not physical picking and does not prove persistence
  into a later chord. String is not Voice.
- A note spanning a chord boundary can have different **nominal time-local** roles only
  when both note and chord boundaries share a supported exact model. Keep one original
  note identity with multiple contextual comparisons; do not split it into invented
  attacks, truncate its written length, merge continuations or realize bends.
- If the note or chord change has unknown time, sustain across that boundary is unknown.
  Report entry-based membership separately; do not silently substitute it for whole-note
  temporal analysis. Missing harmony is missing context, not an erroneous note.

## GO gates and unknowns

Plan applicability is conditional GO for a bounded supplied-harmony association layer.
Implementation must wait for the user's placement and capo-notation choices, plus an
explicit supported parsing subset and final-end/deleted-anchor policy. The first review
fixtures should cover untimed assignment, two changes in one bar, gaps/conflicts, a
deleted boundary, split/join/import/Undo, retuning, and a long note over a known/unknown
change. Add tests of parsing errors and IME event order without claiming user-study data.
Automatic segmentation, local key or modulation are not made true by manually supplied
chords and should consume these facts later as separate competing interpretations.
