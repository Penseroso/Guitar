# Guitar pre-release baseline

Status: **FROZEN for Release Gate Closure**. Recorded 2026-09-13. This is a documentation-only record; it does not authorize rollout, deployment, policy tuning, product changes, or Stage 10 cleanup.

## Release-candidate identity

- Authoritative implementation commit: `4187903b3a97c788c870e93bd274bbb3a68f0565`
- Commit tree: `1c8beeb8f1d80e6f733038cb6026db45834ecfd3`
- Production `src` tree: `d0186978862058d07de6debb676fa1ccbab8fb02`
- Required policy/implementation lineage, all ancestors of the release candidate:
  - `e25cc9272506aff376ee76e8a15ff02be99f6fd0` — Product Policy v2.1 lock
  - `00dc4895b8e366692c283eed3c16aa2b78ba51b3` — independent demand/vocabulary and Surface v2 integration
  - `4187903b3a97c788c870e93bd274bbb3a68f0565` — final validation evidence and presentation clarification
- Authoritative document blobs at the release candidate:
  - `docs/architecture/engine-specification.md`: `27ad051f089142b314fe3c146ebbabaada0937e9`
  - `docs/architecture/product-policy-v2.md`: `1a4f235387ad5e1b49645f926fcc40d943c7d33a`
  - `docs/implementation/product-readiness.md`: `4d5b301178f4d4e2832ee1c22993d35b58dd2ec6`

The commit that adds this record is a documentation-only descendant of the release candidate. Later sessions must use the implementation commit and `src` tree above when deciding whether production behavior changed.

## Frozen runtime contracts

| Contract | Active version |
|---|---|
| Engine | `guitar-engine/2` |
| Worker protocol | `engine-worker-v2` |
| Product policy | `product-policy-v2.1` |
| Structural / realization | `structural-v1` / `identity-v1` |
| Physical screen / geometry | `physical-screen-v1` / `geometry-um-v1` |
| Physical demand / demand geometry | `physical-demand-policy-v1` / `demand-geometry-um-v1` |
| Practical vocabulary / translation | `practical-vocabulary-v1` / `practical-exact-translation-v1` |
| Recommended surface / request / cursor | `recommended-surface-v2` / `surface-request-v2` / `surface-cursor-v2` |
| Ranking / features / numeric policy | `classic-v1` / `legacy-rank-features-v1` / `rank-int-v1` |
| Empirical runtime | disabled |

These contracts and their selected parameters are accepted as functionally complete. Release Gate Closure must validate the frozen implementation without redesigning or retuning it.

## Working-tree boundary

At freeze inspection, the index and tracked working tree were clean. No partial or uncommitted implementation change remained. Git reported 114 untracked files, all belonging to preserved frozen research inputs and reproduction scripts:

- `docs/research/`: 81 files
- `scripts/physical-envelope-v2/`: 7 files
- `scripts/web-voicing-corpus-v2/`: 26 files
- other untracked paths: 0

These files are established research inputs, not incomplete release-candidate production work. Preserve them; do not silently add, delete, rewrite, or treat them as a dirty implementation delta.

## Release Gate Closure scope

The Product Policy v2.1 implementation is GO for its scoped functional contract. Unrestricted rollout and Stage 10 retirement remain blocked by concrete engineering evidence gaps:

1. representative physical-mobile performance measurements;
2. repeated Firefox and WebKit latency percentiles;
3. attribution or acceptable resolution of the observed browser embedder-heap growth;
4. the carried Stage-9 synthetic certificate-verifier and mocked optional-extension failure subchecks;
5. fresh verification of the unavailable historical source-review files;
6. explicit disposition of repository-wide lint failures in preserved research/archive material and the recorded host-load-sensitive worker test.

Release Gate Closure must preserve truthful uncertainty presentation and the prohibition on unsupported claims of improved preference, human playability, comfort, hand fit, popularity, or canonicality. The future five-player formative check is not a rollout gate. Scientific uncertainty is not a failure condition. Deployment and Stage 10 cleanup remain outside this baseline.

The repository is ready to begin **Release Gate Closure** from this baseline. It is not yet approved for unrestricted rollout or Stage 10 cleanup.

BASELINE FROZEN
