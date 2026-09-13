# Recomputed Sabahan S1 aggregates

Research-only, source-specific descriptive data. No individuals or identifiers are output.

Source SHA256: `3f2847df30f9180029a3e4f62d63f467377455750f076796ee3750b6fc550aea`. Source: [Khazri et al. (2022), S1](https://journals.plos.org/plosone/article/file?id=10.1371/journal.pone.0273840.s001&type=supplementary).

Source cm converted to mm. Sample SD uses n−1; P5/P50/P95 are empirical linear-interpolated quantiles. No records removed; no population weighting.

| Sex | Dimension | n | Mean | SD | P5 | P50 | P95 |
|---|---|---:|---:|---:|---:|---:|---:|
| Female | LHL | 184 | 169.64 | 7.59 | 158.14 | 169.31 | 182.38 |
| Female | LHB | 184 | 74.03 | 3.62 | 68.37 | 73.79 | 80.16 |
| Female | LMFL | 184 | 73.15 | 4.08 | 66.56 | 73.12 | 79.77 |
| Female | L2ICL | 184 | 25.28 | 1.98 | 21.71 | 25.33 | 28.53 |
| Female | LHS | 184 | 155.34 | 12.99 | 135.65 | 154.56 | 178.62 |
| Male | LHL | 184 | 184.23 | 7.57 | 171.53 | 184.81 | 195.63 |
| Male | LHB | 184 | 82.66 | 3.95 | 75.64 | 82.69 | 88.72 |
| Male | LMFL | 184 | 79.12 | 4.07 | 72.50 | 79.02 | 86.23 |
| Male | L2ICL | 184 | 26.92 | 2.13 | 23.21 | 26.93 | 30.10 |
| Male | LHS | 184 | 172.03 | 12.74 | 150.52 | 172.00 | 194.45 |

Left-hand correlations from actual same-record measurements:

| Pair | Pooled | Female | Male |
|---|---:|---:|---:|
| LHL–LHB | 0.7796 | 0.5639 | 0.5238 |
| LHL–LMFL | 0.9066 | 0.8962 | 0.8120 |
| LHL–LHS | 0.6193 | 0.4771 | 0.3194 |
| LHB–LHS | 0.6161 | 0.4667 | 0.2863 |
| LMFL–L2ICL | 0.7752 | 0.7108 | 0.7733 |
| Stature–LHL | 0.7846 | 0.5640 | 0.5880 |

All 368 rows are complete; each of the eight sex×ethnicity strata has46 records. The workbook contains no identifier field. Full covariance matrices, strata and flags are in [anthropometry-sabahan.json](anthropometry-sabahan.json).
