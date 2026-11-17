# Scale tab analysis

Analyze tab is a separate Scale workflow with an editable score, local analysis and no
fretboard. It follows docs/design-language.md: quiet actions, thin string lines, small
selection indicators, hairline-separated results, shared tokens and 44px targets.

## Document and state

The committed TabDocument is independent of the ASCII import draft. The initial document
has one measure with one empty position. Additional bars also start with one unknown
position; neither document creation nor appending bars depends on system layout. Stable IDs identify positions and notes. Editing a draft or failing
to import preserves the score; successful import is an undoable replacement. Imported notes
retain source positions; authored/edited notes do not receive fictitious ASCII coordinates.
The parent owns the score, active cell, selection and history across workflow switches.

Frets are integers 0–36, relative to capo. Pitch derives from fret, tuning and capo. Instrument
changes retain frets and recalculate pitches. Each column has at most one note per string.
Same-column entries start together; columns establish order. Blank columns are editable
positions, not rests. The document continues to declare timing: order-only, even when
optional written timing is supplied. No beat, duration or sustain is inferred from spacing.

Optional input lives in the existing document: `meter` on TabDocument, bar-relative
`beatOffset` on TabMoment, and `duration` on individual TabNotes. Durations/offsets use
normalized exact fractions of a quarter note; meter retains its written numerator and
denominator. Missing values mean unknown, not zero or a default quarter note. Same-column
notes share an onset but can have different durations. Partial, overlapping or inconsistent
timing may be preserved; this is not a validated measured timeline or a rhythm engine.

An explicit whole-position `rest`, per-string unpitched `mutes`, and `sustains` referencing
an original note ID are distinct from empty input. A rest excludes other events at that
position. A continuation adds no pitch observation; its optional duration belongs to that
continuation. Technique metadata belongs to the source note, independently of its pitch
and duration. Fret-to-fret connectors reference stable endpoint IDs and retain their raw
glyph; bend/release retain written target fret-equivalent values, not additional TabNotes.

The parser accepts six-string ASCII through .txt/.tab or pasted text. Adjacent explicit
fret endpoints around h/p, / and backslash, postfix ~ vibrato, and numeric b/r gestures
(5b7, 5b7r5) are retained with source locations and located boundary warnings. Targets do
not become fret observations, even when another string has a real note at that source
column. Intermediate pitch/gesture realization is not modeled. Standalone releases, ^,
full/fractional/unspecified bend targets, ASCII ties and malformed gestures remain located
errors. Muted-only columns interrupt pitch runs, never inferred rests. All-muted input is
editable/importable; Analyze requires pitched notes. Completely blank imports still fail.
Limits remain 64 KB and 1024 editable positions
and measures. Imported empty measures receive one editable empty position. Imports
verify the exact source/instrument snapshot. File reading uses cancellation/revision tokens.
Guitar Pro, MusicXML, images/PDFs, ASCII rhythm parsing and playback remain outside this adapter.

Undo/redo stores at most 100 score/instrument snapshots. Import text and its filename are
separate from the committed score name. Insertion/deletion remaps selection through stable
column IDs. No edit-to-ASCII-to-parser round trip is used.

## Editing

A six-row accessible grid provides roving focus and native numeric text input at the active
cell. The first typed digit replaces the old fret; following digits extend the draft, so
10/12/24 do not depend on typing speed. Enter confirms and advances, Escape cancels, and arrows confirm
then move across columns or strings. Invalid frets remain available for correction.
Delete clears a note; Backspace edits the draft or clears a nonediting cell. Tab confirms
and leaves the grid. Shift with horizontal arrows extends selection from a stable anchor.
Undo/redo applies to committed edits, retuning, imports and column mutations. IME composition
and native input events must work without global shortcut interception.

