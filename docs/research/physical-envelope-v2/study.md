# Physical Envelope Study v2

Research-only study · 13 September 2026 · Guitar integrated implementation through stage 9

## 1. Executive conclusion

**The evidence supports a reproducible description of instrument-conditioned contact geometry and separate measured human-reference panels. It does not yet support a population-calibrated fretting-demand envelope.** This limitation concerns the proposed demand construct itself, before the separate question of predicting successful execution. Hand length, flat finger spread and target separation do not share the digit assignment, landmarks, posture, loading or simultaneous-contact conditions needed for a defensible calibration.

Useful progress is substantial. This study reconstructs the prior model's evidential boundary, reviews primary anthropometry and functional-reach sources, recomputes a public 368-person dataset including actual covariance, defines three explicit instrument scenarios, and measures geometry across the complete integrated universe. All 480 request rows reproduce the control: **15,943,679 request/allocation pairs; 583,916 PASS; 15,359,763 UNCERTAIN; zero REJECT**. There are **6,998,385 distinct allocations** across those requests. These are enumeration statistics, not observations of players or performed music.

The main new descriptive dimensions are full-fret-cell longitudinal separation, transverse separation and explicit contact topology. They expose distinctions concealed by current span/group warnings. A planar pair-distance bound is useful as a diagnostic, but is almost entirely longitudinal in the large-span UNCERTAIN stratum. A proposed count of optimal contact partitions proved identically one and is excluded from the principal vector. No scalar, qualitative normality bands, percentile hands, or anatomical cutoff is introduced.

The previous **REFINE CURRENT** Physical decision remains frozen. The live architecture and verdicts remain unchanged. The present research decision is **A. NO POPULATION MODEL YET**. A future hybrid may become supportable after matching measured functional contacts to the geometric constructs; it is not an implemented or calibrated result here.

## 2. Exact baseline, scope and method

The initial scope check was written before substantive research: [scope-check.md](C:/Projects/Guitar/docs/research/physical-envelope-v2/scope-check.md). The branch was `master`, the initial working tree was clean, and exact HEAD was:

`32f9d3f8a71dc0d2a5f18520bfad738e67ba26c0`

This matches expected integrated baseline `32f9d3f`. No branch/worktree was created or switched, and no history was reset. The authoritative runtime chain remains Request compilation → Structural Generator → Physical Assessment → Deterministic Ranking → Presentation/pagination. New files are confined to this research directory and [scripts/physical-envelope-v2](C:/Projects/Guitar/scripts/physical-envelope-v2).

The object is a descriptive/reference construct over structurally valid allocations. Three outputs remain separate:

| Concept | Meaning in this study | Evidence boundary |
|---|---|---|
| Production Physical verdict | Existing PASS / UNCERTAIN / certified REJECT contract | No remapping or new provider |
| Proposed demand description | Instrument geometry, contact topology, conditional model distinctions and explicitly named human reference measurements | No supported population fretting calibration yet |
| Actual human execution | Successful, clean, repeatable or comfortable performance by people | Predictive validity of this study's features is **ABSENT** |

Independent research tracks covered anthropometry, functional reach, instrument geometry, prior-model audit, census extraction and adversarial interpretation. Literature searching prioritized primary papers, government datasets and manufacturers. It stopped after the available evidence supplied actual external-dimension covariance, functional task contrasts and instrument dimensions but continued to lack the decisive measurement bridge. This is a targeted evidence review, not a preregistered systematic review; access failures are recorded rather than treated as negative findings.

## 3. Relationship to the frozen Physical review

The prior review established that inexpensive geometry/contact calculations should survive with explicit uncertainty. The former >5-group and >180-mm exclusions lack support as generic physical impossibility. The >4-group and >95-mm warnings and former severe boundaries remain engineering heuristics. REJECT requires a sound necessary-condition exclusion over the complete declared realization scope. Unresolved search is unresolved; model sophistication does not establish physical truth.

The current [physical evaluator](C:/Projects/Guitar/src/domain/chord/engine/physical.ts) implements that evidential separation. Its certificate-provider list is empty. Full-target span remains present even when a thumb fallback is considered. Unsupported damping or personalized/restricted profiles cause abstention. The study does not retry whether an articulated model should replace the evaluator.

The integrated control also records retention of all **1,647,041 / 1,647,041** legacy allocations and **12,749,194** formerly old-hand-excluded pairs now reachable as UNCERTAIN. Those counts describe the integration; they are neither training labels nor target sizes. P5 generator admission, DadaGP frequency, classic-v1 rank and top-page membership have no role as physical ground truth here.

## 4. Reconstruction of prior assets

The old physical-feasibility model specification, frozen model JSON, solver source, corrected reassessment and previous review documents are **absent from this checkout**. Their internals below are reused from verified findings in the same research session. They have not been reconstructed or presented as freshly inspected files.

The available [engine-physical-shadow.json](C:/Projects/Guitar/docs/implementation/engine-physical-shadow.json) retains 88 reference rows. Fresh aggregation finds 61 audited conditional kinematic witnesses, one no-fretting-contact case, one fixed-model analytic exclusion, and 25 unresolved cases: 12 exhausted searches, 11 unsupported multi-contact/barre cases and two explicit damping cases. Thus 62 positive statuses do **not** mean 62 articulated poses. The shadow's 54-file historical hash verification cannot be repeated against missing files. Its own freshly checked SHA256 is `19580a0e693439575686b89e47f358c0175836bcf4e4678cacb0b692ed607339`.

Reusable elements are classified below; combinations are deliberate. A = geometric fact within declared geometry; B = useful model construct; C = potentially population-calibratable parameter; D = uncalibrated assumption; E = search/numerical convenience; F = unsupported for this new inference.

| Element | Class | Reuse and limit |
|---|---|---|
| Fret-wire coordinates; full fret-cell intervals | A, B | Exact ideal geometry; cells are an optimistic contact domain, not clean-sound guarantees |
| String taper, spacing, radius | A, B, C, D | Useful declared geometry; actual slot centers/setup still require measurement |
| Distinct digits sharing one palm; digit assignments | B, C, D | Exposes simultaneity; unrelated anthropometric marginals cannot calibrate a common hand |
| Joint ranges, pad approach, occupied volume, unused fingers | B, C, D | Meaningful interactions; independent limits and ideal solids remain assumptions |
| Open/stopped ringing clearance | B, C, D | Necessary acoustic distinction; static geometry omits force and vibration |
| Unplayed versus required damping | B | Different obligations even for the same allocation; constructive damping unavailable |
| Positive serialized pose; restricted exclusion | B, E / A, B, D | Conditional evidence only; no population accommodation inference |
| Palm/contact/DIP sampling and selected IK branches | E | Search design; never population probabilities |
| Missing thumb, barre, force and support modes | F | Unsupported scope remains explicit |
| Familiar, synthetic and corpus fixtures | B, F | Diagnostics; no independent difficulty labels |

