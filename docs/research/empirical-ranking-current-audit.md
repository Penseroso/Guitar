# Current ranking audit

Production baseline: `a79007f0919b5b7f34657caa99f6d30a787c2a49` (verified HEAD). Research only; no production changes. Generator and Physical decisions are accepted as frozen inputs. Source references below are repository-relative paths followed by exact baseline line numbers.

## Finding

The live scorer contains **23 configurable scalar weights, no corpus-derived input, and no learned model**. It is an additive deterministic product preference, not a deductive proof of comfort. Measurable note/geometry facts support feature computation; they do not establish preference signs, coefficient magnitudes, thresholds, or cross-feature tradeoffs. The current numeric weights require review even where their feature has a reasonable ergonomic rationale.

The live exploration path preserves the pool through ranking, filters the full ranked pool before pagination, and keeps user selection by physical identity. It does not read `assessment.status` when ranking. Nevertheless, its independent ergonomic heuristics share inputs with Physical, so an UNCERTAIN candidate may receive lower scores for estimated reach/fingers without an explicit status penalty. Those are different mechanisms and must remain distinguished.

## Active data flow and ordering contract

1. `src/components/guitar/chord/chord-exploration.worker.ts:13` generates an exploration pool and returns `rankExplorationPool(pool)`.
2. `src/domain/chord/exploration.ts:126` passes every pool voicing to `rankVoicingCandidates`, then reattaches the facts and assessment by physical ID. No rank-stage filter or truncation occurs.
3. `src/domain/chord/deductiveRanking.ts:496` maps every voicing to its score and sorts. Descending total score is followed by playable-first, ascending raw `voicing.span`, ascending `voicing.minFret`, and `voicing.id.localeCompare` (lines 504–517).
4. `src/domain/chord/exploration.ts:149` applies explicit fret, string-count, open, root, coverage, bass and top filters. `queryExploration` filters before slicing (lines 165–173). Initially six matches are displayed; each Show more adds twelve (`exploration.ts:162`; `ChordExplorationPanel.tsx:227`). These are presentation budgets, not candidate invalidation.
5. `src/components/guitar/ClientApp.tsx:198` passes the full ranked pool to selection resolution. `src/components/guitar/chord/bridge.ts:39` preserves a requested ID; absent a valid selection, line 55 selects the first ranked candidate. Ranking therefore controls the default preview/playback selection as well as the initial list.
6. `src/components/guitar/chord/ChordExplorationPanel.tsx:131` explicitly retains selection outside new filters and displays a notice. Score reasons appear in details (`:67`); the surface does not label the numerical score as a probability or preference estimate.

`src/domain/chord/rankedVoicingSearch.ts:17` is another exported search/rank adapter, used by tests; it forwards separate search and ranking options. The live worker uses exploration. There is no extra generator score: `voicingSearch.ts:182` emits resolved candidates and no score field.

## Classification scheme

- **1 — Structural fact:** a measurable/reproducible input, not a preference in itself.
- **2 — Physical/ergonomic heuristic:** an estimate potentially useful for ordering; not validity or proven comfort.
- **3 — Musical/conventionality prior:** a deterministic product preference.
- **4 — Empirical signal:** externally observed evidence actually used as a signal.
- **5 — Historical/arbitrary weight:** no sufficient calibration or preference evidence establishing its numeric value.

The table separates feature classification from weight classification. A geometry input can be category 1, its comfort interpretation category 2, and its multiplier category 5 simultaneously. All 23 current preference/safety weights are listed; **none is category 4**. Historical corpus work exposed calibration hooks but did not replace the defaults with empirically justified production weights.

## Every scoring term and default

All defaults are declared at `src/domain/chord/deductiveRanking.ts:104`–136; formulas are additive. Symbols: `s` = stopped-note longitudinal span in mm; `H` = comfort reference (95 mm by default); `g` = scorer-estimated finger groups; `b` = largest same-fret barre group's number of notes; `a` = internal mutes with a fretted neighbor; `i` = isolated internal mutes; `o` = those isolated mutes flanked immediately by two open strings; `m` = maximum stopped fret; `n` = sounding string count; `u` = open strings.

