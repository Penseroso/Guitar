# Plan review notes

Baseline product revision: `1339c6c4af10e7c2b8fc87593cc85ccbddfdc862`.
This is root's synthesis of three read-only subagent investigations/reviews, not
new test execution, actual-user testing or product implementation approval.

- Domain review traced existing code/tests: arbitrary supplied chord is independent
  of recognizer eligibility; relation generation is not sequence observation;
  observed ending requires its original missing-evidence checks; theoretical
  guide connections and curated chord-scale tension text are not melodic-role detection.
- Product review compared source-ID ranges, exact spans and bar-only labels. It
  identified ephemeral context/history limitations, score-generation association,
  deleted anchor handling, Roman frame provenance and concert-pitch/capo conventions.
- Challenge review used musical counterexamples and reviewed the complete draft.
  It supported useful source-order analysis without waiting for time/key automation,
  while distinguishing nominal intervals, actual voices and harmonic segments.

Corrections applied to the plan after independent review:

1. Existing `texture: monophonic` is a column-count classification, not proof of
   nonoverlap or a performed voice. Untimed single-note source sequences remain usable.
2. New progression guards preserve the existing Analyze valid-fret commit contract.
3. Import history can restore score/context atomically; Reset keeps its existing
   history-clearing behavior. No new Reset Undo is implied.
4. Logical score identity, document and supplied harmony restore together. Derived
   snapshot revision is a different concept.
5. An item has one placement type initially. Inclusive source endpoints and adjacent
   half-open exact spans use different overlap predicates; no implicit mixed merge.
6. Roman resolves under the explicitly supplied entry frame, with absolute chord
   fixed afterward. Reinterpretation/transposition is a separate future command.
7. Automation research can begin independently of the product release sequence.
   Oracle segments→key, oracle key→segmentation and joint/end-to-end are separate arms.
8. Development/calibration/test use song/arrangement/transposition groups. Boundary
   matching/tolerance reflect annotation resolution. Acceptance criteria are informed
   by dev exploration and frozen before untouched held-out inspection.

Recommendation: plan GO for supplied-context stages within their stated contracts,
research GO for automation, no blanket production GO for automatic inference.
The unanswered placement/pitch-basis preferences remain declared planning assumptions,
not user confirmation or an implementation change. No extra test suite or production
build was run for this documentation-only task.
