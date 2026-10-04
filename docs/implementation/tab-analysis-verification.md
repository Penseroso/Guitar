# Editable tab analysis verification

## Current product and theory audit — 2026-10-04

The subsequent [TAB Analysis audit](tab-analysis-audit-2026-10-04.md) records the current
implementation, evidence boundaries and release judgment: **35 files / 852 tests passed**,
production build and scoped lint passed, with default/changed browser checks at 390, 768
and 1335px. The earlier interaction verification below remains useful historical context.

## Earlier hover insertion and touch deletion — 2026-10-04

Analyze always processes the whole score. Score selection is for editing; there are no
Whole score/Selected passage buttons, separate input mode or persistent detail sidebar.

- Insertion controls overlay the center of the string area at column boundaries. Desktop
  controls stay hidden until hovered or keyboard focused; there is no extra insertion row.
  Touch devices expose the active position's +. Targets remain 44×44px, including the last
  position. Insertion immediately opens the new numeric input on the same string.
- There is no desktop × or persistent delete button. A touch-only 550ms header hold opens
  a compact popover with an iOS-red trash icon. Holding within an existing range retains
  that range. Movement, pointer cancellation, scrolling and outside actions dismiss or
  cancel the gesture. Ordinary taps and mouse holds do not open the popover.
- Header click, pointer drag and Shift-arrow selection support Delete/Backspace as one
  undoable batch operation. Cell Delete clears only a note. Entire-measure deletion retains
  one stable empty position with aligned focus and selection.
- Final relevant regression suite: **27 files / 368 tests passed**. Includes tab domain,
  state and UI, Scale integration, shared scale/Roman/chord recognition and workspace
  state. TypeScript, scoped ESLint and the final production build passed.
- Real-browser default and changed layouts checked at **390, 768 and 1335px**. Page width
  matches viewport content width (375, 753 and 1320px); dense systems scroll internally.
  Desktop hover revealed exactly one + without inserting or selecting native text.
  Clicking it added a position and immediately focused its fret editor. Numeric entry,
  explicit Analyze, two-column deletion and one-step Undo worked.
- Tablet and mobile-width checks accepted fret 24 in an inserted position. Mobile header
  Delete removed it and Undo restored both its position and fret. No console warnings or
  errors appeared in this final browser session. Reduced-motion rules and keyboard focus
  remain intact.
- Touch hold timing, cancellation, dismissal, selected-range retention and trash deletion
  are covered by automated pointer-event tests. The current browser automation supports
  viewport resizing but does not expose physical touch synthesis; a real-device long-press
  check remains unverified.

Screenshots: [desktop hover](screenshots/tab-hover-insert-desktop.png),
[tablet entry](screenshots/tab-hover-insert-tablet.png),
[mobile entry](screenshots/tab-hover-insert-mobile.png).

## Previous direct column editing baseline — 2026-10-04

Analyze now always processes the whole score. Whole score/Selected passage and the
separate selection toolbar are removed. The visible range is an editing selection.
Lower Add position/Delete position actions are replaced by direct score controls.

- Inline + controls sit on column boundaries with 44px targets, including a fully
  contained target at the system end. Clicking + or pressing Insert opens the new
  empty numeric editor immediately on the same string.
- Header click selects a column; dragging headers or Shift + horizontal arrows selects
  a range. Delete/Backspace deletes all selected positions in one history operation.
  A contextual delete control appears beside the selected system for touch input.
  Delete on a string cell clears only that note.
- Empty measures retain one stable editable position. After deleting an entire measure,
  focus and selection stay aligned on that position; a repeated Delete is a no-op.
- Focused domain/state/editor/workspace suite: **9 files / 217 tests passed**. TypeScript,
  scoped ESLint and the final production build passed.
- Real browser: default and changed states inspected at 390, 768 and 1335px. No horizontal
  page overflow; visible targets remain 44×44px. Keyboard focus and instant/reduced-motion
  scrolling are retained. Desktop pointer drag selected columns 1–3; Delete removed three
  positions and one Undo restored them. Selecting a whole measure preserved its empty
  placeholder and correct header focus.
- Tablet + insertion, fret entry and header Delete worked. Mobile + insertion opened
  position 2 immediately, accepted fret 24, and the contextual delete control removed
  the column; one Undo restored both the position and its fret. Cell Delete retained the
  column in the desktop check.
- The console retained an earlier Explore hydration-ID warning from development reload;
  no additional warning appeared during direct-edit checks. This adjacent development
  warning is recorded separately from the score editing feature.

Screenshots: [desktop selected columns](screenshots/tab-direct-edit-desktop.png),
[tablet insertion](screenshots/tab-direct-edit-tablet.png),
[mobile contextual deletion](screenshots/tab-direct-edit-mobile.png).

## Previous score-first baseline — 2026-10-04

Implemented four measures per system with variable onset counts, direct numeric score
editing and explicit Analyze snapshots. The fixed detail sidebar is replaced by score
annotations and local evidence disclosure. The example contains eight measures and
36 positions, mixing melody, double stops, simultaneous chords and arpeggios.

