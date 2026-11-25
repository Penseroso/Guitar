# Conditional GO deep check: offline comparability predicate

**Result: conditional GO remains conditional.** An isolated research predicate now
demonstrates an explicitly bounded comparable subset; it is **not a product adapter,
engine, validated exporter, or a complete sounding timeline**. No THE MODUS source,
dependency, package or existing P2 contract was changed. Earlier P3 probes are
historical evidence, not reused as this stage's new results.

Pinned reference: `cuthbertLab/music21@86a7dc8a5fb3b1996ac0202d6bb9b4d4b9d19197`.
Tree operation: `Stream.asTimespans(classList=(note.Note,))` and canonical-coordinate
`getVerticalityAt` queries. Chordify operation: `removeRedundantPitches=False`,
`copyPitches=True`, `addTies=False`, `toSoundingPitch=False`. Different operation,
options, source pin or coordinate protocol requires a new comparability decision.

## Executed scope and disposition

**22 deterministic cases: 12 admitted, 10 refused** for the combined Tree+chordify
comparison. These are reference-comparability dispositions, not user-data correctness,
music quality, an accuracy rate or proof for all rational inputs. Every admitted case
was separately queried at exact authored boundaries and exact interval midpoints.
The manual half-open expectation was compared with actual event-ID multisets from
both upstream operations. No mismatching result was counted as a reference match.
The predicate does not inspect the resulting event-ID/pitch-set match to admit a case.
Operation-specific totals are Tree **14 admitted / 8 refused**, chordify **12 admitted /
10 refused**. Only the declared finite query set (boundaries plus the chosen midpoint
of each interval) was checked. Arbitrary rational queries close to a boundary require
their own coordinate-rank/representability check and are not automatically admitted.

| New case group | Tree | chordify | Evidence / meaning |
| --- | --- | --- | --- |
| Dyadic unison, repeated notes, simultaneous ends/starts | Admitted | Admitted | Half-open boundary excludes ended events and includes starts; duplicate artifact identities survive. |
| Nonbinary triplets, multiple simultaneous ends/starts | Admitted | Admitted | Canonical queries preserve the independent exact expectation for these cases. Not a dyadic-only result. |
| `a:[0,1/100)`, `b:[1/101,1/101+1/2)`, scale 1, 1/2, 1/4 | Admitted | Admitted | Overlap lengths `1/10100`, `1/20200`, `1/40400` reconstruct correctly. |
| Same source pattern scaled 1/8 | Admitted | Refused | All written fractions remain within numerator/denominator ≤1024 (`1/800`, `1/808`, `1/16`), but derived overlap `1/80800` is reconstructed as `1/65535`. Correct Tree membership does not make chordify duration comparison valid. |
| Same nonbinary pattern translated by 1, 32, 1024 | Admitted | Admitted | Exact declared coordinate transforms preserve the tested result. These absolute coordinates are reference transforms, not new per-bar authoring limits. |
| Same pattern at declared anchor 130944 | Admitted | Refused | The relative term in `isclose` now skips the `1/10100` interval. Translation changes reference applicability although the authored interval relationships are unchanged. |
| Explicitly rebase that high-offset pattern to local origin | Admitted | Admitted | A declared reversible reference-frame option restores comparability; it is not inference of a missing onset or final product architecture. |
| Distinct valid-source endpoints collapse to one float at anchor 130944 | Refused | Refused | Exact endpoints differ by `1/87751473810` but share float `130944.00296150627`. Refusal occurs before matching projected empty sets. |
| Distinct endpoint floats one ULP apart, but the exact midpoint rounds to an endpoint | Refused | Refused | Independent challenge exposed a Tree-only gate omission; fixed query-representability gate now rejects the case for both requested operations. |
| Missing onset, incomplete declared coverage/provenance, unresolved realization/relations, ambiguous artifact IDs | Refused | Refused | The reference has no justified comparison contract; refusal is not invalid notation or invalid music. |

The anchor-130944 cases assume a declared complete global coordinate system:
1024 measures, uniform 32/1 meter, `(1024−1)×128` quarter units before the final bar.
That is representable by current source fields, but P2 has no implemented global
timeline conversion. The collision uses local fractions `1/506 + 1/1015` and
`1/507 + 1/1011`, each within current input bounds. A product exporter would still
need to establish the preceding-bar evidence; the fixture declares it explicitly.

## Predicate gates tested

1. Declared complete scoped coverage, provenance, fixed-pitch interval policy and
   resolved authored relation policy; required source fields and unique artifact IDs;
   exact source values and positive projection intervals.
