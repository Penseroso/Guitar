# P4-B independent source-contract review checklist

Prepared before runtime freeze; this is a review plan, not a passing verdict.
Baseline for P4-B: A gate committed 5c5c219; prior engine-policy reference af2fb44.
Review scope: new written-point analysis and its UI call paths, read-only product.
Independent manual-oracle/browser validation belongs to the challenge agent.
No segmentation/P4-C implementation or engine-policy amendment belongs here.

## Observation and inference boundary

- Trace exact callers: frozen local/across snapshot -> existing point inspector ->
  complete query only -> new point adapter -> child render. No raw document re-read,
  copied interval slicing, endpoint comparison, inferred sounding state or marker
  realization in the adapter. A local bar excludes carry-in; regular-origin across
  projection is an explicit model, not performed sound.
- Noncomplete/unavailable/invalid/outside statuses cannot produce a candidate or Roman
  from the known subset. Point-complete proofs in globally partial populations may
  analyze the proven active set only. Complete empty means no nominal written source
  notes at that point, not performed silence or a rest.
- Keep occurrence/multiplicity information before pitch-class deduplication. A duplicate
  octave is still an occurrence; union PCs are recognition input, not a replacement
  for notes. Min MIDI is the lowest represented guitar source note, not ensemble bass.
- Same-string overlapping authored source intervals are not silently repaired or
  considered physically playable. Their nominal projection and source IDs stay true.
  Existing metadata exclusions are not reinterpreted as performed voice logic.

## Recognition, omission and reference semantics

- Use the A-gated buildTabChordCandidates only. Preserve exact/incomplete/added-tone,
  every alternative and source-input populations; confidence is not probability.
  MissingPitchClasses from the recognizer is not a full-formula omission list.
- Counterexamples: C/E/B -> Cmaj7 missing5; C/E/G/A -> C6 and Am7 exact ambiguity;
  E/G/Bb cannot silently become rootless C7 under recognition-v1; a 12-PC collection
  must not expose hundreds of unconstrained raw candidates as certainty.
- Eligibility for lone note, exactly two occurrences and octave-doubled two-PC groups
  must be explicit and consistent with existing TAB facts. No fabricated chord/bass
  context is established by candidate[0], order, note count or a pinned reference.
- Structural scale degree and contextual chord spelling are separate fields. A scale
  collection's tonic is not the current chord root or detected global key.
- Reference-scale membership is fact under the supplied collection. Nonmembership
  cannot establish tension, avoid/passing tone, wrong note or harmonic function.
- Supplied TonalFrame is an optional major/minor coordinate frame; validate it without
  any major/tonic default. Only existing contextual formatter semantics supply inferred
  Roman labels; chromatic-root abstention must not be widened incidentally.
- Malformed/unsupported scale/key references: no throw, invented fallback, candidate
  filtering or note relabeling as harmonic truth. Preserve key-free observed facts.
  Unknown scale IDs, out-of-range tonics, invalid mode/lens/spelling are adversarial cases.
- Legacy interpretChordAgainstTonalCenter and exploreRelation illustration generation
  cannot act as score observers. No cadence, applied-function, local tonal center,
  modulation, progression or segmentation conclusion is within the B adapter.

## Lifecycle, guards and hidden runtime costs

- Reference props must actually reach both local/across child paths from current TAB
  context; context removal/change updates reference readings without a new score write
  and without silently changing the pinned frame or the time-observation scope.
- Document/bar/scope/point invalidation keeps the existing snapshot association rules.
  Source change hides results immediately; undo cannot resurrect the old snapshot.
  Query or disclosure actions add no history and do not refresh legacy Analyze results.
- Every new child action/disclosure invokes onAction; parent pointer-down and key/click
  guards still run before blur or native details toggling. A failed guard must stop the
  action with no deferred retry. IME Escape and Enter do not close, save or cancel drafts.
- Child Escape closes only its own disclosure before the existing parent close route.
  Focus return must target a still-connected trigger; no document-global query/focus.
- Expensive recognition is opt-in and memoized for stable query/reference inputs. Page,
  open/close details, rerender and internal callback identity should not recompute all
  12*registry recognition loops. No eager per-endpoint or full-score candidate scan.
  Bounded rendered result rows must not conceal unbounded synchronous preparation.
- Audit imports for forward generation, Recommended/Physical/rank policies, audio,
  worker calls, timers, mutation, new observer rebuilds or duplicate recognition tables.
  Compare protected source hashes; no frozen-policy source changes are allowed.

Expected final evidence: source call-path references, confirmed defects vs limitations,
manual inline probes only for unresolved semantic questions, runtime fingerprints,
strict B verdict within this review scope. This checklist itself asserts no validation.
