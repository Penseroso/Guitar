# Scale tab analysis

Analyze tab is a separate Scale workflow with an editable score, local analysis and no
fretboard. It follows docs/design-language.md: quiet actions, thin string lines, small
selection indicators, hairline-separated results, shared tokens and 44px targets.

## Document and state

The committed TabDocument is independent of the ASCII import draft. The initial document
has four measures with four empty positions each. These are starting positions, not a
four-note limit or a 4/4 meter declaration. Stable IDs identify positions and notes. Editing a draft or failing
to import preserves the score; successful import is an undoable replacement. Imported notes
retain source positions; authored/edited notes do not receive fictitious ASCII coordinates.
The parent owns the score, active cell, selection and history across workflow switches.

Frets are integers 0–36, relative to capo. Pitch derives from fret, tuning and capo. Instrument
changes retain frets and recalculate pitches. Each column has at most one note per string.
Same-column entries start together; columns establish order. Blank columns are editable
positions, not rests. The document declares timing: order-only. Note lengths, meter,
sustained overlap, ties and musical voices are unknown.

The parser accepts six-string ASCII through .txt/.tab or pasted text, with located errors
for unsupported symbols or misalignment. Limits remain 64 KB and 1024 editable positions
and measures. Imported empty measures receive one editable empty position. Imports
verify the exact source/instrument snapshot. File reading uses cancellation/revision tokens.
Guitar Pro, MusicXML, images/PDFs, timed notation and playback remain outside this adapter.

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
positions; inline + controls between columns insert directly, and Insert adds after the
cursor. The + controls overlay the vertical center of the strings, without a dedicated
row. Desktop controls appear on hover near the insertion boundary; touch exposes the
active position's insertion affordance. Column headers support click, drag and Shift-arrow range selection. Delete or
Backspace on a focused header deletes the selected columns together, as one undoable edit;
on touch, holding a header opens a compact red-trash popover. Ordinary taps and desktop
selection expose no persistent delete button. Movement or pointer cancellation cancels
the hold gesture.
Delete on a string cell clears only that note. Deleting every position in a measure retains
one empty stable position so the measure remains editable. + 4 bars appends a system;
Structure exposes a barline after the cursor. Dense systems scroll inside the score viewport,
including on mobile, with 44px input targets and no horizontal page overflow.

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

## Analysis and inference boundaries

Analysis is deterministic local TypeScript. Ordered moments and each note occurrence are
preserved; a repeated melody is not collapsed to a pitch set. Mixed passages can contain
single-note runs, double stops and chordal events in the same selection.

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
- Chordal sequences retain alternatives with conditional Roman numerals under an explicit
  key. Gaps and single notes do not establish hidden chords. No automatic harmonic-span
  segmentation, cadence or key inference is claimed.
- Under an explicitly supplied major key, adjacent unique exact formula matches can
  establish bounded ii–V–I, V–I and IV–I patterns. These labels do not establish phrase
  endings or harmonic function. Minor keys are outside this pattern observer's scope.
  Exact alternatives such as Dm7/F6 and C6/Am7 remain ambiguous; incomplete and added-tone
  readings do not trigger these patterns. A longer ii–V–I suppresses its nested V–I label.

Intervals use supplied spelling context where available; otherwise semitone distance is
shown without an assumed enharmonic reading. Shared scale structures, chord registry and
spelling policy remain authoritative. Scale and chord-relative spelling can differ.

ScaleRef is a reference collection; TonalFrame is an explicit key. Neither implies the other.
Copying Explore scale is a one-time snapshot. The domain retains optional selection chord
context, but the score-first UI does not expose a manual chord picker. Non-membership does not automatically establish a
passing tone, tension or avoid note. Registry matching scores are not probabilities.
Harmony's illustrative relationship generator is not a performed-score observer.

## Verification

Domain tests cover order, repetition, dyad motion, mixed passages, arpeggio/simultaneity,
ambiguous chords, enharmonic spelling and absent evidence. State/editor tests cover numeric
input, invalid frets, history, selection, retuning, column mutation and stale/failed imports.
Integration tests preserve independent Scale/Chord/Harmony state. Browser checks cover
390/768/1335px default and changed states, keyboard/focus, targets, contained overflow and
reduced-motion styles. Relevant tests, typecheck, lint and production build are required.
