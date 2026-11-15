# P3.1: written-time view

Baseline: P3 core at `ded09286592c4dfe590560c02dc93292a71a814f`, on the shared
`feat/tab-timing-inspection` branch. No historical local timeline candidate is imported.

## Delivered scope

`View written time` sits beside `Check timing` and explicitly observes the active
position's bar. It opens a quiet, read-only panel, using shared workspace tokens,
hairline rows and text controls. Explanations and exact values are disclosed on demand.
The score remains the primary interaction surface.

| Source state | UI contract |
| --- | --- |
| Complete, nonempty | Known interval rows, exact endpoint stepping and the complete owned-note query result |
| Partial | Known rows and enumerable known/owned count; no point controls or full active-note set |
| Unreadable | Review guidance; no complete query or misleading total |
| Complete, empty, range null | `No written notes`; no time query and no silence claim |
| Complete interior gap | `No written notes at this point`, relative only to owned written notes |
| Final endpoint | `Outside observed range`; no active rows |

Rows retain separate occurrences and source position/string labels, with base pitch.
At most eight rows and eight exact-detail entries are mounted per page. A cursor
steps the original exact endpoint fractions; number conversion is confined to drawing
and approximate axis labels. Position labels refer to score source order. Quarter-note
coordinates are local to the selected bar, even if a written length extends beyond it.

Only the frozen P3 snapshot is consumed. P2 issue counts and meter availability are
not gates. Opening, paging, stepping, disclosure and closing do not modify the score,
selection, history or harmonic analysis. Existing editing remains available.

## Input and lifetime

All new controls live inside the existing timing-action guard. Dirty fret text,
unapplied start fractions and IME composition block View and panel actions. Pointer
down is intercepted before blur; keyboard activation is also guarded. Blocked actions
are never queued. Existing Enter/Tab/Escape, explicit cancellation and Set start keep
their meanings. An unchanged fret editor can close without creating an edit.

Snapshots are associated with the immutable source document and active bar. A document
or bar change hides the panel and clears `aria-expanded` in the current render, then
discards the report. A concise refresh notice requests a new explicit View. Editing,
successful import, retune, capo, Undo and Redo therefore invalidate it; history restoration cannot
resurrect the report. Import drafts and rejected imports leave the document and view
current. A tonal-reference change with the same document does not
invalidate it. Close and Escape from panel controls return focus to View after the
guard allows the action. This view adds no source-location navigation.

## Verification

- Related TAB regression suite: **23 files / 589 tests passed**, including **27 new
  tests** (11 panel and 16 independent reducer/editor integration tests). The panel
  stress case uses **6,144 notes** and verifies eight chart rows plus eight detail
  entries, without a rendered full active-note list.
- Scoped ESLint with zero warnings, final TypeScript check and production build
  passed. The existing Tailwind module-type warning remains.
- Independent production Chromium visual checks passed at **390 / 768 / 1335px**:
  complete without a meter, known gap and final endpoint, partial, rest-only empty,
  8+1 paging, exact Details, disclosure, focus and history preservation. Page widths
  matched viewports; visible controls met 44px; reduced motion was enabled; no page
  or console errors occurred. NON VERBATIM / INTUITIVE feature review: **GO**.
- Independent native interaction checks passed at all three widths, using touch
  emulation at 390px and mouse at the other widths: valid/invalid fret drafts,
  actual fraction Shift+Tab, pointer-down and keyboard panel actions, trusted CDP
  composition, no deferred action, explicit edit commits, document/bar invalidation
  and no Undo resurrection. The separate P2 browser regression also passed at all
  three widths. Physical-device/OS IMEs and screen-reader participant testing were
  not measured.
- Core exact arithmetic, observer, source types, Analyze, reducer and dependency
  manifests match the baseline hashes. No external code or runtime was added.

[Verification and source hashes](tab-written-time-ui-validation/verification.json) ·
[Independent visual report](tab-written-time-ui-validation/visual/report.md) ·
[Independent interaction report](tab-written-time-ui-validation/interaction/audit.md) ·
[Related suite log](tab-written-time-ui-validation/tests.txt).

**Acceptance: GO for P3.1's declared read-only written-time UI.** No product defect
requiring a runtime correction was found in independent verification.

## Boundaries retained

No new domain engine, normalization, automatic correction, runtime dependency,
playback, harmonic analysis or sounding timeline is introduced. Rest, mute,
continuation, technique and cross-bar carry-in realization remain outside this view.
Partial observations do not establish locally complete subregions. Global anchors,
regional completeness and actual sounding behavior require separate evaluation;
this UI does not decide their implementation.

Approximate geometry can visually merge very close endpoints; Details retains exact
values and queries remain exact. Paging bounds DOM rows, not synchronous observation
or query cost. The prior core maximum-size measurements remain Node diagnostics,
not a browser/mobile performance guarantee. Immutable reducer updates are required
for identity-based invalidation; arbitrary in-place source mutation is not supported.
