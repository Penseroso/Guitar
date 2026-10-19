# TAB P1 interaction and paint audit — 2026-10-19

Base: freshly fetched `origin/master`, `6dc9630`. This repository has no `main` branch.
P0 Measure / Position / Note ownership, document format and order-only analysis remain
unchanged. Only score presentation, insertion access and regression coverage change.

## Reproduced problems and causes

- On desktop the single blank position has no visible insertion affordance. Every `+`
  has `opacity: 0` and `tabIndex: -1`; its `:focus-visible` rule cannot make it discoverable
  through Tab. The Insert shortcut works, but requires prior knowledge. A bottom hover
  hint is carrying the onboarding burden. Narrow width alone does not enable touch CSS.
- Touch CSS shows only the active position's `+`. The same operation therefore has a
  different discovery rule depending on pointer media queries. The 44px overlay sits
  halfway down the six strings, at the boundary between columns, where it can obscure
  note hit areas and has no visible boundary guide.
- String lines are six repetitions of a cell-local gradient. The actual reproduced
  disappearance is caused by an opaque, full-column fret input covering that gradient:
  editing the only position erases the entire first string. The same defect occurs in
  first, middle or last columns, independent of measure identity. Plain unedited empty
  first cells do have lines; no general missing-first-position parser defect was found.
- Per-cell left borders fragment measure rules into six cell-height pieces. Header
  left borders also consume a pixel from flex widths, allowing subpixel header/cell
  drift. Neither is an appropriate owner for a complete measure boundary.
- Meter, selection headers, Edit and annotations already occupy separate P0 lanes.
  Their capabilities do not need consolidation or a new panel. Adding insertion to
  those same 44px rows would collide with their targets in dense scores.

Before: [editing the only position](screenshots/tab-p1-before-editing.png).

## Alternatives

| Insertion approach | Visual clarity | Pointer / touch / keyboard | Grid alignment | Overflow / scrolling | Annotation / editor conflicts | DOM / CSS cost | Regression risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Retain cell overlay; improve visibility | A visible plus still floats among strings | Mouse/touch discoverability improves; must add keyboard entry | Boundary x is already available | Keeps old end padding | Still occupies note targets and musical marks | Lowest | Medium: ambiguous ownership and overlapping targets persist |
| Put plus on the position/header boundary | Strong relationship to the column | At minimum 44px width, a centered header/Edit target and boundary target overlap | Would require wider columns or moving P0 controls | Wider columns substantially increase dense scrolling | Competes with selection, Edit or meter; above annotations can separate it from strings | Medium | Higher: reworks established P0 interaction |
| Separate lane directly below strings — selected | Small plus and short stem identify the column's trailing edge; gutter says Position | Always available with identical targets; one roving Tab entry, arrow navigation and native buttons | Shares the existing grid template, centered on each trailing edge | Adds 44px height; retains old 22px end allowance, no added column width | Own vertical space before below-score annotations; leaves P0 Edit/meter lanes intact | Small: relocate existing controls, add keyboard refs/handler | Lowest overall; extra lane height is the explicit tradeoff |

| String approach | Visual clarity | Pointer / touch / keyboard | Grid alignment | Overflow / scrolling | Annotation / editor conflicts | DOM / CSS cost | Regression risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Keep cell backgrounds | Seams remain dependent on every cell's border/background | No accessibility benefit; opaque input must still be fixed | One paint origin per cell | No extra width | Every new state can obscure its own segment | Lowest immediately, recurring state-specific rules | Medium: repeats the original paint ownership problem |
| One line per string row — selected | A single 1px segment spans all positions and measures | Decorative, pointer-transparent; semantic grid unchanged | Uses the actual row width, starting after the 44px label gutter | Moves with the same scrolling sheet; sticky labels cover it | Only compact musical glyph masks sit above it; annotations are outside the grid | One pseudo-element per row, no new string DOM | Low: no pitch/order/layout projection changes |
| One separate score background layer | Also continuous | Must remain decorative and pointer-transparent | Requires tracking row centers/heights in another layer | Must share scroll and clipping geometry | Must avoid annotation rows and input overlays | More CSS positioning or SVG/DOM bookkeeping | Higher than row-owned paint without a P1 benefit |

## Final contracts

**Position insertion:** one named `Insert positions` group immediately below each
system's strings. The visible gutter says Position. Each existing position has a small
permanent plus and short stem centered exactly on its trailing column edge. Targets are
44×44px, including the final edge; adjacent targets do not overlap at minimum column
width. There is no hover, selection, long-press or invisible-target prerequisite.
An accessible description names the owning bar. Inserting at a measure boundary adds
to the preceding position's measure; Add bar remains the separate P0 measure action.

Tab enters at the current position's boundary (or the last keyboard-focused boundary).
Left/Right/Home/End move insertion focus in document order, including across systems,
without changing the score selection or notes. Enter/Space inserts after that boundary
and opens native fret input on the current string, as before. Up returns to that
boundary's preceding position on the current string; Escape returns to the selected
cell. Tab/Shift-Tab leave the lane normally. Insert in a cell, input or column header
retains its existing meaning. Keyboard history from a boundary restores cell focus;
the corresponding insertion entry remains available. The 1024-position limit remains.
Touch uses the same ordinary button tap and permits native viewport scrolling; header
hold deletion remains an independent P0 interaction.

