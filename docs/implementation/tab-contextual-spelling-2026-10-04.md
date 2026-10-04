# TAB contextual spelling follow-up

Baseline: fetched origin on 2026-10-04. Default branch is **master**, not main;
HEAD and origin/master were **83cc619**, with a clean working tree.

## Reproduced issues and minimal fix

| Issue | Cause | Change |
| --- | --- | --- |
| Selecting C# / G# minor yields Db / Ab minor | TAB tonic callback always used major `getKeyName` | Choose shared `getMinorKeyName` in minor. The shared RootDial trigger receives the actual frame tonic through its existing `displayName` prop. |
| Major ↔ Minor keeps a spelling inconsistent with the new mode | Mode callback changed mode only | Preserve tonic pitch class, reapply the corresponding shared naming utility. Includes shared D# minor / Eb major seam. |
| Sharp-key evidence disagrees with correct score annotations | `observeTabProgressions` concatenated neutral recognition `candidate.name` | Use the same frame-based presentation adapter for evidence, annotations and chord-sequence readings. |
| Independent copies of contextual formatting can diverge | Annotations and passage each built their own frame-root map | Extract their existing logic into `domain/tab/contextual-spelling.ts`, backed by authoritative Harmony/shared utilities. Incomplete-chord evidence uses it too. |

Before the fix, B major evidence read `D♭m → F♯7 → B`; F# major evidence read
`A♭m → D♭7 → F♯`. C# / G# minor V–i also used flat chord names despite a sharp
supplied key. Four new domain regressions failed on the baseline. After supplying the
same native-popover shim used by Harmony tests, all three new tonic-selection regressions
also failed on the baseline, then passed on the restored fixed implementation.

## Authoritative logic and unchanged boundaries

`getKeyName` / `getMinorKeyName` determine conventional UI key names. `frameChords`
determines contextual diatonic root spellings, `romanLabel` retains the frozen
major-reference Roman convention in both modes, and `getChordTypeSuffix` /
`formatAccidentals` produce symbols. No spelling table, enharmonic-ranking rule or
tonal inference was added to TAB. The new adapter copies presentation candidates;
observed notes, raw candidates, candidate identity/order, omissions and harmonic spans
remain unchanged. Key-free displays retain their existing neutral names. Chromatic roots
outside the existing frame map keep the existing abstention policy.

The C#m7/E6 ambiguity in B is retained. It does not produce an asserted ii7–V–I;
only the independently eligible V–I suffix appears. The ii–V–I consistency regressions
use an unambiguous ii triad, covering simultaneous and broken-chord evidence.

No automatic key detection, local tonal-context/modulation inference, modal frames,
new cadence rules or harmonic segmentation was added.

## Initial scaffold review

The initial four-position bar boundaries are currently indistinguishable in the document
model from explicitly authored grouping. Filling the first three scaffold bars with
`D F A D | G B D G | C E G C` yields `ii–V–I pattern?` under C; grouping the same
ordered notes into one bar yields no whole-bar harmonic span. This boundary dependence
is reproducible and can encourage an unintended grouping hypothesis in freely entered
melody. It does **not** prove accompaniment or harmonic duration: the output remains a
candidate with `?` and explicit grouping evidence, including through score annotations.

Possible follow-ups are boundary provenance (scaffold vs supplied/confirmed), an explicit
grouping opt-in, or authored spans. Provenance is the smallest structural alternative but
requires decisions for import, split/add-bar, normalization and undo. Suppressing every
authored bar would also suppress intentional direct-entry arpeggios. No new confirmed
false positive was demonstrated; this spelling patch leaves the existing candidate
contract unchanged and adds a regression documenting its limits.

## Validation and freeze decision

- Final related suite: **13 files / 336 tests passed**, including TAB domain/state/UI,
  ClientApp integration, shared key naming and Harmony Romans. Fifteen new tests cover
  C# / G# / D# minor entry and mode round trips, B/F# sharp keys, Db/Ab/Eb flat keys,
  C major / A minor, simultaneous/broken-chord label–Roman–evidence consistency,
  ambiguity, absent key and scaffold grouping.
- `npx tsc --noEmit`, scoped ESLint, `npm run build` and `git diff --check` passed.
- Real-browser key selection/mode round trips and B major `C♯m → F♯7 → B`
  annotations/evidence verified; changed score inspected at 390/768/1335px without
  page overflow. No console warnings/errors in the verification session.
- Screenshots: [minor key controls](screenshots/tab-spelling-minor.png),
  [B major labels and evidence](screenshots/tab-spelling-b-major.png).

**GO to freeze the current bounded, order-only TAB analysis scope.** Contextual spelling
is consistent within the authoritative frame-root policy. Candidate bar grouping,
chromatic-root abstention, incomplete technique grammar and physical mobile ergonomics
remain documented limits, not capabilities established by this patch. Full automatic
song/key/modulation analysis remains outside this freeze decision.