| Weight(s), all defaults | Exact contribution and activation | Signal classification; numeric justification | Baseline source |
|---|---|---|---|
| `structuralSafetyNetPenalty = -500` | Add once if `!voicing.playable`, any missing required degree other than root, or any out-of-formula pitch class when tones are supplied. Root missing alone is exempt. | Predicate combines 1 and upstream model status; **5** for the sentinel magnitude. This should be an observable upstream-contract breach, not a comfort preference. In current generated pool it should be zero. | `deductiveRanking.ts:301`–309 |
| `handSpanComfortMax = 20` | Let `T=min(40,H)`. Add `20` if `s<=T`; otherwise `20*max(0,1-(s-T)/max(1,H-T))`. Default: +20 through 40 mm, taper to 0 at 95 mm, never negative beyond 95 mm. | Longitudinal distance is 1; inferred comfort is **2**. Multiplier **5**; 40/95 mm comfort landmarks also need ergonomic/product justification. No corpus preference calibration demonstrated. | `deductiveRanking.ts:317`–323; `fretGeometry.ts:5`, `:9`, `:24` |
| `fingerEconomyPerFinger = -6` | `-6*max(g-1,0)`; no difference between zero and one group. | **2**, computed from 1 plus a grouping model; weight **5**. This is an estimate, not known human finger use. | `deductiveRanking.ts:327`–337 |
| `diagonalRollBonus = 12` | +12 only when `g>1` and every independent non-barre fretted note makes one uninterrupted consecutive-string run with a constant fret step of +1 or -1; at least two such notes. | **2**, explicitly user-requested technique preference. Number **5**, historically chosen to surface a reported maj7 shape. Not independent population evidence. | `deductiveRanking.ts:144`–177, `:332`–334 |
| `barreWidthPenaltyPerString = -2` | `-2*(b-2)` if `b>=3`; largest group only. | **2**; weight **5**. Input is group note count, not actual transverse finger distance. | `deductiveRanking.ts:212`–220, `:342`–344 |
| `internalMuteAdjacentPenalty = -1.5` | `-1.5*a`. Internal means strictly between outer sounding string indices; adjacent means at least one neighboring string has a stopped note. | Pattern is 1; the claim of naturally/easily deadened strings is **2**. Weight **5**. Adjacency does not identify an actual muting action. | `deductiveRanking.ts:192`–209, `:348`–353 |
| `internalMuteIsolatedPenalty = -6` | Define `w=(i-o)+2o=i+o`; add `-6*w*(w+1)/2`. One ordinary isolated gap = -6; one open-flanked gap = -18; two open-flanked gaps = -60. | **2**; multiplier, doubling and triangular interaction are **5**. Strong nonlinear cost with no separate empirical basis established. | `deductiveRanking.ts:354`–358 |
| `innerStringMutePenalty = -8` | For technique Open or Barre, `-8` for **each muted string index in {1,2,3} (B/G/D)**. This counts all such mutes, even outside the sounded-string window. Stacks with general mute penalties. | **2 + 3**: muting-cost rationale plus ringing-technique product policy. Number/scope **5**; explicit historical user request exists. The code does not require a separate fretting finger elsewhere despite that rationale in comments. | `deductiveRanking.ts:93`–102, `:459`–468 |
| `lowPositionBonus = 10`; `standardPositionBonus = 4`; `highPositionPenalty = -4` | +10 if `m<=7`, else +4 if `m<=12`, else -4. All-open receives +10. | Fret is 1; preference is **3**, not a geometric comfort fact. Values and thresholds **5**. Low versus high is a 14-point difference independent of mm reach. | `deductiveRanking.ts:363`–371 |
| `openStringBonus = 3`; `highOpenMixPenalty = -4` | If `u>0` and `m<=5`, `3*min(u,2)`; otherwise if `u>=3` and `m>=8`, -4; otherwise 0. | Counts/frets 1; practice/conventional ringing preference **3** with possible **2** rationale. Weights/cap/thresholds **5**. High-position open strings are not inherently wrong. | `deductiveRanking.ts:375`–380 |
| `rootPresenceBonus = 6`; `rootPresencePenalty = -12` | +6 when root exists, otherwise -12. | Presence is 1; root preference **3**. Values **5**. Standalone's required root makes this constant; accompaniment activates an 18-point rooted/rootless contrast. | `deductiveRanking.ts:384`–389 |
| `rootHintBonus = 8`; `rootHintPenalty = -3` | When registry hint list and root occurrences are nonempty: +8 if any root lies on a hinted string, otherwise -3. Missing hint or missing root gives 0. | Match is 1; hand-authored hint is **3**. Values and registry choices **5**, not corpus observations. Credit duplicated roots on any matching string. | `deductiveRanking.ts:397`–406; `registry.ts:103`–354 |
| `rootInBassBonus = 16`; `rootInBassPenalty = -8` | Without slash request: +16 for root-position; -8 for inversion only if string index of lowest-MIDI note is >=3; upper-string inversion 0; rootless 0. | Bass identity is 1; root-position convention is **3**. Values and string threshold **5**. The implementation tests the bass note's string, not whether any sounded note reaches a low string. | `deductiveRanking.ts:418`–431; `descriptor.ts:209`, `:223`–243 |
| `slashBassBonus = 24`; `slashBassPenalty = -28` | With `chord.slashBassPitchClass` defined: +24 if `satisfiesSlashBass`, else -28; replaces ordinary inversion branch. | Explicit-request compliance is **1/product intent**, not population preference. Encoding it as tradable finite points is **5**. Latent/exported branch: current exploration request has no slash field and generator emits no slash-satisfaction value. | `deductiveRanking.ts:410`–417; `exploration.ts:12`–16; `voicingSearch.ts:170`–194 |
| `colorToneBonus = 2` | +2 for each optional tone in supplied `tones.tones` whose pitch class sounds. Deduplicates sounding pitch classes; counts optional formula entries. No tones argument means 0. | Coverage is 1 under frozen semantic rules; retention preference **3**; weight **5**. “Color tone” includes optional natural fifth, not only tensions. | `deductiveRanking.ts:436`–445; `degreeRequirements.ts:15`–26 |
| `fullnessBonusPerString = 3` | +3*n for Open or Barre technique, 0 for Shell/Standard. Applies even to fewer than five sounded strings when tagged Open; only reason text waits for `n>=5`. | Density is 1; rich-ring preference **3**. Weight and tag gating **5**; can produce a large discontinuity at the five-note Barre tag threshold. | `deductiveRanking.ts:451`–455 |

