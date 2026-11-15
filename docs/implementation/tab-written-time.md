# P3: measure-owned written-time observations

Baseline: verified P2 at `c35b405a7d2f23a1ac019b2478fdacfa92eaa836` on the shared
`feat/tab-timing-inspection` branch. The older local explicit-timeline candidate is
not imported. Research inputs are `tab-p3-applicability` and `tab-p3-go-deep`.

## Delivered contract

`observeTabWrittenTime(document, measure)` is a synchronous, read-only observation of
source note occurrences owned by one declared measure. Coordinates are bar-relative
quarter-note units; the interpretation is nominal written/base-MIDI intervals.
It does not observe previous-bar carry-in, all actual sounding notes, physical picking,
Voice, silence, harmonic changes or a global timeline.

The returned snapshot keeps `sourceDocument` only as a caller association. Its frozen
`data` owns JSON-safe copies of source facts and markers, valid intervals, endpoint
deltas, their finite extent, issues and `noteCoverage`. Querying reads only this copied
data, never the current source object. Object identity is not a global version or a
freshness guarantee against in-place mutation. Existing immutable reducer and P2
history/report invalidation contracts remain unchanged; no cache or UI is added.

- P3 independently checks the declared population, note/position identity, string,
  effective MIDI, explicit start and per-note length. Known duplicates affecting an
  owned note prevent projecting that association; unrelated other-bar issues do not
  become a global gate.
- P2 `timingInput`, missing counts and invalid counts are not readiness signals.
  The core does not call the P2 inspector. Local intervals do not require a meter.
  Missing/invalid meter and non-note marker metadata alone do not gate note coverage.
- Valid intervals survive incomplete/invalid neighbors and unreadable population
  portions. A source field is never filled, repaired, normalized in place or discarded
  merely to produce a complete result.
- Rest/mute/sustain/technique facts are copied, not realized. There is no duration
  cutoff, continuation merge/sum, pitch trajectory or inferred rest. Already computed
  MIDI is not transposed again. Repeated equal pitches and unisons remain distinct.
- Start and duration obey existing authored fraction bounds. Internal arithmetic is
  reduced BigInt rational arithmetic; derived/query fractions use decimal integer
  strings. This preserves exact values, not original typing lexemes. Query objects
  accept an optionally negative integer numerator and positive integer denominator,
  each limited to 64 digits; whitespace, plus signs, decimals and exponent syntax are
  refused. No float, epsilon or tick grid is used.
- `end = start + duration` is retained even beyond the written barline. No bar length
  is inferred. Endpoint deltas store exactly two references per valid interval; no
  per-segment copy of a full active-note set is materialized.

## Coverage and query behavior

| Source population | Observation | Valid query |
| --- | --- | --- |
| Enumerated, zero notes | `complete`, no intervals/deltas, range `null` | `outside-range / no-observed-range`, no `notes` property |
| Enumerable but required note fields incomplete/invalid | `partial`; valid intervals retained | Always `partial`, no `notes`, even outside the known extent or when extent is null |
| Document/scope/population cannot be enumerated | `unreadable`; any known intervals retained | `unreadable`, no `notes` |
| Complete, nonempty | Exact finite `[minStart, maxEnd)` | In-range `complete` with all active owned note occurrences; outside returns `outside-range` |

`ownedNoteCount` counts enumerated entries; it does not establish a total for an
unreadable population. An unreadable notes list is never converted into an empty one.
Marker-only positions can have complete empty note coverage even when their own
metadata has diagnostics. No time-specific completeness proof is implemented.

`getTabWrittenNotesAt(snapshot, time)` applies this precedence:
**invalid-query → unreadable → partial → outside-range → complete**.
Activity is `start <= time < end`; the final endpoint is outside. A complete in-range
gap may return `notes: []`, meaning only no active nominal note in this population.
Neither that result nor an empty measure establishes an authored rest or real silence.
The range of a partial observation describes known intervals only, not all possible
contributions. Successful queries preserve source order and event multiplicity.

## Verification

**P3 core acceptance: GO for this declared local written-note scope.**

- Related TAB suite: **21 files / 562 tests passed**, including **117 new tests**
  (66 exact arithmetic, 18 observation, 19 independent contract, 14 lifecycle).
  Existing Analyze and P2 regressions remain in this run.
- Scoped ESLint with zero warnings and the default production build passed, including
  TypeScript and static pages. The pre-existing Tailwind module-type warning remains.
- Independent validation against the final source hashes: **50,000** finite JSON
  fuzz inputs, zero exceptions/mutations/non-JSON outputs; **33,036** exact finite
  queries against an independently implemented naive oracle, zero mismatches of IDs,
  MIDI or source order. No production arithmetic helper is used by that oracle.
- Maximum editing size: **1,024 positions / 6,144 notes**, **12,288 endpoint references**
  (2N). Serialized observation data was 2,554,960 bytes; an 8× note-count increase
  produced approximately 8.11× data size, with no full active set stored per boundary.
- Seven host Node samples at maximum size: observation construction median **52.59ms**.
  Query-plus-oracle/assertion timing and immediate heap-allocation deltas are diagnostic
  measurements, not retained-memory, browser/mobile latency, p95 or SLO claims.

The first independent run preceded a final metadata-only diagnostic/copy correction;
it was preserved outside the app, and the full independent probe rerun against the
final frozen source. Current results are bound to that final source hash.

[Independent report](tab-written-time-validation/report.md) ·
[Raw results](tab-written-time-validation/results.json) ·
[Suite and source fingerprint record](tab-written-time-validation/verification.json).
Probe sources are retained as `.ts.txt` reference data so they are not app compiler
inputs. Runnable originals and the exact command are documented in the report.

Optional music21 comparison is **not-run** for this implementation: it is not a
completion gate. No UI, external runtime or new product dependency is introduced.
Research reference success is not counted as production core correctness.

```ts
const snapshot = observeTabWrittenTime(document, 1);
const query = getTabWrittenNotesAt(snapshot, { numerator: '1', denominator: '2' });
// Only query.status === 'complete' provides query.notes.
// Serialize snapshot.data, not its raw sourceDocument association.
```
