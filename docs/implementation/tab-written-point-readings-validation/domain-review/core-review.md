# P4-B source-contract review: core interim

Status: core contract checks pass after B-D1 correction; UI/lifecycle gate pending.
No product files changed by this reviewer. Review is technical integration accuracy,
not empirical proof of actual harmony. P4-C/segmentation is not implemented here.

## B-D1 confirmed and fixed by author before freeze

Initial describeTabWrittenPointCandidate read raw CHORD_REGISTRY formula degrees.
Legacy Cdim7 registry retains [1,b3,b5,6], while canonicalTone/engineEntry declares
[1,b3,b5,bb7]. Initial descriptor returned MIDI69 as degree6/A4 instead of bb7/Bbb4.
A direct nominal-point probe reproduced it. Author replaced raw registry access with
engineEntry; the independent probe now gives 1/C4,b3/Eb4,b5/Gb4,bb7/Bbb4. No policy
change was needed. Author also added regression cases. This finding is resolved.

## Contract and source-call-path review

- analyzeTabWrittenPoint first calls inspectTabAcrossBarsWrittenNotesAt and immediately
  returns every noncomplete status. It does not assemble its own timeline or read the
  original document. Existing observer/proof controls point completeness.
- Complete nominal occurrences remain individually linked to interval objects before
  sorted distinct PCs are constructed. Lowest MIDI is described as lowest source note,
  never an ensemble bass. Two-PC interval class is unordered and explicitly named.
- buildTabChordCandidates is the A-gated helper, preserving full formula omissions,
  at-most-one-extra filtering and every alternative. Candidate roles are computed only
  on an explicit candidate request; no global chord context is established.
- Structural scale tones come from getScaleStructuralTones. No tension/caution/function
  engine is imported. Unsupported scale references produce diagnostics and unknown
  membership. Supplied modal collection does not supply a TonalFrame.
- Frame data is validated via frameChords; only supportedFrame is sent to the existing
  createTabCandidateFormatter. Invalid frame never supplies Roman inference. Base
  candidates remain unranked by either scale or key. Existing chromatic-root abstention
  and explicit major/minor frame support remain unchanged.
- New selected-candidate degree/spelling uses canonical engineEntry, shared spellDegree
  and alteration-aware written octave. Known degree with unsupported accidental spelling
  can still yield null name rather than invented enharmonic certainty (existing parser
  supports at most double accidentals).
- Current31 chord entries have zero duplicate formula PCs; current registered scales
  also have none. The first-PC map is therefore not a current-data-loss defect. Future
  degree aliases would require a new representation/contract review, not a speculative
  expansion in this change.
- Input reference objects are copied before output freezing. Existing query note/proof
  objects are already immutable. The result does not freeze/mutate user source context.
- Core work is O(active occurrences + bounded registry/formula work), with no per-point
  materialization of all score endpoints or N*C role lists. describe operates on only
  the requested candidate in O(N + bounded candidate/formula lookup). UI memoization and
  inactive-disclosure costs still require source review after UI freeze.

Independent probes: core-contract-probe.cjs / core-contract-results.json.
64 invalid scale/frame reference pairs preserve neutral notes/candidates and no Romans;
canonical dim7 and B#3/Cb4 octave assertions pass; D Dorian collection alone adds no key.
These are source-contract probes, not a replacement for independent musical fixtures.

Inspected core SHA256:
153a1a6c81fe2b26cf44c1d5a2851103a7ced7fc44ed2cbd9fa7b06fbb9ef1be

Remaining gate: prop chain, reference lifecycle, guarded disclosures/actions, snapshot
invalidation, focus/IME, render-time computation and source fingerprint conservation.
