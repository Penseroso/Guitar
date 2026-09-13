# Voicing and instrument sensitivity

All examples are descriptive sanity checks, never training labels. Tabs run low E to high E; production states run in the reverse order. The current default screen is observed at its unchanged 647.7-mm profile. Applying other geometry does not remap that verdict.

| Allocation | Current default | Groups | Instrument | Wire mm | Full-cell gap mm | Planar pair bound mm | Transverse bound mm | Midpoint diameter mm |
|---|---|---:|---|---:|---:|---:|---:|---:|
| open_em: 0 2 2 0 0 0 | PASS | 1 | electric_strat_constructed_v2 | 0.00 | 0.00 | 7.20 | 7.10 | 7.29 |
| open_em: 0 2 2 0 0 0 | PASS | 1 | acoustic_gs_mini_reference_v2 | 0.00 | 0.00 | 7.52 | 7.42 | 7.62 |
| open_em: 0 2 2 0 0 0 | PASS | 1 | classical_c5_constructed_v2 | 0.00 | 0.00 | 8.78 | 8.69 | 8.86 |
| open_c: x 3 2 0 1 0 | PASS | 3 | electric_strat_constructed_v2 | 66.70 | 34.31 | 40.69 | 21.57 | 72.07 |
| open_c: x 3 2 0 1 0 | PASS | 3 | acoustic_gs_mini_reference_v2 | 61.47 | 31.62 | 39.01 | 22.53 | 67.29 |
| open_c: x 3 2 0 1 0 | PASS | 3 | classical_c5_constructed_v2 | 66.94 | 34.43 | 43.51 | 26.32 | 73.87 |
| closed_f: 1 3 3 2 1 1 | PASS | 3 | electric_strat_constructed_v2 | 66.70 | 34.31 | 44.96 | 35.00 | 74.53 |
| closed_f: 1 3 3 2 1 1 | PASS | 3 | acoustic_gs_mini_reference_v2 | 61.47 | 31.62 | 43.84 | 36.51 | 70.15 |
| closed_f: 1 3 3 2 1 1 | PASS | 3 | classical_c5_constructed_v2 | 66.94 | 34.43 | 49.37 | 43.00 | 77.42 |
| a_shape: x 3 5 5 5 3 | PASS | 2 | electric_strat_constructed_v2 | 59.42 | 30.57 | 38.20 | 29.52 | 65.33 |
| a_shape: x 3 5 5 5 3 | PASS | 2 | acoustic_gs_mini_reference_v2 | 54.76 | 28.17 | 37.01 | 30.87 | 61.28 |
| a_shape: x 3 5 5 5 3 | PASS | 2 | classical_c5_constructed_v2 | 59.63 | 30.68 | 41.23 | 35.80 | 67.30 |
| crossing_c: x x 10 9 8 0 | PASS | 3 | electric_strat_constructed_v2 | 44.52 | 22.90 | 28.30 | 16.44 | 48.74 |
| crossing_c: x x 10 9 8 0 | PASS | 3 | acoustic_gs_mini_reference_v2 | 41.02 | 21.10 | 27.41 | 17.28 | 45.69 |
| crossing_c: x x 10 9 8 0 | PASS | 3 | classical_c5_constructed_v2 | 44.67 | 22.98 | 30.22 | 19.45 | 49.99 |
| high_diagonal: x x 10 9 8 7 | PASS | 4 | electric_strat_constructed_v2 | 68.78 | 47.16 | 53.19 | 24.25 | 74.93 |
| high_diagonal: x x 10 9 8 7 | PASS | 4 | acoustic_gs_mini_reference_v2 | 63.38 | 43.46 | 50.57 | 25.47 | 70.14 |
| high_diagonal: x x 10 9 8 7 | PASS | 4 | classical_c5_constructed_v2 | 69.02 | 47.33 | 55.57 | 28.79 | 76.75 |
| low_diagonal: x x 4 3 2 1 | UNCERTAIN | 4 | electric_strat_constructed_v2 | 97.27 | 66.70 | 70.16 | 21.28 | 102.46 |
| low_diagonal: x x 4 3 2 1 | UNCERTAIN | 4 | acoustic_gs_mini_reference_v2 | 89.64 | 61.47 | 65.54 | 22.21 | 95.01 |
| low_diagonal: x x 4 3 2 1 | UNCERTAIN | 4 | classical_c5_constructed_v2 | 97.61 | 66.94 | 71.99 | 26.05 | 103.90 |
| wide_pair: 1 x x x x 8 | UNCERTAIN | 2 | electric_strat_constructed_v2 | 203.32 | 179.06 | 183.13 | 37.89 | 212.84 |
| wide_pair: 1 x x x x 8 | UNCERTAIN | 2 | acoustic_gs_mini_reference_v2 | 187.38 | 165.02 | 169.85 | 39.68 | 197.07 |
| wide_pair: 1 x x x x 8 | UNCERTAIN | 2 | classical_c5_constructed_v2 | 204.04 | 179.70 | 185.52 | 45.66 | 215.09 |
| six_fret_targets: 1 2 3 4 5 6 | UNCERTAIN | 6 | electric_strat_constructed_v2 | 153.35 | 126.12 | 131.63 | 37.18 | 162.33 |
| six_fret_targets: 1 2 3 4 5 6 | UNCERTAIN | 6 | acoustic_gs_mini_reference_v2 | 141.33 | 116.23 | 122.74 | 38.90 | 150.76 |
| six_fret_targets: 1 2 3 4 5 6 | UNCERTAIN | 6 | classical_c5_constructed_v2 | 153.90 | 126.57 | 134.48 | 45.01 | 164.85 |
| separated_same_fret: 5 0 5 0 5 0 | PASS | 3 | electric_strat_constructed_v2 | 0.00 | 0.00 | 30.87 | 30.87 | 31.18 |
| separated_same_fret: 5 0 5 0 5 0 | PASS | 3 | acoustic_gs_mini_reference_v2 | 0.00 | 0.00 | 32.35 | 32.35 | 32.70 |
| separated_same_fret: 5 0 5 0 5 0 | PASS | 3 | classical_c5_constructed_v2 | 0.00 | 0.00 | 37.04 | 37.04 | 37.33 |
| partial_cover: x 5 4 5 5 5 | PASS | 3 | electric_strat_constructed_v2 | 28.85 | 0.00 | 30.87 | 30.87 | 37.77 |
| partial_cover: x 5 4 5 5 5 | PASS | 3 | acoustic_gs_mini_reference_v2 | 26.59 | 0.00 | 32.35 | 32.35 | 36.70 |
| partial_cover: x 5 4 5 5 5 | PASS | 3 | classical_c5_constructed_v2 | 28.96 | 0.00 | 37.04 | 37.04 | 40.85 |
| thumb_hypothesis: 3 1 2 4 5 x | UNCERTAIN | 5 | electric_strat_constructed_v2 | 126.12 | 97.27 | 99.81 | 30.02 | 131.78 |
| thumb_hypothesis: 3 1 2 4 5 x | UNCERTAIN | 5 | acoustic_gs_mini_reference_v2 | 116.23 | 89.64 | 92.64 | 31.43 | 121.95 |
| thumb_hypothesis: 3 1 2 4 5 x | UNCERTAIN | 5 | classical_c5_constructed_v2 | 126.57 | 97.61 | 101.29 | 36.26 | 133.11 |
| omission_semantics: x 5 x 5 5 x | PASS | 1 | electric_strat_constructed_v2 | 0.00 | 0.00 | 23.15 | 23.15 | 23.38 |
| omission_semantics: x 5 x 5 5 x | PASS | 1 | acoustic_gs_mini_reference_v2 | 0.00 | 0.00 | 24.27 | 24.27 | 24.52 |
| omission_semantics: x 5 x 5 5 x | PASS | 1 | classical_c5_constructed_v2 | 0.00 | 0.00 | 27.78 | 27.78 | 27.99 |
| open_only: 0 0 0 0 0 0 | PASS | 0 | electric_strat_constructed_v2 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| open_only: 0 0 0 0 0 0 | PASS | 0 | acoustic_gs_mini_reference_v2 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| open_only: 0 0 0 0 0 0 | PASS | 0 | classical_c5_constructed_v2 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |

Independent one-parameter controls, restricted-contact-window tests, raw values and assumptions are in [sensitivity-results.json](C:/Projects/Guitar/docs/research/physical-envelope-v2/sensitivity-results.json). The full-cell endpoints are an optimistic geometric domain, not a guarantee that a string can be cleanly stopped at every endpoint. Midpoints are target constructions, not hand poses. Nut/bridge/radius completion assumptions remain attached to each profile.
