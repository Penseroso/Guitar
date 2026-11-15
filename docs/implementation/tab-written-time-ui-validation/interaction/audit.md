# P3.1 independent interaction audit

**Verdict: GO within the tested written-time UI interaction scope.** No confirmed
product defect was found. Product source, dependencies, branches and server were not
modified by this reviewer. Source/build/driver identities are in
[source-fingerprints.json](source-fingerprints.json).

## Independent execution

Fresh production Chromium at **390 / 768 / 1335px**, reduced motion enabled. The
390px context used actual Chromium touch input; other widths used mouse input.
Nine notes were imported and their starts/lengths authored through the existing UI,
giving two pages and 18 exact endpoint positions. No React/store injection was used.

All eight groups passed independently at each width:

1. Complete internal gap and final outside-range endpoint states; page and point
   movement left source labels and score selection unchanged.
2. Clean panel Escape closed it and returned focus to View written time.
3. Pending valid `12` and invalid `37` fret drafts blocked View, Close, page, point,
   About, Details and Check timing pointer actions; button Enter/Space and panel
   Escape also preserved drafts. No saved fret changed or input was discarded.
4. Unapplied start input survived pointer actions and actual Shift+Tab traversal to
   View followed by Enter/Space. Explicit Cancel restored the committed value.
5. Browser-native CDP IME composition and finalized-but-uncommitted text were
   protected for both fret and fractional input. Composing Escape did not close the
   fractional editor. View/page/point state remained unchanged after composition end,
   demonstrating no deferred action. Clean explicit cancellation remained available.
6. One Undo after all panel actions still reverted the last explicit source duration
   edit; it invalidated the panel. Redo did not resurrect an old snapshot.
7. Explicit key/scale changes with the same document retained the view. Retuning and
   capo changes invalidated it with `aria-expanded=false` even where source frets were
   unchanged.
8. Explicit fret Enter/Tab, successful import replacement and active-bar change
   invalidated immediately. Returning to the prior bar did not resurrect a view.
   A rejected mismatched-tuning import retained the current document and view.

The separate retained **P2 Check timing** regression driver also passed at all three
widths: diagnostic navigation/Escape priority, dirty inputs, native IME, Set start/Tab
commit, history invalidation and keyboard/pointer routes. No page or console errors
were recorded by either driver.

## Source review supporting the observations

- `TabScoreView.tsx:106–122`: current snapshot requires source document identity and
  active owning bar; mismatch hides the panel before effect cleanup and prevents
  subsequent resurrection.
- `TabScoreView.tsx:123–134,510–515`: shared synchronous draft/composition guard,
  pointer-down before blur, and click/keyboard capture cover the new controls.
- `TabScoreView.tsx:524–540`: explicit guarded observation and close, with View focus
  return; no score reducer/history write occurs in these handlers.
- `WrittenTimePanel.tsx:42–56,64–66`: page, point, disclosure and Escape-close actions
  consult the same guard before changing local view state.

## Harness preconditions and limits

The first driver attempt used Standard-labelled text after selecting Drop D. The
existing parser correctly rejected that text and preserved the current snapshot.
This was a driver precondition error, now an explicit passing negative-control case:
[initial record](initial-import-precondition-rejection.json).
The second attempt used an unscoped alert locator, which also matched Next's route
announcer. It was restricted to the TAB workspace; no product change was needed:
[selector record](initial-alert-selector-ambiguity.json).
There is no unresolved `failure.json`; both original screenshots remain preserved.

CDP `Input.imeSetComposition` / `Input.insertText` exercised Chromium's native input
path, including trusted composition-start events. This is not physical-device,
physical-keyboard or OS/IME-specific certification. These runs validate the declared
fixture interactions, not every browser/device or musical correctness/performance.

Evidence: [new panel results and native events](results.json),
[driver](browser.py), [retained P2 results](p2-regression/results.json),
[390px final state](final-state-390.png), [768px](final-state-768.png),
[1335px](final-state-1335.png).
