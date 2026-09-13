# Prior explicit-model reuse and parameter audit

Physical Envelope Study v2, 2026-09-13. This is a research-only audit for population-reference descriptions of demand. It does not reopen production replacement or change PASS/UNCERTAIN/REJECT, Generator, ranking or presentation.

**Evidence boundary.** The old `docs/research/physical-feasibility/model-specification.md`, `frozen-model.json`, `scripts/physical-feasibility/model.py` and corrected reassessment are absent in this checkout. Their absence was checked. Descriptions of their internals below are **session-verified continuity from the earlier review**, not a fresh code, manifest or solver verification. Current available evidence is identified separately.

## What survives in the present checkout

The current [engine-physical-shadow.json](C:/Projects/Guitar/docs/implementation/engine-physical-shadow.json) contains 88 replay rows, historical input hashes and reference-profile outcomes. Fresh aggregation of those retained rows gives:

| Retained reference result/reason | Count |
|---|---:|
| FEASIBLE_FOUND / audited_conditional_kinematic_witness | 61 |
| FEASIBLE_FOUND / no_fretting_contacts | 1 |
| INFEASIBLE_UNDER_MODEL / analytic_pair_reach_bound | 1 |
| UNRESOLVED / constructive_search_exhausted | 12 |
| UNRESOLVED / multi_contact_barre_required_not_modeled | 11 |
| UNRESOLVED / explicit_left_hand_mute_not_modeled | 2 |

There are 62 positive statuses, not 62 newly verified articulated hand poses. The shadow reports default replay totals 79 PASS/9 UNCERTAIN/0 REJECT and semantics-aware totals 77/11/0; explicit damping changes S19 and S20. It records zero new solver runs and historical verification of 54 frozen files. That stored verification claim cannot replace verification of files absent today. The retained JSON's fresh SHA-256 is `19580a0e693439575686b89e47f358c0175836bcf4e4678cacb0b692ed607339`.

The present [physical.ts](C:/Projects/Guitar/src/domain/chord/engine/physical.ts) has an empty certificate-provider list, preserves full-target span, uses heuristic group/span warnings and abstains for unsupported profiles/damping. This confirms the current runtime boundary; it is not a fresh check of the old explicit model. The archive's conditional reference exclusions have no runtime admission effect.

## Reusable-element classification

The requested categories are used literally and may overlap:

- **A — geometric fact**
- **B — useful model construct**
- **C — potentially population-calibratable parameter**
- **D — uncalibrated assumption**
- **E — search/numerical convenience**
- **F — unsupported for new purpose**

“A” always states the declared geometry; it does not claim the idealized object exactly matches an instrument. “C” means a credible measurement target, not a claim that a calibrated population distribution is available. “F” is purpose-specific: an element may be useful for conditional diagnostics while unsupported for population-reference inference.

| Prior element | Categories | What can be reused for v2 | Boundary |
|---|---|---|---|
| Equal-tempered fret coordinates from scale length | A, B | Deterministic wire positions; compare instrument-conditioned distances. | Scale must be measured, specified or declared. Individual intonation/compensation is not recovered. |
| Complete fret-cell contact intervals | A, B | Represent positional freedom; derive interval separation rather than treating fret wires as mandatory fingertip centers. | Full cell is a broad geometric relaxation, not a guarantee every point gives clean sound or adequate force. |
| String taper, endpoint spacing and transverse positions | A, B, C, D | Separate longitudinal and transverse demand; preserve nut width versus outer-string spread. | Linear taper/equal centers are completion assumptions unless actual slot/saddle centers are measured. |
| Constant-radius board and local normals | A, B, C, D | Declared surface geometry; illustrate depth and approach distinctions. | Constant radius is not a measured neck mesh. Curvature alone does not determine string height or pad contact. |
| Different finger link lengths with a common palm frame | B, C, D | Simultaneity and digit identity are meaningful constructs missing from a scalar span. | Radiographic segments do not directly establish joint centers, common MCP positions or a population of poses. |
| Per-finger assignment and separate joint coordinates | B, C, D | Preserve uncertainty about which digits carry which contacts. | Independent joint ranges may contain combinations not voluntarily attainable together. |
| Contact orientation/pad approach | B, C, D | Distinguish reaching a target from orienting the contact surface. | The old hemisphere convention is not calibrated pad orientation or force capability. |
| Capsules, spheres, palm and unused-finger poses | B, C, D | Express occupied volume and possible interference, including unused digits. | Ideal solids are not validated outer/inner envelopes of real tissue; false clearance and false collisions are both possible. |
| Open and stopped ringing-path protection | B, C, D | Make the intended acoustic path explicit. | Static line clearance omits vibration, actual depression, compliance and force. |
| Unplayed versus required damping | B | Preserve semantics even when geometry is identical; retain unsupported status. | The model does not construct left-hand damping. Absence of a damping witness is not impossibility. |
| Thumb/barre/two-hand/contact-mode omissions | F | Retain explicit scope declarations and abstention. | Cannot become missing-mode penalties, demographic limits or evidence that omitted modes fail. |
| Audited serialized positive pose | B, E | Stronger conditional configuration evidence than screen clearance, with assumptions retained. | It is not a human outcome or population-normal pose. No missing witness is regenerated in v2. |
| Pair-reach necessary-condition certificate | A, B, D, F | Preserve proof structure using conservative maximum reach and complete contact intervals. | The old certificate excludes its fixed skeleton, not generic hands or a normal population envelope. |
| Finite pose/contact/joint sampling | E | Reuse the distinction between model domain and searched subset. | Search frequency/success is not population frequency or normality. |
| One-axis anatomical/instrument scenarios | B, C, D, E, F | Controlled sensitivity can identify which assumptions move a result. | They are not joint population draws, measured people or percentile hands. |
| Conventional/synthetic/corpus challenge fixtures | B, F | Diagnostic probes and regressions for declared semantics. | Fixture provenance, frequency and current PASS are not independent physical labels. |