The complete reconstruction and parameter taxonomy are in [prior-model-audit.md](C:/Projects/Guitar/docs/research/physical-envelope-v2/prior-model-audit.md).

## 5. Human anthropometry evidence

All measurements retain source definitions. External hand length, bone length, fingertip span and compressed pad-center separation are distinct variables. The [full anthropometry evidence table](C:/Projects/Guitar/docs/research/physical-envelope-v2/anthropometry.md) and [machine-readable source register](C:/Projects/Guitar/docs/research/physical-envelope-v2/anthropometry-sources.json) provide the detailed values and limitations.

| Primary source | Population / n | Construct and units | Quantitative evidence selected here | Applicability and limits |
|---|---|---|---|---|
| Guan et al., 2012 [1] | US Class-A truck drivers; 1,779 men, 171 women; 2008–09 | RH stylion–middle-tip length and metacarpale II–V breadth, hand on table; mm | Length mean±SD: M196±10.10, F177±8.48; P5–P95 M180–214, F163–190. Breadth M90±4.82, F79±3.90 | Weighted occupational marginals; no P50 supplied; interobserver differences matter; its thumb-tip reach is whole-arm reach |
| Hsiao et al., 2015 [2] | US firefighters; 943 analyzed, 855M/88F; 18–65 | RH 2D scans, naturally open fingers; external hand/palm/digit dimensions; mm | Palm length M113.8±5.8, F104.0±5.7; index75.8±4.4/71.3±4.2; middle83.8±4.6/78.6±4.5; ring79.6±4.5/74.0±4.5; little65.2±4.3/60.4±4.3; thumb70.8±4.3/64.8±4.1 | External lengths and breadths do not locate joint centers or pads; naturally open breadth cannot simply pool with closed-hand breadth |
| Buryanov & Kotiuk, 2010 [3] | 66 adult clinical patients without relevant bone pathology; 19–78; sex mix unspecified | AP radiographic interarticular segments; mm | Index proximal/middle/distal means39.78/22.38/15.82; middle44.63/26.33/17.40; digit-specific SDs and other segments in appendix | Source anatomy, not a joint-center skeleton; covariance unavailable; tip tissue thickness is not pad radius |
| ANSUR II official owner [4] | US Army, 4,082M/1,986F; 2010–12 | 93 direct dimensions; raw joint records identified | No numerical hand parameters adopted: raw/manual retrieval failed | Strong route to coherent records; military selection and missing loaded reach remain limits |
| Khazri et al., 2022 + S1 reanalysis [5] | Sabahan university students18–25; 368; 184/sex; four equally sampled ethnic strata | Bilateral wrist-crease hand length, knuckle breadth, middle-finger/crease lengths and wide thumb–little span; source cm→mm | Actual source-record quantiles and within-sex covariance, below | Coherent external records; protocol and publication discrepancies retained; not a representative sample of all adults or guitarists |
| Greiner, 1991 Army hand report [6] | Working subset1,003M/1,304F | 64 photographic +22 direct dimensions | Indexed primary source only; full tables not retrieved | Evidence lead, no guessed numeric profile |

Reanalysis of public S1 found 368 complete records, no identifier field, no nonfinite/nonpositive entries and no exact duplicate full records. All observations were retained, including 30 records flagged by a descriptive within-sex IQR screen across dimensions. Source cm were multiplied by ten; covariance therefore by 100. Sample SD uses n−1; empirical quantiles use linear interpolation. No normal-tail fit or synthetic population was generated. The 44,594-byte source is retained for reproducibility with SHA256 `3f2847df30f9180029a3e4f62d63f467377455750f076796ee3750b6fc550aea`. [Derived tables](C:/Projects/Guitar/docs/research/physical-envelope-v2/anthropometry-sabahan.md), [aggregate covariance/QA](C:/Projects/Guitar/docs/research/physical-envelope-v2/anthropometry-sabahan.json).

| S1 source stratum | Left-hand measure | Mean±SD, mm | Empirical P5 / P50 / P95, mm |
|---|---|---:|---:|
| Female,184 | Wrist-crease hand length | 169.64±7.59 | 158.14 /169.31 /182.38 |
| Female,184 | Hand breadth | 74.03±3.62 | 68.37 /73.79 /80.16 |
| Female,184 | Wide thumb–little span | 155.34±12.99 | 135.65 /154.56 /178.62 |
| Male,184 | Wrist-crease hand length | 184.23±7.57 | 171.53 /184.81 /195.63 |
| Male,184 | Hand breadth | 82.66±3.95 | 75.64 /82.69 /88.72 |
| Male,184 | Wide thumb–little span | 172.03±12.74 | 150.52 /172.00 /194.45 |

Actual length–span covariance is47.057mm² female and30.797mm² male; corresponding correlations are .4771/.3194, versus .6193 when pooled. Length–breadth correlations are .5639/.5238, versus .7796 pooled. Pooling therefore changes apparent dependence materially; group mean shifts must not be mistaken for a universal scaling law. Each sex stratum still includes four equally sampled ethnic groups, without population weights.

The paper's Table5 n=463 conflicts with the actual368 records; the reanalysis also only partly resolves conflicting stature correlations. A related 2023 paper with overlapping authors/cohort dates and internal table inconsistencies is quarantined rather than counted as independent replication. These flags remain attached to the source panel. Different span protocols, including the functional sources below, are not pooled to explain away their different values.

## 6. Functional reach, ROM and execution evidence

The evidence ladder is static dimensions → passive range → active range → simultaneous functional reach → successful task execution. Higher levels are task-specific; keyboard or pinch execution does not validate fretting-demand features. The [functional-reach table](C:/Projects/Guitar/docs/research/physical-envelope-v2/functional-reach.md) and [ROM/mechanics table](C:/Projects/Guitar/docs/research/physical-envelope-v2/rom-and-mechanics.md) retain protocols, strata and source limitations.

