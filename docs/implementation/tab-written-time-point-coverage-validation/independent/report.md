# P3.2 independent core and native-browser validation

**Verdict: GO for the declared onset-exclusion inspection and partial-view UI.**
No confirmed implementation defect was found. The reviewer changed no product or
tracked test files, dependencies, branch, commit, or server. Baseline was verified
P3.1 HEAD `72d7c0fdefaa346f8e540e1384732243731c9f22`, not master or an old candidate.
[Before identities](before-fingerprints.json) and [final source/build/driver hashes](source-fingerprints.json)
bind this evidence; the core oracle hash matches the final runtime source.

## New independent core evidence

[Oracle source, archived as text](core-oracle.ts.txt) / [raw results](core-results.json).
The script imports current production observer/getter/inspector/point APIs, but no
production arithmetic helper constructs expected membership or eligibility.

- **2,000 seeded mixed-source fixtures / 10,000 exact query points** matched the
  independently assigned expected dispositions. Cases mix absent duration, present
  null/zero duration, missing/invalid start, invalid ID/MIDI/string, malformed note,
  unknown ownership, unreadable note population, other-bar errors and metadata-only
  errors. **2,000 invalid queries** retained highest priority. No throw, mutation,
  or falsely complete active set was observed.
- **360 finite completion worlds** independently assign positive durations on an
  integer 1/1024-quarter grid. Whenever the new inspector reports complete, its IDs
  match every enumerated completion. Query equality with the first eligible start
  remains partial. Legacy getter remains globally partial on those same sources.
- The optional ledger missing from an older partial snapshot fails closed.
  Eligible starts `1/1024` and `2/1024` become exact distinct inspection choices;
  equality at `1/1024` is uncertain, never rounded into the proven region.
- Global note coverage stays partial. Known intervals/endpoints do not grow when
  only a start is eligible: no missing duration/end/interval is manufactured.
  Malformed non-note metadata does not gate note-only completeness.
- The source is frozen during calls; source JSON remains unchanged. The new point
  helper does not mutate existing endpoint deltas. Snapshot data remains JSON-safe.

These are finite semantic/property checks, not exhaustive proof over all inputs,
performed sound, every valid rational, or every possible duration completion.
The mathematical claim is restricted to declared nominal notes strictly before
every otherwise-valid duration-missing note's known onset.

## Editing-limit host costs

Five observer samples and seven query/point samples per synthetic **6,144-note**
pattern were collected. Complete, one-future-missing, and half-future-missing cases
passed their manually specified results. Observer medians were approximately
**45–65ms**, proven query medians **1.1–2.1ms**, and point helper medians **0.66–0.91ms**.
After an eligible onset, partial early-return medians were **0.002–0.003ms**.
Full sample arrays and serialized data sizes are in the JSON. These are this host's
Node costs, excluding browser rendering, startup, workers and physical devices;
they are not p95/SLO certification or a runtime comparison ranking.

## Native browser evidence

[Driver](partial-browser.py) / [results and native events](browser-results.json).
Fresh system Chromium used the new production build at port 3001 with reduced motion,
**390 / 768 / 1335px** contexts. The 390px context used touch input; others used mouse.
Ten notes were imported and authored through visible controls. Nine have explicit
intervals and the tenth has only valid onset `1/4`, giving two pages and 19 points.
No React/store injection was used.

At all three widths, six groups passed:

1. At exact zero the bar remains incomplete but the point is complete with one
   excluded later start; at exact `1/4` it becomes uncertain, removes active emphasis,
   and removes the stale proof. Details retains the exact current point.
2. Valid `12` and invalid `37` pending frets block View/Close/page/point/disclosures/
   Check actions through pointer and Enter/Space; panel Escape does not discard them.
3. Pending start survives actual Shift+Tab traversal and Enter/Space/pointer actions;
   explicit Cancel restores committed zero.
4. Native CDP composition and finalized-but-uncommitted text are protected for fret
   and fraction input. Composing Escape preserves the fractional editor. No deferred
   View/page/point action runs when composition ends.
5. One Undo still reaches the last explicit source Set start edit, proving panel
   actions did not insert history. Undo invalidates; Redo does not resurrect the view.
6. Same-document key/scale changes retain the view. Tuning/capo, import replacement
   and active-bar changes invalidate with false expanded state and no resurrection.

The separate [retained P2 driver](p2-regression.py) and [results](p2-regression/results.json)
also passed at all three widths: native IME, pending inputs, diagnostic Escape hierarchy,
explicit Set start/Tab commit and history invalidation. Both drivers recorded zero
page/console errors. Final partial-view geometry showed no horizontal overflow and
visible controls at least 44×44px. Root's separate visual audit measures the point/page
controls in their populated states; it is not relabeled as this reviewer's execution.

CDP `Input.imeSetComposition` / `Input.insertText` exercises Chromium's native input
path, including trusted composition-start events. It is not physical-device,
physical-keyboard, participant-usability or OS/IME-specific certification.

## Reproduction and remaining scope

The executable oracle remains outside the repository at
`/workspace/p32-validation/independent/core-oracle.ts`; the archive uses `.ts.txt`
so it cannot enter product TypeScript/test discovery. From `/workspace/Guitar-p2`:

```sh
node --import tsx /workspace/p32-validation/independent/core-oracle.ts
python /workspace/p32-validation/independent/partial-browser.py
python /workspace/p32-validation/independent/p2-regression.py
```

Browser commands require a separately started production server at port 3001 and
installed Python Playwright/system Chromium. No browser/Python runtime dependency
was added to the product. No external reference runtime was used for core truth.
Arbitrary partial-region inference, synthesized durations, sounding realization,
harmonic analysis and automatic correction remain outside this GO.
