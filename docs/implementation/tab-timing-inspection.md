# P2 timing notation inspection

Base: `master` at `3ef63568353ee395eb3a46e02f27541bfdca8adf`.
Branch: `feat/tab-timing-inspection`.

## Delivered behavior

- Independent `inspectTabTiming(unknown)` API with `none` / `some` / `unreadable`,
  missing/invalid issues, counts and optional unique score targets. Ordinary malformed
  JSON-like values are checked by shape; unreadable entries do not stop later checks.
- Optional Check timing action, summary first, separate completeness and notation
  disclosures, and batches of 25 detail rows. No new primary action, persistent sidebar
  or harmonic annotation kind. The shared workspace palette and 44px targets are used.
- Free timing has no mass missing-value diagnostics. Structure checks still run.
  Partial timing reports existing event fields without inferring beats or silence.
- Current-snapshot navigation with real focus/scroll and Escape return. Continuation
  issues point to the continuation position, not the source attack. Ambiguous targets
  remain non-navigable. A later import cannot reuse a stale target with the same ID.
- Dirty fret/fractional drafts and IME composition block inspection actions. Applying
  fractions remains explicit; a cancel action restores the previous value. No queued
  inspection runs when composition ends.
- The independent audit's Escape, interrupted-reference and UI-state findings are
  resolved. The default result now uses short states/counts, with scope in About this
  check. See [fixes and independent revalidation](tab-timing-revalidation.md).

The initial browser run exposed an event-order gap beyond the component-only test:
Shift+Tab could leave the fractional popup through an intermediate control and unmount
the draft before reaching Check timing. The popup now remains mounted while that draft
is dirty/composing; explicit close/Escape, apply/cancel and ordinary score selection
retain their existing responsibilities. The real keyboard route is also a regression test.

The new Check timing button is an intentional additional Tab stop before the grid.
Two prior entry/exit assertions now pass through it, while still verifying one roving
grid cell and native Tab commit/exit.

## Verification

P2 acceptance: **GO** for the notation-inspection scope above.

**Current result: 445 tests passed**, scoped lint and production build passed;
all five independent findings closed. The latest browser screenshots, measurements,
stress results and source hashes are in [the revalidation record](tab-timing-revalidation.md).
The 422-test evidence below records the original implementation run, before that audit.

- Relevant domain, feature, component and ClientApp suite: **17 files / 422 tests**
  passed. Inspector fixtures use manually expected results, including malformed input,
  frozen input, unchanged analysis, structure conflicts and ambiguous references.
- Scoped ESLint with zero warnings, `npx tsc --noEmit --incremental false`,
  `git diff --check` and the default `npm run build` passed. The existing Tailwind
  module-type warning remains unrelated to this change.
- Production Next server, system Chromium, real browser input at **390 / 768 / 1335px**:
  free/partial states, explicit fret Enter/Tab commit and Escape cancellation, invalid
  drafts, fractional pointer and native Shift+Tab/Enter routes, Cancel/Set start,
  diagnostic focus/scroll/Escape return, import invalidation and 25-to-48-row expansion
  passed. At 390px the blocked Check timing and navigation routes also used touch input.
- CDP `Input.imeSetComposition` / `Input.insertText` exercised Chromium's native IME
  path for fret and fraction input. Trusted composing Escape kept the fractional editor
  mounted; inspection did not commit text or queue a later action. Component tests also
  cover active-composition navigation guards. This does not establish physical-device
  or OS/IME-specific coverage; Chromium's composition-end trust flag is retained in the
  evidence rather than treated as a physical keyboard event.
- Page width matched each viewport, Check timing measured approximately 77×44px,
  insertion targets measured 44×44px, and the dense mobile score scrolled internally.
  No browser page/console errors were recorded. Reduced motion was enabled.

Browser event traces and geometry: [evidence](tab-timing-browser.json).
Screenshots: [390px](screenshots/tab-timing-390.png),
[768px](screenshots/tab-timing-768.png),
[1335px](screenshots/tab-timing-1335.png),
[48 expanded details at 390px](screenshots/tab-timing-dense-390.png).

The relevant suite can be repeated with:

```sh
npx vitest run src/domain/tab src/features/tab-analysis src/components/guitar/scale/tab-analysis src/components/guitar/ClientApp.tab-analysis.test.tsx --maxWorkers 2
```

Browser evidence was captured against `npm run build` followed by
`npm run start -- --hostname 127.0.0.1 --port 3000`, using an external Python Playwright
driver and installed system Chromium. No browser/Python dependency was added to the app.

## Deferred verification, not P2 dependencies

No music21 dependency, Python runtime path or `verify:tab-timing` comparison command is
added. A future sounding-timeline stage may use an offline reference with pinned source
and dependencies, explicit onset/length fixtures, and an external source manifest for
document/position/note/string and authored tie/rest evidence. Keep duplicated notes,
repeated attacks and actual MIDI without double transposition. Generated library ties
and rests cannot establish authored facts. Independently expected exact fractions must
cover narrow-boundary loss as well as ordinary tuplets. Record options, excluded inputs
and library limitations rather than accepting its output as sole ground truth. Recheck
code/corpus licensing separately if any external implementation or data is introduced.

No sounding overlap, temporal tie resolution, harmonic segmentation, progression/key
inference, local-meter migration or frozen chord policy changes belong to this slice.