| Source | Population / n | Level and definition | Usable observation | Missing transfer |
|---|---|---|---|---|
| Boyle, Boyle & Booker2015 [7] | Mostly Australian pianists:159M/314F; separate student samples | Active maximum unaided RH flat-hand span, outside fingertip edges; thumb–little1–5 and index–little2–5 | Pianist2–5 mean±SD: M170±14mm, F157±13; Q1/median/Q3 M160/171/178, F150/157/165 | Other digits unconstrained, no fretting load, RH versus typical fretting LH; not a pad-center bound |
| Kamaşak Arpaçay et al.2026 [8] | 70 guitarists/70 controls; each34F/36M;18–25, RH dominant | Left thumb–little full-abduction span | Guitarist median201.92mm [Q1 187.10,Q3 217.27]; control200.17 [183.05,208.28]; p=.178 | Not a simultaneous chord task; assistance unclear; caption/prose inconsistencies; contextual evidence |
| Kuo et al.2009 [9] | 20 participants | Functional fingertip workspace reaching thumb in pinch, versus maximum workspace | Reported functional/maximal workspace ratios differ by digit (33.7/27.1/23.5/19.1%) | Workspace ratios are not linear-span discounts; no guitar posture/force distribution |
| Bullock, Feix & Dollar2014 [10] | 19 young RH participants,6M/13F | Object manipulation with two or three maintained contacts | Mean workspaces5.7 versus4.8cm³; object33–41mm | Contact count changes usable workspace; not chord-reach calibration |
| Leitkam, Bush & Bix2014 [11] | Nine subjects | Weighted fingertip space: positions, orientations, directional force | Functional construct explicitly includes more than reach | Small study; no population-calibrated guitar mapping |
| Heijink & Meulenbroek2002 [12] | Six male professional classical guitarists,22–36 | Actual scale execution across strings, fret spans and positions | Within-cell placement and movement strategies are task-dependent | Genuine execution data, but sequential scale task; no simultaneous voicing outcome labels for this vector |
| Ngeo et al.2014 [13] | Ten adults,7M/3F,27±4 | Active free finger flexion, optical measurement | Index mean extension/flexion endpoints: MCP−39.97/62.29°, PIP−14.95/72.55°, DIP−16.96/45.51°, with broad SDs | Full-fist marker exclusions and task protocol prevent universal joint limits |
| van den Noort et al.2016; Reissner et al.2019 [14], [15] | Three-person technical comparison;20-person repeatability study | Active ROM and measurement agreement | Methods/measurement error materially affect ROM estimates | Task angle amplitudes are not independent population joint constraints |
| White et al.2018; Holzbauer et al.2021 [16], [17] | 96 adults21–92;29 adults | Passive thumb CMC range; method comparison for active abduction | Passive abduction51.1±5.5° in first study; reported angles differ substantially by measurement definition in second | Thumb abduction is not active opposition or wrapping a neck |
| Sung et al.2013 [18] | Limited primary abstract for four guitar chords | Static pressure/angles and biomechanical hand model | Shows force is a distinct modeling target | No quantitative population force/comfort rule adopted |

Wagner's primary discussion, Lee's pianist kinematics and Sakai's keyboard work provide further task/measurement contrasts in the appendix. None provides a source-matched conditional distribution of simultaneous loaded guitar contacts. No number from passive ROM is installed as an active fretting constraint.

## 7. Guitar geometry evidence and reference scenarios

The analysis uses numeric geometry, with instrument category serving only as a descriptive label. Manufacturer specifications are nominal, not a distribution of measured specimens or the market. Inch conversions retain decimals for reproducibility, not manufacturing precision. Parameter-level sources and assumption labels are versioned in [instrument-profiles.json](C:/Projects/Guitar/docs/research/physical-envelope-v2/instrument-profiles.json); the [geometry review](C:/Projects/Guitar/docs/research/physical-envelope-v2/guitar-geometry.md) explains definitions.

| Scenario, mm | Scale L | Nut width | Nut outer-string spread N | Bridge outer-string spread B | Radius R | Evidence |
|---|---:|---:|---:|---:|---:|---|
| Constructed Strat-like electric | 647.7 | 41.91 | **35 assumed** | **52.3875 transferred** | 241.3 | PlayerII scale/nut/radius [19]; different Fender bridge component spacing [20] |
| Taylor GS Mini nominal reference | 596.9 | 42.8625 | 36.5125 | 55.5625 | 381 | Same-model manufacturer specifications and identified staff answers [21] |
| Constructed C5-like classical | 650 | 52 | 43 | **59 assumed** | **Flat assumed** | C5 scale/nut/nut-spacing [22]; explicit completion for missing values |

Equal string-center spacing, linear taper, the interpretation of endpoint spread as center-to-center, and a constant cylindrical surface remain declared constructions. Even the GS Mini is not a measured specimen mesh. The electric transfer does not establish PlayerII component compatibility. Classical flatness and bridge spacing are scenario assumptions, not freshly verified C5 specifications.

The GS Mini is a short-scale acoustic. It is not representative of all steel-string instruments. As an additional partial reference, Taylor's full-size314ce lists25.5in scale/1.75in nut, with staff-reported1.5in nut and2-3/16in bridge outer spread:647.7/44.45/38.1/55.5625mm. Radius was not completed from that page and this row is not one of the three census profiles. [23] The sampled nominal scale range596.9–650mm is a scenario range, not a market percentile interval.

Separate electric/acoustic/classical-like scenarios are useful, but continuous scale/spread/curvature parameters are the better analytical representation. Nut width is not string spread: using GS Mini nut width/5 would invent8.5725mm adjacent spacing instead of the declared7.3025mm. Neck thickness/contour, action, relief, string diameter and tension matter to thumb support, approach, clearance or force; unavailable values are not silently converted to zero.

## 8. Audit of integrated and prior physical metrics

Classes: **1** directly measurable/derivable physical geometry; **2** potentially population-calibratable proxy with a defined measurement target; **3** useful uncalibrated heuristic/model construct; **4** redundant for the intended role; **5** unsupported or misleading interpretation. Class2 is a research route, not current calibration. No row changes runtime behavior.

