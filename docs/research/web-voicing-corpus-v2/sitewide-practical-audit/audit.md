# All-Guitar-Chords Practical Vocabulary Audit

The audited product supports a bounded core practical vocabulary across all twenty integrated chord qualities and all twelve roots. The proposed version contains **109 root-translatable closed templates, two templates limited to observed placements, one exact closed exception, and 99 exact open forms**. This is a product convention grounded in one site's finite presentation structure. It estimates neither popularity nor preference, and it does not establish manual curation or human success rates.

The complete comparable domain contains **1,510 source variations on 240 pages**. Every allocation passed an SVG-versus-explicit-state check. The current standalone identity engine admits 1,454 observations; 56 ninth-chord observations omit its required third. Of the 1,454 survivors, **1,292 satisfy the locked Product Policy v2 usability predicate and 162 do not**. All 240 queries retain at least one representative under the proposal. The vocabulary therefore works with the present gate, while exposing material conflicts for adjudication.

## 1. Scope and evidence identity

This is the final site-wide expansion of the [bounded pilot](../representative-addendum/addendum.md), not a revision of the [frozen Web Voicing Corpus Study v2](../study.md). Acquisition is dated 2026-09-13. The integrated baseline remains `32f9d3f8a71dc0d2a5f18520bfad738e67ba26c0`; the locked [Product Policy v2](../../../architecture/product-policy-v2.md) is unchanged. DadaGP, Physical research, broad source discovery and ranking fitting are outside this audit.

The source domain is the ordinary and Advanced chord product and its public detail pages. The comparable engine request is standard high-to-low tuning [64,59,55,50,45,40], capo 0, frets 0–15, standalone context, identity realization, no explicit slash bass and no explicit view restrictions. Physical defaults are generic static fretting, 647,700 µm scale, unplayed omitted strings and no thumb allowance. Accompaniment, alternate tuning, capo, slash-specific and other realization requests are outside this proposed vocabulary version. They retain the normal usability-based fallback behavior.

Every site page, root, octave and transposition belongs to **one source family**. Source variation ordinals identify presentation locations; they are not votes or preference ranks. The intended construct is the small vocabulary made available for a product's primary chord presentation. Only variation 1 is the literal default diagram. Higher numbered variations are primary-list alternatives requiring selection.

## 2. Site taxonomy and presentation