**String paint:** each of six semantic rows owns one pointer-transparent 1px line from
the label gutter to the system's final boundary. Selection/hover backgrounds cannot
erase it. Fret/rest/mute/tie/technique glyphs retain small legibility masks. The native
input retains P0's full-cell hit area and focus ring (at least 44×44px); empty input is
transparent and nonempty input masks only a 32×24px text area. These intentional glyph
masks are not missing string segments. Position spacing still means order, never beats.

A separate decorative measure-rule layer uses the same grid and explicit measure spans.
Rules run continuously between the first and sixth string centers (220px), including
system start/end, and are brighter than strings. They neither create nor infer measures.
Header separators use inset paint instead of consuming flex width. No note, position,
measure, duration, technique, annotation or history domain representation changes.

## Verification

- Relevant TAB domain, state, input, score, workspace and ClientApp suite: **15 files /
  378 tests passed**. Four new interaction tests cover blank keyboard onboarding,
  boundary navigation without note/selection changes, history across a system wrap and
  ordinary touch insertion. The prior Tab-exit test still checks leaving the grid and
  committing drafts; it now passes through the newly accessible insertion lane before
  leaving the score. Skipping the formerly untabbable insertion controls was an
  implementation detail, not the grid-exit requirement.
- Scoped ESLint: no errors or warnings. Final production build, including TypeScript
  and static page generation: passed. The sandbox build stalled at compilation; the
  same build completed with host permissions. No application workaround was needed.
- Actual browser at **390 / 768 / 1335px**: blank 1-bar/1-position score, initial
  insertion and successive additions, first/middle/last position editing, multi-bar
  rules, 4→5-bar wrapping, selected/active/editing states, R/x/tie, written duration,
  meter and safe structural history. Existing P0 cell/header keyboard navigation,
  Insert shortcut, range deletion, touch-hold deletion and invalid-draft refusal remain
  covered by the unchanged regression suite. The P0 contextual editor's keyboard
  entry/exit and Add bar focus/history tests also pass.
- Analyzed the existing 8-bar mixed example and inspected above/below annotations and
  contextual editor at all three widths. Candidate question marks, annotation evidence
  and the Edit/meter/Add bar hierarchy remain intact. No persistent lower form returns.
  Chord/arpeggio/progression results and order-only document semantics pass the existing
  domain regressions; no domain, parser, analysis or reducer implementation changed.
- Imported a 24-position ASCII bar and inspected internal horizontal scrolling at
  all three widths. Page content/scroll widths match at **375 / 753 / 1320px** (the
  outer viewport includes a 15px scrollbar). Score viewport widths are **351 / 689 /
  1152px**. The dense sheet is **1122px** at narrow/middle widths, growing to **1152px**
  on desktop. End-boundary focus scrolls to **771 / 433 / 0px**, respectively.
- All insertion targets measure **44×44px**, with **0px** boundary alignment error.
  Header center drift is at most **0.008px** from fractional track rounding. Six row
  lines retain identical 1px height/color and span the whole string area in every
  measured system. Measure rules are continuous **220px** between string centers.
  First/middle/last dense inputs retain exactly the cell's width and a 32×24px text mask;
  single-position empty input is transparent across its full cell. Scroll padding keeps
  a focused boundary at or beyond the sticky gutter (measured left **56px**, not hidden).
- New affordances have no animation and computed transition duration **0s**. Keyboard
  scrolling is instant; the existing reduced-motion `scroll-behavior: auto` remains.
  Neither hover nor coarse-pointer media queries hide/reveal insertion controls now.
  Ordinary touch pointer events exercise the real reducer/input focus in tests; no
  physical device or browser touch/media emulation is available in this backend.
- Browser console warnings/errors: none. `git diff --check`: passed.

Evidence: [measured browser geometry](tab-p1-browser-metrics.json),
[desktop blank](screenshots/tab-p1-desktop-empty.png),
[tablet blank](screenshots/tab-p1-tablet-empty.png),
[mobile blank](screenshots/tab-p1-mobile-empty.png),
[single-position editing](screenshots/tab-p1-mobile-single-editing.png),
[mobile insertion](screenshots/tab-p1-mobile-empty-editing.png),
[four bars](screenshots/tab-p1-tablet-four-bars.png),
[five-bar wrap](screenshots/tab-p1-mobile-five-bars.png),
[desktop annotations](screenshots/tab-p1-desktop-annotations.png),
[tablet annotations](screenshots/tab-p1-tablet-annotations.png),
[mobile annotations](screenshots/tab-p1-mobile-annotations.png),
[desktop dense editing](screenshots/tab-p1-desktop-dense-editing.png),
[tablet internal scrolling](screenshots/tab-p1-tablet-dense.png),
[mobile internal scrolling](screenshots/tab-p1-mobile-dense.png).

P1 acceptance: **GO** with the physical-device coverage limitation stated above.

## Deliberately deferred

No local meter/Measure migration, new notation, file-format change, sounding timeline,
timing-aware analysis, harmonic segmentation, key/cadence/modulation work or broad visual
redesign. A physical touch-device/browser matrix remains separate from the available
browser's mouse/keyboard and responsive checks; touch event behavior is covered in the
component suite. Very long imported technique labels retain their existing bounded
presentation. No P2 work was started.
