# P4-A independent gate

Verdict: GO for refactor equivalence only. Not a musical-truth oracle and not Phase B authorization.

Baseline: af2fb44e5c9a9c1882bffbb594be46c4e481c25b.
Expected implementation is the original private chordCandidates helper and original
analyzeTabSelection module read with git show at that revision. The original module
is TypeScript-transpiled in memory, with one validation-only export appended for the
private helper. The new shared helper is never used to construct baseline expected
results. All 129 protected engine/policy/dependency files match the baseline bytes;
they also remain unchanged through the comparison. New runtime hashes are pinned.

- 4,096 canonical pitch-class masks: zero candidate/value/order/name/omission/addition
  or JSON serialization mismatches; 6,552 candidates total, comprising 372 exact,
  420 incomplete and 5,760 added-tone entries. Nine additional input-order/doubling
  fixtures agree. All helper inputs are frozen and unchanged.
- Baseline and working analyzeTabSelection: 26 fixtures x timed/untimed x seven
  contexts x six selections = 2,184 complete output comparisons, all identical.
  Fixtures include single/dyad/chord/mixed/gap, ambiguity, missing fifth, rich input,
  broken/simultaneous progressions, explicit rest/mute/sustain/technique metadata,
  all original audit ASCII exercises in standard and drop-D + capo2 variants.
  Drop-D ASCII open-string labels are correspondingly D, not E. Contexts include
  no context, major/minor/lens/enharmonic frames, independent scale/chord roots,
  Altered dual spelling and unsupported contexts; selections include whole, partial,
  reversed and unavailable ranges. Frozen document/context/selection inputs unchanged.
- Existing relevant suite: eight files / 235 tests PASS, exit0.

Independent command (cwd /workspace/Guitar-p2):
node --import tsx /workspace/p4-validation/a/equivalence.cjs

Existing tests:
node_modules/.bin/vitest run src/domain/chord/chordRecognition.test.ts src/domain/chord/reverse/readings.test.ts src/domain/chord/reverse/readings.registry.test.ts src/domain/tab/analysis.test.ts src/domain/tab/passage-analysis.test.ts src/domain/tab/harmonic-spans.test.ts src/domain/tab/contextual-spelling.test.ts src/domain/tab/input-analysis-regression.test.ts --maxWorkers 2

No tracked writes, git mutations, dependency changes or Phase B implementation were
performed by this validation agent. Only external artifacts under this directory.
The working module is evaluated against unchanged existing dependencies, whose hashes
are checked against git, not against an independent implementation of music theory.

Evidence:
- equivalence-summary.json: counts, aggregate fingerprints, pinned runtime hashes.
- mask-fingerprints.json: 4,096 per-mask output fingerprints and candidate counts.
- protected-source-hashes.json: 129 baseline/working hash pairs.
- baseline-analysis.original.ts.txt / baseline-helper.original.txt: actual baseline source.
- equivalence.cjs: independently authored validation driver.
- TSarchive.txt: source snapshot of the baseline and compared runtime implementations.
