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

The parser accepts six-string ASCII through .txt/.tab or pasted text. Adjacent explicit
fret endpoints around h/p, / and backslash, and postfix ~ vibrato are accepted with located
warnings: articulation, intermediate pitches and vibrato variation are not modeled.
Bend/release targets, unspecified slides, ties and malformed gestures remain located errors;
silently stripping these could invent pitches. Muted-only columns remain empty pitch
observations that interrupt runs, never inferred rests. All-muted input still fails.
Limits remain 64 KB and 1024 editable positions
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
The four initial positions are scaffolding. The UI explicitly labels free timing and
states that positions are not beats. Header dots and pointer-specific hints reveal editing.

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
