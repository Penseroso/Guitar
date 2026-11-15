# P3.2 real-browser visual and read-only flow review

**GO for the tested point-coverage UI.** Root ran the new production build in actual
system Chromium at 390 / 768 / 1335px, using visible ASCII import, score cells,
Set start and Duration. No product-state injection was used. Source hashes and the
build identity are in [results.json](results.json). The driver was adapted from the
prior independent P3.1 visual audit; this execution is Root's visual review.

All 15 scenario/check groups passed at every width. Complete populations retain
their no-meter endpoint queries, gap and final outside-range behavior. Rest-only
empty ownership remains No written notes, without a silence claim. An unknown-start
note leaves every navigable point uncertain, with no active rows/full-set count.

For known `a=[0,1)` and otherwise valid `b.start=1/4` with missing duration, the exact
choices are 0, 1/4, 1. At 0, the whole bar remains Timing incomplete / 1 of 2 notes
timed, while Complete at this point and one active row establish the narrower scope.
At 1/4 and the final known endpoint, More timing needed at this point replaces that
claim and all active-row emphasis is removed. The final known endpoint is not
mistaken for the unknown note's end. Details keeps the exact current time and a
short proof/excluded count. The main flow does not display proof prose or a list.

Native time-point/page/Details actions leave notation labels unchanged. Nine fully
timed notes retain eight-plus-one paging, enabled-control focus handoff, and Undo
still reaches the last authored duration rather than a view action. Undo/Redo remove
the view and do not resurrect it. Close returns focus to View; keyboard entry has a
visible focus outline. The separate independent interaction audit covers native IME
and pending input in partial views.

At each width the proven panel was 312.6px high and the uncertain panel 289.4px.
Page width equaled viewport width in all checked states, including expanded About,
Details and dense pages. Visible panel controls measured at least 44x44px; reduced
motion was enabled; page and console error logs were empty.

**NON VERBATIM / INTUITIVE feature review: GO.** Existing interval rails, source
position/string labels and quiet text controls are reused. The whole-bar and current
point states are explicit; uncertain points remain navigable without implying a
complete result. Technical proof is secondary disclosure. CSS, shared tokens,
default opt-in visibility and score interactions are unchanged. This is a functional
design review, not participant comprehension or physical-device certification.

Evidence: [driver](browser.py), [results](results.json),
[390px proven](proven-390.png), [768px proven](proven-768.png),
[1335px proven](proven-1335.png), [390px uncertain](uncertain-390.png),
[390px proof Details](proof-details-390.png), [390px unknown start](partial-390.png),
[390px dense](dense-page1-390.png).

Reproduce with a production server at `http://127.0.0.1:3001` and
`python /workspace/p32-validation/visual/browser.py`. System Chromium and Python
Playwright are validation tools, not product runtime dependencies.
