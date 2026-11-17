# P3.2: point-local written-note coverage

This records the local P3.2 contract and acceptance. The later [P3.3 cross-bar view](tab-written-time-across-bars.md)
adds separate model-qualified APIs and a bar-origin lower-bound proof without
changing the local APIs or their default UI behavior.

Baseline: verified P3.1 `72d7c0fdefaa346f8e540e1384732243731c9f22` on
`feat/tab-timing-inspection`. The historical local timeline candidate is not imported.

## Delivered boundary

The new point inspection can establish the complete **nominal, measure-owned written
note set at one exact time**, even when the overall note population remains partial.
It does not establish actual sounding notes, silence, a global timeline or complete
coverage of a region. Existing Analyze, Scale, Chord, Harmony and P2 retain their
contracts and do not consume this result.

The sufficient rule is deliberately narrow: an otherwise valid note with a known
start and only a missing duration cannot contribute strictly before its start.
For every allowed positive duration, `q < start` implies that the half-open nominal
interval cannot contain q. This proof uses no duration estimate, source order, meter,
bar clipping, later attack, rest, mute or continuation policy.

At the start itself this implementation conservatively refuses promotion; it does
not construct an interval with an invented end. A partial result means that this
rule did not prove completeness, not that alternative note sets must exist there.

## Snapshot and API contracts

The observer adds optional, frozen JSON-safe `coverageFacts`, one per owned source
note entry that was not projected to a valid interval. Each keeps `momentIndex` and
`noteIndex`. A `missing-duration` fact also keeps its validated exact start; every
other case is `unresolved`. The fact is eligible only if duration is absent and all
other existing required note/position fields pass validation. Invalid duration,
identity collision, unknown start, malformed note, invalid MIDI or string cannot
be reclassified as merely a missing length.

`noteCoverage`, valid intervals, `observedRange`, endpoint deltas, diagnostics and
`getTabWrittenNotesAt()` retain their original meanings. The legacy getter still
returns partial for every valid query on a partial snapshot.

`inspectTabWrittenNotesAt(snapshot, time)` adds the narrower query contract:

| Condition | Result |
| --- | --- |
| Invalid exact query | `invalid-query` |
| Unreadable population | `unreadable`, regardless of known intervals |
| Partial with absent ledger, unaccounted entries, unresolved fact, or q at/after any eligible start | `partial`, no `notes` |
| Every incomplete note excluded, but q outside the finite known extent or extent null | `outside-range`, no `notes` |
| In-range complete point | `complete`, exact active intervals in source order, plus `proof` |

Complete results record `proof.basis` as `whole-population` or `onset-exclusion` and
the excluded source-index/start facts. All incomplete entries must be accounted for;
one unresolved contributor defeats promotion. Querying reads frozen data only,
never the associated source document or P2 issue totals. Older snapshots without
the new facts fall back conservatively.

The priority is **invalid-query → unreadable → unresolved → outside-range → complete**.
In a partial snapshot the last known endpoint may still be partial: it is not the
end of an unknown-duration note. Empty ownership with a null range and complete
interior gaps keep their prior meanings and never establish silence.

`getTabWrittenInspectionPoints(snapshot)` returns sorted, exact, unique known
endpoints plus eligible missing-duration starts inside the inclusive known extent.
It adds no unknown-note endpoint to `endpointDeltas`, which still represents valid
intervals only. Unreadable/null-range snapshots expose no inspection points.

## Read-only UI

The existing panel now permits point navigation whenever it has readable known
intervals, including partial observations. Its overall `Timing incomplete` and
known/owned count remain visible. Proven points show `Complete at this point` and
the active note count/rows; other partial points show `More timing needed at this
point` without a full note count or active-row emphasis. Known interval rails remain.

Details discloses the proof rule and excluded count without mounting a large list.
Exact values remain in Details; approximate geometry never feeds queries. Eight
chart rows plus eight detail entries are mounted per page. Candidate times are
memoized per snapshot and the query per snapshot/point, independently of row paging.
No new free-time input, score navigation or automatic refresh is introduced.

The parent lifetime and guard are unchanged: dirty fret/fraction/IME input blocks
actions before pointer blur and on keyboard activation, with no queued retry.
Explicit commits/cancel, Escape focus, document/bar invalidation and Undo/Redo
behavior remain governed by the existing editor. Point/page actions write no score,
selection or history entry.

## Verification and remaining limits

- Related TAB suite: **24 files / 627 tests passed**, including **38 new tests**
  (30 coverage and eight panel/integration additions). Legacy getter expectations
  remain unchanged; partial-input UI expectations intentionally follow the new API.
- Scoped ESLint with zero warnings, final TypeScript and the production build passed.
  The pre-existing Tailwind module-type warning remains.
- Independent core checks: **2,000 seeded mixed sources / 10,000 exact queries**,
  plus **2,000 invalid queries** and **360 finite duration-completion worlds**.
  No false complete set, exception or source mutation was found. Expected active
  sets use independent integer 1/1024-quarter ticks, not production arithmetic.
- Maximum **6,144-note** probes cover complete, one-missing and half-missing sources.
  Mixed DOM tests retain eight chart/eight detail rows while summarizing **3,072**
  excluded notes. Host median observation cost was about 45–65ms and successful point
  inspection about 1.1–2.1ms for these fixtures; this is not a browser/mobile SLO.
- Production Chromium **390 / 768 / 1335px** checks passed for strict start boundaries,
  global-partial/current-complete distinction, uncertain final known endpoints,
  exact Details, unknown starts, gaps, empty ownership, paging, read-only history,
  focus, 44px targets, reduced motion, page containment and zero browser errors.
  NON VERBATIM / INTUITIVE feature review: **GO**, not a participant usability study.
- Independent partial-view interaction checks passed at all three widths: pending
  valid/invalid fret, fractional Shift+Tab, native CDP composition, no queued action,
  panel/View/P2 guards, explicit commits and document/bar/history invalidation.
  The retained P2 diagnostic/Escape/input browser regression also passed at all
  three widths on this new production build.
  Physical-device, OS-specific IME and screen-reader participant testing are not claimed.
- Legacy getter source is identical to baseline. Exact arithmetic, input/editing,
  P2, Analyze, reducer, parent snapshot lifecycle and dependency manifests match
  protected baseline hashes.

[Source-bound verification](tab-written-time-point-coverage-validation/verification.json) ·
[Independent core/interaction report](tab-written-time-point-coverage-validation/independent/report.md) ·
[Visual review](tab-written-time-point-coverage-validation/visual/report.md).

**Acceptance: GO for P3.2's declared point-local written-note scope and UI.**

Finite completion tests check the implementation against independent exact
expectations; the strict-start argument above is the justification across all valid
positive durations. No music21 result is used as an exact oracle or completion gate.

Storage remains linear; no active set is precomputed for every point. Large-input
timings are host diagnostics, not physical-mobile latency guarantees. Proofs are
snapshot-bound and require the existing immutable document lifecycle. Authored
maximum-duration bounds, missing-onset exclusion, membership at an unknown-duration
note's start, continuous coverage maps, carry-in/sustain realization, sounding,
automatic correction and external runtime integration remain deferred.
