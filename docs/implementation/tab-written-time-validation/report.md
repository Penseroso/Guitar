# P3 nominal written-time core: independent validation

**Verdict: GO on the tested contract.** Product source was read-only throughout this
validation. Executable probes ran under `/workspace/p3-core-validation`; this repository folder preserves their text archives and evidence. During validation,
no product/package/tsconfig files, dependencies, branches or commits were changed.
No music21 integration or matching criterion was used.

APIs examined: `observeTabWrittenTime(document: unknown, measure: number)` and
`getTabWrittenNotesAt(snapshot, time: unknown)`. The scope is one measure's owned
source-note population in bar-relative quarter units, interpreted as **nominal written
base MIDI**. It is not a sounding timeline, an inferred silence/voice/attack model,
full-score time conversion or harmony analysis.

## Robustness and JSON contract

- **50,000** deterministic ordinary finite JSON-like inputs, with malformed document,
  population/measure ownership, IDs, note/string/MIDI fields, offsets/durations and
  rest/mute/sustain/technique metadata. Each document was deeply frozen before calling
  the observer; source content was compared before/after.
- Observer outputs were passed to the query as real opaque snapshots, with both a valid
  exact zero query and malformed queries. The snapshot argument itself was not forged.
- Exceptions **0**, input changes **0**, non-finite-number/BigInt/JSON serialization
  failures in immutable public `data` and query results **0**. Fuzz elapsed time was
  approximately 1.94s on this host. This is not proof for all ordinary JSON inputs.
- Proxy/accessor/cyclic behavior, arbitrary forged snapshots and extremely deep or huge
  metadata were not tested. The source-document association reference is caller-owned;
  it is distinct from the copied/frozen public data.

## Independent exact oracle

The validation-only [oracle.ts](oracle.ts.txt) uses its own BigInt rational arithmetic and
a naive linear `start <= q < end` filter. It never imports product arithmetic helpers.
Expected intervals come from manually authored fixture fields. Source ordering, IDs,
strings and MIDI are compared directly, not reconstructed from the implementation.

**1,000 random small scores plus manual fixtures produced 33,036 finite query checks**
at exact authored boundaries and exact interior midpoints, including a before-range
query. All completed with zero mismatches. This finite query set is not a universal
claim for every rational input or a musical accuracy score.

Confirmed cases:

- Current-valid narrow overlap: source `167/1001 + 601/1002` against start `772/1007`,
  with nonzero overlap `1/1010023014` preserved exactly.
- Close distinct local endpoints from `1/501 + 1/999` and `1/500 + 1/1003` remain
  distinct; no float query bridge is involved.
- Source note order remains source order even when positions' written starts are not
  chronological. Unisons on different strings, simultaneous starts/ends and adjacent
  same-pitch note entries remain distinct identities and preserve MIDI.
- An interior gap in the fully known owned-note population returns complete empty
  membership within observed range. This does not create an authored rest. Queries
  outside observed range return a reason-only outside-range result.
- One missing owned note duration yields partial coverage: known intervals remain
  inspectable data, but the public query returns partial **without notes** rather than
  publishing a misleading complete subset.
- Unreadable position ownership prevents a complete population claim; query result
  is unreadable without notes.
- Malformed non-note marker metadata is preserved/diagnosed separately and does not
  block otherwise complete nominal owned-note coverage. This is intentionally separate
  from P2 score-structure validation, not a claim that the marker is valid.

The independent script asserts exact interval endpoints as well as query answers, and
confirms every admitted note contributes one start and one end reference. Manual
query records are included in [results.json](results.json).

## Maximum-size structure, performance and memory

Two dense source fixtures used 128 and **1,024 positions**, six valid uniquely identified
notes per position on distinct strings, all in one bar. Every note has explicit start
`position/1024` and duration `1`; sustained nominal overlaps therefore grow to the
maximum **6,144-note** population without storing active-note sets per endpoint.

Seven samples per size, with optional explicit GC before each build:

| Positions / notes | Build median | Query + independent oracle/assertions per point median | Serialized data | Endpoint references |
| --- | ---: | ---: | ---: | ---: |
| 128 / 768 | 6.91ms | 0.28ms | 315,001 bytes | 1,536 |
| 1024 / 6144 | 52.59ms | 3.34ms | 2,554,960 bytes | 12,288 |

- At maximum size, endpoint references are exactly **2N**, with at most 2N distinct
  endpoint entries. The actual source stores deltas (start/end IDs), not a full active
  population at every endpoint. No stored segments/verticalities/active-set cache was
  present in the public data.
- Multiplying notes by 8 increased serialized data by **8.11×** and endpoint references
  by **8×**. These observations support the linear stored-index structure for these
  fixtures; they are not a proof for arbitrary source metadata or total process memory.
- Immediate Node heap deltas had medians approximately **8.9MB / 66.0MB**. These include
  transient allocations before later cleanup and must not be described as retained
  snapshot memory, leaks, RSS or a device memory budget.
- Query timing includes the independent naive oracle and assertions. It is not a
  product query-only benchmark. Measurements are host Node diagnostics, not browser,
  physical-mobile, p95 or SLO claims.

## Reproduction and limits

```sh
cd /workspace/Guitar-p2
node --expose-gc --import tsx /workspace/p3-core-validation/validate.ts
```

Source hashes of `written-time.ts` and `exact-time.ts` are recorded in the evidence.
The initial source run remains preserved outside the app at `/workspace/p3-core-validation/results-initial.json`. Metadata diagnostics
were completed after that run; this report and `results.json` reflect the single
requested rerun against the final frozen implementation. Final observer SHA-256:
`a8193829a7f832e77c63fde5c47b3df88fdc002450861536ef2299f7c97e9ee8`.
Source changes after those hashes require affected checks to be repeated. UI/browser
integration and lifecycle coverage belong to the other independent checks; this report
does not substitute for them. No performed duration, implied sustain, key, progression
or harmonic-boundary inference was tested or introduced.

[Validation source](validate.ts.txt) · [Independent oracle](oracle.ts.txt) ·
[Fuzz input generator](fuzz-inputs.ts.txt) · [Raw results/samples/source hashes](results.json)