## Facts, derived labels, and tie-breaks not covered by a scalar weight

- Exact frets, tuning, MIDI, pitch classes, root occurrence, sounding/open/muted strings and coverage are category 1 facts under accepted chord semantics. The fret formula is `L*(2^(-lo/12)-2^(-hi/12))` with `L=647.7 mm` by default (`fretGeometry.ts:24`). This calculates distance along the neck, not a complete hand posture or comfort measurement.
- Scorer min/max fret and mm span exclude open strings (`deductiveRanking.ts:222`–225). Its `mutedCount` and `minFret` metrics are collected but receive no additive term. Top note, bass/top pitch distance, absolute MIDI register, duplicated-tone count, and explicit user-selected target position receive no direct additive score.
- Technique precedence is Shell > Barre > Open > Standard (`deductiveRanking.ts:241`–268). Shell is a descriptor family; Barre requires group note count >=3 and sounding count >=5; Open requires an open note. These are category 3 presentation conventions built from facts and models. They are not the user's active technique selection in today's exploration UI. Their use as score gates couples semantic labeling to ranking.
- “Barre width” is `max(group.strings.length)`, whereas physically touched strings can include intervening frets/mutes; the variable/comment overstates transverse width. A two-note permissible barre counts as one finger (`fretGeometry.ts:117`) even though it gets no wide-barre term and no Barre technique label.
- Playable-first tie-break is upstream status as category 1, with category 5 sorting policy; every actual generated candidate has `playable:true` (`voicingSearch.ts:191`), so it is inert in the live pool. Do not map UNCERTAIN onto false.
- Ascending raw fret-span tie-break is a category 2/5 compactness heuristic. It uses the generator's `max(played frets)-min(played frets)`, **including open strings** (`voicingSearch.ts:165`–190), unlike stopped-only comfort. An open-plus-high shape can be penalized again on ties despite zero/short stopped reach.
- Ascending `voicing.minFret` is category 3/5 lower-position preference, also including open frets. `localeCompare(id)` is category 5 reproducibility/implementation ordering with no musical meaning. Exploration rewrites IDs to physical tuning/fret patterns (`exploration.ts:58`–64, `:80`); the older adapter keeps chord/style/signature IDs, so equal-score ties need not match across adapters.

