# P4-B independent core and native-browser verification

**GO for the declared complete-point formula alternatives and explicit hypothetical reading.** No product defect remained in the tested frozen build. This reviewer changed no product/tracked tests, dependencies, branch, commit or server. Phase A had already passed and been committed as `5c5c2197d2884e58d7f9b7631d21d083ee64212e` before B execution. [B-entry fingerprints](before-b-fingerprints.json) and [final source/build/driver/result hashes](source-fingerprints.json) bind this evidence. Build ID: `aGxq0JQ61iHdPBf_UeD8a`; point-core SHA: `153a1a6c81fe2b26cf44c1d5a2851103a7ced7fc44ed2cbd9fa7b06fbb9ef1be`.

[Independent oracle, archived as text](core-oracle.ts.txt), [manual constraints](manual-fixtures.json) and [raw results](core-results.json) establish the following:

- **11 manual groups:** C major; C6/Am7 ambiguity; rooted C7(no5); absent-root prohibition; two-PC power-5; one-extra versus two-extra policy; one-PC abstention; complete interior gap; canonical diminished-seventh degree/spelling; selected-formula membership. Required/prohibited alternatives are hand specified, not generated from the production registry. They are deliberately not an exhaustive oracle for every registered formula.
- **108 metamorphic comparisons:** twelve transpositions of five collections; source reversal and octave doubling; supplied scale/frame changes; unsupported references; ignored selection-chord input; identity and equivalent-fraction changes; corrupted raw pitchClass; immutable snapshot/reference behavior. Candidate sets are transpose-covariant; absolute-PC tie order is not falsely required to survive wrapping. Context/permutation/doubling preserve candidate identity and order.
- **42 partial/edge queries**, plus **seven invalid queries**, retain eligibility and status precedence. Noncomplete results expose no known-subset notes/candidates. Fifteen independently filled missing-field completions produce **90 completion/query comparisons**; every reported complete set agrees with every enumerated completion. The raw legacy counter is named `completionWorlds`, but counts query/world pairs, not90 distinct worlds.
- MIDI drives pitch classes, retaining each source occurrence. A throwing source-association getter is never read. Source/context edits after observation do not alter old results. Empty source remains outside-range; an empty complete interior point has no chord candidates and asserts no actual silence.
- Selecting C7(no5) never adds G to observed notes. Db outside a C-major formula remains outside that formula, with no passing/tension/function classification. Cdim7's A4 is conditionally `bb7 / B♭♭4`, using canonical formula semantics. Unsupported scale/key references diagnose and abstain; selecting/reference changes do not retune notes or reorder candidate hypotheses.

The canonical dim7 descriptor issue and complete-point backtracking issue were found by the other reviewers/root and fixed **before this final run**. This report verifies those fixes and does not relabel their discovery as this reviewer's finding.

Seven host-Node samples per synthetic **6,144-active-occurrence** pattern cover triad, C6/Am7 and six-PC collections. Point-analysis medians were **5.30–15.59ms**; explicitly selected descriptor medians **3.49–3.86ms**. Results serialize to approximately **2.49MB**. Candidate objects contain no eager per-note role matrix. Costs exclude observer construction, browser rendering and physical devices; these are neither p95/SLO certification nor a runtime ranking. Finite metamorphic/completion checks are not exhaustive musical or rational proof.

[Native driver](browser.py) / [native events and results](browser-results.json) used fresh production port3003 with system Chromium156, reduced motion and **390/768/1335px** contexts. The390 context used touch, others mouse. All scores, timings, meter and references were entered through visible controls; no store/React state injection was used. Each width passed seven groups:

1. Readings start closed. C6 and Am7 are both unselected until explicit choice;12 occurrences remain distinct. Clear removes formula roles. A partial point unmounts readings and returning never revives a choice.
2. Valid12/invalid37 pending frets block summary/formula/choice/Clear/note-page actions and existing scope/page/point/View/Check actions through pointer and Enter/Space. Clean Escape closes the child first, focuses its summary, then closes the parent to View.
3. Pending fractions survive actual Shift+Tab traversal and attempted pointer/keyboard actions. Explicit Cancel restores committed0.
4. Native CDP composition and finalized-but-uncommitted text protect new controls and cursor/scope actions. Trusted composition-start events are retained. Composing Escape does not discard input and no delayed action runs afterward.
5. One Undo reaches the last real Set start edit, proving inspection/choice/page actions add no score history. Reference changes close/reset only the child; score/meter/import/Undo/bar changes invalidate the snapshot. Fresh View defaults to This bar.
6. A real imported dim7 shape yields12 alternatives on8+4 pages. Canonicalbb7 spelling is visible. Clearing while the selected button is off-page focuses Formula alternatives; candidate paging obeys pending-input guards.
7. Two **complete** points0→1→0 retain the disclosure while never resurrecting the original hypothetical selection.

All three widths recorded **zero page/console errors**. Final populated-reading geometry measured14 visible targets, all at least44×44px, with zero horizontal overflow. Root's separate visual audit is separate evidence. Native CDP input is not physical-device, participant-usability or OS/IME-specific certification.

The [retained P2 driver](p2-regression.py) and [fresh results](p2-regression/results.json) also passed all three widths: native IME, diagnostics/input guards, Escape hierarchy, explicit Set start/Tab commit and history invalidation. Output paths are local to this evidence directory.

Final source hashes match root's frozen verification, including **23 protected source/dependency files**. No further test run was needed after these passes. The earlier `before-fingerprints.json` is preparatory context captured during Phase A work; `before-b-fingerprints.json` is the committed A→B gate identity.

Reproduction, from `/workspace/Guitar-p2`, with a separately started production server on3003 and the installed Chromium/Python tooling:

```sh
node --import tsx /workspace/p4-validation/b/independent/core-oracle.ts
python /workspace/p4-validation/b/independent/browser.py
python /workspace/p4-validation/b/independent/p2-regression.py
```

Chromium execution requires the approved less-restricted execution context because the default sandbox blocks crashpad startup. The `.ts.txt` copy is the repository-safe archive. This GO does not establish actual harmony, ensemble bass, melody role, harmonic segmentation, sounding realization, automatic tonal center/tonicization/modulation, or P4-C implementation.
