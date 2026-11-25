# P3.3: cross-bar nominal written-time observation

Baseline: verified P3.2 `9375293b72e4d3ecccc00da0e3104b934579e860`, shared
`feat/tab-timing-inspection`. No master merge or historical local timeline is used.

## Declared model and population

The user explicitly selects `regular-bar-origins`. With a valid score-wide meter,
`L = 4 * numerator / denominator` quarter notes and `origin(m) = (m - 1) * L`.
The first bar origin is zero. This is a selected coordinate model, not evidence of
actual full bars, absence of pickups, metrical validity or performance timing.
Missing/invalid model, meter or scope makes this projection unavailable; local P3.2
observations remain independently usable.

The population is **all source note occurrences**; the selected bar determines only
the half-open `projectionWindow`. Every valid occurrence retains its source bar,
position/note IDs and indices, string, current base MIDI, source local start and
written length. Global start/end are exact translated values, never a rewrite.
Unisons and repeated pitches remain separate. The observer classifies the whole
source directly rather than calling the local observer once per bar.

An offset equal to or greater than L is still a valid authored fraction. It is
projected exactly with its original owner, even into a later bar's window. One
nonblocking `offset-outside-projected-bar` diagnostic per position records the
offset, source location and L. It neither clips/reassigns the note nor, by itself,
blocks completeness. Such a late onset is not automatically a carried-in sound.

Rest, mute, continuation and technique facts are preserved without realization.
No cutoff, duration extension/merge, pitch trajectory, inferred onset, tempo,
silence, chord, harmonic or tonal interpretation is introduced.

## API and completeness contract

```ts
observeTabAcrossBarsWrittenTime(document, measure, { model: 'regular-bar-origins' })
inspectTabAcrossBarsWrittenNotesAt(snapshot, globalTime)
getTabAcrossBarsWrittenInspectionPoints(snapshot)
```

The snapshot associates the source object but owns frozen JSON-safe data. Queries
read only that copied data. Its selected model/domain, complete/partial/unreadable
population, raw source facts, valid global intervals, uncertainty facts, endpoint
deltas, finite known `observedRange`, selected `projectionWindow`, validation issues
and nonblocking projection diagnostics remain separate.

`complete` means only **nominal written-time completeness for the entire declared
source-note population at this exact point under this selected model**. It does not
establish actual sounding, silence, rest, sustain realization or harmonic completeness.
An overall partial population can have a proven point; it stays globally partial.

Two sufficient exclusion facts are supported:

- Otherwise valid note, exact start known and only length absent: the exact global
  start is a lower bound; exclusion requires `query < start`.
- Start absent, with otherwise valid ownership/identity/string/MIDI and length either
  valid positive or absent: the source-bar origin is a lower bound **only under the
  explicitly selected model and declared nonnegative authored-offset completion
  domain**. Exclusion requires `query < origin`. At equality this rule refuses proof.

An explicit invalid temporal value is never missing. Unknown ownership, malformed
population, duplicate IDs, invalid MIDI/string or any unresolved contributor cannot
be repaired or excluded by these rules. Lower bounds stay proof facts; they do not
become fabricated onset/interval/note endpoints. Every source entry must be accounted
for before a complete set is returned, independent of P2 issue counts.

Query precedence is **invalid query -> model unavailable -> outside selected window
-> unreadable population -> unresolved partial -> outside known range -> complete**.
Only complete results expose notes and their proof; other states expose no full set.

The window is a query domain, not an interval end or coverage proof. At global 8,
window [4,8) is outside-window regardless of unknown notes; the same source queried
through window [8,12) must still fail the missing-start lower-bound proof at equality.
Inside a window, unresolved contributions take priority over known-range exclusion.
Null known range never becomes a new complete empty set merely because a window
exists. Complete internal gaps mean no active nominal source note, not silence.

Inspection choices combine exact window boundaries, known interval endpoints and
supported exclusion boundaries in the selected window. The window start permits
inspection of a long interval spanning the whole window without an attack there.
These are view/proof boundaries, not newly authored events. Unavailable/unreadable
or null-observed-range data provides no inspection points.

## UI and source traceability

Every explicit View begins with the unchanged `This bar` panel. Open reports expose
quiet `This bar` / `Across full bars` scope buttons with the current meter. Across
is unavailable without valid meter; a short hint points to existing meter entry.
Selecting Across explicitly opts into the model, without a new confirmation dialog.
Controls stay in the existing pending-input guard, outside the keyed result panel.