## Material interactions and limitations

**Root preference is compounded.** A rooted root-position candidate matching its registry hint gets +6+16+8=+30. A rootless candidate gets -12 and neither ordinary inversion nor hint contribution. That is a 42-point contrast before other features; it can dominate the 20-point comfort range. Accompaniment enables rootless candidates but does not change the scorer's weights. Explicit root-omit filters still preserve and reveal them, since filtering happens across the whole pool.

**Position preference stacks with open convention and the final tie-break.** The hard jumps at fret 7/8 and 12/13 coexist with +3/+6 for low open strings, -4 for high open mixtures, and low-minimum-fret tie resolution. Fixed fret bands are not justified by the mm comfort calculation, which often favors the shorter distances at higher frets.

**Density and mute terms interact.** Filling one internal string can remove -1.5 or a much larger triangular mute cost, remove an additional -8 core-string term, add +3 fullness, possibly add +2 optional coverage, and cross a technique threshold. Interpret results as the combined policy, not separate independent evidence for all these correlated bonuses.

**Technique labels introduce discontinuities.** A closed four-note grip with a three-note barre gets the physical barre penalty but no fullness; a fifth sounded note may switch Standard to Barre and add +15 fullness (while enabling core mute penalties). Shell precedence can suppress Open scoring even when an open string rings. A technique taxonomy originally designed for UI buttons now silently influences an unconstrained exploration order.

**Finger counts are not the same object in scorer and Physical assessment.** `deductiveRanking.ts:212`–217 calls `classifyFrettedGroups` and counts a whole same-fret group as one if barre-able, otherwise every note independently. Physical assessment calls `evaluateHandPlayability`; its count uses minimum covering partial barres (`fretGeometry.ts:123`–170). The shared primitive does not make their returned counts identical. A partial grouping or thumb case may therefore show one estimated count in assessment and another in score reasons. This is a ranking-input/explanation issue; it does not justify reopening frozen Physical rejection decisions.

**Uncertainty is already separate as a field.** `exploration.ts:97` creates status using the assessment's count/reach; `rankExplorationPool` passes only voicings to the scorer and appends status afterward (`:129`–131). There is no uncertainty coefficient. Geometry-based scoring remains a policy whose effects on UNCERTAIN slices should be measured; it must not be described as an uncertainty penalty.

**Reasons overclaim evidence.** “Naturally deadened,” “one smooth diagonal roll,” and “Needs N independent fretting fingers” are model interpretations, not observed fingering/comfort evidence. The fullness contribution is sometimes unmentioned (Open with <5 strings), and no numeric term decomposition is returned. The user sees prose reasons, not a complete score ledger.

**Finite penalties cannot enforce explicit constraints.** The slash branch can trade compliance against other positive terms, and is inactive in this UI. Future slash/user constraints should stay in the established constraint path, with preference ranking operating only on preserved matching candidates. This is a ranking contract statement, not a proposal to alter today's generator.

## Historical provenance

`git log --follow` and targeted `git show` establish:

