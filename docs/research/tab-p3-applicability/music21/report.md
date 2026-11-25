# music21 P3 applicability: offline comparison only

Source: `cuthbertLab/music21@86a7dc8a5fb3b1996ac0202d6bb9b4d4b9d19197`.
Fresh synthetic probes and four selected upstream tests ran against that cached pin;
no product source, dependency, Python runtime path or P2 acceptance check was changed.
The earlier `/workspace/modus-p3-evaluation` evidence was not overwritten.

**Verdict: ADAPT / CONDITIONAL GO for a declared offline comparison subset.**
Binary-exact, explicitly timed fixture comparisons passed; arbitrary valid THE MODUS
fractions do **not** receive an unconditional exactness GO. Neither `chordify` nor
TimespanTree output is an authoritative product timeline or harmonic interpretation.

## Actual implementation and fresh evidence

| Element | Confirmed source/call path | Product value and limitation |
| --- | --- | --- |
| Sounding verticality | `Stream.chordify` → `asTimespans(GeneralNote)` → all time points → `getVerticalityAt` → `Verticality.makeElement` | Useful independent overlap projection on audited fixtures. Output verticality is not a chord identity/function or harmonic boundary. |
| Original event identity | `fromStream.listOfTreesByClass` wraps the actual original element in `PitchedTimespan`; fresh tree elements are `is` original objects | Preserve exported source IDs explicitly; music21 does not know THE MODUS IDs automatically. Do not replace sidecar provenance with a pitch set. |
| Unisons | `makeElement` defaults `removeRedundantPitches=True`; `False` retains both fresh same-MIDI note IDs | Mandatory duplicate-preserving comparison. String/unison identity remains in source manifest; no guitar-string-to-Voice inference was made. |
| Repeated attacks / ties | Adjacent same-MIDI attacks remained two slices and tree events. `stripTies` separately collapses explicit tied notes and removes continuation identity | Keep authored attack/continuation relations separately. Default chordify did not itself merge our authored tied segments. |
| Slicing | `sliceAtOffsets` uses strict interior cuts and `splitAtQuarterLength(addTies=True)` | Fresh untied `long` becomes two tied pieces, both with copied ID `long`. Generated ties are not authored ties; source ID alone is not a unique slice ID. `sliceByGreatestDivisor` uses approximate GCD, so it is not an exact rational oracle. |
| Gap/rest | Empty `Verticality.makeElement` returns `Rest`; `chordify` also consolidates rests | Fresh unknown gap and explicit authored rest produce identical chordify projection. A library Rest cannot establish authored silence. |

Fresh semantic/default probes: **11**. Four selected upstream tests passed:
`fromStream.Test.testTripletEndsWhereTheNextNoteStarts`,
`stream.tests.Test.testSliceAtOffsetsSimple`, `testSliceAtOffsetsBuilt`,
`testChordifyRests`. No corpus or full music21 suite was executed.
“Passed” includes assertions confirming known library divergences; it is not an
accuracy score or evidence that those divergences match the product contract.

### Precision failures occur with current product-valid fractions

1. **Fraction query vs stored float boundary.** `Timespan.__init__` casts offsets and
   ends to `float`; `getVerticalityAt` does not canonicalize a query. For adjacent
   `a:[0,1/10)` and `b:[1/10,1/5)`, the manual expected active event at `1/10` is `b`.
   `getVerticalityAt(Fraction(1,10))` instead returns `a`;
   `getVerticalityAt(float(1/10))` returns `b`. With `1/3`, active pitch agrees but the
   direct Fraction query classifies `b` as overlap instead of start. Exact source
   quarterLength therefore does not imply exact tree coordinates or attack labels.
2. **Nonzero overlap skipped by chordify.** Each written fraction here is within
   THE MODUS's numerator/denominator bound of 1024:
   `a.start=167/1001`, `a.duration=601/1002`, `b.start=772/1007`, `b.duration=1/4`.
   Exact arithmetic gives `a.end − b.start = 1/1010023014`.
   The tree queried at its canonical float `b.start` retains **both a and b**.
   `chordify(removeRedundantPitches=False)` produces **no two-note overlap slice**,
   because its local loop skips adjacent points satisfying `isclose(abs_tol=1e-7)`.
   This is a source-valid counterexample to broad exact-reference claims, not an
   unsupported tiny-duration fixture.
3. **Float coercion has an additional denominator limit.** Direct `opFrac(Fraction(1,65536))`
   preserves the exact dyadic value, while `opFrac(float(Fraction(1,65536)))` gives
   `1/65535`; float `1/100000000` becomes zero. These direct inputs are outside the
   current product input bounds and are recorded separately, not used to exaggerate
   product scope. The prior valid overlap case already establishes the product risk.

## Adoption decision and refusal contract