| Metric or assumption | Class | Construct and recommended research treatment |
|---|---|---|
| Stopped fret-wire span | 1;5 as fingertip reach | Retain comparator/instrument geometry. Wires are not mandatory fingertip centers |
| Minimum full-fret-cell longitudinal gap | 1 | Principal geometric lower bound; zero for adjacent cells is not zero whole-hand demand |
| Actual longitudinal contact separation | 1 if contacts measured;3 if selected | Contact fractions are unknown; distinguish intervals from chosen targets |
| Transverse/string-direction separation | 1;2 only after assignment/posture bridge | Principal separate geometric bound; not finger-abduction angle or available reach |
| Stopped-position dependence | 1 | Preserve individual frets, min/max, absolute x and taper. Raw fret span alone loses scale/position |
| Current partial-cover group count | 3;5 as anatomical minimum | Minimum over a declared contact vocabulary; retain contextual hypothesis and warnings, no finger-count proof |
| Alternative contact assignments | 3;2 with measured tasks | Anatomically meaningful, unavailable here. Ordered minimum partition count is identically1: class4/5 as an ambiguity feature |
| Same-fret multi-contact / barre width | 1 geometry;3 hypothesis | Record candidate interval/string gap/contact count; not required barre, pad fit, force or possible finger |
| Simultaneous group interactions | 3;2 with same-subject measurement | Keep nullable/unresolved; pair bounds and group count do not capture common-palm feasibility |
| Thumb dependence | 3;5 if inferred as necessity | Existing fallback removes low E diagnostically when allowed, tests remaining groups≤4 and fret proximity≤3. Neither thumb reach nor necessity is established |
| Open-string conflict | 1 topology;3 flat-contact rule | Open/lower stops block a flat covering interval; rejects that hypothesis, not the candidate. Whole-hand ringing clearance remains unsupported |
| Omitted-string / damping requirement | 1 request semantics;5 as generic geometry penalty | Unplayed strings impose no automatic left-hand damping. Required damping remains unsupported rather than assigned numeric demand |
| Scale normalization | 1 algebra;4 as replacement for mm | Retain as diagnostic of relative allocation; absolute separation remains necessary |
| String-spacing normalization | 1 algebra;5 as universal anatomical correction | Preserve actual millimetres and taper; index separation alone is inadequate |
| Common-palm reach | 3;2 with coupled geometry/functional data | Useful conditional-model construct; not calibrated by independently sampled digit lengths |
| Finger-specific assignment demand | 3;2 with matched digit tasks | Record assignment and operation explicitly if measured/modeled; unknown is not average demand |
| Planar pair-distance lower bound | 1 | Useful combined diagnostic; pairwise minima need not be jointly attainable; strongly redundant with longitudinal span in wide-span stratum |
| Full-cell midpoint diameter | 1 selected-target geometry;3 as demand proxy | Sensitivity illustration, not optimized reach, clearance or hand pose |
| Stopped/open/omitted count and distinct frets | 1 | Topology descriptors; not effort coefficients |
| >4/>5 groups; >95/>180mm thresholds | 3;5 as population boundaries | Preserve only as existing warning strata. No anthropometric calibration or normality interpretation |
| Restricted/personalized profile without support | 5 if presented as calibrated | Existing abstention is appropriate evidence labeling; no invented reference person |

Current computation is in [geometry.ts](C:/Projects/Guitar/src/domain/chord/engine/geometry.ts), [contactHypotheses.ts](C:/Projects/Guitar/src/domain/chord/engine/contactHypotheses.ts), [physical.ts](C:/Projects/Guitar/src/domain/chord/engine/physical.ts) and [types.ts](C:/Projects/Guitar/src/domain/chord/engine/types.ts). Ranking proxies are separate and unchanged.

## 9. Audit of explicit-model parameters

| Parameter family | Status under the new question | Treatment |
|---|---|---|
| Published radiographic segment means/SDs | Empirically measured at source landmarks | Preserve as source marginals; direct mapping to rotation centers remains uncalibrated |
| MCP base coordinates, common palm, link coupling | Calibratable with new joint data; currently plausible uncalibrated | No fabricated covariance or isometric population skeleton |
| Active flexion/abduction limits and coupling | Calibratable with matched protocol | Independent rectangular ROM limits do not establish jointly attainable fretting states |
| Pad/link/palm radii, tissue compliance, contact orientation | Plausible uncalibrated; measurable in principle | External finger breadth and axial tip tissue cannot supply these by relabeling |
| Scale/spread/radius | Defensible nominal sources or explicit assumptions per parameter | Geometry scenarios, no market/person weights |
| Action, string radius, force/tolerances | Setup and load measurements needed | Current geometric outputs omit them; no sound/force inference |
| Thumb, constructive barre/damping, tendon equilibrium, wrist/arm support, comfort | Unsupported in prior implementation | Missing model modes remain explicit |
| 96 sampled palm poses; shared contact fractions.55/.72/.88; DIP0/30/60/90; branch/rest choices | Numerical/search convenience | Neither anatomical limits nor probability distribution |
| Reconstruction tolerance10⁻⁶mm | Numerical convenience | Does not imply biological accuracy |
| Fixed-skeleton pair-reach certificate | Sound mathematical implication conditional on declared domain/parameters | Preserves one restricted exclusion; no generic or percentile human bound |

The corrected reassessment already distinguished the full contact domain from a finite search subset. The Em/A near-collision example and staggered contact diagnostic showed sensitivity to contact placement; eliminating one local collision did not establish an entire human realization. V2 runs no articulated solver and does not tune hand parameters until familiar shapes solve.

## 10. Recommended descriptive dimensions

The current research output is a **geometric demand vector**, with no calibrated human-envelope field. Its principal contents are:

1. **Longitudinal target freedom:** full-cell gap in mm, with stopped fret positions and wire-span comparator.
2. **Transverse target separation:** a bound in mm under named string spacing/taper, retained separately from longitudinal distance.
3. **Contact topology and hypotheses:** stop/open/omission pattern, estimated partial-cover groups and candidate same-fret interval sizes. These remain distinct variables, not a complexity score.
4. **Operation/support annotations:** requested damping, thumb hypothesis, unknown assignment, unknown common-palm/clearance/force. Unsupported operations are categorical missing support, not large numeric demand.

Planar lower bound and full-cell midpoint diameter are secondary geometry diagnostics. `optimalPartitionCount` is QA only. Finger-specific strain, barre force, thumb reach, common-palm capacity and comfort are not populated. The output's descriptive value does not require converting a missing measurement into a heuristic score.

## 11. Exact definitions and units

The offline domain is six strings with production index s=0 at high E and s=5 at low E; tab examples are printed in reverse, low E first. State−1 means unplayed,0 means open, and positive integer f means stopped fret. The research lookup covers frets0–15, matching this census. It must not be applied silently to higher-fret historical fixtures.

Let L,N,B,R be scale length, nut outer-string spread, bridge outer-string spread and board radius in **mm**. Radius null explicitly means a flat scenario, not missing information. All following are idealized geometry:

\[
x_f=L(1-2^{-f/12}),\qquad w(x)=N+(B-N)x/L,
\]
\[
y_s(x)=(s/5-1/2)w(x),\qquad z(y)=\sqrt{R^2-y^2}-R
\]

with z=0 in a declared flat scenario. The cylindrical formula describes a board surface, not actual string heights. For stopped target i=(s_i,f_i), define a planar full-cell segment

\[
S_i=\{(x,y_{s_i}(x)):x\in[x_{f_i-1},x_{f_i}]\}.
\]

Cell endpoints are a geometric relaxation; pressure at every endpoint is not assumed acoustically viable. For at least two stopped targets:

\[
W=x_{f_{max}}-x_{f_{min}},\quad
G_x=\max(0,x_{f_{max}-1}-x_{f_{min}}),
\]
\[
G_y=\max_{i<j}\operatorname{dist}(\pi_y S_i,\pi_y S_j),\quad
D_{xy}^{LB}=\max_{i<j}\min_{p\in S_i,q\in S_j}\|p-q\|_2.
\]

