# Physical envelope v2: integrated census

The research scan reproduced **15,943,679 request/allocation pairs** across **480 requests**: 583,916 baseline PASS and 15,359,763 baseline UNCERTAIN, with zero REJECT. Every scanned per-request count/status row matched the integrated control; full-total assertion: **true**. This is a geometry census, not a human outcome study.

Exact HEAD: `32f9d3f8a71dc0d2a5f18520bfad738e67ba26c0`. Node v22.16.0, win32/x64; single-run elapsed 96.0 seconds; maximum observed RSS 207.4 MiB. Batches contain at most 8,192 traversal nodes. A 2.88-MiB bitset counted **6,998,385 unique allocations** across requests; no universe array or ranker was used. Counts elsewhere retain request multiplicity.

See [complete compact results](C:/Projects/Guitar/docs/research/physical-envelope-v2/census-results.json), [instrument profiles](C:/Projects/Guitar/docs/research/physical-envelope-v2/instrument-profiles.json) and [reproducible script](C:/Projects/Guitar/scripts/physical-envelope-v2/census.ts). Source hashes and control hash are embedded in the results. The comparator is [the integrated control census](C:/Projects/Guitar/docs/implementation/engine-integrated-census.json); its ranking fields were not used.

## Existing warning decomposition

| Baseline condition | Count | Share of all pairs |
|---|---:|---:|
| Neither >4 groups nor warning span | 583916 | 3.66% |
| Groups only | 77000 | 0.48% |
| Span only | 6152670 | 38.59% |
| Both | 9130093 | 57.26% |

Severe subflags are also disjoint: groups >5 only 226020; span above severe reference only 9844909; both 2678265; neither 3194485. The JSON additionally crosses these with the warning groups. These are existing heuristic flags, not calibrated anatomical boundaries.

## Geometry conditioned on the same allocations

The three instrument profiles were projected onto identical allocations while retaining the original production status. No profile creates a new verdict. Only GS Mini is a complete nominal same-model manufacturer geometry; the electric/classical completions remain constructed sensitivity references.

The table uses the GS Mini geometry. Values are millimetres. Quantiles are **1-mm containing intervals**, not falsely precise quantile estimates. Means and extrema use the unbinned numerical features.

| Feature | Original status | Mean | Median interval | P95 interval | Maximum |
|---|---|---:|---:|---:|---:|
| wireSpanMm | PASS | 58.58 | [63, 64) | [84, 85) | 87.07 |
| wireSpanMm | UNCERTAIN | 224.75 | [233, 234) | [312, 313) | 312.43 |
| cellGapMm | PASS | 39.92 | [43, 44) | [69, 70) | 69.11 |
| cellGapMm | UNCERTAIN | 207.92 | [215, 216) | [297, 298) | 297.51 |
| transverseLowerBoundMm | PASS | 34.37 | [36, 37) | [46, 47) | 47.08 |
| transverseLowerBoundMm | UNCERTAIN | 39.56 | [41, 42) | [45, 46) | 47.08 |
| planarLowerBoundMm | PASS | 51.13 | [51, 52) | [75, 76) | 83.00 |
| planarLowerBoundMm | UNCERTAIN | 209.62 | [216, 217) | [297, 298) | 300.51 |
| midpointDiameterMm | PASS | 67.48 | [70, 71) | [93, 94) | 99.49 |
| midpointDiameterMm | UNCERTAIN | 232.93 | [240, 241) | [322, 323) | 324.48 |

The JSON includes every profile's full nonzero histogram and mean/SD/extrema; exact integer contact distributions; descriptive Pearson correlations for the primary geometry; and quality, context, quality/context and stopped-position slices. Correlations concern deterministic quantities measured on this enumerated universe, not human execution, and cannot establish predictive validity.

## What these distinctions add

Representative pairs in the JSON share baseline status, estimated groups, exact minimum/maximum stopped frets, stopped count and open count, yet differ in transverse lower-bound demand. They were selected after scanning as extrema to illustrate missing transverse information, not as held-out proof of playability. The largest retained PASS pair has a transverse difference of 37.804 mm; the largest retained UNCERTAIN pair differs by 37.804 mm.

Observed minimal ordered-partition count support: PASS 1; UNCERTAIN 1. This construct counts interval partitions under the declared compatibility rule, not finger assignments or actual fingering alternatives. Do not manufacture an anatomical interpretation if the distribution is degenerate.

Longitudinal fret-wire span, projected cell gap, planar cell separation and midpoint target diameter describe different objects. Pairwise minimum-cell distances need not be attained simultaneously by one assignment. Midpoint targets are selected contact geometry, not a hand pose. Open strings contribute no stopped target but remain relevant to contact compatibility; omitted strings here are unplayed without a damping obligation.

## Limits

Analyst interpretation of the completed scan: the ordered-partition count is identically one and was asserted for every allocation. It is a QA invariant of this interval vocabulary, not a useful demand feature or a fingering-alternative count. In the GS Mini projection, wire-span versus transverse-lower-bound Pearson correlation is 0.2962 within baseline PASS and 0.0624 within baseline UNCERTAIN; wire-span versus planar-lower-bound correlation is 0.8637 and 0.9990 respectively. These describe partly distinct geometry and strong longitudinal dominance in the wide-span stratum, without establishing human relevance.

For a concrete illustration, low-to-high tabs `12 15 x 0 x x` and `15 x x 0 x 12` both have two groups, two stopped strings, one open string and stopped frets 12–15, with original PASS status. Their GS Mini wire spans both equal 47.484 mm, while transverse lower bounds are 8.470 and 46.274 mm and planar lower bounds are 33.755 and 56.814 mm. The source requests are C-major standalone and C-major accompaniment respectively; the pair is an intentionally selected geometry illustration, not a matched harmonic or human test.

The universe is bounded by the existing 20-quality, 12-root, two-context policy and standard tuning/frets0–15. Repeated allocations across requests are not independent observations. Production PASS/UNCERTAIN and all warning thresholds are descriptive strata, not labels for human success. No population coverage, comfort probability, new rejection, ranking penalty or presentation policy follows from these distributions.