Four explicit measures form each system. A measure can contain a variable number of
positions; + controls in a named lane immediately below the strings insert at each
column's trailing boundary, and Insert adds after the cursor. The gutter says Position;
small persistent plus/stem marks share 44px targets on mouse, touch and keyboard.
One roving Tab entry and Left/Right/Home/End reach insertion boundaries without changing
selection; Enter/Space opens the inserted position on the current string. Escape returns
to the selected cell; Up returns to the position preceding that boundary. Tab exits the
cell grid to this lane and then leaves it normally. Column headers support click, drag and Shift-arrow range selection. Delete or
Backspace on a focused header deletes the selected columns together, as one undoable edit;
on touch, holding a header opens a compact red-trash popover. Ordinary taps and desktop
selection expose no persistent delete button. Movement or pointer cancellation cancels
the hold gesture.
Delete on a string cell clears only that note. Deleting every position in a measure retains
one empty stable position so the measure remains editable. Add bar at the score's end
appends one measure and focuses its first position. The selected position's inline
Edit trigger opens a contextual editor beside that position to add/remove its following
barline. Dense systems scroll inside the score viewport,
including on mobile, with 44px input targets and no horizontal page overflow.
The single initial position is an editable placeholder. The default UI labels free timing and states
that positions are not beats. If notation is supplied, it explicitly says the analysis
preserves but does not interpret timing, ties or pitch gestures. Header dots and
pointer-specific hints supplement direct score affordances.

Each string row owns one continuous decorative line across the system, independently
of cell state. Musical glyphs and the centered text area of native input mask only their
text area; an empty input leaves its line visible. A pointer-transparent layer draws
explicit measure boundaries between the first and sixth string centers using the same
grid template. These presentation layers do not define timing or change the document.
See the [P1 audit](../implementation/tab-p1-interaction-audit-2026-10-19.md) for the
alternative comparison, interaction contract and browser evidence.

Each bar header reveals meter entry in that system and explicitly labels its current
score-wide scope. An always-visible Edit trigger above the active position opens a
compact contextual editor beside that column: duration, explicit fractional start offset, whole-position Rest, string
Mute x, Tie previous and barline editing. There is no separate bottom Notation form or
Structure menu. The editor fits the score viewport, scrolls internally when needed,
focuses its first input, and Escape/Close returns focus to the Edit trigger. Selecting
another position dismisses it. Existing
SwipePicker/quiet text actions retain 44px targets. x/X also works in direct native input.
The score distinguishes R, x and a tied fret; duration/technique details are accessible
and available beside the selected cell. Imported techniques are displayed, not manually
authored through a new effects editor.

Tie previous requires a previous same-string note/continuation; unknown blanks, rests
and same-string mutes block this shortcut. A different-pitch current note is not silently
converted. Explicit authored connections survive empty placeholder insertion but are
removed when their endpoints disappear/change pitch or a rest/same-string attack/mute
interrupts them. Opening a rest/tie cell without editing does not erase it. Fret changes
retain duration but clear affected technique/continuation links; Undo restores the snapshot.
Structural edits never invent new beat offsets. A bar split is refused if it would move
positions with explicit offsets into a new bar with an unknown timing origin; the UI
explains that starts after the cursor must be cleared first. Removing a barline is also
refused if the following bar has explicit offsets (including zero): its origin would
change. Safe splits/joins retain note IDs, durations, techniques, sustains and offsets
whose bar origins do not change. Each structural change is one undoable edit.

### P0 measure ownership decision (2026-10-05)

The original UX coupling came from `createEmptyTabDocument(16, 4)` in initial state
and appending four positions per bar, alongside separate bottom controls. The renderer
already groups variable-size measures independently into systems of at most four bars.
The existing `moment.measure + measureCount` model suffices for P0: rendering, imported
empty bars, position insertion/deletion, split/join and history work without new identities.
Measure and position controls now belong to TabScoreView; the workspace supplies reducer
actions and owns session/history/analysis. TabNotationEditor is a contextual position
control; TabMeasureEditor handles the bar-owned entry for document-wide meter.

Alternatives considered: explicit stable Measure entities would be suitable for local
meter, measure reordering and persistent bar identity, but require parser/state/history
migration beyond these P0 edits. A measure metadata map is an intermediate option,
but indexing it by mutable bar numbers creates renumbering responsibilities while still
lacking stable measure identity. Neither new layer solves this UI ownership issue by
itself, so neither is introduced here. The document format and analysis projection stay
unchanged.