Projected interval distance is max(0,lo₁−hi₂,lo₂−hi₁). Planar segment distance uses exact analytic endpoint projections/intersection with floating-point arithmetic. `wireSpanMm=W`, `cellGapMm=Gx`, `transverseLowerBoundMm=Gy`, `planarLowerBoundMm=DxyLB`. Each has units mm. All are zero with fewer than two stopped targets. Open strings do not enter stopped target distance, but remain relevant to acoustic clearance and flat-contact compatibility.

For any complete selection p_i∈S_i, DxyLB≤maxᵢⱼ||p_i−p_j||. This is a lower bound on the diameter of **every selection**. The pairwise minima can require inconsistent choices for a shared target; their maximum is not necessarily the minimum globally attainable diameter. No finger identity or collision constraint occurs in this inequality.

Full-cell midpoint x̄_i=(x_(f_i−1)+x_f_i)/2 gives q_i=(x̄_i,y_i(x̄_i),z(y_i(x̄_i))). `midpointDiameterMm=maxᵢⱼ||q_i−q_j||₃D` is a chosen target construction, not a pose. It is not a bound on human capability.

The contact vocabulary contains singles and same-fret intervals whose interiors have no sounding lower fret or open string. Higher-fret stops and unplayed positions do not block a lower covering interval. `groups` is the minimum number of such groups covering the stopped targets. `maxCompatibleContacts` is the maximum count of same-fret targets in any compatible interval; `maxCompatibleStringGap` is its maximum string-index endpoint difference across all intervals, not mm. The two maxima need not describe the same hypothetical action. Width in mm, if needed, must retain the interval, chosen x and w(x); no necessary barre width is inferred.

The independent ordered-partition implementation matches production's bitmask minimum. Under this blocker rule every fret's maximal unblocked runs form a unique optimal partition, so `optimalPartitionCount=1`, including the empty product for no stops. This is why it cannot measure fingering alternatives.

Sensitivity windows replace each full cell by fractions[a,b] of its longitudinal extent for **planar/transverse bounds only**. `cellGapMm` and midpoint diameter remain explicitly full-cell references. When .5∉[a,b], the midpoint construction is outside that contact domain and is not an upper bound for the narrowed-domain optimization.

## 12. Population/reference representation and option assessment

Keep a source-indexed reference catalog with named measurement, landmarks, side, posture/load, sex/age/sample scope, mean/SD or empirical quantiles, covariance availability, uncertainty and quality flags. The S1 data permit a coherent measured external-dimension panel; NIOSH sources supply occupational marginals; functional sources supply differently defined task references. None should be labeled the generic adult guitarist population.

Do not assemble a “P5 hand” from several marginal P5 values, combine unrelated source means into a measured person, scale all bones by hand length, or use a sex/stature category to infer individual ability. Genuine same-record covariance is available for some external measurements; the decisive missing covariance/measurement concerns joint centers, loaded finger contacts, posture and assignment. Absence of that bridge remains even after the useful raw-data acquisition.

| Candidate representation | Assessment |
|---|---|
| A. No population model yet | **Supported principal decision.** Deliver the measured reference catalog and geometric vector as separate research outputs |
| B. Reference profiles only | Measured external panels are supported; small/central/large fretting profiles would imply an unsupported transformation |
| C. Multidimensional physical envelope | Geometric vector supported; population-relative envelope of fretting demand not yet calibrated |
| D. Calibrated scalar demand index | Unsupported coefficients, reduction target and construct bridge; would hide missing interactions |
| E. Hybrid reference + multidimensional envelope | Plausible future direction; not established merely by placing unrelated panels beside geometry |

A source quantile describes that source's measurement distribution. Even an exact empirical CDF F_X(t) is not an accommodation fraction when t is a different construct. Dividing a planar target bound by a flat index–little mean gives a cross-construct ratio; a constant denominator merely rescales the same feature. This study therefore omits those ratios from its principal output rather than calling them utilization or normality.

No TYPICAL/EXTENDED/DEMANDING/OUTSIDE_REFERENCE bands are justified. `unsupported` can describe missing analytical support, but is not the top end of an ordinal difficulty scale. Census P95 refers only to enumeration pairs. Anthropometric P95 refers only to the named measured variable/sample. Neither becomes player success probability.

## 13. Instrument normalization policy

Preserve millimetres as primary output. Preserve fret position and the complete string/fret allocation, since the same fret difference changes longitudinal distance along the neck and string taper changes transverse position. Use fret cells for contact freedom, retaining wire span for traceability to the existing evaluator.

W/L and Gx/L may accompany absolute distances for allocation comparison. With fixed frets they are independent of scale, so using them alone would erase real scale-length differences. With fixed N and B, w(x_f) is independent of L because x_f/L is fixed; changing L scales longitudinal coordinates without scaling transverse spread. Planar/3D distances therefore do not generally scale by L. A uniform scale of all lengths, including radius, is a different transformation and is tested separately.

Use actual or declared outer-string centers/taper, not nut width or string count as an anatomical normalization. Preserve board curvature separately; its small effect on midpoint Euclidean distance does not establish that radius is physically irrelevant to contact orientation, barre mechanics or clearance. Neck contour/thickness can enter a future thumb/support model only with its geometry and assumptions declared.

## 14. Role of the explicit model

The articulated model remains useful for exposing interactions, controlled sensitivity and conditional pose evidence. As a feature generator it can attach assumed digit assignments, common-palm coordinates, approach angles, collision margins and unsupported modes to a particular configuration. These are conditional model features, not automatically population demand.

It is not yet a defensible transformation from external anthropometry to a voicing's population envelope. Calibration would need matched kinematic landmarks, coupled joint behavior, tissue/contact mechanics and functional task measurements. More solver effort cannot supply those observations. Positive solves remain conditional witnesses; failure remains unresolved; the archived analytic exclusion remains restricted to its declared skeleton/domain. No solver success percentage is interpreted as population coverage.

## 15. Research tooling and schema

The implemented offline tools consume the integrated structural iterator and existing physical screen, then attach research geometry without ranking or storing the entire universe. They neither add production imports of research code nor alter runtime manifests.

| Artifact/tool | Purpose |
|---|---|
| [features.ts](C:/Projects/Guitar/scripts/physical-envelope-v2/features.ts) | Cell/spacing geometry tables and independent contact descriptors |
| [validate.ts](C:/Projects/Guitar/scripts/physical-envelope-v2/validate.ts) | Internal unit, transform, geometry and production-equivalence checks |
| [census.ts](C:/Projects/Guitar/scripts/physical-envelope-v2/census.ts) | Full480-request stream, original verdict strata, three geometry projections, histograms/correlations/slices |
| [sensitivity.ts](C:/Projects/Guitar/scripts/physical-envelope-v2/sensitivity.ts) | Fourteen examples, three profiles, one-axis controls and contact-window contrasts |
| [anthropometry-analysis.py](C:/Projects/Guitar/scripts/physical-envelope-v2/anthropometry-analysis.py) | Hash/schema-checked public S1 acquisition/aggregation, empirical quantiles and real covariance |

