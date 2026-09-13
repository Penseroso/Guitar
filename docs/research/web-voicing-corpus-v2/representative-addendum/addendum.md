# Targeted addendum: representative voicing vocabulary for Layer 3

Date: 2026-09-13. Primary case: [All Guitar Chords](https://www.all-guitar-chords.com/). Integrated baseline: **32f9d3f8a71dc0d2a5f18520bfad738e67ba26c0**. Research and policy handoff only.

The completed [Web Voicing Corpus Study v2](../study.md) remains frozen, including its **CURATED REFERENCE CATALOG ONLY** empirical conclusion. This addendum answers a narrower, different product question. It neither reopens that review nor fits an empirical ranking model.

## Conclusion and interpretation

The case supports a **small, versioned representative template/shape-family policy as an explicit product convention**. It does not establish a learned idiomaticity signal, independent human curation, popularity, preference or physical ease. The proposed first version consists of **16 exact closed templates plus seven observed open allocations kept exact, limited to the seven audited root/quality requests**. Its priority operates only among candidates that already pass Product Policy v2's Recommended usability gate.

The evidence is unusually direct for this construct: the source presents a short list of alternatives by neck position, and the allocations repeatedly instantiate the same identifiable patterns at different roots. All 44 sampled alternatives map to the integrated engine. Five are high-position examples and ten are inversions. Only 16 of the 44 appear in classic-v1's first 18; all five high-position examples fall below that cutoff. A representative vocabulary therefore identifies product-presented alternatives that the deterministic order does not consistently expose early.

This is sufficient to propose a transparent choice of vocabulary. It is **not** evidence that prioritizing it improves user outcomes. Source-observed shapes and product-defined translations must remain distinct facts. The policy decision below owns that extrapolation openly rather than attributing unseen shapes to the website.

## 1. Bounded inspection and observed presentation

The [scope record](scope.md) fixed seven pages before integrated mapping: every variation for C/D/E major, C/D minor and C/D dominant seventh. No other dictionary was acquired and no broad discovery was restarted. One targeted within-site lookup checked CAGED discussion and terms/provenance; it did not add another corpus or source vote.

| Source detail page | Displayed variations | Presentation evidence |
|---|---:|---|
| [C major](https://www.all-guitar-chords.com/chords/index/c/major) | 5 | Open form and four closed positions |
| [D major](https://www.all-guitar-chords.com/chords/index/d/major) | 6 | Open form plus all five major-form patterns |
| [E major](https://www.all-guitar-chords.com/chords/index/e/major) | 6 | Open form plus all five major-form patterns |
| [C minor](https://www.all-guitar-chords.com/chords/index/c/minor) | 4 | One open allocation and three closed forms |
| [D minor](https://www.all-guitar-chords.com/chords/index/d/minor) | 4 | One open allocation and three closed forms |
| [C7](https://www.all-guitar-chords.com/chords/index/c/7) | 10 | Open, movable, reduced-string and inverted variants |
| [D7](https://www.all-guitar-chords.com/chords/index/d/7) | 9 | Corresponding seventh families across positions |

The live home tool was inspected through ordinary browser interaction. After choosing C major, it displayed the open C allocation and selectors 1–5. Selecting 5 displayed the same upper-neck allocation as the detail page. Changing to D major reset the selection to variation 1, the open form, with selectors 1–6; selecting 6 displayed frets 12–15. The diagrams and source instructions agree on physical string orientation and fret numbers. Ads were dismissed only to read the controls; no account, contact form or external message was submitted.

**“First presentation” needs a precise boundary.** The evidence supports membership in the product's short, primary variation vocabulary. It does not say every alternative is the literal first displayed diagram. The initial major diagrams inspected are open forms; high positions require choosing another numbered variation. Nor does the source label its variants “Recommended” or demonstrate their order is preference-ranked. The home instructions relate variants to desired neck position, and the sample generally progresses upward; equal-position seventh variants have different within-position ordering. [Source tool instructions](https://www.all-guitar-chords.com/).

Consequently, the proposed policy is inspired by the short primary vocabulary, not a claim that the site already prioritizes its high variants over its open default. The word “practical” means product-selected representative form under this policy, not measured ease.

## 2. Provenance, origin and reuse boundary

All pages, diagrams, roots and transpositions count as **one All Guitar Chords source family**. The operator is identified as All Guitar Chords in its [privacy policy](https://www.all-guitar-chords.com/privacy); a named dictionary editor, original source library, editorial selection rubric and revision history were not established. The [contact page](https://www.all-guitar-chords.com/contact) is an available contact route, not evidence of authorship. No contact was made.

Original creation/selection provenance remains **UNKNOWN**. The observable output is **template-structured**: corresponding closed allocations translate exactly between roots. That is compatible with manual templates, a generated library, manual selection from generated candidates, or another hybrid pipeline. It is not proof of which pipeline the operator used. Repeated instruction wording and machine-rendered SVGs establish repeatable rendering, not independent manual selection.

The site's [CAGED lesson by Empirism](https://all-guitar-chords.com/lesson.php?id=159) discusses major-form relationships, but it is a user-authored lesson, not documentation of the dictionary's implementation. It is corroborating teaching context within the same site family. The analysis calls the major forms CAGED-like because of their exact allocation relationships; it does not assert that the dictionary's authoring code implements CAGED.

No open dataset redistribution grant was established. The site carries a copyright notice; its privacy page refers to terms without supplying a usable chord-library license in the inspected material. The project retains only the small set of structural facts requested here, URL/variation locators, page and diagram hashes, and our derived analysis. No source diagram files, source prose, audio, whole database or application bundle is stored in the repository. The proposed rule is separately expressed as fret-offset arithmetic; it grants no right to copy the site's assets, text, selection database or branding. A commercial source-data import remains outside this handoff.

The [source observation file](source-observations.json) records 44 rows and all seven page inventories. Each row explicitly has empirical curated-vote eligibility **false**. These product-presentation observations do not silently become a third curated family in v2's training or support counts.

## 3. Extraction, complete mapping and exact results

Every one of the 44 allocations was first transcribed from the public string/fret/strum instructions and independently matched to the corresponding SVG's six explicit circle/mute states and printed fret labels. Barre rectangles did not substitute for actual sounded-string coordinates. All **44/44 diagram-versus-instruction comparisons agree**, including multi-digit frets, muted strings and open strings. SVG orientation labels were checked. Raw assets were read in memory and discarded after extracting facts and hashes.

The unchanged [integrated mapper](../../../../scripts/web-voicing-corpus-v2/engine-map.ts) mapped all 44; none was ambiguous, unsupported, outside fret 15 or structurally absent. The seven complete query universes contain **110,199 request/allocation survivors: 5,689 PASS and 104,510 UNCERTAIN**. All seven query counts match the frozen integrated census. Cache hashes, complete classic-v1 ordering, target identities/ranks and status controls passed. This is a bounded mapping, not a new broad census or reranking benchmark.

All 44 targets are production **PASS** with no production warning reasons, but that does not make them user-validated or automatically eligible for Recommended. All are within retrospective legacy gates; this source adds position diversity without demonstrating expanded-region coverage. Physical-v2 supplies geometry under the GS Mini reference profile, while production Physical uses its own default profile. The existing Product Policy v2 demand gate uses a different declared geometry; do not feed the GS Mini table into that gate or infer demand tiers from PASS.

Exact shapes are written **low E → high E**, with spaces separating multi-digit frets and x muted. Position is minimum–maximum stopped fret. Every row maps to a standalone standard-tuning/no-capo default-fret-15 query. Rank is in the full unchanged integrated classic-v1 order. J/T are Physical-v2 GS Mini full-cell gap/transverse lower bound in mm, not human thresholds. Status is the separate production Physical result. Template names are analytical descriptions, not verified site authoring methods.

| Source variation | Exact shape | Position | Open/closed | Inversion | Classic rank | Physical status | J / T (mm) | Template/family |
|---|---|---:|---|---|---:|---|---:|---|
| [C v1](https://www.all-guitar-chords.com/chords/index/c/major) | x 3 2 0 1 0 | 1–3 | open | root | 8 | PASS | 31.62 / 22.53 | Exact open C |
| [C v2](https://www.all-guitar-chords.com/chords/index/c/major) | x 3 5 5 5 3 | 3–5 | closed | root | 7 | PASS | 28.17 / 30.87 | Major A form |
| [C v3](https://www.all-guitar-chords.com/chords/index/c/major) | x x 5 5 5 8 | 5–8 | closed | second | 5911 | PASS | 48.79 / 25.47 | Major partial G form (second inversion) |
| [C v4](https://www.all-guitar-chords.com/chords/index/c/major) | 8 10 10 9 8 8 | 8–10 | closed | root | 13 | PASS | 21.10 / 42.85 | Major E form |
| [C v5](https://www.all-guitar-chords.com/chords/index/c/major) | x x 10 12 13 12 | 10–13 | closed | root | 591 | PASS | 36.55 / 27.16 | Major D form |
| [D v1](https://www.all-guitar-chords.com/chords/index/d/major) | x x 0 2 3 2 | 2–3 | open | root | 2 | PASS | 0.00 / 14.93 | Exact open D |
| [D v2](https://www.all-guitar-chords.com/chords/index/d/major) | x 5 4 2 3 2 | 2–5 | closed | root | 499 | PASS | 58.02 / 30.92 | Major C form |
| [D v3](https://www.all-guitar-chords.com/chords/index/d/major) | x 5 7 7 7 5 | 5–7 | closed | root | 5 | PASS | 25.10 / 32.35 | Major A form |
| [D v4](https://www.all-guitar-chords.com/chords/index/d/major) | x x 7 7 7 10 | 7–10 | closed | second | 3384 | PASS | 43.46 / 26.33 | Major partial G form (second inversion) |
| [D v5](https://www.all-guitar-chords.com/chords/index/d/major) | 10 12 12 11 10 10 | 10–12 | closed | root | 9 | PASS | 18.80 / 44.24 | Major E form |
| [D v6](https://www.all-guitar-chords.com/chords/index/d/major) | x x 12 14 15 14 | 12–15 | closed | root | 255 | PASS | 32.56 / 27.83 | Major D form |
| [E v1](https://www.all-guitar-chords.com/chords/index/e/major) | 0 2 2 1 0 0 | 1–2 | open | root | 5 | PASS | 0.00 / 14.93 | Exact open E |
| [E v2](https://www.all-guitar-chords.com/chords/index/e/major) | x x 2 4 5 4 | 2–5 | closed | root | 944 | PASS | 58.02 / 23.53 | Major D form |
| [E v3](https://www.all-guitar-chords.com/chords/index/e/major) | x 7 6 4 5 4 | 4–7 | closed | root | 1342 | PASS | 51.69 / 32.40 | Major C form |
| [E v4](https://www.all-guitar-chords.com/chords/index/e/major) | x 7 9 9 9 7 | 7–9 | closed | root | 43 | PASS | 22.36 / 33.67 | Major A form |
| [E v5](https://www.all-guitar-chords.com/chords/index/e/major) | x x 9 9 9 12 | 9–12 | closed | second | 4057 | PASS | 38.72 / 27.09 | Major partial G form (second inversion) |
| [E v6](https://www.all-guitar-chords.com/chords/index/e/major) | 12 14 14 13 12 12 | 12–14 | closed | root | 92 | PASS | 16.75 / 45.47 | Major E form |
| [Cm v1](https://www.all-guitar-chords.com/chords/index/c/minor) | x 3 1 0 1 3 | 1–3 | open | root | 11 | PASS | 31.62 / 30.87 | Exact open Cm |
| [Cm v2](https://www.all-guitar-chords.com/chords/index/c/minor) | x 3 5 5 4 3 | 3–5 | closed | root | 31 | PASS | 28.17 / 30.87 | Minor A form |
| [Cm v3](https://www.all-guitar-chords.com/chords/index/c/minor) | 8 10 10 8 8 8 | 8–10 | closed | root | 1 | PASS | 21.10 / 42.85 | Minor E form |
| [Cm v4](https://www.all-guitar-chords.com/chords/index/c/minor) | x x 10 12 13 11 | 10–13 | closed | root | 461 | PASS | 36.55 / 26.86 | Minor D form |
| [Dm v1](https://www.all-guitar-chords.com/chords/index/d/minor) | x x 0 2 3 1 | 1–3 | open | root | 17 | PASS | 31.62 / 14.40 | Exact open Dm |
| [Dm v2](https://www.all-guitar-chords.com/chords/index/d/minor) | x 5 7 7 6 5 | 5–7 | closed | root | 58 | PASS | 25.10 / 32.35 | Minor A form |
| [Dm v3](https://www.all-guitar-chords.com/chords/index/d/minor) | 10 12 12 10 10 10 | 10–12 | closed | root | 5 | PASS | 18.80 / 44.24 | Minor E form |
| [Dm v4](https://www.all-guitar-chords.com/chords/index/d/minor) | x x 12 14 15 13 | 12–15 | closed | root | 461 | PASS | 32.56 / 27.57 | Minor D form |
| [C7 v1](https://www.all-guitar-chords.com/chords/index/c/7) | x 3 2 3 1 0 | 1–3 | open | root | 25 | PASS | 31.62 / 22.53 | Exact open C7 |
| [C7 v2](https://www.all-guitar-chords.com/chords/index/c/7) | x x 2 3 1 3 | 1–3 | closed | first | 9807 | PASS | 31.62 / 23.05 | C7-derived upper four (first inversion) |
| [C7 v3](https://www.all-guitar-chords.com/chords/index/c/7) | x 3 2 3 1 x | 1–3 | closed | root | 382 | PASS | 31.62 / 22.53 | C7-derived inner four (fifth omitted) |
| [C7 v4](https://www.all-guitar-chords.com/chords/index/c/7) | x 3 5 3 5 3 | 3–5 | closed | root | 10 | PASS | 28.17 / 30.87 | A7 form |
| [C7 v5](https://www.all-guitar-chords.com/chords/index/c/7) | x x 5 5 5 6 | 5–6 | closed | second | 2044 | PASS | 0.00 / 24.69 | Partial G7 form (second inversion) |
| [C7 v6](https://www.all-guitar-chords.com/chords/index/c/7) | x x 8 9 8 8 | 8–9 | closed | third | 3051 | PASS | 0.00 / 25.71 | Upper E7 form (third inversion) |
| [C7 v7](https://www.all-guitar-chords.com/chords/index/c/7) | 8 x 8 9 8 x | 8–9 | closed | root | 46 | PASS | 0.00 / 34.28 | E7 four-string form with internal mute |
| [C7 v8](https://www.all-guitar-chords.com/chords/index/c/7) | 8 10 8 9 8 8 | 8–10 | closed | root | 6 | PASS | 21.10 / 42.85 | E7 form |
| [C7 v9](https://www.all-guitar-chords.com/chords/index/c/7) | x x 10 12 11 12 | 10–12 | closed | root | 136 | PASS | 18.80 / 27.16 | D7 form |
| [C7 v10](https://www.all-guitar-chords.com/chords/index/c/7) | x x 14 15 13 15 | 13–15 | closed | first | 13958 | PASS | 15.81 / 28.20 | C7-derived upper four (first inversion) |
| [D7 v1](https://www.all-guitar-chords.com/chords/index/d/7) | x x 0 2 1 2 | 1–2 | open | root | 2 | PASS | 0.00 / 14.93 | Exact open D7 |
| [D7 v2](https://www.all-guitar-chords.com/chords/index/d/7) | x 5 4 5 3 x | 3–5 | closed | root | 149 | PASS | 28.17 / 23.71 | C7-derived inner four (fifth omitted) |
| [D7 v3](https://www.all-guitar-chords.com/chords/index/d/7) | x x 4 5 3 5 | 3–5 | closed | first | 6584 | PASS | 28.17 / 24.18 | C7-derived upper four (first inversion) |
| [D7 v4](https://www.all-guitar-chords.com/chords/index/d/7) | x 5 7 5 7 5 | 5–7 | closed | root | 6 | PASS | 25.10 / 32.35 | A7 form |
| [D7 v5](https://www.all-guitar-chords.com/chords/index/d/7) | x x 7 7 7 8 | 7–8 | closed | second | 2517 | PASS | 0.00 / 25.63 | Partial G7 form (second inversion) |
| [D7 v6](https://www.all-guitar-chords.com/chords/index/d/7) | 10 12 10 11 10 10 | 10–12 | closed | root | 7 | PASS | 18.80 / 44.24 | E7 form |
| [D7 v7](https://www.all-guitar-chords.com/chords/index/d/7) | 10 x 10 11 10 x | 10–11 | closed | root | 27 | PASS | 0.00 / 35.39 | E7 four-string form with internal mute |
| [D7 v8](https://www.all-guitar-chords.com/chords/index/d/7) | x x 10 11 10 10 | 10–11 | closed | third | 2525 | PASS | 0.00 / 26.54 | Upper E7 form (third inversion) |
| [D7 v9](https://www.all-guitar-chords.com/chords/index/d/7) | x x 12 14 13 14 | 12–14 | closed | root | 344 | PASS | 16.75 / 27.83 | D7 form |

## 4. Reusable shape and template relationships

The 37 closed observations collapse to **16 quality-conditioned physical families**: five major, three minor and eight dominant-seventh. Every closed family occurs at **at least two distinct sampled roots**, but all such repetitions remain one source's repeated use of a pattern. The seven open observations stay exact. Neither 44 rows nor 16 families means 44 or 16 independent human endorsements.

The major closed set consists of C, A, partial G, E and D forms. The partial G allocation uses only the upper four strings and is a **second inversion**, not a full six-string G grip. The minor set has A-, E- and D-derived forms. Seventh variants include first/second/third inversions, an inner-four form omitting the fifth, and a four-string form with an internal mute. Those distinctions must not be erased by a generic “CAGED” tag or by filling omitted strings.

For example, the C/D/E major A forms have the same mute mask and relative frets, at translations 3, 5 and 7. The major D form repeats at translations 2, 10 and 12. The C7 first-inversion upper-four form also repeats an octave within C7 and translates to D7; that is useful evidence of a reusable allocation pattern, not an additional independent vote.

These are exact same-string translations. No finger reassignment, string-set substitution, quality alteration, octave redistribution within the chord, arbitrary extra mute or root omission is implied. Open-to-closed conversion is not generalized: the seven observed open forms remain a separate exact table.

## 5. What gap this fills—and what remains absent

The completed v2 curated sample had no target with minimum stopped fret ≥11. This case contributes **five such explicitly presented targets**, listed below. It also has 28 targets whose maximum fret exceeds 5, and ten inversions. Only eight of the 44 targets reach classic's first six and 16 reach its first 18. These are descriptive access counts, not retrieval accuracy or user preference metrics.

| High target | Minimum–maximum fret | Classic-v1 rank | Full-cell gap / transverse bound, mm |
|---|---:|---:|---:|
| D major v6 | 12–15 | 255 | 32.56 / 27.83 |
| E major v6 | 12–14 | 92 | 16.75 / 45.47 |
| D minor v4 | 12–15 | 461 | 32.56 / 27.57 |
| C7 v10 | 13–15 | 13,958 | 15.81 / 28.20 |
| D7 v9 | 12–14 | 344 | 16.75 / 27.83 |

The position gap is filled **for the public-product-presentation construct**. It does not repair the original v2 independent-curation benchmark: origin remains unknown and the observations all come from one product. Rootless forms, one-to-three-string sparse forms, alternate tunings, other qualities, production UNCERTAIN and expanded-region targets remain absent. No protected generalization or human ease conclusion follows. The high E-major transverse value also illustrates why being a displayed familiar template must not override the separately chosen usability gate.

## 6. Smallest operational handoff to Product Policy v2

Proposed version: **representative-vocabulary-proposal-v1**. The machine-readable [proposed vocabulary](proposed-vocabulary.json) is an adjudication input, not a runtime bundle. No training, coefficient fitting, new ranking model, UI design or production implementation is included.

**Scope.** Six single strings, standard high-to-low tuning [64,59,55,50,45,40], capo 0, default maximum modeled fret 15, standalone context, identity realization, no explicit slash request, and exactly **major roots C/D/E, minor roots C/D, dominant-seventh roots C/D**. Explicit user constraints always apply first. Outside these seven root/quality pairs or any other part of this domain, the vocabulary reports no match and existing Recommended behavior remains unchanged.

The root restriction is deliberate. Extending closed templates to every root while retaining only seven sampled open forms could prioritize closed E-minor, A-minor or G-major forms ahead of familiar open allocations absent from this sample. The initial version avoids that asymmetric extrapolation. Extending the root domain requires an explicit new vocabulary version with a reviewed open-form policy; no additional source discovery or extension was performed here.

**Vocabulary match.** Match one of the seven exact open records in the observation table, with its exact root and quality, or match one of the closed templates below. For a closed template, choose an integer translation p from 1 through 15 minus the largest offset. Every nonmuted string must equal p plus its listed offset; every x must remain muted. Require the exact listed quality and query root PC = (a+p) mod 12, using C=0. Existing structural validity and explicit filters remain mandatory.

| ID | Quality | Relative offsets, high E → low E | Root anchor a | Translation p | Form |
|---|---|---|---:|---:|---|
| T01 | major | 0, 2, 2, 2, 0, x | 9 | 1–13 | Major A form |
| T02 | major | 3, 0, 0, 0, x, x | 7 | 1–12 | Major partial G form (second inversion) |
| T03 | major | 0, 0, 1, 2, 2, 0 | 4 | 1–13 | Major E form |
| T04 | major | 2, 3, 2, 0, x, x | 2 | 1–12 | Major D form |
| T05 | major | 0, 1, 0, 2, 3, x | 0 | 1–12 | Major C form |
| T06 | minor | 0, 1, 2, 2, 0, x | 9 | 1–13 | Minor A form |
| T07 | minor | 0, 0, 0, 2, 2, 0 | 4 | 1–13 | Minor E form |
| T08 | minor | 1, 3, 2, 0, x, x | 2 | 1–12 | Minor D form |
| T09 | dominant-7 | 2, 0, 2, 1, x, x | 11 | 1–13 | C7-derived upper four (first inversion) |
| T10 | dominant-7 | x, 0, 2, 1, 2, x | 11 | 1–13 | C7-derived inner four (fifth omitted) |
| T11 | dominant-7 | 0, 2, 0, 2, 0, x | 9 | 1–13 | A7 form |
| T12 | dominant-7 | 1, 0, 0, 0, x, x | 7 | 1–14 | Partial G7 form (second inversion) |
| T13 | dominant-7 | 0, 0, 1, 0, x, x | 4 | 1–14 | Upper E7 form (third inversion) |
| T14 | dominant-7 | x, 0, 1, 0, x, 0 | 4 | 1–14 | E7 four-string form with internal mute |
| T15 | dominant-7 | 0, 0, 1, 0, 2, 0 | 4 | 1–13 | E7 form |
| T16 | dominant-7 | 2, 1, 2, 0, x, x | 2 | 1–13 | D7 form |

The template table is in **high E → low E** order, unlike the human-readable source table above. Its zeros are relative stopped-fret offsets, **not open strings**; p is always positive. The seven open exceptions are exactly C major x32010, D major xx0232, E major 022100, C minor x31013, D minor xx0231, C7 x32310 and D7 xx0212 in low-to-high notation. Do not transpose these open exceptions, add the full G grip, invent omitted-string variants or infer templates for another quality.

Applying these 16 fixed templates over their declared integer range describes 207 closed allocations before the seven-query root filter; **39 closed allocations remain within the proposed scope**, plus the seven exact open exceptions. The arithmetic was checked for root/third and, for sevenths, seventh consistency; no outside-formula pitch appears. That check is **not** a claim that the website presents all 207, that all pass the engine/usability gate, or that they were empirically evaluated. Relative fret/mute patterns are preserved under translation; millimetre geometry changes and must be assessed separately at each position.

The 46 scoped vocabulary allocations contain the 44 observed shapes and **two explicit product extrapolations**: C major x 15 14 12 13 12 and C7 x 15 14 15 13 x, both written low-to-high. Neither occurs in the respective inspected source list. This is evidence that the site's list is not simply exhaustive expansion of every observed template through fret 15. The proposed rule deliberately treats the same closed family at an octave translation consistently; it does not attribute those two shapes to the site or interpret their source absence as rejection. They have only formula/pattern checks here, with structural and usability eligibility still mandatory if the policy is adopted. Template IDs, masks, offsets, roots, domain and source observation links are fully versioned.

**Classification and priority.** Let M be the complete explicit matching set of current engine survivors, U(c) the unchanged Product Policy v2 Recommended usability predicate, and V(c) the exact vocabulary match above:

| Internal class | Exact condition | Consequence |
|---|---|---|
| REPRESENTATIVE | c ∈ M, U(c), V(c) | Eligible for the priority partition of Recommended |
| FALLBACK | c ∈ M, U(c), not V(c) | Eligible for the remaining Recommended partition |
| OTHER | c ∈ M, not U(c) | Remains reachable in All with demand=any and matching explicit filters |

Retain V(c) as separate factual policy metadata even when a matching template is OTHER. A template never bypasses usability. PASS/UNCERTAIN remains a separate Physical field and is not a branch in this classification. FALLBACK carries no lower musical-quality verdict, although it does create a real relative presentation disadvantage behind REPRESENTATIVE. That is the explicit product tradeoff, not evidence that unlisted candidates are worse. If no REPRESENTATIVE survives the request and gate, Recommended uses FALLBACK alone; if neither survives, preserve the existing empty Recommended behavior. Never relax the gate to fill cards.

Order Recommended as **classic-v1(REPRESENTATIVE), followed by classic-v1(FALLBACK)**, with unchanged classic arithmetic and numeric tuple ties within each partition. Paginate the complete concatenation. This is a surface-priority rule, not a new classic score or empirical residual. Add no position quotas, family-frequency weights or arbitrary score bonuses. It does not guarantee one example at every neck position on the first page; that stronger diversity policy is not needed for this smallest handoff and is not justified here. All voicings preserves its existing ordinary and demand filters and ordering. With demand=any and matching explicit filters, All reaches every member of M, including OTHER; explicit demand filters continue to narrow that view as currently specified. No implicit vocabulary filter is added.

If the vocabulary is unavailable, invalid or incompatible, disable the entire priority overlay and preserve the existing Recommended usability gate and classic ordering. No network lookup, partial manifest, empirical fallback or candidate deletion is allowed. A normal unmatched shape is not an error. A vocabulary revision that changes membership/priority must version Recommended ordering caches/cursors; exact source-attribution metadata remains separate and must not credit an unobserved translation as source-observed.

## 7. Relationship to the current lock and the empirical conclusion

The existing [Product Policy v2 lock](../../../architecture/product-policy-v2.md) states that exact reference presence is metadata only, contributes zero priority and leaves Recommended in classic order. That file was not edited. If this handoff is adopted later, it would require an explicit, narrowly scoped amendment: **a separate product-owned representative vocabulary may partition Recommended ahead of its usability-eligible fallback**. It would not turn the existing six-row rights-cleared reference overlay into a ranking signal or alter that overlay's attribution rules. Its source metadata remains neutral; the versioned product vocabulary owns priority.

This distinction also preserves the completed empirical decision. One product is enough to document a presentation pattern and motivate a transparent product convention; it is not enough to estimate independent canonicality, broad idiomaticity or player preference. The argument for C is the short primary presentation set, exact cross-root template reuse, successful integrated mapping and additional neck positions. It is not the size of the row count, repetition frequency, a fitted retrieval gain or an assumption that presented means easy.

The policy is deliberately limited to audited forms and three qualities. Its translations are a declared design choice, not empirically validated generalization. No production code, locked policy text, physical thresholds, candidate admission, classic-v1 term, All-voicings order or completed study artifact was changed.

## 8. Reproduction and verification

[Source observations](source-observations.json), [mapping analysis](mapping-analysis.json), [proposed vocabulary](proposed-vocabulary.json) and [contract checks](contract-checks.json) provide the compact evidence. Complete mapping rows, full ordered candidate caches and the seven-query verification are retained under the private research directory. The acquisition script reads only the seven fixed pages and their linked diagrams, compares independent transcriptions, and retains no source assets. It does not crawl the full dictionary.

From the project root, the work used:

```powershell
node scripts/web-voicing-corpus-v2/acquire-representative.mjs
node --import tsx scripts/web-voicing-corpus-v2/engine-map.ts docs/research/web-voicing-corpus-v2/representative-addendum/source-observations.json .research/web-voicing-corpus-v2/representative-addendum-mapping
node scripts/web-voicing-corpus-v2/verify-mapping-artifacts.mjs .research/web-voicing-corpus-v2/representative-addendum-mapping
node scripts/web-voicing-corpus-v2/analyze-representative.mjs
node scripts/web-voicing-corpus-v2/representative-contract.mjs
```

Reproduce in a separate output/workspace to preserve the recorded acquisition snapshots; live source bytes may change. No evaluator or model-fitting script was run. There were 44 exact SVG/prose comparisons, 44 integrated target matches, seven complete-universe checks and 207 finite template/formula checks. These verify extraction and contract arithmetic, not human outcomes or product success. Final integrity checks also confirm the frozen study, existing research files, Product Policy v2 and tracked production remain unchanged.

**C. REPRESENTATIVE TEMPLATE / SHAPE-FAMILY POLICY**
