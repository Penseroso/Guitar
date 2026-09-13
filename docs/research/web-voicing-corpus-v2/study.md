# Web Voicing Corpus / Empirical Layer Study v2

Research date: 2026-09-13. Integrated baseline: **32f9d3f8a71dc0d2a5f18520bfad738e67ba26c0**. Research only.

## 1. Executive conclusion

The evidence supports an attributed catalog of deliberately presented guitar shapes, with exact source-presence facts and explicit gaps. It does **not** justify a canonicality score or empirical ranking signal for the later Joint Product Policy Adjudication.

Two conservative curated source families supplied 51 normalized observations; 47 map confidently to the integrated engine. Four exact interpreted shapes occur in both families when teaching context is removed. The usable observations cover seven qualities, all in low positions, all containing the root, all production PASS, and all inside retrospective legacy gates. The larger open-reference arm preserves 7,070 records, but none of its three acquired sources establishes the original manual selection needed to count as curated evidence.

A fixed exploratory feature residual improves source-held-out Recall@6 from **44.18% to 46.52%**, with **Recall@18 unchanged at 64.91%**. The gains repeat two Kansas examples across holdout tracks. This is limited positive evidence of retrieval transfer, not a demonstrated general-purpose model. High-position, rootless, UNCERTAIN and expanded-region protection cannot be evaluated in the curated sample. A source-support gate correctly falls back to classic-v1 in every source-held-out and joint source/family trial. The family-lookup diagnostic also causes observed retrieval losses under family withholding.

This decision follows from provenance, independence, coverage, transfer and displacement evidence. Missing human preference labels limit interpretation; they are not the sole reason for declining a stronger empirical signal. The generator, live Physical, classic-v1, presentation and product dependencies remain unchanged.

## 2. Exact baseline and scope

The [Scope Check](scope-check.md) preceded execution and fixes the question, baseline, frozen prior decision, integrated universe, Physical-v2 role, permitted evidence, non-goals and stopping criteria. Initial tracked files were clean. Existing Physical Envelope v2 research was contextual input and was not edited.

The baseline pipeline is request compilation → Structural Generator → Physical assessment → deterministic classic-v1 → presentation/pagination. This study calls that integrated path offline. It does not substitute the old exploration pool or change request defaults. Direct comparisons use six physical strings, standard tuning, no capo and the default maximum fret of 15. Other records remain in the inventory with reasons for exclusion.

The target construct is **deliberately taught, selected or presented voicings**. That differs from notated song usage, actual performance frequency, player preference and physical ease. A diagram's existence alone establishes none of those other constructs.

## 3. Relationship to the frozen Empirical review

The earlier [Empirical / Ranking Layer review](../../../.research/empirical-ranking-review/decision.md), based on a79007f0919b5b7f34657caa99f6d30a787c2a49, concluded **USE EMPIRICAL OFFLINE ONLY**. That decision remains frozen. Its DadaGP work showed strong exact retrieval and some feature transfer alongside protected high-position problems. Those outcomes are historical evidence, not measurements on this integrated candidate universe.

This study asks a different evidence question: whether authored public voicing material establishes an independent curated construct. It does not retry DadaGP lookup under a new name, merge its votes with teaching sources, or fit a deliberately weak deterministic comparator to make an empirical method appear useful. The primary comparator is the current integrated classic-v1 implementation.

## 4. Source discovery methodology

Independent educational and structured-data discovery covered manual dictionaries, institutional/open teaching, author lessons, product collections, open repositories, song corpora and explicit generators. Search combinations included guitar/chord/voicing with Creative Commons, open textbook, manually selected fingerings, jazz, inversions, source code and dataset provenance. Primary owner pages, repository files/history, institutional metadata and asset licenses supplied final evidence. Search results were leads, never votes.

The [educational discovery log](educational-discovery.md), [open-source provenance audit](open-provenance.md) and [supplemental manifest](supplemental-sources.json) retain searches, source decisions, access failures and primary URLs. Discovery repeatedly encountered known upstream libraries, mirrors, generators, commercial teaching sources without established reuse permission, or interfaces whose shape origins were unknown. Acquisition stopped after these material source classes and failure modes were established. This is bounded practical saturation, not an exhaustive census of the web.

Additional common open chords would mainly increase rows. A verified independent source covering high positions, rootless accompaniment and sparse voicings could materially change the coverage conclusion; such a source would warrant a new acquisition version. The study does not claim no such source exists.