- `ea08c34` (“Rebuild the ranking layer as a clean, mode-less scorer for the new engine”) introduced nearly all current weights. Its message reports hand-picked Am/G/C diagnostics, fixing optional-tone double counting and neutral absent hints, and adding a flat comfort region. That documents development examples and engineering intent, not empirical human preference or calibrated tradeoffs.
- `94e8238` adds the -8 Open core-mute term at explicit historical user request.
- `72ffb9d` removes an overlapping-barre penalty because it punished a standard A-shape and represented an unreachable condition. The old overlapping-barre weight is **not current**.
- `f8caa3c` adds +12 diagonal roll at explicit historical request. The commit reports moving the concrete maj7 grip x-x-10-9-8-7 from 27.5 to 39.5 so it survives the then-default surface. This is transparent targeted development, not held-out evidence that +12 generalizes.
- `e7ad8a0` restricts Barre technique to 5–6 ringing strings to resolve overlap with then-visible Triad/Quad categories. Today's UI no longer presents that same technique-button competition, but the score gate remains.
- `3d2e27c` extends core-mute scoring to Barre from a reported Cm7 example. Its narrative refers to an independent finger elsewhere; the actual predicate remains broader.
- `55f9436` centralizes the three-note “real barre” threshold; it does not validate its preference value.
- `6bb7923` preserves the 95 mm ranking comfort reference while changing the physical cutoff elsewhere. Its ranking diff only changes the imported/default constant; it does not add an empirical ordering feature.
- `432be85` (“Add DadaGP phase 2 ranking validation”) exposes the default weights and adds `weightOverrides`; its scorer diff does **not** change any numeric default or introduce corpus inputs. Subsequent naming cleanup does not supply empirical evidence.
- `3dc7ef8` adds today's exploration and offline surface-policy comparisons. Historical phase numbers and roadmaps are not operative recommendations.

## Offline presentation policies already available

`src/domain/chord/explorationPolicies.ts:3` explicitly states these are comparison policies; the UI uses baseline order.

- Baseline: first K.
- Near position: ascending distance of stopped-fret midpoint from an explicitly supplied target; original ordering resolves equal distances. No learned coefficients.
- Diverse: keep the baseline first choice, greedily maximize minimum distance from selected choices **only within top 2K**. Distance is the average of six dimensions: capped bass-MIDI octave distance, capped top-MIDI octave distance, bass-degree mismatch, top-degree mismatch, string-count difference divided by four, and omitted-degree-list mismatch (`:9`–19). The equal dimension weights, /12, /4 and 2K pool bound are category 3/5 presentation choices, not corpus-derived calibration. The 2K restriction can prevent high-position or rootless coverage regardless of its novelty. This routine returns a surface subset for a budget; it does not itself provide a full conserving reranked list.

## Verification and what remains unproven

Read all scorer and exploration tests. Ran existing targeted command:

```text
npm test -- src/domain/chord/deductiveRanking.test.ts src/domain/chord/rankedVoicingSearch.test.ts src/domain/chord/exploration.test.ts
```

Vitest reported **6 test files passed, 84 tests passed**. The initial sandbox run could not start Vite's child process (`spawn EPERM`); the authorized escalated retry passed. No tests or production files were edited.

Tests cover score order/reasons, multiple shape-metric cases, optional-tone single credit, neutral missing hint, diagonal-roll and core-mute regressions, and filter/pagination conservation. See `deductiveRanking.test.ts:29`–565, `rankedVoicingSearch.test.ts:10`–51, `exploration.test.ts:26`–125. Some test titles are stronger than their assertions: the “prefers a barre ... over ... four independent fingers” test (`deductiveRanking.test.ts:332`) only checks one shape's metric/reason; it does not compare two candidates. Fixtures often construct templates with declared degree labels, so feature behavior tests are not evidence of observed musical preference.

These tests establish implementation behavior, not metric superiority, artist independence, unseen-family generalization, or valid empirical weight calibration. The absence of production empirical signals does not settle whether a future residual can help; that requires the separately audited certified evidence and protected evaluation.

## Ranking-only recommendation

Retain the conservation/filter/selection contract. For an interpretable baseline, expose a short list of explicitly named product priorities over accepted structural facts and bounded ergonomic estimates; make every preference tradeoff auditable. First isolate the high-impact legacy choices (root/root-bass/hint stacking, position bands, tag-gated fullness, nonlinear plus extra core mute cost), scorer/assessment finger-definition mismatch, and raw-span tie-break. Keep uncertainty as metadata and corpus support outside validity. Compare any cleaned baseline against the exact current function rather than assuming simplification improves observed retrieval. This audit supports **REFINE DETERMINISTIC** as the ranking-code direction; the final empirical adoption decision depends on independent evidence review.