Deferred limitations: meter remains global; renumbered measure numbers are not stable
IDs; structural edits cannot specify a new local timing origin. Local meter changes or
timed boundary relocation need an explicit origin/rebasing policy and likely stable
measure identity. Current guards intentionally refuse such edits. Sounding timelines,
metrical inference, new formats, continuous string rendering and position-boundary +
redesign remain outside P0.

## Explicit analysis and score annotations

The score-first UI has one Analyze action, which snapshots the entire committed score
and context regardless of the cursor or selection. No separate scope buttons or selection
toolbar are exposed; the visible selection is for direct score editing. Selection-scoped
analysis remains supported by the domain reducer.
The first valid numeric draft can be committed by clicking Analyze directly. Invalid
drafts disable Analyze. Cursor movement preserves the snapshot. Score, instrument or
context changes make it stale and hide annotations until Analyze runs again; undo/redo
also require reanalysis. Text import alone does not analyze. Failed imports preserve
both the existing score and a fresh snapshot.

Annotations attach to stable score positions: observed simultaneous chord matches,
conditional Roman numerals, supplied reference scale, double-stop intervals, melodic
contours, the highest-ranked repeated interval pattern, arpeggio candidates and bounded
progression patterns. Generic mixed-contour labels are omitted where a specific repeated
pattern already describes the run. Candidate labels retain uncertainty. Clicking a label
reveals its evidence beside that system; there is no persistent detail sidebar. Annotations
can be hidden without losing the snapshot.
The key shortcut beside Analyze opens the existing context without assigning a key.
Candidate question marks cannot be clipped away with their labels; evidence wraps outside
the scrolling score. Annotation lanes pack in position order.

## Analysis and inference boundaries

Analysis is deterministic local TypeScript. Ordered moments and each note occurrence are
preserved; a repeated melody is not collapsed to a pitch set. Mixed passages can contain
single-note runs, double stops and chordal events in the same selection.

Current inference consumes only the existing `notes` pitch/order projection. Meter,
offsets, durations and technique gestures do not alter recognition, arpeggio grouping,
Roman labels or progression rules. Empty/rest/mute-only/sustain-only positions are still
pitch continuity barriers. No sounding-overlap reconstruction, metrical weighting or
bend-target pitch realization occurs. Converting an attack to a continuation deliberately
removes that attack from the projection; adding timing metadata alone never does.

- Single notes expose pitch/register and optional reference-scale/chord membership.
- Consecutive single-note runs expose directed intervals, contour and repeated interval
  patterns. An interval pattern is not proof of a rhythmic motif.
- Double stops expose vertical intervals. Consecutive dyads expose movement under an
  explicit lower-to-lower/upper-to-upper assumption. Strings are not musical voices.
- Chordal events expose registry alternatives. Three sounding notes alone do not prove a
  triad, and the lowest guitar note is not necessarily the ensemble bass.
- Bounded consecutive single-note windows (at most 16 positions, within an explicit
  measure) expose complete three- or four-pitch-class arpeggio collection matches
  separately from simultaneous chord readings. Maximal complete windows suppress
  contained fragments; alternatives remain candidates. They do not assert the actual accompaniment.
- A separate TAB harmonic-span adapter retains simultaneous readings and whole-bar
  single-note collection candidates independently of any key. A whole-bar candidate must
  cover the full document measure (not a partial selection), contain 3–16 contiguous
  single-note positions and 3–4 pitch classes. Empty/dyad/chord positions interrupt this
  grouping. Sliding arpeggio windows never establish harmonic boundaries. If no exact
  match exists, a root/third/seventh shell with only natural fifth omitted may be retained
  as an incomplete candidate; the missing note is never inserted.
