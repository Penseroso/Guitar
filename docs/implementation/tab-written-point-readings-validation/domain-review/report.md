# P4-B independent source-contract review

Verdict: **GO for source/integration contracts after the corrections below.**
This is not the overall browser/product gate or empirical validation of actual harmony.
The independent challenge agent owns manual-oracle/stress results, other reviewers own
browser/interaction gates, and root owns the combined B acceptance decision. No P4-C
segmentation implementation has been reviewed or authorized by this source verdict.
No product files were modified by this reviewer.

## Corrected findings

1. **B-D1 canonical diminished seventh (core): resolved.** Initial descriptor read legacy
   CHORD_REGISTRY degrees and returned Cdim7's MIDI69 as6/A4. engineEntry now supplies
   canonical bb7/Bbb4. Independent post-fix contract probe confirms all four degrees/names.
   This preserves existing policy; it does not amend the registry or recognition engine.
2. **B-D2 nullable spelling rendered literally (UI): resolved.** With normal F#major
   reference and sourcePCs5,9,0,3,8, candidate5:hendrix-7-sharp-9 is presented as E#7#9.
   Its #9 would require F###, beyond shared double-accidental support. The core correctly
   returns known degree#9 with name=null; the initial UI interpolated '#9 · null · Formula
   member'. WrittenChordReadings.tsx:106 now joins present fields only, retaining '#9 ·
   Formula member'. It neither fabricates a neutral fallback spelling nor adds triple
   accidental support. The author regression covers this source-confirmed example.
3. **Root-found revisit lifecycle defect: correction verified in source.** A derived
   fallback alone hid old selection/page while leaving old point state stored; revisiting
   the original point could resurrect it. WrittenChordReadings.tsx:23-26 now persists the
   reset when snapshot.data or exact point identity changes. Both pages and selection are
   reset, not merely masked. The new regression revisits the initial point after moving.

## Verified source contracts and paths

- written-point-analysis.ts:70-73 calls existing inspectTabAcrossBarsWrittenNotesAt,
  returning noncomplete statuses before recognition. No raw document re-read or custom
  timeline, tie, rest, mute, technique or performed-sound realization is added.
- :98-115 retains each nominal source occurrence and source interval, then derives sorted
  distinct PCs and lowest source MIDI. Two-PC interval class ignores register/direction.
  Complete empty queries remain written-population facts, not actual silence or rests.
- :105-110 invokes the A-gated buildTabChordCandidates and existing contextual formatter.
  No preferred chord is adopted, context does not rank/filter candidates, and full-formula
  omission/extra/alternative data remains intact. C6/Am7 ambiguity and missing5 are not
  removed by this integration. Lowest guitar note never establishes ensemble bass.
- :75-97 copies and validates optional reference scale/key inputs. Unsupported references
  diagnose without fallback; only supportedFrame reaches the formatter. Scale degrees
  remain structural, modal collection alone creates no key, and Romans are conditional
  supplied major/minor coordinates. No function, cadence, applied-dominant, local center,
  modulation or segmentation inference is imported or generated.
- :119-137 computes canonical formula roles only for a requested candidate. Current31
  chord entries and registered scales have zero duplicate-PC formulas; the first-PC map
  is not presently lossy. Future degree aliases require contract review, not expansion now.
- TabAnalysisWorkspace.tsx:59,196 -> TabScoreView.tsx:58,568 ->
  AcrossBarsWrittenTimePanel.tsx:19,115 -> WrittenChordReadings is the current prop chain.
  B disclosure is in the explicit across-bars model only; the existing local view is
  unchanged. readingReferences is memoized from scale/frame, not selection or notices.
- AcrossBarsWrittenTimePanel.tsx:26-27 remounts only the reading child when reference values
  change. Parent time point/page/window remains; new child starts folded and unselected.
  A complete->partial transition unmounts readings; returning complete starts clean.
  TabScoreView.tsx:115-130 rejects document/bar-stale snapshots before display, and removes
  them permanently; undo does not revalidate the stored old snapshot. No auto observation.
- WrittenChordReadings.tsx:27-32 defers analysis while folded; stable snapshot/time/reference
  inputs memoize recognition. Paging, role selection, notices and callback identity are
  absent from recognition dependencies. Only selected candidate roles allocate an O(N)
  description/map, never an N*all-candidates matrix. All notes and alternatives render
  in pages of8; no eager all-endpoint or whole-score recognition loop is introduced.
  Opening at a complete point performs one additional existing inspector query in the
  adapter, beyond the parent's query. This is bounded O(N) validation, not a new slicing
  algorithm or a measured mobile performance claim. Closing/reopening intentionally
  makes a new opt-in analysis; no promise of cross-open result caching is made.
- WrittenChordReadings.tsx:53-76,80-85,119-137 guards all controls/native disclosures via
  onAction. TabScoreView.tsx:535-540 still intercepts pointer-down before blur and rejects
  Enter/Space/click activation. No queued action runs after confirmation/composition.
  Escape stops at an open child, checks composition and guard, closes only that inspector
  and focuses its connected summary; the parent written-time panel stays open. Clear
  returns focus to the selected visible candidate or formula summary; page-boundary focus
  targets remain connected/enabled. Browser event-order truth is separately gated.
- Imports contain no forward generator, Physical/Recommended/rank policy, worker/audio,
  source mutation or additional probability/interpretation engine.

## Evidence and limitations

- Independent core-contract probes: canonical Cdim7, B#3/Cb4 written octave,64 invalid
  scale/frame pairs preserving neutral candidates/no Romans, modal scale without key.
  See core-contract-probe.cjs and core-contract-results.json. They complement, not replace,
  the challenge agent's independently expected musical cases.
- Authored regressions reviewed: nullable spelling, durable revisit reset, folded no
  analysis, explicit roles, action guards, composing Escape and6144-occurrence bounded
  rendering. Author reports10child tests+scoped lint passed; this reviewer did not rerun
  that same suite or claim browser execution during source review.
-129 protected engine/policy/dependency sources still match af2fb44 baseline; A-gated
  analysis/helper runtime bytes are unchanged. Hash evidence: runtime-source-hashes.json.
- Frozen reviewed source: TSarchive.txt. Core SHA153a1a6c81fe2b26cf44c1d5a2851103a7ced7fc44ed2cbd9fa7b06fbb9ef1be;
  child SHA253af1142127e5a92a08dd15d59f03924c179562e526d8ee409e043ceeb1c809.
- Runtime measurements, physical mobile/IME compatibility and actual harmony correctness
  are not established by source inspection. Required combined B checks remain root-owned.