The cross-bar view shows known intervals intersecting the selected window:
`start < window.end && end > window.start`. Drawing alone is clipped to that window.
It sorts a display copy by exact global start, then source `momentIndex/noteIndex`,
and mounts eight chart/eight detail rows per page. Source data and query notes retain
their source order. Point/active-state changes never reorder rows or pages. The full
active count comes from the query, not the current page. Candidate/query/display
projections are memoized per snapshot/point, without caching every point's active set.

Source order best preserves direct score correspondence; time order makes cross-bar
overlap easier to follow when a late source offset appears in a later window. Thus
time order is used only in Across, while This bar stays source ordered. Each row keeps
source Bar/Position/String; Details retains position/note IDs and exact local/global
times, model qualification and bounded diagnostics. Technical proof stays disclosed.

A selected bar with no owned notes may still contain a prior written interval.
Unknown points remain navigable with no complete active-set emphasis. Global source
coverage/count is never mislabeled as selected-bar ownership or actual sounding.

Scope/view/query/page actions dispatch no score, selection or history edits. Pending
fret, fractions and composition block actions before pointer blur and on keyboard
activation, without queued retry. Close/Escape restores View focus. Document, meter,
instrument, active-bar and history changes hide and discard reports; Undo cannot
resurrect them. A new View returns to This bar. Explicit input commit/cancel and P2
diagnostic behavior remain unchanged.

## Verification and residual risks

- Related TAB suite: **27 files / 688 tests passed**, with **61 new tests** (33 core,
  13 panel, 15 parent integration). Scoped ESLint has zero warnings; final TypeScript
  and production build passed. Two unsupported Testing Library test options were
  corrected before the final full-suite/type/lint run; runtime source stayed frozen.
- Independent core checks: **2,400 seeded mixed inputs / 14,400 exact queries**,
  **2,400 invalid queries**, **114 finite completion worlds**, and **10 manual groups**.
  Expected eligibility/membership uses independent integer-grid and manually exact
  nonbinary arithmetic, not production coverage/arithmetic helpers. No false complete
  set, source mutation, fabricated interval or exception was observed.
- Four maximum-size host patterns cover **1,024 bars / 1,024 positions / 6,144 notes**,
  spread or concentrated, with simple/source-limit fractions. Serialized snapshot data
  was about **2.95–3.19MB**, retaining **12,288 endpoint references**. Latest observation
  medians were **48.8–63.4ms**, queries **1.27–2.27ms**, and inspection choices
  **0.21–1.69ms**. Host scheduling/GC varied; these are not performance rankings or SLOs.
- Production Chromium **390 / 768 / 1335px** passed explicit-model, chronological
  display, nonblocking overrun/source trace, empty-bar carry-in, strict future-origin
  boundary, 8+1 paging, history and new-View-default checks. Source/model facts remain
  distinct; Details is opt-in. Page widths matched viewports; targets met 44px;
  reduced motion was enabled; page/console errors were zero.
- Independent native-browser checks passed at all three widths for valid/invalid
  fret drafts, actual fraction Shift+Tab, trusted CDP composition, scope/View/Close/
  page/point/P2 guards, no queued action, explicit commits, and document/meter/bar/
  instrument/history invalidation. The P2 diagnostic/Escape regression also passed.
  Root additionally checked native Scope Escape with clean and pending input at all
  three widths. Physical-device/OS IMEs and participant understanding are unmeasured.
- Runtime/source/build/driver/result hashes match the frozen app. All **13 protected
  files**, including P3.2 core/local panel, exact arithmetic, editing, P2, Analyze,
  reducer and product dependencies, retain their baseline hashes. The historical
  worktree's five local changes remain untouched.

**Acceptance: GO for the explicit regular-origin nominal written-time scope and UI.**
NON VERBATIM / INTUITIVE feature review is GO within functional browser review,
without claiming participant comprehension or actual sounding correctness.

[Source-bound verification](tab-written-time-across-bars-validation/verification.json) ·
[Independent report](tab-written-time-across-bars-validation/independent/report.md) ·
[Visual/focus review](tab-written-time-across-bars-validation/visual/report.md).

The selected model cannot detect pickups, irregular/variable meter or performed bar
lengths from current data. Unknown earlier durations may conservatively block later
points. Time-sorted source-bar labels can be nonmonotonic, requiring visible origin
labels and stable pages. These are declared limits, not inferred music-theory errors.
Maximum-size host measurements do not certify physical-device latency or retained
memory. OS-specific IMEs and participant usability require separate evidence.

No existing input model, local API, analysis engine, source field, history schema,
external reference runtime or product dependency is replaced. Future sounding,
sustain policy, playback, irregular origins and harmonic analysis remain separate.
