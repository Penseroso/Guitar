# Anthropometry evidence for Physical Envelope Study v2

Research-only synthesis, 2026-09-13. Baseline verified: `32f9d3f8a71dc0d2a5f18520bfad738e67ba26c0`. Scope follows [scope-check.md](scope-check.md). Earlier physical-study files are absent in this checkout; none is treated as newly inspected evidence here.

**Measured hand dimensions can supply named population references. They cannot convert longitudinal fret span or inferred contact groups into a validated percentage of players able to execute a voicing.** Keep instrument demand in millimetres and hand measurements with their original landmarks. Any comparison across unlike constructs is exploratory normalization, not accommodation or success.

## Source and construct register

| ID | Primary source; date | Population and sample | Measurement/units | Usable evidence and limits |
|---|---|---|---|---|
| A1 | Guan, Hsiao, Bradtmiller, Kau, Reed, Jahns, Loczi, Hardee & Piamonte, *U.S. Truck Driver Anthropometric Study and Multivariate Anthropometric Models for Cab Designs*; 2012 | US Class-A truck drivers, Jan 2008–Mar 2009; 1,779 men, 171 women | Right hand, palm on table; stylion–middle fingertip length; metacarpale II–V breadth; mm | Sex-specific weighted marginal mean/SD/P5/P95; occupational reference, no hand covariance extracted. [Primary paper, Appendices A–C](https://pmc.ncbi.nlm.nih.gov/articles/PMC4698842/) |
| A2 | Hsiao, Whitestone, Kau & Hildreth, *Firefighter Hand Anthropometry and Structural Glove Sizing: A New Perspective*; December 2015 | US firefighters, 2009–2012; 951 recruited, 943 analyzed (855 men/88 women), ages 18–65 | Right-hand 2D scans, fingers naturally open; external hand, palm, thumb/digit dimensions; mm | Fourteen sex-specific means/SDs; measured multivariate shape variation; selected occupation and posture. [Primary CDC PDF, Tables 2–4, 7; Appendix A](https://stacks.cdc.gov/view/cdc/201534/cdc_201534_DS1.pdf) |
| A3 | Buryanov & Kotiuk, *Proportions of Hand Segments*; 2010 | 66 adult clinical patients, ages 19–78, no bone pathology/deformity; sex distribution unspecified | AP radiographic interarticular lengths; right-hand summary; mm | Digit-specific segment means/SDs; no joint covariance, population quantiles or sex-specific profiles. [Primary author PDF, Table I](https://www.researchgate.net/profile/Viktor-Kotiuk/publication/295677869_Proportions_of_Hand_Segments/links/5b1eaaaba6fdcc69745bdea5/Proportions-of-Hand-Segments.pdf) |
| A4 | US Army ANSUR II owner database; survey Oct 2010–Apr 2012; owner page updated March 2025 | Army active duty, Reserve, National Guard; 4,082 men/1,986 women | 93 direct measures, including hand length/breadth/circumference and palm length | Subject records exist, permitting genuine within-sample covariance. Owner description verified; raw files/manual/report not retrieved here. No unverified numerical ANSUR II statistics imported. [Official owner](https://ph.health.mil/topics/workplacehealth/ergo/Pages/Anthropometric-Database.aspx), [Army release](https://www.army.mil/article/188601/for_good_measure_natick_releases_raw_data_from_army_wide_anthropometric_survey) |
| A5 | Khazri, Shimmi & Parash, *A multivariate analysis to propose linear models for the stature estimation in the Sabahan young adult population*; 30 Aug 2022 | 368 university students, 184/sex, 46 per ethnicity/sex stratum, age 18–25 | Wrist-crease hand length, knuckle breadth, middle-finger crease–tip length, middle inter-crease distance, thumb–little span; cm | S1 workbook acquired and reanalyzed: actual within-sex covariance and empirical quantiles; partial resolution of publication inconsistencies. [Publisher](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0273840) |
| A6 | Greiner, *Hand Anthropometry of U.S. Army Personnel*, NATICK/TR-92/011; Dec 1991 | 1987–1988 Army; working subset 1,003 men/1,304 women | 64 photographic plus 22 direct dimensions | Primary report indexed with correlation/regression/percentile tables; full table retrieval failed. Bibliographic lead only. [Primary report copy](https://www.ece.uvic.ca/~bctill/papers/mocap/Greiner_1992.pdf) |

## Quantitative reference values

### A1: occupational whole-hand marginals

All values are mm; mean and SD are weighted. P50 was not supplied in Appendix C and is not assumed equal to the mean.

| Sex | Dimension | n | Mean | SD | P5 | P95 |
|---|---|---:|---:|---:|---:|---:|
| Male | Hand length | 1779 | 196 | 10.10 | 180 | 214 |
| Male | Hand breadth | 1779 | 90 | 4.82 | 82 | 98 |
| Female | Hand length | 171 | 177 | 8.48 | 163 | 190 |
| Female | Hand breadth | 171 | 79 | 3.90 | 74 | 87 |

The paper weights age and race/ethnicity within sex. Training interobserver mean absolute differences were 4 mm for hand length and 2 mm for breadth, versus population SDs above. Measurement error and population spread are different quantities. The study's “thumb-tip reach” is a whole-arm forward-reach measure, not thumb length or thumb reach around a guitar neck. [A1, Appendices A–C](https://pmc.ncbi.nlm.nih.gov/articles/PMC4698842/)

### A2: external palm and digit dimensions

Entries are mean ± SD in mm; n=855 men and 88 women throughout. These are **external dimensions**, not bone lengths or articulated-link parameters.

| Dimension | Men | Women |
|---|---:|---:|
| Hand length | 197.6 ± 9.3 | 182.7 ± 8.7 |
| Hand breadth | 97.2 ± 4.6 | 87.4 ± 4.2 |
| Palm length | 113.8 ± 5.8 | 104.0 ± 5.7 |
| Palm breadth | 96.0 ± 4.6 | 85.3 ± 4.2 |
| Thumb length | 70.8 ± 4.3 | 64.8 ± 4.1 |
| Thumb breadth | 24.4 ± 1.6 | 21.5 ± 1.5 |
| Index length | 75.8 ± 4.4 | 71.3 ± 4.2 |
| Index breadth | 22.7 ± 1.6 | 20.5 ± 1.2 |
| Middle length | 83.8 ± 4.6 | 78.6 ± 4.5 |
| Middle breadth | 22.4 ± 1.7 | 20.3 ± 1.3 |
| Ring length | 79.6 ± 4.5 | 74.0 ± 4.5 |
| Ring breadth | 21.7 ± 1.6 | 19.4 ± 1.2 |
| Little length | 65.2 ± 4.3 | 60.4 ± 4.3 |
| Little breadth | 19.8 ± 1.5 | 17.5 ± 1.2 |

Hand length runs from wrist crease to middle tip; palm length ends at the middle-finger base furrow. Digit lengths run base-to-tip; breadths are measured at the first knuckle from the base. Palm breadth uses transverse palmar creases; hand breadth joins outer index/little MCP-level points. None is compressed pad-contact width. [A2, Table 2 p.1363 and Appendix A pp.1374–1375](https://stacks.cdc.gov/view/cdc/201534/cdc_201534_DS1.pdf)

Quality check: Table 2 reports male hand length **197.6**; discussion/Table 9 report **196.6**. The former agrees with its 113.8+83.8 palm-plus-middle decomposition. Preserve the discrepancy rather than silently repairing the source. The source also distinguishes naturally spread from closed-finger breadth; importing its ~97 mm breadth beside A1's ~90 mm without posture qualification would conflate methods and populations. Table 8's P2.5/P97.5 are within proposed glove clusters, not whole-population percentiles.

The study supplies real multivariate evidence: PCA of 12 dimensions accounts for 56.2% in overall size and another 20.1% in breadth-versus-length shape. Full covariance cannot be reconstructed from just those two components. Its combined-sex PCA is dominated by men and does not justify an unweighted general-population mixture. Reported PC1–PC2 correlations differ by sex: −.056 men, −.228 women. Glove fit is a separate observed endpoint and cannot become guitar validation. [A2, Table 7 and discussion](https://stacks.cdc.gov/view/cdc/201534/cdc_201534_DS1.pdf)

A limited, explicitly **derived** covariance is possible because this measurement system defines hand length = palm length + middle-finger length. From rounded Table 2 SDs,
`Cov(palm,middle)=(SD(hand)^2−SD(palm)^2−SD(middle)^2)/2`:
men ≈15.845 mm² (r≈0.594); women ≈11.475 mm² (r≈0.447). This uses an observed within-person identity, not assumed independence. Rounding and the hand-length discrepancy limit precision; it supplies neither other correlations nor a full synthetic-person distribution.

### A3: radiographic segments

Mean±SD in mm. Thumb has no middle phalanx.

| Digit | Proximal | Middle | Distal | Metacarpal | Axial tissue beyond distal bone |
|---|---:|---:|---:|---:|---:|
| Thumb | 31.57±3.13 | — | 21.67±1.60 | 46.22±3.94 | 5.67±0.61 |
| Index | 39.78±4.94 | 22.38±2.51 | 15.82±2.26 | 68.12±6.27 | 3.84±0.59 |
| Middle | 44.63±3.81 | 26.33±3.00 | 17.40±1.85 | 64.60±5.38 | 3.95±0.61 |
| Ring | 41.37±3.87 | 25.65±3.29 | 17.30±2.22 | 58.00±5.06 | 3.95±0.60 |
| Little | 32.74±2.77 | 18.11±2.54 | 15.96±2.45 | 53.69±4.36 | 3.73±0.62 |

These landmarks are not validated rotation centres. Axial tip tissue is not pad radius. Metacarpal length does not locate MCP bases in a common 3D palm. Summing mean segments is algebraically permissible; summing SDs or independently sampling them is not an empirical distribution of digit length. No raw covariance or percentile table was supplied. [A3, Table I p.757](https://www.researchgate.net/profile/Viktor-Kotiuk/publication/295677869_Proportions_of_Hand_Segments/links/5b1eaaaba6fdcc69745bdea5/Proportions-of-Hand-Segments.pdf)

## Actual covariance, missing access and exclusions

A4 is the strongest identified route to coherent **whole-hand** reference records: compute statistics within its supplied sex strata and preserve each person's joint measurements. The official owner specifically warns against naïvely combining the male and female databases. ANSUR II does not supply all phalangeal dimensions or a loaded guitar posture. The official report is Gordon et al., *2012 Anthropometric Survey of U.S. Army Personnel: Methods and Summary Statistics*, NATICK/TR-15/007; the measurement handbook is Hotzman et al. (2011), NATICK/TR-11/017. Official raw/report URLs and institutional mirror fetches failed in this run; this is a retrieval gap, not absence of published data. [A4 owner](https://ph.health.mil/topics/workplacehealth/ergo/Pages/Anthropometric-Database.aspx)

A5's [published S1 workbook](https://journals.plos.org/plosone/article/file?id=10.1371/journal.pone.0273840.s001&type=supplementary) was acquired and checked: 44,594 bytes, SHA256 `3f2847df30f9180029a3e4f62d63f467377455750f076796ee3750b6fc550aea`. It has one sheet, `statureestimation`, 368 complete records and no identifier field. `ethnct` contains four named ethnic strata and `gdr` contains Female/Male; each cross-stratum has 46 records. The eleven numeric columns are stature and bilateral HL/HB/HS/MFL/2ICL. The methods explicitly give centimetres; analysis multiplies by 10 for mm and by 100 for covariance in mm². No dimension was inferred from another or silently relabeled.

Recomputation supports the methods' n=368 against Table 5's n=463. Stature–left-hand-length r=.784562 rounds to Table 7's .785 and conflicts with Table 5/abstract .842. Right-hand r=.778613 differs slightly even from Table 7's .777, and clearly from Table 5/abstract .833. The source of the remaining differences is unknown. These are source-record statistics, not an endorsement of every published regression.

The [recomputed aggregate table](anthropometry-sabahan.md) and [full aggregate JSON](anthropometry-sabahan.json) contain actual covariance rather than assumed independence. Selected left-hand values, mm:

| Source sex stratum | Dimension | Mean ± sample SD | Empirical P5 / P50 / P95 |
|---|---|---:|---:|
| Female, n=184 | Hand length | 169.64 ± 7.59 | 158.14 / 169.31 / 182.38 |
| Female, n=184 | Hand breadth | 74.03 ± 3.62 | 68.37 / 73.79 / 80.16 |
| Female, n=184 | Middle-finger length | 73.15 ± 4.08 | 66.56 / 73.12 / 79.77 |
| Female, n=184 | Wide thumb–little span | 155.34 ± 12.99 | 135.65 / 154.56 / 178.62 |
| Male, n=184 | Hand length | 184.23 ± 7.57 | 171.53 / 184.81 / 195.63 |
| Male, n=184 | Hand breadth | 82.66 ± 3.95 | 75.64 / 82.69 / 88.72 |
| Male, n=184 | Middle-finger length | 79.12 ± 4.07 | 72.50 / 79.02 / 86.23 |
| Male, n=184 | Wide thumb–little span | 172.03 ± 12.74 | 150.52 / 172.00 / 194.45 |

Pooling changes the apparent relationship substantially: left length–span r=.6193 pooled, .4771 female and .3194 male; left length–breadth r=.7796 pooled, .5639 female and .5238 male. Actual sample Cov(left length,left span) is 47.057 mm² female and 30.797 mm² male; Cov(left length,left breadth) is 15.502 and 15.654 mm². These are within-person measurements but still marginal over the four equally sampled ethnic groups within each sex. They are neither population weights nor sex-independent causal relations.

Quality screening found zero missing/nonfinite/nonpositive values and zero exact duplicate complete records. A descriptive 1.5×IQR screen within each sex flagged at least one numeric dimension in 12 female and 18 male records; **all were retained**. An outlier flag is not evidence of a bad record. Quantiles use empirical linear interpolation; covariance/SD use n−1. The [reproduction script](../../../scripts/physical-envelope-v2/anthropometry-analysis.py) checks schema, counts and source hash, records versions, and emits only aggregates. No synthetic people, distribution fitting or tail extrapolation is performed.

This gives a measured reference panel for its stated external constructs, not an articulated population model. The reported span protocol is wide thumb–little spread; its values cannot be interpreted as fingertip separation while pressing strings, or pooled with a different span protocol. The source supplies no repeat measurements in S1, joint-centre coordinates, thumb segment dimensions, force, loaded posture or guitar execution outcomes. Source-defined sex/ethnicity groups and university selection limit transfer. Published discrepancy flags remain visible even after raw-data analysis.

A related Khazri et al. 2023 [BJMS baseline paper](https://jurcon.ums.edu.my/ojums/index.php/bjms/article/download/3780/2729) is quarantined from numerical calibration: methods specify 46×8=368 while Table 4 labels 42×8=336; Table 3's IQR column is inconsistent with its quartiles (e.g. 16.36 versus 18.55−16.92=1.63). Authors, location and collection dates overlap A5; independence is unestablished. Do not repair values by guessing or count it as an independent cohort.

## Recommended research use

1. Publish a feature vector of **instrument demands** separately from a catalog of measured hand-reference dimensions. Include exact contact/fret definitions and instrument scale/spread/curvature.
2. Allow clearly labeled dimensionless normalizations such as longitudinal demand / named hand-length P50 **only when P50 was actually supplied**. Otherwise use the reported mean and say mean. This is a scale comparison, not a percentile of physical capability.
3. Use A1 P5/P95 solely as one-dimensional reference markers. They are not “small/large hands” with matched breadth, fingers or thumb. Do not combine female P5 length, male P95 breadth and A3 mean fingers into a purported measured individual.
4. If raw joint records become available, empirical joint resampling within a declared source population is preferable to independent marginals. Preserve covariance and demographic/source scope; refrain from extrapolating the tails or asserting population coverage outside that source.
5. Separate hand breadth from MCP base spread, digit external length from joint-centre link lengths, thumb length from opposition/reach, finger breadth from compressed contact patch, and maximum flat spread from reach while fretting.
6. Treat sex, age and stature as study strata or covariates. Do not infer an individual's reach from group membership. Cross-sectional age or occupational differences cannot identify training effects.
7. Do not translate any listed value into hard rejection, PASS eligibility, ranking, hiding, comfort or execution probability.

The missing bridge is a same-subject dataset connecting these dimensions to declared guitar configurations, finger assignments, loaded reach/contact, repeatability and sound outcomes. Without it, the defensible output is a **population-referenced description of demand with construct mismatch visible**, not a population playability envelope.