## Parameter roles: measured does not mean calibrated for this task

| Parameter family | Requested role classification | Available support | v2 treatment |
|---|---|---|---|
| Source radiographic phalangeal/metacarpal dimensions | **Measured/defensible** at source landmarks; **calibratable with new population data** | Current anthropometry review freshly verifies Buryanov & Kotiuk's 66-person source table and limits. | Retain measurements with source/population. Do not rename them joint-center lengths. |
| Mapping those dimensions to serial-chain link lengths | **Plausible uncalibrated** | Earlier model used direct mapping; no same-subject kinematic validation. | Conditional-model assumption, not measured anatomy. |
| MCP base locations, palm shape and digit coupling | **Calibratable with new population data**; presently **plausible uncalibrated** | External breadth and segment means do not recover these coordinates or correlations. | Do not synthesize a population from unrelated marginal measurements. |
| Joint limits, abduction and flexion coupling | **Calibratable with new population data**; presently **plausible uncalibrated** | Individual active/passive and task-conditioned ROM evidence can inform measurement design. | Preserve protocol, posture, load and joint dependence. Do not substitute passive maximum for active fretting. |
| Scaling skeleton lengths by external hand-length anchors | **Unsupported for new purpose** | Earlier model scaled one mean skeleton using occupational hand-length ratios; the mapping to its nominal hand length was assumed. | Cannot produce measured small/median/large people or population coverage. |
| Nominal scale/string endpoint spread/board radius | **Measured/defensible** as reported manufacturer specifications; specimen variation **calibratable with new population data** | The current geometry review distinguishes a same-model nominal reference from constructed completions. | Use named instrument scenarios; no market-population weighting. |
| Equal string centers and ideal cylindrical surface | **Plausible uncalibrated** completion assumptions | Analytically well-defined; precision layouts/setups not measured. | Label construction; test sensitivity separately from sampling uncertainty. |
| Pad/link/palm radii and deformation | **Calibratable with new population data**; presently **plausible uncalibrated** | Finger breadth is not compressed pad radius; axial tissue length is not radius. | Do not fit dimensions to make familiar chords solve. |
| Action, string radius, relief, force/contact tolerances | **Calibratable with new population data**; old completion values **plausible uncalibrated** | Prior static geometry used assumed/completed setup; no loaded-contact calibration. | Distinguish nominal/assumed/measured per parameter. |
| Adequate fretting force, tendon equilibrium, wrist/arm support, comfort/endurance | **Unsupported** in the prior implementation | No implemented/validated solution in session-verified prior scope. | Do not infer these from positive pose, reach or clearance. |
| Thumb wrapping/support and constructive multi-contact barre mechanics | **Unsupported** in the prior implementation | No constructive implementation. | Preserve unsupported scope. No thumb reach percentile follows from flat thumb–little span. |
| Contact fractions .55/.72/.88, 96 sampled palm poses, DIP samples 0°/30°/60°/90°, chosen IK branch and unused-finger rest patterns | **Numerical/search convenience** | Session-verified finite search design, not current code reinspection. | Never anatomical distributions, preferred postures or likelihood weights. |
| Contact reconstruction tolerance 10⁻⁶ mm | **Numerical/search convenience** | Earlier numerical audit tolerance. | Numerical consistency does not imply micrometre biological accuracy. |
| Fixed-skeleton reach upper bound | **Measured/defensible** mathematical implication *conditional on parameters*; physical scope **uncalibrated/unsupported for population inference** | Triangle inequality under the declared model. | Preserve conditional proof, not generic or percentile rejection. |

Fresh source evidence for the anatomical and functional distinctions is catalogued in [anthropometry.md](C:/Projects/Guitar/docs/research/physical-envelope-v2/anthropometry.md), [functional-reach.md](C:/Projects/Guitar/docs/research/physical-envelope-v2/functional-reach.md) and [guitar-geometry.md](C:/Projects/Guitar/docs/research/physical-envelope-v2/guitar-geometry.md). Earlier numeric search settings are included solely to classify their role; they are not reintroduced as a v2 solver configuration.

