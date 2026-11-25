# P2 independent findings: fixes and revalidation

2026-11-15 · `feat/tab-timing-inspection`, based on master
`3ef63568353ee395eb3a46e02f27541bfdca8adf`.

**P2 acceptance: GO** after resolving the five independent findings below.
Domain, interaction and UI review used separate subagents. The domain reviewer
implemented F2; the main agent independently checked its source and 40,000 relation
cases. Interaction and UI reviewers did not edit the product implementation.

| Finding | Final behavior | Verification |
| --- | --- | --- |
| F1: Escape bypassed the position editor | Editor Escape closes it and focuses Edit; a following Escape returns to the diagnostic. Diagnostic return only captures score cell/header/Edit navigation. | Component regression; real Chromium at all three widths |
| F2: interrupted sustain/technique accepted | Explicit rest, same-string mute or attack between endpoints produces `sustain-interrupted` / `technique-interrupted`. Blanks, other strings and continuations do not establish interruption. | 17 domain regressions; original 6 cases; independent relation oracle |
| F3: removed panel remained expanded in accessibility state | Invalidating a report closes its state; `aria-expanded` follows the actual current report. | Commit/Undo/Redo tests; independent browser assertions |
| F4: resolved input retained blocked guidance | Explicit fraction Cancel/Set start and fret Enter/Escape clear guidance without queuing inspection. | 4 component regressions; independent browser recovery checks |
| F5: verbose default result | Short state/counts; technical scope behind About this check; quiet Close control. | Independent design-language review and browser screenshots |

The inspection remains read-only. Prefix counts per string check authored interruptions
in O(events + links + 6×positions), without repairing input, inferring silence or
introducing a sounding timeline. Existing Analyze and Scale/Chord/Harmony engines are
unchanged. Scope and integration deferrals in the original P2 contract still apply.

## Final checks

- **17 files / 445 tests passed**, including 23 regressions added after the audit.
  Scoped ESLint with zero warnings, `git diff --check` and the default `npm run build`
  passed, including TypeScript and static pages. The pre-existing Tailwind module-type
  warning remains.
- **50,000** deterministic malformed JSON-like cases: exceptions, input mutations and
  count inconsistencies all zero. Ordinary JSON-like input is the contract; hostile
  getters/proxies are not established as supported.
- **40,000** relation cases across 10,000 randomized scores: zero mismatches against
  an independently written open-interval expectation and the existing link-cleanup
  contract; frozen input unchanged. The inspector never calls cleanup; the oracle
  invokes it separately for comparison.
- At **1,024 positions / 6,144 notes / 7,168 issues**, inspector-only 30-run median
  **5.87ms**, p95 **18.39ms**. A separate long-range-link stress check scaled from
  1,024 to 50,000 links without per-link document scans. Larger fixtures exceed the
  app's editing limit and are only algorithm stress tests.
- Production Chromium **390 / 768 / 1335px**: Escape priority, pointer/native keyboard
  draft guards, valid/invalid frets, fraction recovery, Set start/Tab commit,
  snapshot invalidation and CDP native IME/composing Escape passed. Touch input was
  also exercised at 390px. No page/console errors.
- Browser stress at the editing limit: collapsed details have **25 DOM rows / 0 visible**;
  25→50 expansion, actual focus/navigation/Escape return and internal score scrolling
  passed. At 390/1335px, free/partial check clicks through two animation frames measured
  approximately **100–131ms**. These are individual measurements on this host, not a
  mobile latency guarantee or a statistically comparable before/after benchmark.
- UI panel heights at 390px: Free **146.75→62px**, partial **190.75→106px**.
  New default panel heights are 62/106px at all three tested widths. Visible new controls
  remain at least 44×44px and the page does not overflow horizontally. NON VERBATIM /
  INTUITIVE acceptance is a feature-level design review, not participant usability data.

[Combined measurements, results and source hashes](tab-timing-revalidation.json).
Screenshots: [390px](screenshots/tab-timing-revalidated-390.png),
[768px](screenshots/tab-timing-revalidated-768.png),
[1335px](screenshots/tab-timing-revalidated-1335.png).

Physical devices, OS-specific IMEs, sounding validity and music21 comparisons remain
unverified/deferred. No new runtime or browser dependency was added to the app.
The earlier audit artifacts remain preserved separately from the new results.