The [chord tool](https://www.all-guitar-chords.com/) exposes twelve chromatic sharp root buttons: C, C#, D, D#, E, F, F#, G, G#, A, A#, B. Detail/index labels also show enharmonic pairs such as C#/Db. These are alternative root spellings, **not slash-bass requests**. The root slugs are c, c_sharp, d, d_sharp, e, f, f_sharp, g, g_sharp, a, a_sharp, b. The [public index](https://www.all-guitar-chords.com/chords/index) supplies every one of the 600 root/type links.

The ordinary interface has twelve types; Advanced adds 38, for fifty total. The live controls and public index agree on that inventory. Detail URLs follow /chords/index/{rootSlug}/{typeSlug}. Sharp alterations use an asterisk in the URL, while compound alterations percent-encode parentheses. These URLs are followed from the index, not guessed. A sus4 page may be labeled “sus” in the index; dim7 writes the diminished seventh as 6, which is harmonically canonicalized to bb7 by the engine. Both are resolved aliases, not additional qualities.

| Interface | Type / URL slug | Engine mapping | C-page formula |
|---|---|---|---|
| ordinary | major | major | 1-3-5 |
| ordinary | minor | minor | 1-b3-5 |
| ordinary | 7 | dominant-7 | 1-3-5-b7 |
| ordinary | 5 | power-5 | 1-5 |
| ordinary | dim | diminished | 1-b3-b5 |
| ordinary | dim7 | diminished-7 | 1-b3-b5-6 |
| ordinary | aug | augmented | 1-3-#5 |
| ordinary | sus2 | sus2 | 1-2-5 |
| ordinary | sus4 | sus4 | 1-4-5 |
| ordinary | maj7 | major-7 | 1-3-5-7 |
| ordinary | m7 | minor-7 | 1-b3-5-b7 |
| ordinary | 7sus4 | unsupported | 1-4-5-b7 |
| advanced-additional | maj9 | major-9 | 1-3-5-7-9 |
| advanced-additional | maj11 | unsupported | 1-3-5-7-9-11 |
| advanced-additional | maj13 | unsupported | 1-3-5-7-9-13 |
| advanced-additional | maj9*11 | unsupported | 1-3-5-7-9-#11 |
| advanced-additional | maj13*11 | unsupported | 1-3-5-7-9-#11-13 |
| advanced-additional | add9 | unsupported | 1-3-5-9 |
| advanced-additional | 6add9 | unsupported | 1-3-5-6-9 |
| advanced-additional | maj7b5 | unsupported | 1-3-b5-7 |
| advanced-additional | maj7*5 | unsupported | 1-3-#5-7 |
| advanced-additional | m6 | unsupported | 1-b3-5-6 |
| advanced-additional | m9 | minor-9 | 1-b3-5-b7-9 |
| advanced-additional | m11 | unsupported | 1-b3-5-b7-9-11 |
| advanced-additional | m13 | unsupported | 1-b3-5-b7-9-11-13 |
| advanced-additional | madd9 | unsupported | 1-b3-5-9 |
| advanced-additional | m6add9 | unsupported | 1-b3-5-6-9 |
| advanced-additional | mmaj7 | unsupported | 1-b3-5-7 |
| advanced-additional | mmaj9 | unsupported | 1-b3-5-7-9 |
| advanced-additional | m7b5 | half-diminished-7 | 1-b3-b5-b7 |
| advanced-additional | m7*5 | unsupported | 1-b3-#5-b7 |
| advanced-additional | 6 | major-6 | 1-3-5-6 |
| advanced-additional | 9 | dominant-9 | 1-3-5-b7-9 |
| advanced-additional | 11 | dominant-11 | 1-3-5-b7-9-11 |
| advanced-additional | 13 | dominant-13 | 1-3-5-b7-9-13 |
| advanced-additional | 7b5 | unsupported | 1-3-b5-b7 |
| advanced-additional | 7*5 | unsupported | 1-3-#5-b7 |
| advanced-additional | 7b9 | dominant-7-flat-9 | 1-3-5-b7-b9 |
| advanced-additional | 7*9 | hendrix-7-sharp-9 | 1-3-5-b7-#9 |
| advanced-additional | 7(b5,b9) | unsupported | 1-3-b5-b7-b9 |
| advanced-additional | 7(b5,*9) | unsupported | 1-3-b5-b7-#9 |
| advanced-additional | 7(*5,b9) | unsupported | 1-3-#5-b7-b9 |
| advanced-additional | 7(*5,*9) | unsupported | 1-3-#5-b7-#9 |
| advanced-additional | 9b5 | unsupported | 1-3-b5-b7-9 |
| advanced-additional | 9*5 | unsupported | 1-3-#5-b7-9 |
| advanced-additional | 13*11 | unsupported | 1-3-5-b7-9-#11-13 |
| advanced-additional | 13b9 | unsupported | 1-3-5-b7-b9-13 |
| advanced-additional | 11b9 | unsupported | 1-5-b7-b9-11 |
| advanced-additional | sus2sus4 | unsupported | 1-2-4-5 |
| advanced-additional | -5 | unsupported | 1-3-b5 |

All twenty mapped type formulas were checked on every acquired root page against the engine's formula, with only dim7's 6→bb7 spelling normalization. No unsupported type was collapsed onto a similar supported type: add9 is not 9, m6 is not 6, 7sus4 is not sus4, and -5 is not dim. The thirty unsupported types remain explicitly inventoried.

The site's complete pages display **one to ten** numbered variations, not the integrated engine's combinatorial universe. Sixty comparable pages have ten variations; this observed ceiling does not prove a hidden hard cap or its selection rule. All 240 comparable lists are nondecreasing in minimum sounding fret, treating open as fret 0. This supports a neck-position presentation sequence, not a human preference order. The home-page instructions explicitly frame numbered variations as choices at different neck locations. The dictionary does not disclose how its original allocations were authored or selected. [1]

## 3. Complete coverage accounting

| Measure | Result |
|---|---:|
| All site pages expected / acquired / unavailable | 600 / 600 / 0 |
| All displayed variations inventoried | 2,775 |
| Comparable pages expected / acquired / unavailable | 240 / 240 / 0 |
| Comparable variations expected / acquired / double-verified | 1,510 / 1,510 / 1,510 |
| Unsupported-type pages / inventoried variations | 360 / 1,265 |
| Ambiguous allocations / unreconstructable comparable pages | 0 / 0 |
| Integrated source mapping successes / exclusions | 1,454 / 56 |
| Exact integrated queries / total survivors examined for ranks | 240 / 5,858,707 |

Unsupported-page allocations were not collected or force-mapped. Their variation headings and explicit state-block counts were inventoried, without retaining those allocations. The comparable pages preserve every numbered variation, including repeated allocations. The full [600-page inventory](page-inventory.md) and [240-cell quality/root table](quality-root-coverage.md) account for every expected page and row. The [acquisition manifest](acquisition.json) retains exact locators, variation ordinals, source page/SVG/state hashes, access times and minimal musical facts.

For each comparable variation, the six explicit page-state allocations were checked against six SVG open/stopped/muted markers and printed fret labels. Diagram orientation was checked against string labels. Finger numbers, barre rectangles and decorative markers were not interpreted as fret numbers. These are two representations of the same product record, **not independent editorial evidence**. Source HTML, images, audio, prose and application bundles were not retained. If a later re-acquisition fails or differs, that is a new snapshot, not permission to overwrite the frozen evidence silently.

## 4. Mapping and full quality coverage

| Site type | Engine quality | Rows / mapped | Open IDs | Closed IDs (B) | U pass / mapped | High / high U | Classic top6 / top18 |
|---|---|---|---|---|---|---|---|
| major | major | 66/66 | 5 | 6 (5) | 50/66 | 10/7 | 17/28 |
| minor | minor | 42/42 | 4 | 3 (3) | 34/42 | 8/5 | 13/16 |
| 7 | dominant-7 | 113/113 | 11 | 8 (8) | 109/113 | 24/21 | 14/30 |
| 5 | power-5 | 120/120 | 9 | 10 (9) | 116/120 | 28/28 | 20/46 |
| dim | diminished | 28/28 | 2 | 2 (2) | 28/28 | 6/6 | 8/17 |
| dim7 | diminished-7 | 118/118 | 7 | 9 (9) | 118/118 | 24/24 | 5/13 |
| aug | augmented | 71/71 | 9 | 5 (5) | 67/71 | 12/12 | 6/17 |
| sus2 | sus2 | 27/27 | 2 | 2 (2) | 23/27 | 5/5 | 15/20 |
| sus4 | sus4 | 75/75 | 4 | 6 (6) | 55/75 | 11/8 | 14/21 |
| maj7 | major-7 | 118/118 | 8 | 10 (9) | 97/118 | 22/16 | 13/22 |
| m7 | minor-7 | 108/108 | 6 | 8 (8) | 104/108 | 23/20 | 15/30 |
| maj9 | major-9 | 80/38 | 1 | 3 (3) | 30/38 | 7/4 | 10/15 |
| m9 | minor-9 | 27/27 | 2 | 2 (2) | 22/27 | 5/2 | 10/13 |
| m7b5 | half-diminished-7 | 117/117 | 7 | 9 (9) | 110/117 | 25/23 | 6/21 |
| 6 | major-6 | 119/119 | 8 | 9 (9) | 111/119 | 27/21 | 10/12 |
| 9 | dominant-9 | 96/82 | 4 | 6 (6) | 68/82 | 18/12 | 6/15 |
| 11 | dominant-11 | 41/41 | 3 | 3 (3) | 41/41 | 8/8 | 8/13 |
| 13 | dominant-13 | 52/52 | 3 | 4 (4) | 41/52 | 9/8 | 2/8 |
| 7b9 | dominant-7-flat-9 | 65/65 | 2 | 5 (5) | 53/65 | 13/7 | 6/12 |
| 7#9 | hendrix-7-sharp-9 | 27/27 | 2 | 2 (2) | 15/27 | 5/3 | 1/3 |

Open/closed ID counts in this table are the adopted subset. The full raw inventory contains 103 distinct open forms and 116 closed templates; four open forms and four closed templates fail the identity boundary. All 56 exclusions are third-omitting ninth shapes: 42 maj9 and 14 dominant 9 observations. Their musical allocations are confidently reconstructed; “excluded” means outside this declared engine identity request, not incorrect or unusable guitar shapes. Six are the site's literal first variation. The [exclusion ledger](mapping-exclusions.json) retains every row and diagnostic. Changing to accompaniment would not resolve a missing required third, and no such relabeling was attempted. [2]

The [complete mapping table](mapping-table.md) reports every source allocation, source ordinal, quality/root, template, open/closed state, stopped position, actual bass/top tones, inversion, omissions, Physical status, exact U variables, full classic-v1 rank and first-6/18 flags. Machine records additionally retain actual bass/top MIDI, string count, source-first status and all reasons. The raw integrated results are in [mapping rows](../../../../.research/web-voicing-corpus-v2/sitewide-practical-mapping/rows.jsonl). Excluded allocations have standalone geometry diagnostics but no fabricated engine rank and no eligibility as an integrated candidate.

All 240 query survivor counts and top-18 allocation sequences match the frozen integrated census. Rank came from the complete unchanged classic-v1 order, not a source subset or a sampled candidate pool. No coefficients, ranking terms or candidate validity rules were changed.

## 5. Exact vocabulary and deduplication

The [open inventory](open-form-inventory.md) retains exact allocations. The 100 admitted open observations reduce to 99 exact open IDs because Dmaj7 variations 1 and 2 have the same fret allocation. They remain two presentation locators and one product allocation. No new fingering preference is inferred from that duplication. An open form cannot be translated by treating its zero as a stopped-fret offset. [3]

The [closed inventory](closed-template-inventory.md) groups allocations only when a single integer translation preserves the six physical string states, mute mask, chord quality, translated root, inversion, omissions and bass/top interpretation. The root anchor a is (rootPC−minimumStoppedFret) modulo 12 in 0…11. Each high-to-low offset vector has −1 for unplayed and a minimum stopped offset of zero. For placement p, stopped states equal offset+p and the root is (a+p) modulo 12. Translation bounds are exactly p=1…15−max(offset).

A direct pairwise check compared constant per-string fret deltas and translated roots, independently of the normalized grouping key. All **987,715 closed-observation pairs** agreed with template membership. The [relationship manifest](template-relationships.json) records shared relative patterns that remain distinct because their harmonic interpretations differ. Symmetric augmented/diminished reinterpretations are not merged merely because their sounding pitch-class sets coincide. “CAGED-like” is an explanatory resemblance, never the equivalence rule.

Among the 112 adopted closed templates, 71 use at most four sounding strings, 40 have a non-root bass, and 15 omit formula tones. These categories overlap. The [reduced/inversion/omission inventory](reduced-template-inventory.md) preserves upper/inner string sets, internal mutes and omissions as distinct templates. Nothing fills muted strings or substitutes a fuller grip. All 76 adopted templates with observed octave repetitions keep those placements as repetitions within the same family, not independent endorsements.

The best-supported product description is a **finite quality-specific template vocabulary, exact open forms and a small number of allocation exceptions**. Each integrated quality has two to ten admitted closed templates. Familiar major open/movable forms explain part of it; reduced, inversion and quality-specific extension forms account for much more. The finite output structure does not distinguish manual, template-based, generated or hybrid original authoring. Provenance remains UNKNOWN.

## 6. Translation adjudication and unseen placements

The versioned adjudication rule is deliberately a product rule: a musically invariant exact-string template is B when all its observations map and it is witnessed at three or more distinct roots; two roots give A; one root gives C; engine-incompatible or ambiguous rows give D. The witness threshold is not a statistical confidence interval. In this completed dataset every B template actually has six to twelve observed roots, so no three-to-five-root borderline case is admitted.

| Class | Count | Adopted domain |
|---|---:|---|
| A — OBSERVED-ROOT ONLY | 2 | Exact observed root/position pairs only |
| B — ROOT-TRANSLATABLE PRODUCT TEMPLATE | 109 | Every root-coherent integer p within the declared bounds |
| C — QUALITY-SPECIFIC EXCEPTION | 1 | Exact observed allocation only |
| D — UNSUPPORTED / AMBIGUOUS | 4 | No vocabulary match under current engine identity |

| Class / ID | Quality | High→low offsets | Allowed exact (root PC,p) |
|---|---|---|---|
| C: PT-305337106506 | major | 0,0,1,2,-1,-1 | (5,1) |
| A: PT-3206bf0edff5 | major-7 | 0,0,1,1,-1,-1 | (0,8); (1,9) |
| A: PT-3175e099c526 | power-5 | -1,3,0,-1,-1,-1 | (11,4); (6,11) |

Every template ID, quality, offset, anchor, bound and allowed position is explicit in [proposed-vocabulary.json](proposed-vocabulary.json); its 99 exact open forms are enumerated there as well. There is no cross-quality generalization. The remaining four closed templates and four open forms are a preserved unsupported identity domain, not invisible omissions.

The proposed vocabulary contains **1,530 distinct quality/root/allocation matches** within its domain: 1,453 unique admitted source observations and 77 additional placements. The additional placements are explicitly **product-extrapolated**. All 77 were checked against exact integrated generation; 73 pass U and four fail it. The [extrapolation table](product-extrapolated-placements.json) records each placement, rank, Physical status and U calculation. The [source-observed sidecar](source-observed-placements.json) separately preserves actual source witnesses. An unseen placement must never receive a source-observed claim merely because it matches an adopted template.

The source omits some coherent bounded translations. Thus the audit does not assert that the website exhaustively enumerates every legal translation of its templates. Its selection/range policy remains partly unknown. The 77 additions are an explicit product-owned octave/root consistency choice, with independent engine and usability checks; absence from the site carries no negative quality meaning.

## 7. Position, inversion and rank access

| Minimum stopped-fret band | Mapped source rows | Pass U | Classic top6 | Classic top18 |
|---|---|---|---|---|
| all open | 5 | 5 | 0 | 1 |
| min stopped 1–3 | 413 | 351 | 86 | 146 |
| min stopped 4–7 | 424 | 399 | 59 | 106 |
| min stopped 8–10 | 322 | 297 | 41 | 78 |
| min stopped 11–15 | 290 | 240 | 13 | 41 |

There are **290 mapped high-position observations**, of which 240 pass U. The source therefore fills the earlier pilot/study gap in neck-position-diverse representative shapes, within one product lineage. High-position examples exist across all twenty qualities. Full per-quality position, inversion, string-count and omission coverage is in [position coverage](position-coverage.md).

The mapped corpus includes 501 non-root-bass observations, 120 two/three-string observations, 208 with internal mutes and 197 with formula omissions. It contains no rootless admitted observations; this audit provides no rootless-vocabulary evidence. Exactly five mapped allocations are all-open and have no stopped-position interval. Bass-tone labels remain authoritative for suspended/extended bass cases rather than forcing them into triadic inversion names.

Only 199 of 1,454 source observations appear in the first six of their full classic-v1 query and 372 in the first eighteen. Of 290 high-position observations, 13 are in full-classic first six and 41 in first eighteen. These counts describe access to this product vocabulary, not ranking accuracy against human preferences.

Under the proposed representative partition, there are **1,364 unique U-eligible vocabulary allocations**, including 73 extrapolations. Every query has one to thirteen representatives; 132 queries have fewer than six and may use U-eligible FALLBACK members after them. The [priority-access projection](proposed-priority-access.json) gives each query's representative first six. It includes 161 source-observed high-position allocations in those first-six lists. This is a combined product surface projection relative to raw full classic order; it does not isolate a causal ranking improvement, calculate the full fallback membership, impose position quotas, or promise every high shape initial visibility.

## 8. Exact U(c) evaluation and L2 ↔ L3 conflicts

U(c) is the **locked compact predicate**, evaluated as an independent product layer. It is not inferred from PASS, GS Mini geometry or the old 95/180-mm warning thresholds. This audit uses the request's default 647,700 µm scale and fixed constructed-electric N2=70,000, B2=104,775 half-micrometre spacing constants. The pinned 10¹² integer fret table, rounded wire coordinates, signed transverse numerators, full cells and final J/T rounding use BigInt throughout. [4]

U = not Uop AND J≤55,000 µm AND T≤42,000 µm AND G≤4 AND G1≤4. G is unchanged partial-cover-v1. G1=Nstop−K+1 for nonempty stopped targets, where K is the maximum compatible same-fret interval; all-open gives zero. Uop checks scope, unavailable hand profile, required damping of unplayed strings, actual thumb reliance and the named unsupported/unresolved/conflicting reasons. Span/group warnings alone do not set Uop. W is retained as provenance and has no additional cutoff.

The [research-equivalent implementation](../../../../scripts/web-voicing-corpus-v2/sitewide-demand.ts) follows the locked predicate. Verification covers inclusive threshold boundaries, scale extremes, unsupported operations, status independence and 4,095 independent exhaustive one-interval topology cases. The [verification record](demand-verification.json) includes exact control values. There is no production usability implementation to invoke yet; this is an equivalent calculation of the locked specification.

The source survivors divide into 1,433 PASS and 21 UNCERTAIN. All 21 UNCERTAIN observations fail U in this dataset, but the predicate has no status branch. Crucially, **141 PASS observations also fail U**. No source open observation fails U; the 162 conflicts occur in 37 closed families. Failure counts overlap: J exceeds 55,000 on 84 observations, T exceeds 42,000 on 74, and G1 exceeds four on twelve. G>4 and Uop do not occur among mapped source conflicts.

For the narrower literal-default construct, 234 of the 240 first variations map and 201 pass U. Thus six defaults hit the identity boundary and 33 mapped defaults hit the usability boundary. The representative vocabulary encompasses the entire small primary variation list; it does not falsely label every entry a site's default choice.

| Source / shape low→high | Template | Position / inversion | Exact failing condition | Classic rank / Physical |
|---|---|---|---|---|
| [E v6](https://www.all-guitar-chords.com/chords/index/e/major): 12 14 14 13 12 12 | PT-2f6d6f7b5754 | 12–14; root | T>42000 (value 43177) | 92 / PASS |
| [C#/Db v1](https://www.all-guitar-chords.com/chords/index/c_sharp/major): x 4 3 1 2 1 | PT-4a9813b782fc | 1–4; root | J>55000 (value 66698) | 114 / UNCERTAIN |
| [Cmaj7 v1](https://www.all-guitar-chords.com/chords/index/c/maj7): x x 2 4 1 3 | PT-bc3339490b42 | 1–4; first | J>55000 (value 66698) | 19001 / UNCERTAIN |
| [C7#9 v2](https://www.all-guitar-chords.com/chords/index/c/7*9): 8 10 8 9 11 11 | PT-86aea0eaac82 | 8–11; root | G1>4 (value 5) | 1144 / PASS |

The required [full conflict table](l2-l3-conflicts.md) includes all 162 source-presented survivors, exact variables, source locators, positions/inversions, classic ranks and whether the family conflict is isolated, recurrent or universal across observed placements. The complete six-string 7#9 template PT-86aea0eaac82 has G1=5 and fails U at all twelve observed roots. Its distinct four-string omitted-fifth relative PT-cde9f43e01a5 remains available; it is a different exact template, not a rewritten source grip.

The high-position full E-family example demonstrates a different systematic issue: longitudinal cells narrow higher on the neck, while modeled outer-string separation grows. At E major's 12th-fret allocation, T=43,177 µm excludes an otherwise PASS representative. The upper-four Dm placement x x 12 14 15 13 remains compact (J=35,332; T=26,165; G=4; G1=4), despite classic rank 461. There is no blanket high-position exclusion or automatic high-position rescue. [5]

This audit does **not** override L2. The 162 source conflicts and four extrapolated conflicts retain vocabulary metadata but classify OTHER if the amendment adopts this vocabulary with unchanged U. The 56 identity exclusions are a different boundary: they are not integrated survivors at all. No policy wording should promise those excluded source allocations through All without separately changing structural validity, which is outside this work.

## 9. Exact matching and surface contract

Vocabulary version: **agc-derived-practical-vocabulary-proposal-v1**. Matcher version: **practical-exact-translation-v1**. Both are proposals for adjudication, not active production settings. [proposed-vocabulary.json](proposed-vocabulary.json) is the authoritative exact ID/quality/domain inventory and contains no website assets, prose, finger instructions or mirrored root-by-root source database.

Define V(c) only for a structurally valid survivor after the existing explicit request/view matcher. A vocabulary match is true exactly when:

1. The validated request matches this version's standard tuning, capo 0, standalone identity/no-slash context, supported quality/root and fret domain wholly inside 0–15. Otherwise V=false and normal U-based fallback applies.
2. If any sounding string is open, match one exact open entry with identical quality, root PC and all six states. No open translation or string completion is allowed.
3. Otherwise set p to the minimum positive state. Match one closed entry with identical quality, identical mute mask, every sounding state exactly offset+p, (anchor+p) mod 12 equal to the query root, and p inside its bounds. A/C also require the enumerated exact (rootPC,p) pair; B accepts every in-range pair. These equations preserve the entry's harmonic semantics, which were checked during manifest validation.
4. No entry implies absence of a vocabulary match, not a negative musical-quality assessment. Source-observed metadata is an independent exact-allocation lookup in the research provenance sidecar; it is not implied by V.

The [executable research matcher](../../../../scripts/web-voicing-corpus-v2/sitewide-match.mjs) implements this rule with validated inputs/manifest. Reject malformed/incompatible manifests as a whole before matching: require the exact schema/version, unique IDs, known quality formulas, six integer offsets/states, mask consistency, valid anchors/bounds, exact A/C allowed pairs, preserved harmonic semantics and a pinned deployment artifact hash. On failure, disable the whole priority overlay and retain classic order among U-eligible candidates. Do not repair a corrupt entry silently or fetch source data at runtime.

For each explicit-match survivor, classify internally:

| Class | Exact condition | Reachability |
|---|---|---|
| REPRESENTATIVE | U(c) AND V(c) | Eligible for priority in Recommended |
| FALLBACK | U(c) AND NOT V(c) | Eligible after representatives in Recommended |
| OTHER | NOT U(c), retaining V separately | Reachable in All under the existing explicit filters |

Recommended = classic-v1(REPRESENTATIVE) concatenated with classic-v1(FALLBACK), with the original integer numerator and numeric six-state tie order unchanged within each partition. Pagination scans the entire resulting ordered set. There is no new score, weighting, family quota, near-position override, human-preference claim or cap at the number of source entries. If there are no representatives, the entire eligible list is fallback. If no U-eligible candidates remain, preserve the locked empty result; never widen U to fill cards.

All preserves its existing classic/explicit near-position order and ordinary filters, including an explicit demand filter. **All with demand=any** and matching ordinary/status filters reaches every relevant survivor, including OTHER. No candidate is deleted, relabeled Physical REJECT or moved by vocabulary priority in All. Changing the vocabulary/order version must invalidate Recommended ordering cursors and caches. This priority proposal does change relative presentation between representative and fallback candidates; it is not a neutral metadata overlay.

## 10. Provenance, reuse and unsupported domain

The site's operator identifies itself as All Guitar Chords. The inspected [privacy policy](https://www.all-guitar-chords.com/privacy) and [contact page](https://www.all-guitar-chords.com/contact) do not establish a named dictionary editor, an original library, a manual selection process or an open-data redistribution grant. The privacy page refers to terms, which is not itself a vocabulary license. No operator contact was made. Creation provenance remains UNKNOWN; regular translations establish structure, not authorship. [6]

The handoff is a product-owned abstract mathematical convention: exact high-to-low integer masks/offsets, quality/root relationships, bounded matching rules and a finite exact-open/exception inventory. Research locators and hashes stay separate from production. No source SVGs, audio, prose, finger-number annotations, application bundle or full proprietary database should be shipped. The abstract representation reduces the copying boundary; it is **not a claim of legal clearance or an inferred license**. No rights-cleared reference badge is granted by this audit.

Unsupported site types are: 7sus4, maj11, maj13, maj9#11, maj13#11, add9, 6add9, maj7b5, maj7#5, m6, m11, m13, madd9, m6add9, mmaj7, mmaj9, m7#5, 7b5, 7#5, 7(b5,b9), 7(b5,#9), 7(#5,b9), 7(#5,#9), 9b5, 9#5, 13#11, 13b9, 11b9, sus2sus4, -5. Their 360 pages and 1,265 variation counts remain in the inventory. No confidence is assigned to uncollected allocations in that domain. Within mapped types, the 56 third-omitting ninth observations and their four closed/four open structures remain unadopted. Rootless practical vocabulary, other tunings/capo, slash-specific interpretations, personalized techniques, dynamic execution and anatomical success remain unsupported evidence domains. Vocabulary absence never modifies validity or implies poor quality.

## 11. Recommended Product Policy amendment

Adopt the exact proposed vocabulary as a separate Layer-3 priority convention for the declared twenty-quality/twelve-root domain. Replace Recommended's current reference-neutral ordering clause with the two-part ordering above **only for this practical vocabulary**. Preserve the existing rights-cleared exact-reference overlay as metadata-only with zero priority contribution; do not import the research source catalog into that overlay. Keep U, Physical verdicts, classic arithmetic, explicit matching, All ordering and empty behavior unchanged unless a separate Product Policy decision explicitly amends them.

Adjudicate the conflict table alongside that amendment. Keeping today's U intentionally leaves 162 source observations and four extrapolated placements outside Recommended; twelve complete 7#9 observations form a wholly excluded family. This is a visible product tradeoff, not a research finding that those shapes are unsuitable. The vocabulary remains coherent and supplies at least one compact representative for every comparable query even if all existing L2 cutoffs are retained. No threshold adjustment or source exception is silently embedded in V.

The pilot's seven-query restriction is superseded by this proposal's complete intersection domain. The frozen pilot and earlier study conclusions remain intact as historical evidence. This closes broad source research for Layer 3; the remaining step is product adjudication of these explicit rules and conflicts, not another source search or fitted ranking model. Production code, Product Policy v2 and deployment state are unchanged.

## 12. Reproduction and verification artifacts

The local [reproduction instructions](reproduction.md) identify acquisition, mapping, exact demand, analysis, matching, extrapolation verification and delivery hashing. [verification.json](verification.json) records all 240 census/top-18 controls, every source double-check, all 77 extrapolations, scope rejection checks, 40 frozen-study hash matches, eleven pilot artifact/script matches, and an unchanged Product Policy hash. The separate [delivery manifest](delivery-manifest.json) pins the completed artifact and script bytes. No new model, stochastic fit or sealed holdout was used.

## Sources

1. All Guitar Chords. [Chord tool and instructions](https://www.all-guitar-chords.com/) and [complete chord index](https://www.all-guitar-chords.com/chords/index), accessed 2026-09-13. All 600 exact detail URLs and variation counts are in [page inventory](page-inventory.md); the 240 comparable pages carry individual page/state/SVG hashes in [acquisition.json](acquisition.json).
2. All Guitar Chords. [C major ninth](https://www.all-guitar-chords.com/chords/index/c/maj9) and all mapped maj9/9 root pages. The site's omitted-third allocations are contrasted with the repository's unchanged identity-required-tone rule; no source prose is reproduced.
3. All Guitar Chords. [D major seventh](https://www.all-guitar-chords.com/chords/index/d/maj7), variations 1–2; identical allocation, distinct presentation records.
4. Guitar project. [Product Policy v2, §3](../../../architecture/product-policy-v2.md), [pinned integer geometry table](../../../../src/domain/chord/engine/geometryTable.ts), [contact hypotheses](../../../../src/domain/chord/engine/contactHypotheses.ts), [integrated census](../../../implementation/engine-integrated-census.json). These are frozen internal primary specifications, not new Physical research.
5. All Guitar Chords. [E major](https://www.all-guitar-chords.com/chords/index/e/major), variation 6; [D minor](https://www.all-guitar-chords.com/chords/index/d/minor), variation 4; [C7#9](https://www.all-guitar-chords.com/chords/index/c/7*9), variation 2. Exact mapped differences are calculated using source allocations and the locked internal specifications.
6. All Guitar Chords. [Privacy policy](https://www.all-guitar-chords.com/privacy) and [contact form](https://www.all-guitar-chords.com/contact), inspected 2026-09-13. No dictionary authorship method or open redistribution grant established.

**C. CORE PRACTICAL TEMPLATE VOCABULARY**

