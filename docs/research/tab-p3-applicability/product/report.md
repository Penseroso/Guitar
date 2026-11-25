# P3 product applicability: current P2 contract

**Verdict: conditional GO for a separately specified, read-only authored-time observation
subset; no implementation or runtime-library choice is approved by these probes.**
Baseline is the revalidated, uncommitted P2 worktree `/workspace/Guitar-p2`, above
master `3ef63568353ee395eb3a46e02f27541bfdca8adf`. The older module in `/workspace/Guitar`
is not this baseline. Root independently verified the current remote master SHA.

## Confirmed implementation and bottlenecks

| Current source / function | Observed contract | P3 implication |
| --- | --- | --- |
| [types.ts:26](/workspace/Guitar-p2/src/domain/tab/types.ts:26), `TabMoment` / `TabDocument` | Ordered positions, bar number, optional bar-relative quarter-note fraction, per-note/rest/sustain length; one score-wide optional meter; `timing:'order-only'`. No Measure object, Voice, tempo, pickup, repeat or performance curve. | The input already contains useful local facts. It cannot establish seconds, polyphonic voice assignment or arbitrary performed structure. String index is instrument identity, not Voice. |
| [input-capabilities.ts:6](/workspace/Guitar-p2/src/domain/tab/input-capabilities.ts:6), `normalizeTabFraction` | Integer numerator/denominator each bounded by 1024; normalized written fractions; zero only allowed for starts. | Keep exact source fractions; arithmetic/overflow and comparison representation still require validation. Per-field bounds do not by themselves prove safe aggregate rational arithmetic. |
| [timing-inspection.ts](/workspace/Guitar-p2/src/domain/tab/timing-inspection.ts), `inspectTabTiming` | Validates shapes, written field bounds and structural relations; classifies none/some/unreadable, missing vs invalid. No overlap, offset order, bar crossing or temporal tie continuity check. | `some`, missing count, or even zero issues are **not projection readiness**. Preserve this P2 contract. |
| [analysis.ts:124](/workspace/Guitar-p2/src/domain/tab/analysis.ts:124), `analyzeTabSelection` | Flattens `moment.notes`; copies metadata but musical observations use MIDI/PC/order. Sustain/rest-only positions become analysis `empty`. | Existing Analyze is neither a sounding-event constructor nor a temporal rest parser. A new observer cannot silently replace its input or reinterpret empty as silence. |
| [harmonic-spans.ts:17](/workspace/Guitar-p2/src/domain/tab/harmonic-spans.ts:17), `buildTabHarmonicSpans` | Aligned columns and bounded complete-bar pitch collections produce explicitly qualified hypotheses. | Verticality changes from a future timeline are additional observations, not verified harmonic boundaries. Preserve existing hypotheses' provenance. |
| [chordRecognition.ts:21](/workspace/Guitar-p2/src/domain/chord/chordRecognition.ts:21), `identifyChordsForPitchClasses` | Deduplicated PCs enter a shared formula registry; alternatives such as C6 and Am7 survive. | Reuse at a derived recognition boundary only; never deduplicate original repeated note/string identities. Root/function/segmentation cannot be read from a verticality alone. |
| [harmony/types.ts:3](/workspace/Guitar-p2/src/domain/harmony/types.ts:3), `TonalFrame`; [roman.ts:14](/workspace/Guitar-p2/src/domain/harmony/roman.ts:14), `validateFrame` | Explicit major/minor frame; lens changes rule applicability. Scale workspace supports modal scale selections separately. | A Dorian scale selection is not an inferred Dorian key or supported Harmony modal frame. Do not silently map modal harmony onto major/minor. |
| [state.ts:239](/workspace/Guitar-p2/src/features/tab-analysis/state.ts:239), Analyze and reducers | Explicit snapshots; edits/instrument/context/history mark analysis stale. Whole-score Analyze does not inherit a selection-only chord reference. | Preserve current behavior. A future geometry result and tonal interpretation need explicit provenance/invalidation contracts; no replacement is demonstrated here. |
| [editing.ts:183](/workspace/Guitar-p2/src/domain/tab/editing.ts:183), `retuneTabDocument` | MIDI already equals tuning[string]+capo+fret. | External adapter must not add capo/transposition again; preserve register and string identity. |