Current result schemas are named/versioned in each JSON. Source hashes, exact baseline, profile IDs and conventions accompany census/sensitivity outputs. Human measurement records retain units and definition IDs, rather than sharing the geometry feature field names. A future per-allocation export, if needed, should preserve this semantic schema (descriptive proposal; no runtime API added):

```text
identity: baseline, requestKey, statesHighEFirst, instrumentProfileId
productionObservation: unchanged status, reason codes, profile
geometry: wireSpanMm, fullCellGapMm, transverseLowerBoundMm,
          planarLowerBoundMm, fullCellMidpointDiameterMm
topology: stopped/open/omitted counts, groupHypothesisCount,
          compatible interval metadata
assumptions: contact domain, taper/surface model, operation semantics
support: digitAssignment/commonPalm/clearance/force/thumb/damping
         = measured | conditional-model | unsupported | not-requested
populationEnvelope: null
humanPredictiveValidity: absent
provenance: source/profile/script hashes; numerical and domain versions
```

Unsupported numeric dimensions must be null/absent with a reason, not0. `not-requested` is different from `supported`; no left-hand damping obligation is different from a solved damping action. Model or source changes must invalidate derived data by hash/version. Exact commands and acquisition details are in [reproduction.md](C:/Projects/Guitar/docs/research/physical-envelope-v2/reproduction.md).

## 16. Integrated universe analysis

The full stream covered20 chord qualities×12 roots×2 contexts, standard tuning and frets0–15. Every per-request survivor/PASS/UNCERTAIN/REJECT count matched the integrated control. Runtime was96.0seconds on Node22.16.0/win32 x64, with maximum observed RSS207.4MiB and8192 traversal nodes per batch. A2.88MiB bitset counted distinct allocations. This is one measured run, not a performance guarantee.

| Existing warning stratum | Pairs | Share of all pairs |
|---|---:|---:|
| Neither group nor span warning | 583,916 | 3.66% |
| Groups>4 only | 77,000 | 0.48% |
| Span>95mm only | 6,152,670 | 38.59% |
| Both | 9,130,093 | 57.26% |

Existing severe flags decompose into groups>5 only226,020, span>180mm only9,844,909 and both2,678,265; union12,749,194. These are current heuristic signals, not stronger evidence of population difficulty. The UNCERTAIN pool is heterogeneous even before anatomical data are attached.

The next table uses the GS Mini geometry projected onto the same allocations, while **retaining original647.7mm production status**. Histogram quantiles are containing1mm intervals; means use unbinned values.

| Feature, mm | PASS mean / median interval / P95 interval | UNCERTAIN mean / median interval / P95 interval |
|---|---|---|
| Wire span | 58.58 /[63,64) /[84,85) | 224.75 /[233,234) /[312,313) |
| Full-cell longitudinal gap | 39.92 /[43,44) /[69,70) | 207.92 /[215,216) /[297,298) |
| Transverse lower bound | 34.37 /[36,37) /[46,47) | 39.56 /[41,42) /[45,46) |
| Planar lower bound | 51.13 /[51,52) /[75,76) | 209.62 /[216,217) /[297,298) |
| Midpoint diameter | 67.48 /[70,71) /[93,94) | 232.93 /[240,241) /[322,323) |

Within PASS, wire/transverse Pearson r=.2962 and wire/planar r=.8637. Within UNCERTAIN, those are .0624 and .9990. Wire/cell and wire/midpoint correlations in UNCERTAIN are .9995 and .9997. Therefore a combined distance largely repeats longitudinal information in this universe, while transverse geometry adds a distinct description. These deterministic enumeration correlations are not human predictive validity or a basis for learned weights.

| Slice | PASS | UNCERTAIN | UNCERTAIN GS wire mean, mm |
|---|---:|---:|---:|
| Standalone context | 201,057 | 5,657,650 | 225.53 |
| Accompaniment context | 382,859 | 9,702,113 | 224.30 |
| Major quality, both contexts/roots | 16,269 | 249,677 | 219.37 |
| Maximum stopped fret1–7 | 129,572 | 317,392 | 132.09 |
| Maximum stopped fret8–12 | 229,668 | 4,522,651 | 197.05 |
| Maximum stopped fret13–15 | 224,461 | 10,519,720 | 239.46 |
| No stopped targets | 215 | 0 | — |

Maximum-fret strata can include a low first fret and high last fret; they are not confined high-position hand placements. Context/quality differences arise from structural request policy, not observed musical frequency. All20 quality, quality/context and exact maximum-fret slices, profile histograms and contact distributions are in [census-results.json](C:/Projects/Guitar/docs/research/physical-envelope-v2/census-results.json), with [analysis notes](C:/Projects/Guitar/docs/research/physical-envelope-v2/census-analysis.md).

Two post hoc illustrative allocations, low-to-high `12 15 x 0 x x` and `15 x x 0 x 12`, share PASS, two groups, two stopped strings, one open and frets12–15. Both GS wire spans are47.484mm; transverse bounds are8.470 versus46.274mm, planar bounds33.755 versus56.814mm. Their source harmonic contexts differ. The pair demonstrates missing geometry at fixed warning inputs, not a controlled human or harmonic validation.

Every other statistic retains request multiplicity:6,998,385 unique allocations are repeated across15,943,679 pairs. No confidence interval treating those pairs as independent people is meaningful. This generator-bounded universe is neither a repertoire distribution nor a representative sample of physical demand encountered by players.

## 17. Sensitivity analyses

The [sensitivity results](C:/Projects/Guitar/docs/research/physical-envelope-v2/sensitivity-results.json) contain42 example/profile rows,12 one-axis parameter values and three contact windows. Instrument, human and technique assumptions are separated.

| Controlled change | Observation | Interpretation |
|---|---|---|
| Scale596.9→647.7→650mm, fixed endpoint spacing and frets1–5 | Wire116.229→126.121→126.569mm; W/L=.1947207742 throughout; spread at fret5=41.2911mm throughout | Scale normalization hides a real longitudinal difference; transverse geometry does not scale with L alone |
| Electric assumed nut spread33/35/37mm; classical assumed bridge57/59/61mm | Raw per-example planar/transverse/midpoint changes retained | Parameter sensitivity, not manufacturer tolerances or population draws |
| GS radius241.3/381/flat, other inputs fixed | Partial-cover midpoint36.7063/36.7006/36.6968mm; planar/transverse unchanged by definition | Tiny diameter change does not test barre force, surface orientation or clearance |
| Contact window[0,1]→[.55,1]→[.72,1], GS wide-pair example | Planar lower bound169.845→181.860→185.581mm | Technique/contact-domain assumption materially moves a bound; none of these windows is population-calibrated |
| Lower `x x 4 3 2 1` versus upper `x x 10 9 8 7` | GS wire89.64→63.38mm while transverse22.21→25.47mm | Longitudinal compression and widening taper move different dimensions in opposite directions |
| Same allocation, unplayed versus required left-hand damping | Geometry unchanged; missing operation support differs | Operation semantics cannot be recovered from distances |
| Measured human source strata | Different marginal values and within-stratum dependence retained | No synthetic skeletal scaling; no solver/person sensitivity masquerading as empirical calibration |