## 5. Source inventory

The unified [source manifest](source-manifest.json) and [lineage registry](lineage-registry.json) are the complete candidate audit, including metadata-only and rejected sources. Component inventories contain 15 structured/open entries, 11 educational entries and 8 supplemental entries: **34 entries, 33 deduplicated sources and 26 provisional lineage buckets** after merging the repeated JGuitar record and aligning known families. These buckets include unknown, generated and unusable sources; they are not counts of independent curated evidence. **Two operational source families contribute curated observations.**

| Acquired source view | Full retained rows | Mapped rows | Evidence role |
|---|---:|---:|---|
| Kansas, Matney/Niemuth handbook | 39 | 35 | Curated teaching; one family |
| Wikibooks Jazz, verified Sluffs diagrams | 6 | 6 | Curated teaching; Wikimedia family |
| Wikibooks Open Chords, explicit prose | 6 | 6 | Curated teaching; same Wikimedia family |
| tombatossals/chords-db | 3,283 | 1,193 | Product/reference; original selection UNKNOWN |
| ChordPro guitar configuration | 1,155 | 498 | Product/reference; original selection UNKNOWN |
| UCI Guitar Chords Finger Positions | 2,632 | 0 | Incomplete allocation representation; origin UNKNOWN |

The curated 51-row inventory and the 7,070-row reference inventory are distinct research views. Neither is “the web corpus.” Wikimedia additionally has a 24-occurrence jazz-image acquisition inventory: six acquired and 18 unavailable after HTTP 429 responses. The six prose observations are additional, not successful acquisitions from those 18 missing images.

## 6. Provenance and licensing

