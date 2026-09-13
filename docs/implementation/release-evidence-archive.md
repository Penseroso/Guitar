# Release evidence retention index

Stage 10 keeps final release evidence in `docs/implementation` because it supports the readiness summaries. These hashes make the identity of the largest decision inputs explicit. Superseded iterations and failed harness setup output are in the ignored local `.research/stage-10-archive/` tree; that archive is not a production dependency.

| Archived file | Bytes | SHA-256 |
|---|---:|---|
| `product-policy-census.json` | 7,391,306 | `afb16a3403eecdf39c31922a5e37119489e018a89a7f06ed797dbfc4dbf449bc` |
| `product-ui-performance.json` | 10,014,438 | `e383ae66fbd5157d0568c00276b8f370ec2421b3c6895f648378b6eb03239c93` |
| `release-performance-firefox.json` | 9,006,126 | `dd1474b9ba87787138951047cc4071f0ad580e7a6015fd1f97b70ed4bbb585f8` |
| `release-performance-webkit.json` | 446,241 | `84182ec148820efe3ebb22d340b290257f62efb783d19e6d183841cc7671ed4d` |
| `release-webkit-targeted.json` | 219,526 | `6fee07d00ea62ce6c9db28b73d6ef2251a5a7b814ee399e05270c5e7a90ca2c1` |
| `release-heap-analysis.json` | 1,976,118 | `57d9c38c898193664f4d66d838189af519f494d569ecf923caff5f6da1032e29` |
| `release-memory-baseline-matrix.json` | 609,808 | `294dbc282f9685e463e088cd7440629796ad816b4a749ece03edb019a9d5dee2` |
| `release-memory-reuse-radio-names-matrix.json` | 608,063 | `581270c3d56d73d0fff8c666873b9018ed44c1e7677d94fd0ebc4b67b56f3578` |
| `release-radio-retention.json` | 426,206 | `71a8385fed4d47fa0bc41a8c206d9258934168f6ce435226b45a6a5f1d75f933` |
| `release-worker-stability.json` | 45,838 | `b9688db7d9d809d7258debc711f57ec203743b00b6ce066b559e585fe8157e54` |
| archived `release-memory-harness-error.json` | 300,919 | `c41abee95378e2eb4ac475ae435c348c31619ca8cfb2cbb02afa6f1c12c32050` |

The final conclusions, preserved measurements, failed historical targets, environment, commands, and debt classifications remain in `release-gate-closure.md`. The frozen Product Policy acceptance totals remain in `product-readiness.md`.