| Candidate | Decision | GO/NO-GO and condition |
| --- | --- | --- |
| Manually expected, explicitly timed, well-separated binary-exact fixture comparison | ADOPT validation practice | GO as a supplementary offline check; no Python in the app and no P2 dependency. |
| TimespanTree plus provenance manifest and canonical-coordinate bridge | ADAPT | CONDITIONAL GO: bridge/exclusion rules must be validated before general fractions are admitted. Current probes evaluate upstream APIs; they do not implement that product adapter. |
| Duplicate-preserving pitch/event comparison and explicit attack/rest/tie evidence | ADAPT | GO as a future validation contract. Note/position/string IDs, original MIDI, exact fractions and authored relation kind must survive outside generated slices. |
| `chordify` as exact authority for all product-valid rational inputs | REJECT | NO-GO; current-valid narrow overlap is lost. A mismatch must identify coordinate/projection loss before blaming product timing. |
| Generated rest or generated/stripped ties as authored evidence | REJECT | NO-GO; projection and source facts differ in the executed fixtures. |
| Browser/runtime inclusion or replacing current Scale/Chord/Harmony engines | DEFER | NO-GO for this implementation stage; Python packaging and measured dense cost are not justified by offline utility. |

Refuse or exclude a comparison when onset/length is unknown (music21's omitted note
length defaults to a quarter); global coordinates need unknown previous bar lengths;
sustain references/contiguity are unresolved; or a performed bend/grace/let-ring
trajectory has not been declared. A declared same-bar relative coordinate system can
be compared without inventing a global meter or previous-bar position.

Retain exact source fractions and authored metadata in a sidecar. Map comparison queries
to audited library coordinates; check endpoint order/coalescence and tiny intervals
against exact manual expectations. If a library projection loses a nonzero boundary or
changes event-start classification, mark that region **precision-limited / excluded**,
not matching, musically invalid, or evidence of a harmonic change. These are required
future adapter gates, not implemented guarantees in THE MODUS today.

## Cost and integration risk

Fresh host Python 3.12 measurements, six overlapping notes per position, quarter-note
lengths and dyadic starts; stream construction/import excluded. `tree.fromStream.asTimespans`
bypassed stream caching; chordify used duplicate preservation. Two dense samples and
three ordinary samples are descriptive only, with no p95/SLO or cross-tool ranking.

| Positions / notes | Tree build median | chordify median |
| --- | ---: | ---: |
| 32 / 192 | 5.79ms | 37.81ms |
| 128 / 768 | 70.43ms | 231.89ms |
| 1024 / 6144 | 4291.56ms | 5617.86ms |

Dense chordify samples were **3369–7866ms**. This is usable for bounded offline
validation, not evidence of interactive browser feasibility. Cold startup, memory,
worker/process transport, device latency and a real guitar corpus were not measured.

Code license at the pin is **BSD-3-Clause**: copyright/license/disclaimer retention and
non-endorsement conditions apply to redistribution. Bundled/external corpus rights are
separate; none were acquired or used in these probes. No upstream code was copied into
the product. No automatic key, modulation, Roman function or segmentation accuracy is
claimed from these pitch-overlap checks.

## Source references and reproduction

- [chordify loop and 1e-7 skip](https://github.com/cuthbertLab/music21/blob/86a7dc8a5fb3b1996ac0202d6bb9b4d4b9d19197/music21/stream/base.py#L6450-L6479)
- [sliceAtOffsets](https://github.com/cuthbertLab/music21/blob/86a7dc8a5fb3b1996ac0202d6bb9b4d4b9d19197/music21/stream/base.py#L9761-L9845)
- [sliceByGreatestDivisor approximate GCD](https://github.com/cuthbertLab/music21/blob/86a7dc8a5fb3b1996ac0202d6bb9b4d4b9d19197/music21/stream/base.py#L9724-L9756)
- [stripTies](https://github.com/cuthbertLab/music21/blob/86a7dc8a5fb3b1996ac0202d6bb9b4d4b9d19197/music21/stream/base.py#L7214-L7247)
- [tree wraps source element](https://github.com/cuthbertLab/music21/blob/86a7dc8a5fb3b1996ac0202d6bb9b4d4b9d19197/music21/tree/fromStream.py#L119-L152)
- [Timespan float coercion](https://github.com/cuthbertLab/music21/blob/86a7dc8a5fb3b1996ac0202d6bb9b4d4b9d19197/music21/tree/spans.py#L80-L88)
- [getVerticalityAt](https://github.com/cuthbertLab/music21/blob/86a7dc8a5fb3b1996ac0202d6bb9b4d4b9d19197/music21/tree/trees.py#L1394-L1431)
- [strict overlap lookup](https://github.com/cuthbertLab/music21/blob/86a7dc8a5fb3b1996ac0202d6bb9b4d4b9d19197/music21/tree/trees.py#L1228-L1264)
- [generated Rest, ties and redundant pitches](https://github.com/cuthbertLab/music21/blob/86a7dc8a5fb3b1996ac0202d6bb9b4d4b9d19197/music21/tree/verticality.py#L740-L849)
- [opFrac denominator handling](https://github.com/cuthbertLab/music21/blob/86a7dc8a5fb3b1996ac0202d6bb9b4d4b9d19197/music21/common/numberTools.py#L245-L340)
- [selected synthetic upstream stream tests](https://github.com/cuthbertLab/music21/blob/86a7dc8a5fb3b1996ac0202d6bb9b4d4b9d19197/music21/stream/tests.py#L5613-L5654)
- [BSD-3-Clause license](https://github.com/cuthbertLab/music21/blob/86a7dc8a5fb3b1996ac0202d6bb9b4d4b9d19197/LICENSE)

[Probe source](probes.py) · [Results, source hashes and full samples](results.json)

```sh
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=/tmp/modus-p2-research/python-deps:/tmp/modus-p2-research/music21 python /workspace/modus-p3-current/music21/probes.py
```