2. Sort distinct exact endpoints and map to canonical floats. Reject coalescence or
   ordering loss; do not ask a float tree to distinguish an unrepresentable interval.
3. Audit actual Tree span endpoints against those canonical source endpoints. Tree
   admission is operation-specific and does not inherit chordify's separate failures.
4. For chordify, independently audit the pinned loop's `isclose(abs_tol=1e-7)` with
   its default relative tolerance, source offsets through `opFrac`, and each nonzero
   adjacent interval's reconstructed duration. Reject losses before ID matching.
5. Use canonical library queries only after the gates. Compute expected membership
   separately with exact `start ≤ query < end`, including simultaneous boundaries.

### Research-gate defect found and closed by independent challenge

The first operation-specific predicate had the strict-interior query veto only in
chordify reasons. For source-local `(onset=1/501,length=1/999)` and
`(onset=1/500,length=1/1003)` at the declared anchor 130944, two exact ends remain
distinct floats one ULP apart, but their exact midpoint rounds to the later endpoint.
The initial Tree-only admission incorrectly said ADMITTED and the actual Tree returned
no event where the exact expectation retained `a`. The overall combined gate was already
REFUSED, so this did not create an accepted combined match.

The strict-interior query gate now also belongs to Tree admission. The counterexample
was added as a regression, the final 22-case suite rerun once, and Tree now REFUSES it.
[Before-fix counterexample](tree-query-counterexample-before.json) and
[original 21-case results](results-before-tree-query-fix.json) remain preserved.
This is a correction to an isolated research checker, not a product defect or adapter fix.

`coverageComplete=True` and `provenanceComplete=True` are **fixture declarations, not
proof of real source completeness or lineage**. No snapshot/hash-bound product exporter
exists in this research. The predicate is deliberately scoped, not a hardened schema
validator for arbitrary objects or a musical interpretation validator. Its assumptions
must be established by a separately validated exporter before production use.

## Negative controls and identity protocol

- Default chordify unison deduplication preserves the pitch-class set but loses an
  artifact. A PC-set-only comparison would falsely accept it; the ID multiset comparison
  detects it. Proper duplicate-preserving options pass the same geometry gate.
- Adjacent same-pitch source segments marked as two authored note starts versus a
  start plus authored continuation produce identical library interval observations.
  Source sidecar kinds retain counts 2 versus 1. These are **authored note-start counts**,
  not physical picked attacks or performed articulation evidence.
- Generated empty/rest slices never establish an authored rest. Author-written rests
  must remain source facts in the sidecar; no rest-truth claim is made by pitch membership.

Minimal sidecar proposal (not a settled architecture): snapshot/hash and source scope;
explicit coordinate frame/origin and units; unique projection artifact ID; original
note/position/string IDs; original effective MIDI; exact onset/length fractions;
authored start/continuation kind and origin reference; authored rest facts; excluded
or missing source IDs with reasons; projection policy; library pin and options.

Two bounded alternatives remain open:

- **Tree event-membership comparison:** compare `(artifactId, effective MIDI)` multisets
  at audited coordinates, with authored semantics supplied exclusively by the sidecar.
- **Chordify slice comparison:** additionally compare interval boundaries/durations,
  with the stricter tolerance and reconstruction gates. Do not count a Tree-only
  admitted case as a successful chordify comparison.

The executable's primary independent match checks IDs; each ID's MIDI is fixed in the
plain-Note fixture builder. An independent challenge reviewer cross-checks actual MIDI
as well. Neither representation may silently drop unisons/repeated starts, merge authored
relations or rewrite source pitch to obtain agreement.

## Remaining condition / decision boundary

The pinned operations are usable for **research/offline fixtures admitted by the
requested operation's gate**. General exact rational authority remains NO-GO.
Product integration remains conditional on a snapshot-bound, complete-scope exporter,
identity/pitch sidecar checks, operation-specific exclusion reporting, and a larger
independent fixture corpus. Admission is bound to the requested operation, pin/options,
declared coordinate frame, source snapshot and query set. No correctness claim for
excluded regions or arbitrary untested queries is allowed.

Reference refusal must be separate from source invalidity and from unsupported musical
realization. Precision-limited outputs are excluded, never automatically corrected or
reported as product timing errors. No new dense benchmarks were needed; prior P3 costs
remain history, with no new runtime feasibility claim. Code license remains BSD-3-Clause,
corpus rights separate; only synthetic input was used.

[Source](admission_probe.py) · [Results, all inputs and independent query records](results.json)

```sh
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=/tmp/modus-p2-research/python-deps:/tmp/modus-p2-research/music21 python /workspace/modus-p3-go-deep/comparator/admission_probe.py
```