- Under a supplied key, directly adjacent, nonoverlapping spans with unique exact formula
  matches can establish bounded major ii–V–I, V–I, IV–I or minor V–i, iv–i patterns.
  Natural-minor v is not promoted to major V. Blank positions, muted-only events and empty
  measures break the sequence. Any sequential span makes the entire reading a candidate,
  with explicit whole-bar grouping assumptions and no harmonic-duration claim.
  Purely simultaneous patterns are structural observations conditional on the reference,
  not proof of actual harmonic function, phrase endings or cadences.
  Exact alternatives such as Dm7/F6 and C6/Am7 remain ambiguous; incomplete and added-tone
  readings do not trigger these patterns. A longer ii–V–I suppresses its nested V–I label.

Intervals use supplied spelling context where available; otherwise semitone distance is
shown without an assumed enharmonic reading. Shared scale structures, chord registry and
spelling policy remain authoritative. Scale and chord-relative spelling can differ.

Key entry uses shared `getKeyName` for major and `getMinorKeyName` for minor; changing
mode preserves the tonic pitch class while adopting that mode's conventional key spelling.
The dial trigger displays the supplied frame tonic. Score annotations, chord-sequence
readings and progression evidence share `contextual-spelling.ts`, a presentation adapter
over Harmony `frameChords` and `romanLabel`, not an independent spelling policy. Neutral
recognition candidates remain unchanged; chromatic roots outside the frame's diatonic
root map retain the existing spelling and inferred-Roman abstention.

ScaleRef is a reference collection; TonalFrame is an explicit key. Neither implies the other.
Copying Explore scale is a one-time snapshot. The domain retains optional selection chord
context, but the score-first UI does not expose a manual chord picker. Non-membership does not automatically establish a
passing tone, tension or avoid note. Registry matching scores are not probabilities.
Harmony's illustrative relationship generator is not a performed-score observer.

## Tonal-reference policy

The explicit-key policy is retained for Roman and named tonal-pattern interpretation,
with the key understood as an optional pinned analysis frame applied across this score.
It is neither detected global truth nor a statistical prior: it does not rank, remove or
rewrite chord/span candidates. No key is required for notes, intervals, chord identities,
arpeggio candidates or harmonic-span candidates. Reference-scale membership cannot supply
a key implicitly. Conditional Roman coordinates such as VI7–ii under C do not claim an
applied dominant, tonicization or modulation.

Global center and local context are conceptually distinct. A future local-context layer
would consume event candidates and return bounded competing contexts with provenance,
before any functional interpretation. It must not relabel notes or silently override a
pinned frame. Modal centers need a separate modal reference contract; reusing a modal
scale as major/minor TonalFrame would conflate collection with center. No local-context
data model or automatic key/modulation engine is introduced without richer evidence and
an evaluation corpus. The present order-only model lacks duration, accents, phrase ends,
sustained voices and ensemble bass, so it cannot reliably separate temporary tonicization
from established modulation. See the implementation audit for alternatives and risks.

## Verification

Domain tests cover order, repetition, dyad motion, mixed passages, arpeggio/simultaneity,
ambiguous chords, enharmonic spelling and absent evidence. State/editor tests cover numeric
input, invalid frets, history, selection, retuning, column mutation and stale/failed imports.
Integration tests preserve independent Scale/Chord/Harmony state. Browser checks cover
390/768/1335px default and changed states, keyboard/focus, targets, contained overflow and
reduced-motion styles. Relevant tests, typecheck, lint and production build are required.

P0 verification (2026-10-05), based on fetched `origin/master` at `ab0cfb1` (this repository
has no main branch): all 374 tests in the 15 TAB domain, session, score/input/workspace
and ClientApp integration files passed. Targeted ESLint has no errors or warnings;
TypeScript and production build passed. Chord, arpeggio and progression regressions
remain unchanged; no analysis implementation was modified.

Actual browser checks at 390/768/1335px covered blank score, 1→2→4→5 bar growth,
system wrapping, keyboard-only fret/meter/duration entry, contextual editor entry and
Escape/Close/Tab exit, position insertion, rest/mute/tie/start input, barline split/join,
timing-origin refusal and structural undo/redo. Undo/redo across a system boundary
retains the correct cell focus. Meter entry remains bar-owned with explicitly global
scope. Visible new controls retain 44px targets; new controls add no motion and shared
pickers retain reduced-motion rules. Touch selection/hold regression tests also pass.

