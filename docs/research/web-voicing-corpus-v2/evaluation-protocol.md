# Fixed exploratory evaluation protocol

Frozen before inspecting integrated-engine matches or ranking outcomes. This is an exploratory acquisition study; no untouched confirmatory set is claimed. Sources and origin classes are audited before inclusion. Unknown/generated sources are never silently promoted to curated votes.

## Observation and identity

One observation is a source-family's deliberately presented chord interpretation and exact physical allocation. Collapse duplicate pages, mirrors, finger-number variants of the same allocation and repeated entries within a source family. Retain all native rows and exclusion reasons in the inventory. Distinguish per-source presentation order from an explicit primary/default recommendation; array order is not a recommendation.

The primary corpus uses sources with evidenced author selection and reusable structural allocations. Other acquired dictionaries/products with unknown origin are a separate reference diagnostic. Algorithmic rows have their own class and cannot train a curation model. A conservative source-family merge takes precedence over separate domains/authors where shared content is known or unresolved.

Exact identity contains tuning, capo and the full six-string allocation; query identity also contains chord/root/context/slash obligations. A closed physical family subtracts the minimum stopped fret but preserves string/mute pattern and tuning. An open shape remains exact because transposition changes the physical open-string affordance. Shape and joint withholding remove matching physical families across all roots, chord qualities, contexts and source families before fitting; the diagnostic family-support model remains chord-quality-conditioned. Report globally unseen physical shapes/families separately from query-conditioned novelty. Quality stress removes the whole chord ID.

## Fixed comparisons

1. Integrated classic-v1 integer order, unchanged.
2. Exact source-family support as descriptive metadata and an offline +10-point maximum residual diagnostic.
3. Closed-normalized/open-exact shape-family support, also +10 maximum, diagnostic only.
4. A fixed feature-only residual, +10 maximum, from equal-source contributions. No exact allocation, root ID, query ID, source identity or shape-family ID enters its feature vector. No coefficient fitting or post-outcome grid search.

The feature residual averages interpretable categorical support: stopped position, top MIDI register, open count, sounding count, root-in-bass, bass/top tone, root presence, doubling, omissions, pitch span, internal string gaps and pitch crossings. These are descriptions of selected forms, not difficulty labels. Report optional Physical-v2 geometry separately; it is not a target. Correlated features are not independent evidence, and a marginal model does not identify causal or independently useful coefficients.

For each training family, each observed feature value contributes at most one source vote; repeated transpositions/rows cannot create independent votes. Features absent from a family give no support, not evidence of invalidity. Residual ties preserve classic-v1. Every rerank is a complete permutation and must conserve IDs, physical status and exact score control. Maximum boosts and rank displacement are reported separately.

## Splits and safeguards

Run leave-source-family-out at the family boundary, leave-shape-family-out, joint source+shape withholding, and leave-quality-out where represented. Per-target family removal is permitted as an explicitly defined leave-one-family diagnostic; it does not generate a new test set. No held-out source contributes counts or model selection. No reranking outcome is used to change normalization, source inclusion or model settings; notation errors may be corrected with an explicit audit trail.

If fewer than two independent curated training families support the applicable chord-quality and declared-context domain, the protected interpretation is exact classic fallback. A one-source transfer diagnostic can still be reported clearly as unsupported exploratory evidence; it cannot earn generalized idiomaticity. This domain-count gate is only an abstention control, not calibrated per-feature confidence or deployment certification. No empirical runtime activation is within scope regardless of result.

Report macro recall@6/@18 and NDCG@6 over held-out source/trial/query contexts, then average contexts within each source and give sources equal weight. Distinct leave-family models must never be pooled into a single fictitious NDCG ranking. Report rank quantiles, exact/family support, unseen behavior and complete-pool displacement. Unmapped observations stay in mapping coverage/exclusion denominators; structurally absent targets remain misses in retrieval for otherwise valid mapped queries. No alternate tuning or ambiguous label becomes a negative preference observation. Different withholding tracks have different context units; compare each arm with its paired classic control, not absolute NDCG across tracks.

Required slices: stopped high position (minimum ≥11), low position, open/closed, every observed sounding count, rootless/context, bass/top, root bass/inversion, chord quality, source family, source origin, current Physical status, descriptive geometry and expanded-versus-legacy region. Source-family weights are equal in aggregate summaries; page frequency is never an outcome weight. Sparse and absent cells are unresolved, not passed. No confidence band or canonicality band is invented from two or three families.

Slice definitions are explicit: evaluation low means maximum stopped fret ≤5; high means minimum stopped fret ≥11. The mapper additionally retains classic-v1's own maximum-fret bands (≤7/≤12/>12), which are different covariates. Geometry bins (cell gap zero, 0–50 mm, >50 mm; transverse bound ≤20/>20 mm) are convenient descriptive partitions only, chosen before outcomes, not physiological bands or calibrated thresholds.

An empirical model must exceed classic-v1, not a weaker replacement, and must not hide material protected losses behind aggregate retrieval gains. No simple deterministic alternative will be fitted merely to force a better result. If the source audit or coverage precludes credible model evidence, deliver a bounded catalog/canonicality conclusion rather than forcing a learned scalar.
