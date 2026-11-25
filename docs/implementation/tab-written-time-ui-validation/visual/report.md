# P3.1 independent browser and visual review

**Verdict: GO for the tested written-time UI scope.** No responsive, focus, read-only
interaction or design-language blocker was found. Product source was read-only during
this review. Root supplied the fresh production server; no server, dependency or branch
was created by this reviewer.

Actual system Chromium ran at **390 / 768 / 1335px**, reduced motion enabled. All input
fixtures were authored through visible ASCII import, score cells, Set start and Duration
controls. Geometry inspection and browser focus were used; no application-state injection,
fake reducer dispatch or synthetic DOM input events were used for behavioral claims.

## Confirmed behavior

- Default view has no written-time panel and only a quiet, transparent secondary
  View written time action. Its `aria-expanded` is false until opened, and false after
  Close or a source edit invalidates the snapshot.
- Two notes with starts **0 and 2**, lengths **1**, and **no meter supplied** open as
  Written timing. Native time-point buttons select the exact four endpoints. At point
  1/1 the view says No written notes at this point and no row is active; the final
  endpoint says Outside observed range. No rest or silence is inferred.
- About written time and Details are closed by default. Technical scope appears only
  on explicit About expansion. Details at the gap shows **Current point · 1/1** and
  exact Start / Length / Local end values for the current rows.
- One fully timed and one unknown note produce **Timing incomplete / 1 of 2 notes timed**.
  Only the known row is drawn, with no time-point query controls or active-note claim.
- A rest-only source displays **No written notes**, without query controls or a silence
  statement. Its rest was authored using the ordinary Rest control.
- Nine explicitly timed source notes produce **8 rows on page 1 / 1 row on page 2**.
  Page counts are clear; endpoint cursor state and page state remain separate.
- Paging to the last page focuses the enabled Previous button, and back to the first
  page focuses the enabled Next button. The final time point likewise focuses the
  enabled Previous point button rather than leaving focus on a disabled Next button.
- Panel point/page/disclosure actions preserve score-header notation labels. After all
  view interactions, Undo still targets the last explicit authored Quarter selection,
  restoring the note's **3/2** duration; Redo restores **1/1**. No view action consumed
  that history step. Source changes remove the panel and reset expanded state.

## Responsive, focus and UI philosophy

All three widths passed:

- Page width equals viewport width, including complete, partial, gap, About, exact
  Details and dense states. The wide score remains within its existing scroll region.
- Visible controls meet **44×44px**. Measured About was approximately 119.6×44px,
  Close 44×44px, Previous point 83.1×44px and Next point 62.9×44px. Details summaries
  are full-width and 44px tall.
- Native keyboard re-entry to View written time has a visible solid focus outline and
  matches `:focus-visible`; Enter opens the view. Close returns focus to its trigger.
- No page or console errors; `prefers-reduced-motion: reduce` matched the browser context.

| Open state | Panel height at each tested width |
| --- | ---: |
| Complete, two intervals | 332.4px |
| Partial, one known interval | 217.2px |
| Dense, eight visible intervals plus paging | 743.4px |

**NON VERBATIM / INTUITIVE review: GO.** The default source instrument stays visible
without a new explanatory panel. The opt-in result uses meaningful interval rails,
pitch/location labels, short state and point/page counters, shared quiet controls and
hairlines. Active state has an underline and dot/text semantics, not color alone.
Scope paragraphs and exact tables are progressive disclosures. No nested cards,
competing filled action or decorative visualization was introduced.

The dense opt-in result is tall and places the score below it, but represents actual
requested musical data, is bounded to eight rows, and exposes explicit paging. This is
not a default eight-row table or a persistent instruction wall. No repository height
threshold is claimed. This is a feature-level design review, not a study proving that
new participants understand the interface.

## Evidence and limits

[Browser driver](browser.py) · [Results, geometry, checks and source hashes](results.json)

Representative screenshots:
[390px complete](complete-390.png), [768px complete](complete-768.png),
[1335px complete](complete-1335.png), [390px partial](partial-390.png),
[390px dense](dense-page1-390.png),
[390px rest-only](rest-only-390.png).

The script exercised real mouse and keyboard browser routes, not physical hardware.
Physical-device/OS IMEs, screen-reader user testing, unreadable populations that cannot
be authored through normal UI, and core performance are outside this visual check.
Input/IME protection has a separate independent interaction review. Exact interval
arithmetic remains covered by the core tests rather than approximate drawing geometry.

```sh
# Root-owned production server on http://127.0.0.1:3000 is required.
python /workspace/p3-ui-validation/visual/browser.py
```