24-position ASCII import remains editable. At mobile width the page stayed 375px wide
(390px including the scrollbar), while the 351px score viewport scrolled over a 1122px
sheet; keyboard End moved its scrollLeft to 749px. Tablet also contained the dense
sheet (689px viewport, 1122px content). Popovers fit the visible system and reposition
after structural changes; page widths did not expand. Browser error logs were empty.
P0 acceptance: GO; no P1 implementation was started.

Screenshots: [desktop contextual input](../implementation/screenshots/tab-p0-desktop.jpg),
[tablet input](../implementation/screenshots/tab-p0-tablet.jpg),
[tablet blank](../implementation/screenshots/tab-p0-tablet-empty.jpg),
[mobile blank](../implementation/screenshots/tab-p0-mobile-empty.jpg),
[mobile input](../implementation/screenshots/tab-p0-mobile.jpg),
[mobile five bars](../implementation/screenshots/tab-p0-mobile-five-bars.jpg),
[mobile internal scrolling](../implementation/screenshots/tab-p0-mobile-dense.jpg).

P1 verification (2026-10-19), based on fetched `origin/master` at `6dc9630`: all
378 tests in the same 15 TAB/integration files passed; scoped lint, TypeScript and
production build passed. Browser checks at 390/768/1335px cover blank, dense, annotated
and edited scores, 4→5-bar wrapping, insertion/history focus, and contained scrolling.
Insertion targets are 44×44px with 0px boundary drift. New controls are independent of
hover/coarse-pointer visibility and add no motion. Touch pointer events pass; physical
device coverage is not claimed. See the P1 audit for screenshots, measurements and
deferred items. P1 acceptance: GO; no P2 analysis or sounding-timeline work started.

## P2 notation inspection

`inspectTabTiming` is a read-only notation/structure check, independent of Analyze.
Check timing is opt-in above the score. No meter, offset, length, rest or performance
is inferred, and missing timing never disables the existing order-only analyzer.

The inspection separates `none` (free timing), `some` (one or more numerical timing
fields supplied) and `unreadable` input. Rest, mute, continuation and technique markers
alone do not establish numerical timing. Free timing still receives structural checks,
but no missing-value list. With partial timing, only event-bearing positions require
start completeness; notes, rests and continuations contribute duration completeness.
Mutes and blank placeholders do not require durations. Missing fields are information,
not invalid notation. Numeric fields use the existing fraction/meter bounds without
normalizing or repairing the document.

Structural checks include unique position/note IDs, rest exclusivity, one event per
string, and source references. A continuation must reference an earlier note; technique
endpoints for h/p/slide must refer forward on the same string. Their time, performed
pitch and expressive realization remain unassessed. Written durations crossing a
barline, overlaps and offset order are deliberately outside this inspection.
Explicit rests, same-string mutes and new attacks between relation endpoints are
structural interruptions. Blanks, other-string events and continuations do not
establish an interruption. The check reports the contradiction without removing links.

Timing results are local UI snapshots, separate from ASCII line/column diagnostics and
harmonic annotations. Document/instrument/history changes invalidate their targets;
cursor, selection, draft import text and tonal-reference changes do not. Navigation
requires a current snapshot and unique target, recomputes bar/position labels and moves
actual keyboard focus with contained scrolling. Escape returns to the originating
diagnostic. Check/open/close/navigation create no score edit or history entry.
The current position editor handles Escape before diagnostic return. Its first Escape
closes the editor and focuses Edit; a subsequent Escape can return to the diagnostic.
The expanded accessibility state follows the actual current report; explicit draft
resolution clears blocked guidance. Technical scope is disclosed in About this check.

Timing pointer, click and keyboard activation share a draft guard. Dirty fret input,
unapplied fractional text and IME composition block these actions without a pending
automatic retry. Pointer-down is intercepted before blur can commit; timing controls
are excluded from outside-dismiss. Dirty/composing fractional editors remain mounted
when keyboard focus passes outside them, including native viewport scrolling. Existing
fret Enter/Tab/Escape semantics remain; Set start commits fractions and Cancel start
input restores their committed value. No new action auto-saves a draft.

