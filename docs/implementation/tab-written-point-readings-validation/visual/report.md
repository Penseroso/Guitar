# P4-B independent production-browser UI/state acceptance

**Verdict: GO for the written-point reading UI contract.** No product changes, dependency changes, fixture store injection, or server management were performed by this reviewer.

Build: `aGxq0JQ61iHdPBf_UeD8a`, production server `127.0.0.1:3003`. The runtime source SHA256 values independently match the root's frozen build verification; see `source-manifest.json`. Actual system Chromium, reduced motion, widths **390 / 768 / 1335px**. Final driver result: **10 contract groups passed at each width, no page/console errors**.

## Fixture and actual-input method

All data was imported through the visible six-string ASCII importer and edited through the score's actual controls. Every note's duration was set independently on its own selected string; setting one position's duration was not assumed to set all its strings. No underlying store, React state, DOM event simulation or document injection populated these cases.

`manual-fixtures.json` records independent expectations:

- C/E/G at quarter-note 0: E4/C4/G3, three source occurrences. Choosing C shows 3/1/5 as conditional formula degrees; choosing Em leaves C4 outside that formula and records the omitted fifth as metadata.
- C/E/G/A at quarter-note 1: four occurrences. C6 and Am7 are both explicit alternatives. No candidate is selected automatically. Choosing Am7 shows 5/b3/b7/1 on the original occurrences and `If Am7 in C major · vi7`.
- A known interior gap at quarter-note 2: complete empty nominal written set, not a silence claim.
- A later C/E/G at quarter-note 3 yields ten timed source occurrences overall and two parent note pages. This lets reference invalidation be tested at **Point 2 of 5 / Page 2 of 2**, rather than only at initial cursor/page defaults.
- C/G: two occurrences, interval class 5, facts first; C5 and Gsus4 appear only after opening Formula alternatives. Gsus4's absent fifth remains metadata.
- No source notes: explicit existing cell Delete operations remove both notes. This has no observed source extent and does not manufacture a silence/rest result.

## Verified state and value contract

1. This bar has no written-point Chord readings action; Across full bars exposes it **closed by default**.
2. Opening Chord readings presents facts and source-associated occurrences; Formula alternatives remains another optional disclosure. Opening either does not preselect a hypothesis.
3. C6/Am7 alternatives remain available together, with neither adopted until explicitly selected.
4. Chosen C/Am7 degrees match the manual expectations above. Conditional key wording remains visible; omissions/outside-formula information is behind Formula details. Original occurrence IDs, pitch labels and bar/position/string labels survive the selected lens.
5. Clear reading removes the lens and returns actual keyboard focus to its candidate button.
6. Point movement clears the selected lens. The sequence selected Em → point 2 → point 1, with no intervening child action, does not resurrect Em. Moving forward again retains no selected candidate.
7. Scale-reference and key-reference changes each close only the child. The parent remains on Across full bars, Point 2 of 5 / Page 2 of 2, and all source score cell labels remain unchanged. Reopening requires an explicit action and begins with no candidate selected.
8. Parent source-note paging preserves the current selected hypothesis while the point remains unchanged.
9. Complete empty point and completely source-free document use distinct truthful states. Neither displays a silence claim or an invented chord.
10. Visible buttons and summaries measure **at least 44×44px**, reduced motion is active, and document width equals every viewport width. Hidden descendants of closed disclosures are excluded from target measurements.

`results.json` contains exact text, geometry and passed groups. `browser.py` is the executed independent driver.

## NON VERBATIM / INTUITIVE review

Source review: `WrittenChordReadings.tsx` and `written-chord-readings.module.css`, against `AGENTS.md` and `docs/design-language.md`.

**Pass at this feature's scope.** A single quiet, initially closed Chord readings disclosure adds the new entry point. Observation facts precede interpretation. `As …`, `If …`, underline/pressed state and Clear reading communicate an ephemeral chosen lens without a tutorial paragraph. Short source rows retain actual musical provenance; optional Formula details and Observation details keep technical limitations and metadata out of the primary facts path. Shared colors, hairlines and existing written-time actions are reused; no extra filled primary action, card stack, automatic suggestion selection or permanent explanatory panel was introduced.

The complete parent Across panel is already tall because it displays up to eight written-note rails. Opening facts or explicitly selected formula details adds further rows; that is a deliberate opt-in state, not an unsolicited default list. No clipping, overlapping labels, page overflow or contradictory selected state was observed. No new-user comprehension or recognition-accuracy claim is inferred from these checks.

Images directly inspected by the reviewer included mobile facts, selected Am7, omissions, two-PC facts, empty point and no-source states; tablet facts; desktop selected Am7. Representative files:

- `opt-in-closed-390.png`
- `facts-ceg-390.png`, `facts-ceg-768.png`
- `if-c-390.png`, `if-am7-390.png`, `if-am7-1335.png`
- `formula-omissions-390.png`
- `reference-reset-parent-retained-390.png`
- `two-pc-facts-390.png`, `two-pc-optional-formula-390.png`
- `empty-point-390.png`, `no-written-notes-390.png`

## Harness corrections retained separately

Four earlier failed attempts are preserved, explicitly **not counted as product failures**:

- `harness-initial-open-attribute*`: the driver treated a present native `open=""` attribute as false and closed an already-open Formula alternatives disclosure. Fixed by testing `is None`.
- `harness-initial-progress-key*`: an unquoted Python dictionary key caused a driver NameError after the earlier UI assertions passed.
- `fixture-empty-import-not-replacement*`: all-hyphen ASCII import does not replace the existing score, so it was an invalid source-free fixture precondition.
- `fixture-empty-fret-disappeared*`: empty fret input did not retain the driver target for a following Enter. The source-free fixture was changed to the existing explicit cell Delete route.

The final complete run passes all widths after these driver/fixture corrections. The source runtime was not modified between attempts.

## Limits

This report covers production visual/state/value acceptance only. Root and independent challenge/core reviewers cover guards, native IME, dense limits, abstention and core invariants separately. This browser run does not certify physical mobile hardware, OS-specific IMEs, user comprehension, musical probability, performed sounding harmony or future P4-C implementation applicability.
