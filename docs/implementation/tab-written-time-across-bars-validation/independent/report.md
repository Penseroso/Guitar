# P3.3 independent verification

**GO for the explicit regular-bar-origin nominal projection and guarded Across view.** No confirmed product defect was found. The reviewer changed no product/tracked test files, dependencies, branch, commit or server. Baseline is `9375293b72e4d3ecccc00da0e3104b934579e860`; [before identities](before-fingerprints.json) and [final source/build/driver/result hashes](source-fingerprints.json) bind this evidence. New core SHA is `b9f74ed88f9bcbb3d7ef27366790f173aab74458498c8bbc3cc01ed66c96f286`, matching the oracle result. Production build ID is `ARH4t5eI9f-GvF7s435At`.

## Independent core evidence

[Executable oracle archived as text](core-oracle.ts.txt) / [raw results](core-results.json). Expected eligibility and membership are assigned independently of production coverage facts and arithmetic helpers, using integer 1/1024-quarter ticks plus manually specified exact nonbinary cases.

- **2,400 seeded mixed-source fixtures / 14,400 queries** matched the declared statuses and complete source-occurrence lists. The fixtures mix complete notes, missing start, missing duration, both absent, invalid-present fields, invalid IDs/MIDI/string, malformed population/ownership and marker-only errors. Another **2,400 invalid queries** retained highest priority.
- **114 finite completion worlds** fill absent starts with nonnegative values and absent lengths with positive values. Every reported complete set agrees with every enumerated world. No missing interval, end or endpoint is manufactured. These worlds are finite checks, not an exhaustive proof over all legal rational completions.
- **10 manual groups** cover late offset9, multi-bar carry-in, same-pitch/source occurrence identity, source/query order, W2/W3 equality, invalid-present exclusions, duplicate IDs, empty observed range, literal metadata/copy semantics, explicit prerequisites, interior gaps and last-bar overflow.
- The identical query **q8** is outside W2 `[4,8)`, but partial in W3 `[8,12)` when an unresolved note can start at8. Window rejection precedes population uncertainty; inside the window, uncertainty precedes known-range checks. Empty/null known range never becomes complete-empty.
- A bar1 note `[0,12)` contributes in an empty-owned bar3. A bar1 local start9 remains owned by bar1 and projects to `[9,10)` with a separate diagnostic. For source A=`[9,10)`, B=`[7,10)`, C=`[8,9)`, query q8 returns B,C and q9 returns A,B in source order. Display ordering is a separate concern.
- A valid 32/1 projection at bar1024 reproduces float-colliding exact ends `67251530481/513590` and `22372961402/170859`: at the former endpoint, only B remains active. Exact arithmetic preserves this distinction.
- Frozen sources remain byte-identical. Snapshot queries do not reread the source association; later source mutation cannot change retained MIDI or intervals. Data is JSON-safe, and all 6,144-note benchmark cases retain exactly 12,288 endpoint references.

The existing local API runtime source retains its baseline hash. A source-code review confirms the global observer does not call the local observer once per measure. The new core accounts for all source-note occurrences in one global snapshot.

## Host cost scope

Four synthetic patterns use **1,024 bars / 1,024 positions / 6,144 notes**: source spread across all bars versus concentrated in bar1, each with simple or source-bound fractions (denominators1021/1019). Five observation and seven query/point samples per pattern are retained. Latest medians: observation **48.8–63.4ms**, query **1.27–2.27ms**, inspection choices **0.21–1.69ms**. Serialized data is **2.95–3.19MB**.

These are Node costs on this host, not browser/physical-mobile latency certification, p95/SLO evidence or a performance ranking. Scheduling/GC variation was visible between preparation and final runs. No repeated 1,024-snapshot aggregation or sounding engine is measured or implied.

## Native browser evidence

[Driver](browser.py) / [results including native events](browser-results.json). System **Chromium156.0.8078.79** used the fresh production server at port3002, reduced motion and **390 / 768 / 1335px** contexts. The390 context used touch; others used mouse. Notes, meter, starts and lengths were authored through actual visible controls; no store/React state injection was used.

All three widths passed six groups:

1. Across is disabled without meter. Explicit4/4 opens the regular-origin view with carry-in, two note pages and an onset-only unknown note. A proven point becomes partial at the exact quarter onset and loses all active emphasis.
2. Valid12 and invalid37 fret drafts block scope/View/Close/page/point/disclosure/Check actions through pointer and Enter/Space. Escape cancels the input first; a later clean panel Escape closes and returns focus to View.
3. A pending start survives actual Shift+Tab traversal to scope controls, keyboard activation and pointer actions. Explicit Cancel restores the committed zero.
4. Native CDP `Input.imeSetComposition` / `Input.insertText` protect fret and fraction drafts during composition and after final text insertion. A trusted composition-start event is retained at each width. Composing Escape does not discard the fraction; no delayed scope/query action runs afterward.
5. One Undo still reaches the last real Set start edit. Undo invalidates, Redo stays closed, and every new View defaults to This bar.
6. Same-document key/scale changes retain the view. Retune, capo, meter, successful import and active-bar changes immediately invalidate it; returning to the prior bar never resurrects Across.

All widths recorded **zero page/console errors**. Final empty local/scope geometry had no horizontal overflow and visible controls at least44×44px. Root's separate populated-Across geometry/visual inspection is separate evidence, not relabeled as this reviewer's execution. CDP native input is not physical-device, participant-usability or OS/IME-specific certification.

The [retained P2 checks](p2-regression/results.json) also passed at all three widths: diagnostic/fraction/fret guards, native IME, Escape hierarchy, explicit Set start/Tab commit and history invalidation.

## Harness notes and reproduction

The first browser launch failed before app access because the default execution sandbox blocked Chromium crashpad `setsockopt`; the authorized escalated local-browser run passed. This was an environment restriction, not a product defect.

The copied P2 driver retained its previous external output-directory constant while its URL correctly targeted3002. The fresh P2 result timestamp is `2026-11-17T06:15:22.945992Z` (screenshots span `06:15:14.495318Z` to `06:15:22.865493Z`). The latest output was relocated into this evidence directory. [Actual executed driver](p2-regression.executed.py) is retained and hashed; [reproduction driver](p2-regression.py) differs only by using its own directory for output. Product and repository-archived P3.2 evidence were untouched. No repeat of passing tests was needed for this output-path correction.

From `/workspace/Guitar-p2`, with a separately started fresh server on3002:

```sh
node --import tsx /workspace/p33-validation/independent/core-oracle.ts
python /workspace/p33-validation/independent/browser.py
python /workspace/p33-validation/independent/p2-regression.py
```

The oracle stays external; `.ts.txt` is the repository-safe archive format. GO is limited to the declared regular-origin model, finite selected-bar query window, exact nominal base-MIDI occurrences and guarded inspection. It does not establish actual full-bar lengths, pickups, sounding duration/cutoff/continuation realization, harmony, modulation or universal rational/performance correctness.