See [P2 implementation and verification](../implementation/tab-timing-inspection.md).

## P3 measure-owned written-time core

`observeTabWrittenTime` and `getTabWrittenNotesAt` provide opt-in, read-only domain
observations of explicitly authored note intervals owned by one measure. The source
document remains order-only; Analyze, editing and P2 checks do not invoke
this core or change behavior. It introduces no global anchor, sounding realization,
harmonic interpretation, external runtime, cache or worker.

The population and coordinate frame are explicit: source note occurrences in the
selected measure, in bar-relative quarter-note units. Written durations are not clipped
at barlines or merged with continuations. Notes keep their IDs, string and already
computed MIDI; non-note markers remain source facts. Exact BigInt rationals are
serialized as integer-string fractions in separately copied JSON-safe snapshot data.

Coverage is independently validated, never derived from P2 timingInput or issue totals.
A confidently empty note population can be complete with no observed range; querying
it is outside-range, not proof of silence. Partial observations retain known intervals
but never return a complete note set. Complete queries apply only inside their finite
half-open extent, and a gap is empty only relative to the declared written-note
population. Existing report invalidation and input protection contracts are unchanged.

See [P3 contract and implementation verification](../implementation/tab-written-time.md).

## P3.1 written-time view

`View written time` explicitly observes the active position's bar, independently of
`Check timing`. The read-only panel draws known nominal intervals, eight per page.
Only complete, nonempty note coverage offers exact endpoint queries; partial views
show known intervals without a complete active-note set. Empty ownership says
`No written notes`; an interior gap and the final outside-range endpoint remain
distinct. Neither means performed silence. Approximate drawing geometry never feeds
the exact query or edits source values.

The panel shares P2's pending-input guard, including pointer-down before blur,
keyboard activation and composition. A document or active-bar change immediately
hides the snapshot and requires an explicit new view; Undo cannot resurrect it.
Tonal-reference changes retain the same document and view. Opening, querying, paging
and closing dispatch no score, selection or history action. Close/Escape returns
focus to View after the shared guard allows the action.

See [P3.1 UI contract and verification](../implementation/tab-written-time-ui.md).

## P3.2 point-local written-note coverage

`inspectTabWrittenNotesAt` can prove a point complete within a partial snapshot only
when every nonprojected note is otherwise valid, has only a missing duration, and
starts strictly after the query. The observer records these exclusion facts during
its existing validation pass. All other unresolved entries block promotion, and an
unreadable population never becomes complete. Overall `noteCoverage` and the legacy
`getTabWrittenNotesAt` remain conservative and unchanged.

The panel retains uncertain points in navigation, removes active-set emphasis there,
and distinguishes proof at the current point from completeness of the whole bar.
Added candidate times are exact eligible starts inside the known interval extent;
the known extent itself is never a completeness proof or bar length. Snapshot
lifetime, pending input, score editing and P2 are unchanged.

See [P3.2 contract and verification](../implementation/tab-written-time-point-coverage.md).

## P3.3 cross-bar written-time observation

An explicitly selected regular-origin model places bars by the existing score-wide
meter, with first origin zero. This model is an interpretation, not measured bar
timing or performance. New cross-bar APIs enumerate all source note occurrences and
keep the selected bar's query window separate from the extent of known intervals.
They preserve original ownership and authored values, including offsets beyond one
modeled bar, with a nonblocking projection diagnostic rather than correction.

Otherwise valid missing starts can use their known bar origin only as an exclusion
lower bound under the declared nonnegative authored-offset domain. No onset or note
endpoint is invented. Complete means nominal source-note completeness at a point,
not sounding, silence, sustain realization or harmonic completeness.

The opt-in Across view displays an exact-time-sorted copy with source labels and
bounded pages; source/query order and the default This bar remain unchanged. Existing
pending-input and report/history invalidation behavior also covers scope changes.

See [P3.3 contract and verification](../implementation/tab-written-time-across-bars.md).
