# P4-B: explicit written-point chord readings

Baseline: P3.3 `af2fb44`, then P4-A `5c5c219` on the shared
`feat/tab-timing-inspection` branch. P4-A's independent equivalence gate passed
before P4-B implementation started. No historical timeline branch was merged.

## Contract

`analyzeTabWrittenPoint(snapshot, globalTime, { scale, frame })` consumes an
Across-bars snapshot and calls its existing point inspector. Only a **complete
point query** permits interpretation. A globally partial snapshot can qualify
through the existing strict onset-exclusion proof. Partial/unreadable/unavailable,
outside-window/range and invalid queries supply no subset chord candidates.

Completeness means the complete nominal written note-occurrence population at
that point under the explicitly selected regular-bar model. It establishes neither
actual sound, silence, ensemble bass, sustain realization nor actual harmony.
The interval's validated MIDI supplies pitch class; raw cached pitch-class fields
are ignored. Original note/position IDs, string, measure, source indices, local
start and projected exact interval remain associated with every occurrence.

Two or more distinct PCs permit the existing shared formula alternatives. Octave
doubling changes the occurrence population, not the PC set or candidate identity.
The registry's alternatives, ordering, full-formula omissions and at most one extra
PC remain intact. No missing note/root is inserted into the observation. Zero or
one PC gives no chord formula candidates. A complete empty point inside a known
extent is not a generated rest; an entirely empty source still has no extent.

References are explicitly supplied and copied. Scale degrees/membership describe
the registered scale; key-relative candidate spelling/Romans remain conditional
coordinates. Unsupported references abstain with diagnostics. References never
rerank candidates, infer a key or import the selection-scoped `context.chord`.

`describeTabWrittenPointCandidate(result, key)` computes note membership and formula
degrees for one explicitly selected hypothesis. Omitted degrees stay metadata;
outside-formula notes acquire no automatic passing/tension/avoid/error role.
The lowest displayed note is only the lowest observed nominal guitar MIDI.

## UI and lifecycle

The existing **This bar** view and **Analyze** retain their contracts. In **Across
full bars**, **Chord readings** is closed initially. Opening it analyzes only the
current complete point. Facts precede optional formula alternatives; no candidate
is preselected. Selecting an alternative applies an ephemeral hypothesis lens,
not a saved chord label or user-authored harmonic context. Original occurrences
and alternatives use bounded pages.

Changing a complete point refreshes an open inspector and clears its candidate
and pages. A partial/unavailable point hides the inspector and its former choices.
Changing scale/key references closes/remounts only this child; the written snapshot,
cursor and source-note page survive. The user reopens explicitly. Existing source,
bar, instrument, meter and history invalidation rules remain in force.

Every new action uses the existing timing action guard, including pointer capture
before blur, keyboard activation, disclosure and paging. Pending fret/fraction or
IME input must be explicitly committed/cancelled first; no retry is queued.
Reading actions do not edit the score, selection, history or existing analysis.

Recognition is demand-driven for one point; formula degrees are computed only for
the selected candidate. There is no full-score point-by-candidate analysis, new
runtime dependency, sounding timeline, segmentation or tonal inference.

## Verification and sequential decision

Synthetic formula assertions and invariant checks measure the stated contract, not
real-world chord-recognition accuracy or user comprehension.

The final relevant regression suite passed **46 files / 1,257 tests**, including
the unchanged Scale/Chord/Harmony and source-based TAB behavior. Whole-project
TypeScript, changed source/test ESLint and the production build passed. The build
used for browser acceptance is `aGxq0JQ61iHdPBf_UeD8a`. Source review confirms 129
engine/policy/dependency files and both A-gated runtime files remained unchanged;
the combined manifest separately checks 23 protected baseline files and preservation
of the historical worktree's five local changes.

Independent core checks passed 11 manual groups, 108 metamorphic cases, 42
partial/edge queries, 15 finite completions across six queries (90 comparisons)
and seven invalid queries. The
manual constraints do not use the shared helper to invent their expected formulas.
C6/Am7 ambiguity, missing-fifth metadata, rootless abstention, extra-PC limits,
two-PC doubling and MIDI-derived PCs are covered. A separate source review checked
64 malformed scale/frame pairs and the observation/inference call boundaries.

The source review found and corrected use of a legacy raw diminished-seventh `6`;
selected roles now consume the existing canonical `engineEntry` formula (`bb7`).
B♯/C♭ written octaves and this diminished-seventh case have regressions. Registry
entries currently have unique formula PCs; a future registry with multiple degrees
for one PC needs an explicit degree-ambiguity contract before extending this adapter.

Host Node stress checks used three patterns with 6,144 active source occurrences,
seven samples each. Point-analysis medians were 5.30–15.59 ms; one selected formula
description 3.49–3.86 ms. Serialized results were about 2.49 MB. These are measured
host costs, not browser/device latency guarantees, and support retaining the
demand-driven single-point boundary rather than precomputing every score point.

UI regressions include persisted point/page reset on backtracking (an initial derived
fallback could resurrect a hypothesis), and omission of an unavailable theoretical
note spelling rather than displaying `null`. The domain retains the known formula
degree and abstains beyond the shared accidental range. No spelling engine expansion
or harmonic interpretation rule was added to fix either issue.

Independent production Chromium runs passed at **390 / 768 / 1335 px** with reduced
motion and no page/console errors: seven native interaction groups per width,
retained P2 browser regressions, and ten visual/state contract groups per width.
New controls preserve pending valid/invalid frets, fractions and native CDP IME
through pointer/keyboard activation. Candidate/note pages, child-first Escape,
off-page Clear focus, complete-point backtracking and reference-only child reset
passed. Visible targets meet 44×44 px with no page overflow. Quiet disclosures,
conditional As/If labels, pressed underlines and detail-on-demand passed the
feature's NON VERBATIM / INTUITIVE review. These are not participant usability or
physical-device/OS-IME certifications.

**Combined P4-B: GO.** Existing This bar/Analyze, source edits, Undo/Redo, input
protection and engine policies retain their meaning. P4-C proceeds to assessment
only; its [next gate](tab-p4-next-gate.md) does not authorize expanded inference.

Evidence: [combined verification](tab-written-point-readings-validation/verification.json),
[independent source review](tab-written-point-readings-validation/domain-review/report.md),
[manual oracle/stress/native review](tab-written-point-readings-validation/independent/report.md),
[visual/state review](tab-written-point-readings-validation/visual/report.md),
[tests](tab-written-point-readings-validation/tests.txt),
[build](tab-written-point-readings-validation/build.txt),
[artifact fingerprints](tab-written-point-readings-validation/artifact-manifest.json).
Three text archives have Git-safe whitespace normalization; the artifact manifest
retains both raw execution and archived digests. Runtime source fingerprints are
unchanged.
