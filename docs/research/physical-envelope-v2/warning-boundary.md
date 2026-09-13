# Existing warning boundaries and contrasting quality slices

This small offline audit enumerates **210 critical scales**: 105 distinct pairs of stopped frets 1–15 at each existing 95/180-mm reference. It calls production geometry arithmetic only; it does not call the physical evaluator, change a verdict, rescan candidates, tune a threshold or import ranking. Exact HEAD: `32f9d3f8a71dc0d2a5f18520bfad738e67ba26c0`. All source hashes are recorded in [the numerical output](C:/Projects/Guitar/docs/research/physical-envelope-v2/warning-boundary.json); reproduce with [warning-boundary.ts](C:/Projects/Guitar/scripts/physical-envelope-v2/warning-boundary.ts).

For stopped wires a<b, span = L[2^(−a/12) − 2^(−b/12)]. It is continuous and linear in scale L. The critical scale for threshold T is L*=T/[2^(−a/12) − 2^(−b/12)]. The existing strict comparison uses >, so exact equality does not trigger the flag. No discontinuity in contact geometry, physiological capability or human success follows from the flag's discontinuity.

The examples below were selected mechanically as the closest critical scales to the declared 596.9, 647.7 and 650-mm references, deduplicated. Before/after scale differs from L* by only 0.1 mm. They are constructed controls, not new manufacturer instrument models.

| Threshold mm | Stopped frets | Critical scale mm | Wire at L*−0.1mm | Wire at L* | Wire at L*+0.1mm | First integer scale µm triggering production flag |
|---|---|---:|---:|---:|---:|---:|
| 95 | 8–13 | 601.176907 | 94.984198 | 95 | 95.015802 | 601181 |
| 95 | 6–10 | 651.239122 | 94.985412 | 95 | 95.014588 | 651243 |
| 180 | 5–14 | 592.681999 | 179.969630 | 180 | 180.030370 | 592684 |
| 180 | 5–13 | 649.312276 | 179.972278 | 180 | 180.027722 | 649315 |

Before, at and after the analytical boundary the ideal strict flag is false, false and true. At 180 mm this concerns the existing severe subflag; it does not create a new REJECT or even imply an additional status change. The 95 mm case concerns the span-warning subflag only; other warnings may already apply.

## Integer micrometre detail

The production table rounds computed wire span to integer micrometres. For frets 6–10 at 95 mm, the algebraic critical scale is 651.239122476mm. At scale 651242µm the continuous formula gives 95.000419761mm, but production span is 95000µm and its strict flag is false. At the next 1 µm scale step, production span is 95001µm and the flag is true. The JSON records both quantities rather than confusing rounding behavior with a biological boundary. Algebraic equality is treated explicitly so a binary floating residual is not mislabeled as a crossing.

This demonstrates sensitivity of an existing label to declared geometry and a strict engineering comparator. It supplies no justification for shifting either threshold, assigning probabilities or equating either side with normal/abnormal hands.

## Named quality contrast from the completed census

Each quality includes 12 roots × 2 contexts. These are request/allocation pairs, not independent samples of players or repertoire. Mean groups covers **all pairs**; wire/transverse means cover **baseline UNCERTAIN only**, projected onto the GS Mini reference. Per-quality UNCERTAIN group means were not stored and are not inferred. Different harmonic vocabularies create different enumerated allocation distributions; this table does not order difficulty.

| Quality | All pairs | PASS | UNCERTAIN | Mean groups ALL | Mean wire mm U | Mean transverse LB mm U |
|---|---:|---:|---:|---:|---:|---:|
| power-5 | 51,000 | 5,492 | 45,508 | 3.670 | 210.740 | 36.217 |
| major | 265,946 | 16,269 | 249,677 | 4.251 | 219.368 | 38.007 |
| sus4 | 267,072 | 18,573 | 248,499 | 4.014 | 216.433 | 37.966 |
| diminished-7 | 497,526 | 15,096 | 482,430 | 4.836 | 226.822 | 39.492 |
| dominant-11 | 3,582,532 | 130,316 | 3,452,216 | 4.593 | 225.617 | 39.852 |
| dominant-13 | 1,782,672 | 49,545 | 1,733,127 | 4.799 | 227.284 | 40.155 |
| dominant-7-flat-9 | 997,016 | 23,014 | 974,002 | 4.919 | 227.084 | 39.933 |

The larger dominant-11 count reflects the compiled request universe, not prevalence or physical validation. The group, longitudinal and transverse columns describe different constructs. U means across qualities condition on the existing heuristic status and cannot validate that status. The full census and its source hashes remain unchanged. These analyses preserve the recommendation to collect measured reference data and geometry separately from any unvalidated population-to-execution link.