The existing95/180mm boundaries are strict comparators applied to a geometric quantity, not discontinuities in that quantity's continuous scale dependence. For fixed stopped frets a<b, a threshold T is crossed at L*=T/(2^(−a/12)−2^(−b/12)). Nothing in the coordinate formula changes biologically at L*. Group count is discrete and vocabulary-dependent; it is not a calibrated continuous difficulty axis either. No warning boundary is moved to reduce uncertainty counts.

The [boundary audit](C:/Projects/Guitar/docs/research/physical-envelope-v2/warning-boundary.md) enumerates210 critical scales and reports seven contrasting quality slices. For frets6–10, the95mm crossing is at scale651.239122mm: a±0.1mm change moves span continuously from94.985412 to95.014588mm while the strict flag switches. Production integer-micrometre rounding is separately recorded; scale651242µm gives continuous95.000419761mm but rounded95000µm, so its strict flag is still false. For frets5–13 the180mm crossing is at649.312276mm. These are comparator diagnostics, not new verdicts or biological categories.

## 18. Diverse sanity examples

Full42-row output is in [sanity-examples.md](C:/Projects/Guitar/docs/research/physical-envelope-v2/sanity-examples.md). Examples include familiar patterns and deliberately synthetic allocations; the latter need not correspond to a default chord request. Familiarity is descriptive context, never an easy/playable label. Values below are GS Mini geometry with unchanged default production observation.

| Low-E-first allocation | Role | Groups / existing verdict | Wire / cell / transverse, mm |
|---|---|---|---|
| `0 2 2 0 0 0` | Compact open Em pattern | 1 /PASS | 0 /0 /7.42 |
| `x 3 2 0 1 0` | Open C pattern | 3 /PASS | 61.47 /31.62 /22.53 |
| `1 3 3 2 1 1` | Closed F/barre hypotheses | 3 /PASS | 61.47 /31.62 /36.51 |
| `x 3 5 5 5 3` | Nested covering hypotheses | 2 /PASS | 54.76 /28.17 /30.87 |
| `x x 10 9 8 0` | Opposing fret direction with an open string | 3 /PASS | 41.02 /21.10 /17.28 |
| `1 x x x x 8` | Broad synthetic pair | 2 /UNCERTAIN | 187.38 /165.02 /39.68 |
| `1 2 3 4 5 6` | Six-group synthetic target | 6 /UNCERTAIN | 141.33 /116.23 /38.90 |
| `5 0 5 0 5 0` | Same-fret targets separated by protected opens | 3 /PASS | 0 /0 /32.35 |
| `x 5 4 5 5 5` | Partial covering across a blocker | 3 /PASS | 26.59 /0 /32.35 |
| `3 1 2 4 5 x` | Optional low-E thumb fallback hypothesis | 5 /UNCERTAIN | 116.23 /89.64 /31.43 |
| `x 5 x 5 5 x` | Omission semantics | 1 /PASS | 0 /0 /24.27 |
| `0 0 0 0 0 0` | No stopped contacts | 0 /PASS | 0 /0 /0 |

Zero longitudinal span does not mean zero transverse target separation. A single estimated covering group is not an articulated witness. A thumb fallback observation is not proof that a thumb is necessary or that wrapping is feasible. No fretting contacts avoids the stopped-hand question but does not test the broader performance task.

## 19. Unsupported dimensions and evidence gaps

The decisive gap is matched functional measurement: simultaneous loaded contact configurations on declared guitar geometry, with digit identities, contact landmarks, posture and technique. This is needed to connect geometric demand to an ordinary/reference physical envelope independently of eventual success prediction.

Additional gaps are source representativeness; joint rather than marginal anatomy; active coupled ROM under load; repeatability/error; actual MCP/CMC coordinates; pad deformation/contact pressure; thumb support and neck contour; constructive barre/damping modes; action/tension/setup; and acoustic/force measurements. Existing anatomy sources are occupational, clinical, student or musician convenience samples. They cannot establish a universal adult guitarist reference distribution.

Instrument dimensions are nominal/constructed; no manufacturing/setup distribution was measured. Historical full model artifacts are missing locally, so no fresh solver or frozen-asset audit is claimed. ANSUR/Greiner retrieval gaps concern access, not assertions that their data do not exist. S1 publication inconsistencies remain visible. No extreme certificate is needed to answer the normal/reference question, and none is promoted here.

## 20. Validation levels

| Level | Work completed | Conclusion |
|---|---|---|
| Internal validity |15,625 exhaustive contact patterns matched production;3,375 cross-string fret-pair lower-bound checks against a deterministic grid; segment/unit/scale/spacing checks; integer-wire parity through fret15; all480 census rows and histogram/slice sums verified | Geometry and extraction internally checked within declared domain |
| Construct validity | Each feature tied to geometry/topology or marked conditional/unsupported; source landmarks and task definitions separated | Geometric constructs defensible; population fretting bridge **not established** |
| Descriptive sanity |14 diverse allocations×3profiles; one-axis controls; post hoc matched-warning geometry pair | Reveals distinctions and sensitivities; does not calibrate labels |
| Human predictive validity | No independent dataset links these features to held-out simultaneous voicing success, repeatability or comfort | **ABSENT** |

The maximum difference between continuous research wire differences and integrated integer-micrometre arithmetic through fret15 was0.000496334911mm, below0.5µm. This verifies numerical agreement, not anatomical precision. Grid checks test lower-bound consistency; analytic formulas and code inspection supply the mathematical interpretation. The primary literature does contain actual human task execution studies; “ABSENT” specifically applies to predictive validation of this study's proposed representation, not all research on guitarists.

## 21. Possible future uses — not authorized or implemented

This evidence may inform a separately adjudicated proposal for richer Physical explanations, named reference metadata or a future calibrated multidimensional envelope. Personalized profiles would require actual measurements and a validated mapping. Any use in Presentation, segmentation, policy or ranking requires separate research and authorization.

This study makes no decision about default hiding, Recommended/Explore surfaces, ranking penalties, deletion, PASS/UNCERTAIN remapping, new REJECT thresholds or UI behavior. It does not perform Stage10 retirement, release-gate work or deployment.

## 22. Warranted follow-up