- Relevant regression suite: 27 files / 346 tests passed, including tab domain/state/UI,
  Scale workspace and shared scale, Roman, chord recognition and workspace state.
- Focused tab suite: 9 files / 203 tests passed. Covers measure insertion/splitting,
  empty-measure imports, snapshot freshness, cursor stability, selected scope, first-note
  draft commit through Analyze and invalid-draft blocking.
- TypeScript, scoped ESLint and the final production build passed.
- Real-browser default and changed states inspected at 390, 768 and 1335px. Page width
  equals viewport content width at each size; dense systems scroll inside the score.
  Visible workspace buttons meet 44×44px. Reduced-motion CSS retains instant focus scrolling.
- First numeric entry followed directly by Analyze commits the draft and analyzes it.
  Enter advances; 24-fret entry and Undo work at mobile width. ArrowRight crosses
  the system boundary from position 18 to 19. Invalid 37 stays editable, blocks Analyze,
  and Escape restores the prior note.
- Adding three positions expands the first measure from four to seven without changing
  its barline. Context changes hide annotations and report stale; Analyze restores them.
  Hiding/showing annotations preserves the snapshot. Cursor movements keep fresh results.
- Explicit C major labels the adjacent Dm–G7–C example as ii–V–I. Arpeggio labels remain
  candidates; reference C Ionian remains a supplied collection. Clicking annotations opens
  evidence within the relevant system. No console warnings or errors appeared in the
  final browser session.

Screenshots: [desktop](screenshots/tab-score-desktop.png),
[tablet](screenshots/tab-score-tablet.png), [mobile](screenshots/tab-score-mobile.png),
and [progression with evidence](screenshots/tab-score-progression.png).

The previous verification below describes the superseded detail-sidebar layout.
Timing remains order-only: positions do not declare note duration, rests or meter.
No automatic key, hidden harmony, cadence or accompaniment assertion is added.

## Previous editable-score workflow — 2026-10-03

Verified 2026-10-03 against the then-current workspace. Scope: direct six-string score editing,
ASCII import, single-note/double-stop/chordal passage analysis and bounded major-key
progression patterns in the separate Scale > Analyze tab workflow.

## Automated checks

- Relevant regression suite: 25 files, 749 tests passed. Covers tab parser/editing/analysis,
  reducer/history, numeric input/IME, workspace and ClientApp integration, existing Scale,
  chord recognition/reverse and Harmony behavior.
- TypeScript (`npx tsc --noEmit`) and repository ESLint passed.
- Production build passed, including TypeScript and static-page generation.
- Test/build child processes required the sandbox exception after local `spawn EPERM`.

## Real-browser checks

Used the Next development app in the in-app browser at 390, 768 and 1335px. Inspected
empty/default and mixed-example states at each width, expanded context on tablet/mobile,
and invalid input/import states. Desktop uses a score/detail split; smaller views stack.

- No horizontal page overflow at all three widths. The score and pitch sequence scroll
  within their own regions. Visible analysis buttons meet the 44px minimum target.
- Direct 12-fret typing and right-arrow commit/move worked. Direct 0 and 10 input worked;
  Enter committed, and Tab committed then focused Undo outside the grid. Invalid 37 stayed
  editable with an error; Escape restored the original fret. Mobile-width 24 entry and
  Undo restored the original note.
- The mixed example contains single notes, three successive double stops and two triads.
  Reference C Ionian reveals m2/M2 melodic ascent and parallel thirds under the displayed
  lower/upper connection assumption. Explicit C major adds I/ii sequence labels.
- A separate C–G7–C import with explicit C major showed V–I motion at columns 2–3, while
  retaining the distinction between a progression pattern and a cadence.
- Invalid text import at 390px showed located diagnostics and preserved all eight existing
  score columns. Editing/restoring the draft cleared errors without replacing the score.
- A development hydration-ID warning appeared during hot reload on the existing Explore
  screen; a settled fresh reload did not reproduce it. No new errors appeared in the
  subsequent editor checks. This was not treated as a reason to redesign adjacent screens.
- Reduced-motion CSS disables transitions; editor focus scrolling uses instant behavior.
  The OS motion preference was not changed.

Screenshots: [desktop](screenshots/tab-editor-desktop.jpg),
[tablet](screenshots/tab-editor-tablet.jpg), [mobile](screenshots/tab-editor-mobile.jpg),
and [progression](screenshots/tab-editor-progression.jpg).

The earlier tab-analysis-* screenshots document the previous ASCII-only viewer.
Rhythm, explicit voice notation, Guitar Pro/MusicXML/OCR imports, playback, automatic
key/harmonic segmentation and cadence/modulation inference are not included. Pattern
observation is intentionally limited to explicit major keys and unique exact chord matches.
See the [domain contract](../architecture/tab-analysis.md) for inference boundaries.