## Adversarial review of the proposed descriptive vector

The current research [features.ts](C:/Projects/Guitar/scripts/physical-envelope-v2/features.ts) is useful **geometric demand extraction**. It does not establish a population-calibrated demand construct. Its quantities require precise interpretation:

| Feature | Defensible meaning | Claim to avoid |
|---|---|---|
| `wireSpanMm` | Extreme stopped fret-wire displacement. | Actual fingertip span or a required pairwise hand reach. |
| `cellGapMm` | Minimum longitudinal gap between full extreme fret cells; zero for overlapping/adjacent cells. | Clean-sounding reachable gap, or a bound using narrowed fraction intervals. |
| `planarLowerBoundMm` | Maximum over target pairs of their minimum planar segment distance. This lower-bounds the diameter of every complete target selection in those segments. | The exact minimum global diameter, a single jointly attained contact choice, or digit reach. |
| `transverseLowerBoundMm` | Maximum pairwise lower bound using projected transverse intervals. | A transverse finger-abduction requirement or a complete 3D distance. |
| `midpointDiameterMm` | Diameter of chosen full-cell midpoint targets on the declared surface. | An optimized pose, collision measure, or human demand percentile. |
| `groups` | Minimum groups in singles/compatible same-fret interval vocabulary. | Proven number of human fingers needed. |
| `maxCompatibleContacts` | Largest count in a compatible interval hypothesis. | Necessary barre contacts, force or anatomical availability. |
| `maxCompatibleStringGap` | String-index steps between endpoints of a compatible interval. | Width in mm or measured barre length. |
| `optimalPartitionCount` | Count of optimal ordered disjoint same-fret interval partitions. | Number of fingerings or realization ambiguity. |
| Stop/open/omission counts and distinct stopped frets | Allocation topology. | Damping, plucking cost, physical difficulty or relative preference. |

Two specific implementation-reading cautions matter:

1. Pairwise minimizing choices need not be jointly consistent. Therefore the maximum pairwise lower bound remains a **bound**, not an optimized whole-configuration measurement. Open strings are excluded from stopped-demand distances; clearance remains a separate unmodeled requirement.
2. Fraction sensitivity narrows planar/transverse segments, but midpoint targets remain at the full-cell .5 fraction and `cellGapMm` still uses full cells. That is defensible only with explicit invariant-feature naming. If the permitted fraction interval excludes .5, midpoint diameter is not a constructive upper bound for that restricted contact domain.

There is also a structural degeneracy in `optimalPartitionCount`: under the present blocker rule, same-fret targets split uniquely into maximal runs separated by lower/open blockers. Every run can be covered as one interval; splitting it increases cost, and merging across a blocker is invalid. The optimal disjoint partition is therefore unique for each fret, so the product is identically one for valid allocations. It supplies no useful ambiguity signal. Retain as a QA invariant or omit from the principal vector; do not redesign contact inference to force variability.

The helper's 0–15 lookup domain should remain explicit. Current frozen shadow fixtures include higher frets, so silently applying the census table to all historical fixtures would not be valid. This is a research-domain restriction, not a proposal to alter Generator.

## Principal choice and normalized ratios

**Recommend option A: no calibrated population model yet.** Deliver useful multidimensional geometric features and separate measured-population reference panels now. This does not discard population references; it limits the claimed bridge between the two. Option E can remain a future hybrid direction, conditional on measurement matching and validation, rather than implying that the present vector has been calibrated to population demand.

A ratio of planar target separation to a named flat index–little sample span is arithmetically interpretable as a **cross-construct dimensional comparison**. It is not source-matched merely because both quantities use millimetres:

- The numerator may concern any stopped-string pair, whose digit assignment is unknown and whose contacts might share one barre finger.
- The denominator concerns a specific anatomical pair, with outer-tip landmarks and intermediate fingers unconstrained on a flat surface.
- Fret-cell lower bounds, fingertip edges, selected midpoints and compressed pad centers are different landmarks/relaxations.
- The references may be right-hand maxima while the target usually concerns a left hand; posture, force and acoustic conditions differ.

If shown at all, use a literal label such as “planar target-diameter lower bound / reported RH flat index–little mean, [named sample].” Publish the two raw quantities beside it. Do not call it span utilization, remaining reach, accommodated fraction, normality, difficulty, comfort or success; do not add qualitative bands or a traffic light. A constant reference denominator merely rescales the geometric statistic and contributes no new candidate ordering or validated biological discrimination. Omitting the ratio from the principal result is cleaner than relying on a disclaimer to undo a misleading name.

Even a future explicit assignment of index and little fingers would remove only the digit-identity mismatch. It would not resolve posture, landmark, loading and simultaneity mismatches. Those require a measurement/validation bridge, not an assumed correction factor.

The prior model's reusable contribution is therefore its **decomposition of physical questions and evidence**, not its numbers as a ready population envelope. Preserve conditional witnesses, unsupported modes and search abstention, while keeping v2 descriptions separate from production verdicts and human execution claims.