The authored [Kansas handbook](https://hdl.handle.net/1808/29433) is licensed CC BY-NC 4.0 subject to exceptions. The retained chapter-diagram facts include attribution and page provenance; the original PDF and rendered pages were kept outside the repository. The normalized research adaptation has a noncommercial restriction. No blanket commercial permission follows from institutional hosting.

The selected [Wikibooks Jazz lesson](https://en.wikibooks.org/w/index.php?title=Guitar/Jazz&oldid=3931946) deliberately presents voicings. The acquired [Sluffs diagrams](https://commons.wikimedia.org/wiki/File:G_major_jazz_chord_for_guitar_(root).png) have individually verified public-domain declarations. The [Open Chords prose revision](https://en.wikibooks.org/w/index.php?title=Guitar/Open_Chords&oldid=4212611) has separate attribution/ShareAlike obligations. The mixed catalog therefore has no single permissive commercial license.

[chords-db](https://github.com/tombatossals/chords-db) is MIT licensed, [ChordPro](https://github.com/ChordPro/chordpro) uses Artistic-2.0, and [UCI 575](https://archive.ics.uci.edu/dataset/575/guitar%2Bchords%2Bfinger%2Bpositions) states CC BY 4.0. Pinned acquisitions and licenses are recorded in [open-acquisition-lock.json](open-acquisition-lock.json). Permission to retain data does not establish manual authorship or independence.

Commercial dictionaries and lessons were retained as provenance metadata when usable allocation rights were not established. For example, [Dirk Laukens' authored dictionary](https://www.jazzguitar.be/blog/jazz-guitar-chord-dictionary/) has useful jazz coverage but states all rights reserved. [String Warrior's license](https://stringwarrior.com/license) excludes compiled libraries from its asset/widget grant. [Fender's terms](https://www.fender.com/policies/terms-of-service) were not adopted as permission to extract its product database. The audit records the material actually accessible and the relevant uncertainty; it does not provide a general legal opinion.

## 7. Manual, generated, imported and unknown origins

| Class | Operational evidence | Treatment |
|---|---|---|
| Manual selection evidenced | Named authored lesson, deliberate sequencing or selected chapter example | Eligible source class, subject to rights and item normalization |
| Generated | Explicit calculator, constrained enumeration or generated dataset | Comparison/provenance only; zero human-curation votes |
| Imported/hybrid | Credited upstream data, generated additions or mixed method | Preserve component lineage; do not credit the wrapper as independent |
| UNKNOWN | Diagram display, app defaults, edits or open license without original selection evidence | Reference only; never silently promoted |

[JGuitar](https://jguitar.com/) explicitly calculates shapes dynamically. [Flavia Gaglio's voicings project](https://github.com/flaviagaglio/voicings) combines CAGED seeds with constrained generation; its displayed variants are not independent human selections. [IDMT's chord dataset](https://www.idmt.fraunhofer.de/en/publications/datasets/chords.html) describes generated barre-chord recordings and remains a separate audio/generation construct.

chords-db has human maintenance and corrections, but that does not resolve how the original collection was selected. ChordPro's maintained defaults likewise do not establish their original curation process. The [Siege Analytics library](https://github.com/siege-analytics/musescore4-chord-library-plugin) required special caution: its claims of hand curation coexist with calculated and chords-db tags, 408 six-string versus 412 seven-string entries, copyrighted-method references and conflicting license surfaces. Only provenance and structural aggregate findings were retained. Open-source availability is not a substitute for this audit.

## 8. Source families and lineage

Known relationships are grouped before counting support:

| Operational family or relationship | Treatment |
|---|---|
| Kansas handbook, mirrors, companion/redistributed copies | One authored-work family |
| Wikibooks, Commons assets, language reuse and diagram authors | One conservative Wikimedia family |
| tombatossals → chordbook fork / vendored guitar-practice / ChordMiniApp | One upstream dataset family |
| JGuitar → T-vK/chord-collection → szaza filtered collection | Generated/import lineage; szaza also credits chords-db |
| Standard Guitar / former Awesome Guitar Solo | Same product lineage, origin UNKNOWN |
| String Warrior sister network | Same network; no independent page votes |
| bjesus/chords → credited BrageFuglseth/Fretboard | Imported lineage, unresolved original selection |

The open audit found 258 shared physical allocations between chords-db and ChordPro before integrated mapping. Common shapes alone prove neither copying nor independent selection. Exact order, explicit upstream credits, common errors and file identity provide stronger lineage evidence. A multi-parent importer must not manufacture a new independent vote.

Kansas and Wikimedia are two operational families with no documented direct copying identified. Shared teaching traditions may still correlate their choices. Two website families are not two random samples from a population of guitarists. Family IDs and uncertainty are retained so later lineage evidence can merge counts without losing source citations.

## 9. Normalization schema

The [normalization contract](normalization-schema.md) and [engine method](engine-method.md) document actual fields and source adapters. Each inventory row retains source/family ID, raw label, attribution, extraction confidence, source context and native data. The comparable allocation is six absolute nut-relative fret states in **high E → low E** order: −1 muted, 0 open, positive integer stopped. Standard tuning MIDI is [64,59,55,50,45,40]. Null means unresolved, not a muted string, capo zero or an empty chord.

Confident interpretation records engine quality, root pitch class and explicit slash-bass obligation where present. Actual MIDI, bass/top, pitch classes, omissions and allocation identity are derived from tuning and frets. Source finger numbers and source difficulty/category remain metadata; neither becomes a fret coordinate or a human difficulty target. Context mapping is a declared research interpretation, not evidence of the author's preference ranking.

For chords-db, positive relative frets receive baseFret−1 before orientation reversal; all 3,283 reconstructed MIDI arrays match the source. Its capo flag describes barre drawing, not a physical capo. ChordPro aliases remain inventory records while duplicate interpreted allocations cannot multiply source votes. UCI's finger-position labels and note names do not provide absolute frets/octaves; all 2,632 records retain unresolved allocation fields.

Exact identity includes tuning, capo and every physical string state. Query identity also includes interpretation, root, context and slash requirements. Closed shape families subtract the minimum stopped fret while preserving string/mute topology. Shapes with open strings remain exact because a fret shift changes the open-string affordance. This physical-family definition is intentionally limited; it is not a claim about interchangeable harmony or hand technique.

## 10. Mapping quality and exclusions

All 51 curated inventory rows are accounted for: **47 mapped, four ambiguous exclusions**. The Kansas C9 diagram x32033 lacks a dominant seventh; it was not silently relabeled Cadd9. Three diminished diagrams each name several harmonic uses and remain single grouped ambiguous observations. Kansas Dm x00231 retains its open A bass. No familiar replacement shape was substituted. The separate Wikibooks Dm xx0231 remains a distinct observation.

An initial parser recognized maj7/M7 but omitted the literal spelling Maj7. Before the evaluation run, that narrow alias was corrected against the registry, taking curated mapping from 44 to 47. Raw labels were unchanged. [notation-corrections.json](notation-corrections.json) identifies the earlier snapshot and final mapper. The reference arm has no affected Maj7 rows. No model was retuned after this correction.

The reference audit preserves **5,379 exclusions**. Reason occurrences include 2,632 unresolved fret arrays/capos, 2,374 unsupported-quality flags, 966 non-formula slash compiler exclusions, 102 compiled-but-structurally-absent allocations and 41 source-label/pitch mismatches; reasons overlap and must not be summed as distinct rows. Detailed missing-tone and slash-bass reasons are in [analysis.json](analysis.json) and the row-level mapping logs.

Unsupported formulas, alternate tuning, unknown capo and ambiguous labels are outside the comparable view, not negative observations. Valid-query targets absent from generation would remain retrieval misses; ambiguity is never coerced into a query to inflate success. The core has no structurally absent target after confident normalization.

## 11. Corpus composition and coverage

| Curated mapped composition | Count |
|---|---:|
| Source-family/context/shape observations | 47 |
| Distinct interpreted shapes with context removed | 43 |
| Qualities | 7 |
| Open / closed | 30 / 17 |
| Four / five / six sounding strings | 15 / 15 / 17 |
| Root bass / inversion | 42 / 5 |
| Accompaniment / standalone declared context | 41 / 6 |
| Low position, maximum fret ≤5 | 47 |
| High position, minimum stopped fret ≥11 | 0 |
| Rootless / production UNCERTAIN / expanded-region targets | 0 / 0 / 0 |

The qualities are major, minor, dominant seventh, minor seventh, sus4, major seventh and major sixth. There are no sparse one-to-three-string examples, and only single examples of some qualities. The teaching context is heavily weighted toward open/root-position accompaniment. Equal-source evaluation reduces row-count dominance but cannot repair this selection bias or separate genre from source identity.

The reference arm maps 1,691 native rows to 1,339 distinct query/shape targets. It includes 70 UNCERTAIN native rows and 37 native rows outside retrospective legacy gates; its 65 high-position examples are counted after query/shape deduplication. These wider regions are useful mapping diagnostics. UNKNOWN provenance prevents using them to fill the curated model's missing validation cells.

## 12. Exact-shape canonicality

The [canonicality output](evaluation-summary.json) supports exact **presence facts**, not a population frequency. With context removed but chord interpretation retained, E major 022100, A major x02220, and G major 320003/320033 each occur in both curated families. These familiar notation strings are low-to-high for reading; stored arrays remain high-to-low. The other 39 interpreted shapes have one observed family. With declared query context retained, all 47 observations have one family: repeated open shapes occur in different context views.

These four overlaps are meaningful evidence that both sources present those allocations. They do not establish ordinal HIGH/MODERATE/LIMITED bands, a calibrated canonicality measure or a default-order preference. An initial chapter example and a lesson variation are not interchangeable “primary recommendation” labels. Source presentation roles are retained individually rather than inferred from array order.

The exact residual changes no aggregate Recall@6 or Recall@18 in the tested holdouts. No held-out target has exact training support under its full query/context key. Exact lookup can still move competing candidates, so equal target recall is not proof that the entire order is unchanged. Absent support means **unobserved in this acquired, versioned view**, never non-canonical or invalid.

## 13. Shape-family analysis

There are 43 quality-conditioned closed-normalized/open-exact family keys. Four open-exact keys have support from both curated source families; no closed transposition-normalized family does. The four shared keys are the exact open shapes described above, so family normalization adds no independent cross-source replication beyond those exact matches. Physical-family withholding removes matching physical patterns globally across roots, qualities and contexts before fitting, preventing a transposed or relabeled held-out family from surviving in training. Model support keys remain quality-conditioned.

The family residual offers no robust transfer result. Under source withholding it changes Recall@6 from 44.18% to 44.11%, despite improving NDCG@6. Under global-family and joint withholding it reduces Recall@6 from 43.93% to 39.64% (**−4.29 percentage points**). A missing held-out family receives no boost while competing observed families do. This is an observed example of unsupported-target displacement, not evidence that the missing family is undesirable.

## 14. Feature-level idiomaticity evaluation

The [fixed exploratory protocol](evaluation-protocol.md) specifies 13 categorical descriptors: stopped position, top MIDI register, open count, sounding-string count, root bass, bass degree, top degree, root presence, pitch-class doubling, formula omissions, pitch-span octave bin, internal string gaps and pitch crossing. Exact allocations, root IDs, query IDs, source IDs and family IDs do not enter the feature vector. Physical status and Physical-v2 geometry are excluded from the model and retained for diagnostics.

Each training source family contributes at most one vote per observed feature value. The residual averages those source-support fractions and adds at most ten classic score points. It has no fitted coefficients, hyperparameter search, preference target or calibrated probability. Correlated features can count related evidence repeatedly; the model is a deliberately transparent candidate, not a claim that these are independent causes or an optimal feature set. Geometry, richer topology and context/quality interactions were inspected as slices or support domains; the sample did not warrant fitting a more flexible interaction model.

All rows below compare a fixed arm with its paired classic control. Recall percentages use equal source weight after averaging source/trial/query contexts. NDCG@6 uses binary held-out presented-shape relevance. Family tracks create different context units from source tracks, so absolute metric levels must not be compared across tracks.

| Withholding track | Arm | Recall@6 | Recall@18 | NDCG@6 |
|---|---|---:|---:|---:|
| Source family | classic-v1 | 44.18% | 64.91% | 0.3235 |
| Source family | Exact diagnostic | 44.18% | 64.91% | 0.3235 |
| Source family | Family diagnostic | 44.11% | 64.91% | 0.3717 |
| Source family | Feature exploratory | **46.52%** | 64.91% | 0.3428 |
| Source family | Feature support-gated | 44.18% | 64.91% | 0.3235 |
| Global physical family | classic-v1 | 43.93% | 67.86% | 0.3097 |
| Global physical family | Exact diagnostic | 43.93% | 67.86% | 0.3097 |
| Global physical family | Family diagnostic | 39.64% | 67.86% | 0.2912 |
| Global physical family | Feature exploratory | **46.79%** | 67.86% | 0.3341 |
| Global physical family | Feature support-gated | 46.79% | 67.86% | 0.3323 |
| Joint source + physical family | classic-v1 | 43.93% | 67.86% | 0.3097 |
| Joint source + physical family | Exact diagnostic | 43.93% | 67.86% | 0.3097 |
| Joint source + physical family | Family diagnostic | 39.64% | 67.86% | 0.2912 |
| Joint source + physical family | Feature exploratory | **46.79%** | 67.86% | 0.3295 |
| Joint source + physical family | Feature support-gated | 43.93% | 67.86% | 0.3097 |
| Chord quality | classic-v1 | 44.18% | 64.91% | 0.3235 |
| Chord quality | Exact / family diagnostic | 44.18% | 64.91% | 0.3235 |
| Chord quality | Feature exploratory | **45.74%** | 64.91% | 0.3457 |
| Chord quality | Feature support-gated | 44.18% | 64.91% | 0.3235 |

The source/family/joint Recall@6 gains repeat the same two Kansas targets: F major 133211 moves rank 7→6 and F7 131211 moves 7→5. Quality withholding improves only F7. These are not independent replications of a broad effect. Recall@18 improves in none of the tracks. No untouched confirmatory set exists, and two source families cannot support credible population uncertainty estimates.

The support gate requires two training families in the same quality and declared context. Source/joint withholding leaves one family, and quality withholding leaves none in that quality, so the gated order is exactly classic. Global-family withholding can retain both source identities; its gated gains therefore do not independently establish new-source transfer. The gate is an abstention control, not validated deployment confidence.

## 15. External-evidence audit of classic-v1

The integrated [classic-v1 implementation](../../../src/domain/chord/engine/deterministicRanking.ts) uses 14 explicit ledger terms and integer ranking with deterministic physical-tuple ties. The mapper verifies its complete order and ledger totals. On the 47 curated rows, 25 are in the first six and 36 in the first 18; raw target rank median is 6, 90th percentile 155, maximum 6,156. These row summaries differ intentionally from the source-balanced context metrics above.

| Term group | Observed agreement or tension | What can be concluded |
|---|---|---|
| Stopped position, open texture | All targets receive +10 position; 30 receive an open contribution | Agreement with this low/open teaching sample; no evidence for high-position penalties |
| Root presence, root bass | All targets have root; 42 get positive root-bass contribution, five negative | Strong corpus bias; rootless tradeoff untested and inversions disadvantaged |
| Root-location hint | Positive for 45 rows, negative for two | Descriptive alignment only; hint weight not independently validated |
| Span envelope, group economy, grouped contacts | Positive span contribution on all; group-economy negative on 42, contact-size negative on 12 | Taught examples can incur these engineering penalties; no calibrated ergonomic inference |
| Diagonal pattern, adjacent gaps | Four positive diagonal cases; six negative adjacent-gap cases | Too sparse/correlated for coefficient adjudication |
| Optional coverage, ringing density | Positive on 46 and 37 rows respectively | Alignment with dense teaching material; sparse-voicing treatment unresolved |
| Isolated internal gap, core-string gap | Neutral on all 47 | No external validation of those penalties in the core |

The six acquired jazz examples rank 37–6,156, with none in the first 18, while the six Wikibooks open-prose examples all reach the first 18. All five inversions miss the first 18, including the source-faithful Kansas Dm with A bass. This identifies a real mismatch between taught alternatives and the baseline's preferred low/open/root-bass forms. It does not identify a single culpable coefficient: ledger contributions are correlated, the sample is selective, and no counterfactual human ordering is observed. No deterministic alternative was fitted or proposed from these 47 rows.

## 16. Integrated candidate universe and displacement

The curated mapping enumerates **39 requests and 999,184 request/allocation survivors**: 58,674 PASS and 940,510 UNCERTAIN. All 47 curated targets are PASS. Every query's counts match the corresponding integrated census, and full integer sorting reproduces the runtime first page. The separate reference audit enumerates 349 requests and 6,417,643 survivors, including 240 default queries matched to the census and 109 explicit-slash queries. These totals overlap; they must not be added as distinct allocations.

The evaluator executes 99 withholding trials and verifies **880 complete ranked-list permutations** across the five arms. Candidate identity and Physical status are conserved; unsupported-domain fallback is exact. The retrospective legacy membership flag evaluates historical gates inside the integrated universe. It is not a reconstruction of the old UI pool or a license to prune expanded candidates.

A ten-point residual can still create substantial displacement in a densely scored universe:

| Source-held-out arm | Exact-support-deficient occurrences demoted | Lose top 6 / top 18 | Maximum rank demotion |
|---|---:|---:|---:|
| Exact diagnostic | 1,689 | 2 / 2 | 2 |
| Family diagnostic | 37,617 | 14 / 25 | 3 |
| Feature exploratory | 523,179 | 22 / 42 | 5,438 |
| Feature support-gated | 0 | 0 / 0 | 0 |

The denominator is 1,116,736 repeated trial/query/candidate occurrences across 43 source-held-out lists. “Support-deficient” means no exact support in that trial's fit query, not poor quality or a unique person/shape. These demotions are ordering changes, not measured utility losses; nevertheless, they prevent interpreting a small score cap as a small ranking effect. All candidates remain reachable. [evaluation-summary.json](evaluation-summary.json) retains the complete per-arm aggregate displacement.

## 17. DadaGP as a distinct construct

[DadaGP](https://arxiv.org/abs/2107.14653) provides a GuitarPro song-score representation. The earlier certified observation artifact was hash-checked and reused only for separate descriptive distributions. It measures notated usage after that pipeline's filtering, not actual performance frequency or authored dictionary recommendation.

| Descriptor | Certified DadaGP song/query/shape observations | Curated source observations |
|---|---:|---:|
| Observations | 187,887 | 47 |
| At least one open string | 28.17% | 63.83% |
| Minimum stopped fret ≥11 | 3.96% | 0% |
| Root in bass | 68.45% | 89.36% |
| Mean sounding strings | 3.06 | 5.04 |

The populations have different units, query coverage and selection mechanisms. Their shared tendency toward root bass is qualitative convergence; the much denser/open curated sample is a material divergence. Neither is a controlled or causal comparison. Source-specific curated distributions and the certified DadaGP hash are in [analysis.json](analysis.json). No DadaGP observation becomes a curated-family vote, and no old-pool ranking metric is presented as an integrated result.

## 18. Physical Envelope v2 descriptive cross-analysis

[Physical Envelope v2](../physical-envelope-v2/study.md) supplies descriptive geometry, not calibrated fretting bands. The study attaches its full-cell longitudinal gap, transverse lower bound and contact topology using an explicit GS Mini reference profile. This analysis profile is distinct from the integrated production Physical profile. No geometry value is a target or evidence of human ease.

Curated full-cell gap has median 0 mm, 90th percentile 31.62 mm and maximum 58.02 mm; transverse bound has median 29.21 mm and maximum 38.59 mm. The zero-gap slice has 27 targets, 0–50 mm has 19 and >50 mm has one. That last target ranks 6,156 under classic and stays outside the first 18 after feature reranking. The transverse ≤20 mm slice has 18 targets and >20 mm has 29. These are descriptive partitions, not physiological thresholds.

Taught shapes concentrate in a narrow part of the production-status/geometry space. All targets being PASS does not demonstrate that curation proves feasibility, and the large candidate UNCERTAIN population is not evidence of low musical quality. Contact/group and gap contributions are reported above; the absence of isolated-gap/core-gap cases limits topology inference. Neither unobserved support nor large geometric separation becomes a hidden difficulty penalty.

## 19. Protected-slice evaluation

The full [protected-slice report](protected-slices.md) retains every arm/track and observed source, quality, string-count, bass/top, global novelty, context, geometry and Physical-status slice. Absent cells display N/A. A separate [register summary](register-slices.json) aggregates the immutable ranks after the run using the existing feature bins: all 47 targets have top MIDI in 60–71, leaving no target register variation at that resolution. This post-run descriptive aggregation reproduces all 20 original aggregate metrics and makes no new model-selection or confirmatory claim. Important source-held-out results are:

| Slice | Targets | Classic → feature Recall@6 | Interpretation |
|---|---:|---:|---|
| Open | 30 | 63.64% → 63.64% | No access gain |
| Closed | 17 | 20.00% → 27.50% | Two low closed barre targets drive gain |
| Inversions | 5 | 0% → 0% | Still no top-18 access either |
| Globally unseen physical shape/family | 39 | 31.90% → 34.48% | Limited transfer; same small target gains |
| Accompaniment | 41 | 32.81% → 35.16% | Rootless accompaniment absent |
| Four strings | 15 | 31.25% → 31.25% | No access gain |
| Five strings | 15 | 82.14% → 82.14% | No access gain |
| Six strings | 17 | 56.82% → 65.91% | Dense-target gain; sparse protection unresolved |
| Kansas / Wikimedia | 35 / 12 | 65.63%→70.31% / 22.73%→22.73% | Gain concentrated in one target source |
| High / rootless / UNCERTAIN / expanded | 0 each | N/A | Protection absent, not passed |

No observed feature Recall@6 regression was found in the reported slices. That should not be rewritten as an observed high-position failure: the actual high-position failure is **missing validation coverage**. Conversely, family lookup has actual family/joint losses and must not hide behind a favorable NDCG in another track. Bass/top and quality cells often have one source or one observation. Low-position dominance, source/style confounding, popular-quality imbalance and rare-density suppression remain unresolved safeguards even where aggregate metrics improve.

## 20. Leakage and adversarial audit

The [independent adversarial audit](adversarial-audit.md) challenged source attribution, query/context leakage, transposition, missingness, conservation and overclaiming. Fixes made before the result run included global physical-family removal across qualities and correct source/trial/query NDCG units. Different fitted models are never pooled into a fictitious shared ranking; NDCG bounds are asserted. Unreachable targets are explicit misses and serialized with an unreachable flag, never accidentally counted because JSON null compares below a cutoff.

The exact observation is deduplicated within source family/query/allocation. Source support is binary, so repeated pages, transpositions, finger variants and aliases do not create independent votes. UNKNOWN and generated rows cannot enter curated training. Training excludes the held-out source/family/quality before support computation. Full cache hashes, canonical target presence, classic scores/ties and first-page agreement are verified. The final evaluator hash is recorded in its completion artifact.

After results were visible, the independent review identified the same-two-target effect and the lack of protective coverage. No model, split or source inclusion was subsequently retuned to improve outcomes. This remains exploratory development: fixed holdout calculations reduce specific leakage, but they do not create an untouched confirmatory study after source inspection and development.

## 21. Evidence limitations and stopping decision

The limiting evidence is two conservatively independent teaching families, selective English-language public access, license-dependent acquisition, incomplete jazz-image retrieval, low/open/root-bass concentration, no sparse or rootless targets and no high/expanded/status diversity. Even the two families can share a teaching tradition. Row counts, page counts and multiple holdout tracks cannot repair the effective source count.

The reference arm broadens representation while leaving original selection unresolved. It cannot be promoted post hoc merely because it fills a missing slice. The marginal feature residual omits many interactions and is not an exhaustive test of every possible empirical model. A negative promotion decision here is not a theorem that generalized idiomaticity cannot be learned.

Further broad scraping under the same provenance constraints is unlikely to change the evidence contract enough to justify continuing this version. More legal, independent and targeted evidence could change a future version. The current bounded research question is answered without maximizing corpus size or inventing support bands.

## 22. Exact statement of absent human preference validation

**No participant in this study compared, selected, rated or attempted the candidate voicings. No human preference, comfort, difficulty, success probability or playability outcome was collected or validated. Recall, NDCG and rank here measure agreement with the acquired deliberately presented examples only.**

Source-provided difficulty words are source metadata, production PASS/UNCERTAIN are engineering annotations, and Physical-v2 measurements are geometric descriptors. None supplies the missing human outcomes. Deliberate teaching is still a valid and useful evidence construct in its own right.

## 23. Recommended empirical evidence contract

Carry forward a **versioned research reference catalog**, with no numeric ranking residual or canonicality band. Each retained record must carry source ID/family, primary URL and revision/hash, access date, license/retention obligations, origin evidence, raw label, interpretation confidence, tuning/capo/string orientation, exact allocation, source fingering if supplied, declared context/presentation role and extraction/mapping status. Source category/difficulty remains explicitly source-asserted metadata.

Derived catalog fields may include exact interpreted shape ID, carefully defined physical-family ID, the list and count of observed curated families, contexts in which support occurred, and the acquisition/mapping denominator. Counts must name their corpus version and context policy. Two-family overlap is a factual catalog property; it is not a calibrated strength category. A later lineage merge must recompute counts. Ambiguous/unacquired/unsupported entries remain visible and cannot contribute interpreted shape votes.

Missing lookup means **no support observed in this version**, with no score penalty, invalidity implication or claim that the source rejected the shape. For every runtime request, fallback remains unchanged classic-v1 because this study authorizes no empirical runtime behavior. Unsupported queries retain ordinary integrated behavior; they are not suppressed or served a fabricated default empirical score. No runtime bundle or product network dependency is included.

The catalog means that identified authors or teaching contexts presented a particular allocation under documented interpretation and rights. It does not mean popularity, independent player consensus, global canonicality, performance frequency, preference, ease or validity. Keep DadaGP usage and Physical geometry in separate evidence namespaces if reviewed together later.

## 24. Future product uses, not authorized here

A later adjudication could consider attributed “shown in this teaching source” evidence, provenance inspection, a curated-example browser or an offline regression/reference suite. Each would require a separate product decision, attention to per-source rights and a clear missing-evidence message. Commercial redistribution of the mixed catalog cannot be presumed from this study.

No badge, default sort, source whitelist, hidden empirical penalty, user-facing canonicality band, physical warning change or deployment is implemented or authorized. The artifacts are inputs to policy discussion, not an implementation proposal accepted by this report.

## 25. Warranted follow-up and reproducibility

Only three follow-ups are supported by the findings: obtain a source agreement or openly licensed authored selection that adds independent high/rootless/sparse/expanded coverage; repair the 18 documented acquisition gaps when access permits without treating retries as new evidence; and, if that produces adequate independent domains, freeze a new feature model and an untouched source-level evaluation before inspecting its outcomes. A preference study becomes relevant only if a later product claim concerns player choice or ease. Broad hyperparameter tuning on these 47 rows is not warranted.

[reproduction.md](reproduction.md) documents exact acquisition, normalization, mapping, verification and evaluation commands. [analysis.json](analysis.json), [evaluation-summary.json](evaluation-summary.json), [protected-slices.md](protected-slices.md), source manifests, normalization records and immutable private mapping/evaluation logs preserve the evidence chain. The large complete candidate caches remain research artifacts rather than product bundles. Targeted TypeScript checks, synthetic normalization controls and full-cache/target/order checks support the computational claims. Tracked production files and baseline HEAD are unchanged.

The evidence earns exact attributed references and narrowly stated source-presence facts. It has not earned a ranking signal or calibrated canonicality measure.

**B. CURATED REFERENCE CATALOG ONLY**
