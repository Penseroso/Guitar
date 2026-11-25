# P3.3 production-browser visual/read-only review

**GO for the tested explicit regular-origin Across view.** Root used actual system
Chromium at 390 / 768 / 1335px with reduced motion. All notes, meter, offsets and
durations were authored through visible ASCII import and existing score controls;
there was no application-state injection. [Results](results.json) bind the reviewed
runtime hashes and production build ID. This is Root's review, separate from the
independent core/native-input audit.

All 14 scenario/check groups passed at every width:

- View defaults to This bar. Without meter, only Across is disabled, with a concise
  Set meter hint. Choosing Across full bars with the visible 4/4 model is explicit.
- In bar3, a source bar1 late offset9 remains bar1, while the visual order follows
  exact starts: source B, C, A. Native point changes update the full active set
  without changing that order. Details preserves original offset9, source IDs and
  global coordinates; the nonblocking diagnostic does not prevent complete queries.
- A source-empty bar2 shows No written notes in This bar, then shows the bar1
  written interval [3,7) at global4 in Across. No actual sounding is inferred.
- An otherwise valid future note with absent start/length is excluded before its
  origin4. At4 the bar1 window is outside; in the bar2 window that same point is
  partial, even with no known intersecting interval. No complete active-set emphasis
  remains at the uncertain point, and no silence claim replaces it.
- Nine source-bar1 late starts inside an empty bar2 window retain 8+1 paging, source
  labels and enabled-control focus handoff. View/scope/point/page/Details actions
  preserve score notation. Undo still targets the last explicitly authored duration
  (1/1 back to3/2), while Undo/Redo discard the report. New View starts in This bar.
- Scope changes keep focus on their persistent buttons; Close returns focus to View.
  All visible result/scope controls measured at least44x44px; page width equals
  viewport width, including expanded Details and dense rows. No console/page error
  occurred.

The existing Duration picker has no length3 option. The real-UI chronology fixture
therefore uses B=[7,11) (Whole4), alongside A=[9,10), C=[8,9). The exact B=[7,10)
counterexample is verified separately by core, component and independent tests.
Neither fixture requires adding duration-authoring UI or synthesizing store state.

The new persistent scope controls sit outside keyed panels, so a separate native
[Escape supplement](scope-escape-results.json) checks all three widths: clean local
and Across Escape close to View, pending fret12 survives Escape from a scope button,
and explicit fret cancellation then permits scope Escape. [Supplement driver](scope-escape.py).

**NON VERBATIM / INTUITIVE feature review: GO.** Existing rails, hairlines, quiet
text actions, underlined scope state, source labels and shared focus tokens remain.
Proof/model/IDs/diagnostics are disclosed in Details; no new primary card, instruction
wall, sorting switch or competing filled action was added. The broader population
and source ownership are explicit. Time order is useful for overlaps while source
labels preserve score correspondence. This is a functional design review, not a
participant comprehension study, physical-device/OS-IME test or performance SLO.

Representative screenshots: [390px chronology](chronological-390.png),
[768px chronology](chronological-768.png), [1335px chronology](chronological-1335.png),
[390px source/diagnostic Details](details-overrun-390.png),
[390px empty-bar carry-in](empty-bar-carry-390.png),
[390px future-origin equality](future-anchor-equal-390.png), [390px dense](dense-390.png).

Reproduce [driver](browser.py) with the root-owned production server at port3002:
`python /workspace/p33-validation/visual/browser.py`. The supplementary driver is
`python /workspace/p33-validation/visual/scope-escape.py`. Browser tools are validation
dependencies only, not product runtime additions.
