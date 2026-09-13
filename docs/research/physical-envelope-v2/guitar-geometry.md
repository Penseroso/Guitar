# Guitar geometry for Physical Envelope Study v2

Research-only reference geometry; sources inspected 2026-09-13. Scope follows [scope-check.md](C:/Projects/Guitar/docs/research/physical-envelope-v2/scope-check.md). Numerical records and parameter-level provenance are in [instrument-profiles.json](C:/Projects/Guitar/docs/research/physical-envelope-v2/instrument-profiles.json).

The strongest complete same-model reference found is the Taylor GS Mini. The electric and classical numerical references are explicitly constructed completions of partial manufacturer specifications. They are useful dimensional contrasts, not three measured specimens, market means, instrument percentiles, or a joint distribution. No geometry result here establishes human success, comfort, or rejection.

## Reference dimensions

All values below are millimetres. Extra decimal places preserve inch conversion; they do not indicate manufacturing precision.

| Analysis profile | Scale | Nut width | Outer-string spread at nut | Outer-string spread at bridge | Board radius | Evidence class |
|---|---:|---:|---:|---:|---:|---|
| Constructed Strat-like electric | 647.7 | 41.91 | **35 assumed** | **52.3875 transferred component value** | 241.3 | Constructed |
| Taylor GS Mini | 596.9 | 42.8625 | 36.5125 | 55.5625 | 381 | Same-model nominal manufacturer reference |
| Constructed C5-like classical | 650 | 52 | 43 | **59 assumed** | **Flat assumed** | Constructed |

Fender's Player II product specifies a 25.5-inch scale, 1.650-inch nut and 9.5-inch radius; its rounded metric equivalents are not substituted for exact inch conversions. Actual nut and bridge outer-string endpoints were not established for this model. The constructed electric combines those dimensions with a chosen 35-mm nut spread and the 2-1/16-inch spread of a separately documented Fender bridge. That component is listed for American/American Standard instruments of 1986–2007; the transfer does not establish factory Player II geometry or component compatibility. [Player II specifications](https://www.fender.com/products/player-ii-stratocaster?variant=45947062911198), [separate Fender bridge specifications](https://intl.fender.com/products/american-series-stratocaster-tremolo-bridge-assemblies).