One focused **measurement-bridge pilot** is warranted before more envelope modeling. Use a declared adjustable/measured fretboard setup; measure the same participants' external landmarks and simultaneous contact locations with named digits, posture, force/contact conditions and repeat observations. Include simple two-contact configurations plus selected additional-contact and barre conditions to test whether pairwise geometry transfers when other contacts are constrained. Record setup and acoustic outcome separately. Stratify/report the recruitment frame; do not claim population coverage from a pilot.

The first success criterion is construct matching and measurement repeatability: can a reproducible functional contact measure be defined that corresponds to the vector's geometry and exposes the missing interactions? Sample-size planning and representative population calibration should follow observed measurement variance and a declared target population, not an arbitrary “P95 hand.” Independent execution/comfort prediction would require a later held-out validation design.

Further source acquisition is useful only if it supplies coherent joint measurements or a better functional protocol. Restoring missing frozen artifacts would enable reproducibility checks, not by itself remove the calibration gap. Another synthetic solver sweep or coefficient fit to familiar chords is not warranted. All follow-ups are proposals; no human study or production experiment has been initiated.

## Sources and linked evidence

Primary references below support the literature tables. Detailed protocols, source-access limits and additional sources are in the linked evidence appendices. Derived census and sensitivity claims refer to this study's reproducible JSON/script outputs rather than external literature.

1. [Guan et al., US Truck Driver Anthropometric Study](https://pmc.ncbi.nlm.nih.gov/articles/PMC4698842/).
2. [Hsiao et al., Firefighter Hand Anthropometry, CDC primary PDF](https://stacks.cdc.gov/view/cdc/201534/cdc_201534_DS1.pdf).
3. [Buryanov & Kotiuk, Proportions of Hand Segments, author PDF](https://www.researchgate.net/profile/Viktor-Kotiuk/publication/295677869_Proportions_of_Hand_Segments/links/5b1eaaaba6fdcc69745bdea5/Proportions-of-Hand-Segments.pdf).
4. [ANSUR II official database owner](https://ph.health.mil/topics/workplacehealth/ergo/Pages/Anthropometric-Database.aspx).
5. [Khazri et al., Sabahan young-adult study and supporting data](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0273840).
6. [Greiner, Army hand anthropometry report copy, retrieval lead](https://www.ece.uvic.ca/~bctill/papers/mocap/Greiner_1992.pdf).
7. [Boyle, Boyle & Booker, primary conference paper](https://paskpiano.org/wp-content/uploads/2023/10/Boyle-Boyle-Booker-_APPCA-2015_Dec-2015.pdf).
8. [Kamaşak Arpaçay et al., guitarists and controls, primary PDF](https://dergipark.org.tr/en/download/article-file/5401241).
9. [Kuo et al., functional workspace study](https://pubmed.ncbi.nlm.nih.gov/18778954/).
10. [Bullock, Feix & Dollar, manipulation workspace, author PDF](https://www.eng.yale.edu/grablab/pubs/bullock_haptics2014.pdf).
11. [Leitkam, Bush & Bix, weighted fingertip space](https://pubmed.ncbi.nlm.nih.gov/24337062/).
12. [Heijink & Meulenbroek, guitar execution, author PDF](https://www.socsci.ru.nl/meulenbroek/Publications/Heijink%20en%20Meulenbroek%202002.pdf).
13. [Ngeo et al., finger motion measurement](https://link.springer.com/article/10.1186/1743-0003-11-122).
14. [van den Noort et al., PowerGlove comparison](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0164889).
15. [Reissner et al., finger-ROM reliability](https://pubmed.ncbi.nlm.nih.gov/31182129/).
16. [White et al., passive thumb CMC range](https://www.sciencedirect.com/science/article/pii/S0894113017300595).
17. [Holzbauer et al., thumb-abduction measurement methods](https://pubmed.ncbi.nlm.nih.gov/33019845/).
18. [Sung et al., biomechanical guitar hand model, institutional primary record](https://pure.psu.edu/en/publications/development-of-the-two-dimensional-biomechanical-hand-model-for-a/).
19. [Fender PlayerII Stratocaster specifications](https://www.fender.com/products/player-ii-stratocaster?variant=45947062911198).
20. [Fender American Series bridge component specifications](https://intl.fender.com/products/american-series-stratocaster-tremolo-bridge-assemblies).
21. [Taylor GS Mini specifications and staff Q&A](https://www.taylorguitars.com/guitars/acoustic/gs-mini).
22. [Córdoba C5 specifications](https://cordobaguitars.com/iberia/c5).
23. [Taylor314ce specifications and staff Q&A](https://www.taylorguitars.com/guitars/acoustic/314ce).

[1]: https://pmc.ncbi.nlm.nih.gov/articles/PMC4698842/
[2]: https://stacks.cdc.gov/view/cdc/201534/cdc_201534_DS1.pdf
[3]: https://www.researchgate.net/profile/Viktor-Kotiuk/publication/295677869_Proportions_of_Hand_Segments/links/5b1eaaaba6fdcc69745bdea5/Proportions-of-Hand-Segments.pdf
[4]: https://ph.health.mil/topics/workplacehealth/ergo/Pages/Anthropometric-Database.aspx
[5]: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0273840
[6]: https://www.ece.uvic.ca/~bctill/papers/mocap/Greiner_1992.pdf
[7]: https://paskpiano.org/wp-content/uploads/2023/10/Boyle-Boyle-Booker-_APPCA-2015_Dec-2015.pdf
[8]: https://dergipark.org.tr/en/download/article-file/5401241
[9]: https://pubmed.ncbi.nlm.nih.gov/18778954/
[10]: https://www.eng.yale.edu/grablab/pubs/bullock_haptics2014.pdf
[11]: https://pubmed.ncbi.nlm.nih.gov/24337062/
[12]: https://www.socsci.ru.nl/meulenbroek/Publications/Heijink%20en%20Meulenbroek%202002.pdf
[13]: https://link.springer.com/article/10.1186/1743-0003-11-122
[14]: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0164889
[15]: https://pubmed.ncbi.nlm.nih.gov/31182129/
[16]: https://www.sciencedirect.com/science/article/pii/S0894113017300595
[17]: https://pubmed.ncbi.nlm.nih.gov/33019845/
[18]: https://pure.psu.edu/en/publications/development-of-the-two-dimensional-biomechanical-hand-model-for-a/
[19]: https://www.fender.com/products/player-ii-stratocaster?variant=45947062911198
[20]: https://intl.fender.com/products/american-series-stratocaster-tremolo-bridge-assemblies
[21]: https://www.taylorguitars.com/guitars/acoustic/gs-mini
[22]: https://cordobaguitars.com/iberia/c5
[23]: https://www.taylorguitars.com/guitars/acoustic/314ce

Advancing to a calibrated hybrid requires matched functional measurement and a declared reference population; this study supplies the geometry and source audit needed to design that work.

**A. NO POPULATION MODEL YET**