For unchanged baseline files, permanent source links are available at
[master types](https://github.com/Penseroso/Guitar/blob/3ef63568353ee395eb3a46e02f27541bfdca8adf/src/domain/tab/types.ts#L26-L49),
[Analyze](https://github.com/Penseroso/Guitar/blob/3ef63568353ee395eb3a46e02f27541bfdca8adf/src/domain/tab/analysis.ts#L124-L162),
[harmonic spans](https://github.com/Penseroso/Guitar/blob/3ef63568353ee395eb3a46e02f27541bfdca8adf/src/domain/tab/harmonic-spans.ts#L17-L85).
The new P2 inspector is uncommitted and is cited by its actual local path and recorded hash, not a fabricated master permalink.

## Fresh probes against current product API

[probes.ts](probes.ts.txt) / [results.json](results.json): **22 document cases passed**, plus
modal-context and reducer checks. Frozen input remained unchanged. Existing product
source was only read. This is applicability evidence, not new timeline code or a full
rerun of the previously recorded 445-test suite.

- Free timing still analyzes. Known lengths without starts do not gain positions.
- **No meter, known start+length:** inspector emits only missing-meter; local authored
  coordinates remain known. Across-bar/global placement remains unspecified. Making
  meter mandatory for every local observation would discard usable input.
- Mixed completeness preserves known facts. Whether a future output is local, partial,
  or globally rejected is a product contract still to be selected, not this probe's result.
- Cross-bar written duration is accepted, and same-column notes retain independent
  lengths. A clip-at-barline rule or single Moment duration would lose authored data.
- Repeated MIDI at adjacent positions remains two note IDs; same MIDI on two strings
  remains two notes while the recognition PC view has one PC.
- Sustain adds no new pitch observation. A structurally valid continuation with a time
  gap, reverse supplied starts, and same-string overlapping written lengths each pass
  P2 with zero issues: time-policy decisions remain unimplemented.
- Explicit rest and timed blank produce the same current pitch/order analysis but
  different authored facts. Unnotated gaps must not become generated authored rests.
- Bend/release retains base MIDI and fret-equivalent targets, with no curve or dwell
  time. h/p/slide retains note-event endpoints; **authored note onset is not proof of
  a separately picked attack**. Current analysis does not realize these gestures.
- The same musical pitch/order output is obtained with and without added timing for
  otherwise identical notes. Note metadata is still copied into analyzed notes; the
  probe compares a declared musical projection, not byte equality of complete results.
- C6/Am7 exact alternatives survive. Separate C/E/G attacks produce the current
  whole-bar collection hypothesis; this does not establish their actual sounding overlap.
- D Dorian is accepted as a scale reference, while a forced Dorian Harmony frame emits
  the existing unsupported major/minor-frame diagnostic. No local key is inferred.
- Meter edit, explicit frame change, Undo and Redo keep previous analysis stale until
  Analyze is invoked again. P2 missing data never disables that existing path.

## Candidate dispositions

| Candidate | Decision | GO/NO-GO and conditions |
| --- | --- | --- |
| Existing source IDs, string/register and exact written fractions | **ADOPT** existing contract | GO; retain source provenance and distinct note events. |
| Explicit-time observation of a declared supported subset | **ADAPT** | Conditional GO for further contract/fixture evaluation. State local-vs-global coverage, temporal relation checks, cross-bar semantics and unsupported techniques before implementation. |
| P2 inspector as preparation diagnostics | **ADOPT** | GO for diagnostics. **REJECT as-is** as timeline-readiness or musical-validity gate. |
| Existing formula recognizer on an observed PC set | **ADAPT** | GO to evaluate as an optional interpretation layer after independent timeline correctness; keep C6/Am7 ambiguity and original note multiplicity. |
| String→Voice mapping, gaps→rests, automatic duration filling, MIDI re-transposition | **REJECT** | NO-GO: no product evidence supports these transformations. |
| Whole-result replacement of order-only Analyze | **DEFER** | NO-GO now; current API consumers and harmonic provenance assume positions/collections, not measured sounding segments. |
| Automatic harmonic segmentation, local/modal center, tonicization/modulation | **DEFER** | NO-GO for implementation; no corpus/ambiguity/calibration evidence, and modal Scale support is not equivalent to a modal Harmony frame. |

No external code reuse or new product dependency occurred in this subtask. Runtime cost,
library-license compatibility and independent music21 comparison are separate review
inputs. Policy decisions above remain acceptance questions rather than a fixed P3 solution.