Taylor's product page and identified staff answers supply the GS Mini's scale, both string-spacing endpoints, nut width and radius. The staff answers distinguish nut spacing from nut width. Treat overall spacing as outer-string center span for the model; the page does not explicitly define center-versus-edge measurement, so specimen measurement remains necessary for contact precision. First-fret neck thickness is 21.336 mm. These are nominal specifications without tolerances. [GS Mini product and staff Q&A](https://www.taylorguitars.com/guitars/acoustic/gs-mini).

Córdoba's C5 page specifies 650-mm scale, 52-mm nut, 43-mm nut string spacing, and neck thicknesses of 21/24 mm at frets 1/9. It does not supply the required bridge spread or radius. Therefore 59 mm and a flat board are marked constructed assumptions. Córdoba explicitly describes a flat board for the different Stage Traditional CD model; that supports a classical-type scenario, not a transfer of certainty to C5. Native metric C5 specifications take precedence over its coarsely rounded inch equivalents. [C5 specifications](https://cordobaguitars.com/iberia/c5), [Stage Traditional CD](https://cordobaguitars.com/stage/stage-traditional-cd/).

A historical dealer-hosted C5 catalogue listed a 59-mm saddle spread, but its current-model applicability and primary authorship were not independently established. It was deliberately not promoted into current C5 provenance. This avoids silently mixing dates/models into a purported coherent manufacturer profile.

## Which width is being modeled?

Nut width is the material/neck boundary. Outer-string spread is the distance between the outer string centerlines. Individual neighboring-string intervals are a third quantity. Dividing nut width by five conflates them and places the outer strings on the nut edges.

Even dividing actual outer spread by five assumes equal center spacing. A technical instrument-building source describes this as a starting layout and then discusses adjusting for differing string diameters. Endpoint spread alone does not recover actual intermediate slot centers. The current numeric profiles use equal centers as a disclosed simplification; a precision contact model would need measured centers or a declared spacing/gauge rule. [StewMac assembly guidance, page 22](https://www.stewmac.com/globalassets/video-and-ideas/online-resources/building-instruments/bluegrass-resomaster-assembly/download-bluegrass-resomaster-assembly-instructions).

This distinction matters to apparent pad congestion. Using the GS Mini nut width as its string spread would change the modeled adjacent interval from 7.3025 to 8.5725 mm: an artificial increase of 1.27 mm. That is a modeling error, not evidence of more finger clearance.

## Explicit geometric construction

Let L be nominal scale, N the outer nut spread, B the outer bridge spread, and x the longitudinal distance from nut toward bridge. Use:

- Fret-wire position: x(n) = L × (1 − 2^(−n/12)).
- Outer spread along straight centerlines: W(x) = N + (B − N) × x/L.
- Equal-center string position: y(s,x) = (s/5 − 1/2) × W(x), with high E index 0 and low E index 5.
- Constant-radius surface: z(y) = sqrt(R² − y²) − R, or z = 0 for the explicit flat scenario.
- A stopped contact at fret n is allowed somewhere in the cell between wires n−1 and n; selecting a midpoint or a near-wire fraction is an additional research assumption.

The first equation is the declared equal-tempered scale model. The remaining equations are an idealized construction from endpoint geometry, not a manufacturer claim of an exact cylindrical board or uniform slot layout. It ignores individual saddle compensation, relief, action, fret crown, string radius and compliance. A surface point is not the surface of a fingertip or an articulated hand pose.

Under this construction the twelfth-fret spread is exactly (N+B)/2. The following are derived checks, not additional measurements:

| Profile | Adjacent interval at nut | Outer spread at fret 12 | Adjacent interval at fret 12 | Fret-wire 1→5 longitudinal separation |
|---|---:|---:|---:|---:|
| Constructed electric | 7.0000 | 43.6938 | 8.7388 | 126.121 |
| GS Mini reference | 7.3025 | 46.0375 | 9.2075 | 116.229 |
| Constructed classical | 8.6000 | 51.0000 | 10.2000 | 126.569 |

These rows illustrate different demand dimensions. A shorter scale reduces longitudinal distance for a fixed fret allocation, while endpoint string spread and radius change transverse geometry separately. That does not establish that one profile is globally easier.

The offline census may compute planar contact-cell separation, midpoint surface target diameter and compatible flat-contact interval width from these coordinates. Label the first as a lower-bound distance *within the declared planar contact-cell model*, and the latter quantities as chosen-target geometry. None supplies coupled finger reach, collision-free placement, fretting force, damping or a hand-success prediction. A compatible interval is not a proved anatomical barre.

## Sensitivity design and interpretation

The JSON separates manufacturer profiles, full numeric analysis profiles, and one-dimensional scenarios. Missing values in manufacturer records are omitted and listed under missingParameters; radiusMm = null means flat only. Every numeric completion has an assumed flag and reason.

Use the actual GS Mini nominal row as the central complete reference. Compare the two constructed rows with their status visible. For attribution, independently vary one dimension while retaining the base record:

- Electric nut endpoint: 33, 35, 37 mm.
- Classical bridge endpoint: 57, 59, 61 mm.
- GS Mini scale only: 596.9, 647.7, 650 mm.
- GS Mini radius only: 241.3, 381 mm, flat.

These levels are declared sensitivity choices. They are not observed limits, tolerances, probability intervals or small/medium/large population bins. A GS Mini with changed scale or radius is a constructed control, not a catalog variant. Do not combine all dimensions into an unweighted collection and label its aggregate result population coverage.

At fixed fret number, x/L is fixed, so changing only scale changes longitudinal distances but not the modeled transverse spread. This gives an interpretable sanity check. At fixed physical x, changing scale also changes the taper fraction; state which comparison is intended.

## Contact-relevant gaps

Neck thickness matters only if a future construct models palm/thumb wrapping, support or neck collision. The isolated thickness values preserved in JSON do not define a cross-section, neck taper, shoulder contour or joint reach. They should not be inserted into a planar demand index merely because they are available.

The current study still lacks matched specimen measurements of nut/saddle center positions, equal-gap versus equal-center layouts, board profile along the neck, relief/action under pitch, fret crown dimensions, string diameters and compensation. The source geometry also lacks manufacturing variance and a sampling frame for the guitar market. No correlations between these properties have been estimated.

Accordingly, these profiles support transparent instrument-conditioned geometry and controlled sensitivity. They do not justify a universal physical threshold, a percentile of playable chords, or reclassification of the existing production verdicts.

