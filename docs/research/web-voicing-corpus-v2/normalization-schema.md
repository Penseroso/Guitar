# Normalized observation and mapping schema

This document describes the implemented [mapper](../../../scripts/web-voicing-corpus-v2/engine-map.ts), source adapters and [final evaluation protocol](evaluation-protocol.md). Files are research records, not a runtime chord database. Source selection, musical identity, exact physical allocation, production physical annotations and empirical support remain separate.

## Canonical source rows

Each normalized input contains a `rows` array. The mapper also accepts a bare row array. Source wrappers retain their own schema/version and provenance fields; the mapper does not pretend they are identical source formats. Every source row is preserved unchanged in the mapping result's `row` field, in input order, including excluded records.

| Field | Actual meaning and handling |
|---|---|
| `rowId` | Unique provenance observation ID. The CLI rejects duplicate IDs. This is not allocation identity. |
| `sourceId`, `lineageId` | Immediate source and conservative source family. Mirrors, related Wikimedia surfaces and copied variants do not create independent families. Both are required for mapping. |
| `rawLabel` | Retained source label. The parser recognizes a conservative root/suffix/optional slash grammar. It does not infer a replacement label from pitches. |
| `rootPitchClass`, `chordId`, `slashBassPitchClass` | Optional reviewed normalization. Pitch classes are integers 0–11. Missing values may be resolved from the recognized label; unresolved or invalid values exclude the row. Source adapters may retain a null unresolved root, which the boundary rejects. Conflicts between recognized raw labels and supplied normalized values are exclusions. |
| `statesHighToLow` | Six physical strings, high E to low E. `-1` means unplayed, `0` open, positive integer absolute nut-relative fret. Null means missing structural information, never six muted strings. Accepted study frets are 0–15. |
| `tuningMidiHighToLow` | Six actual open-string MIDI pitches. Accepted study value is `[64,59,55,50,45,40]`. Null, altered or unresolved tuning excludes the row from this default-domain comparison. |
| `capoFret` | Accepted value is explicit/verified zero. Null means unresolved; nonzero capo is outside this uncapoed study domain. A diagram's first displayed fret is not a capo. |
| `orientationConfidence`, `labelConfidence` | `explicit`, `verified` or `ambiguous`. Only the first two pass the mapping boundary. Confidence concerns interpreting source notation, not confidence that a shape is preferred or easy. |
| `context` | `standalone` or `accompaniment`. Absent means the compiler's standalone default. The acquired reference rows and six Wikibooks open-prose rows declare standalone; Kansas and the six jazz diagrams declare accompaniment based on teaching context. Missing roots never trigger automatic context changes. |
| `originClassification`, `eligibleCuratedVote` | Curated merged rows use `MANUAL_SELECTION_EVIDENCED` and `true`; open-reference rows remain `UNKNOWN` and `false`. Eligibility is still conditional on confident interpretation/mapping for model fitting. The mapper preserves these fields; the evaluator explicitly filters them. |
| Source extensions | Page/diagram locators, URLs, asset hashes, attribution, license, native records, extraction method, fingering alternatives and source presentation metadata remain attached. They do not change engine membership or scores. |

Source fingerings intentionally retain two native adapter forms. Structured references use `sourceProvidedFingeringHighToLow`, one vector or null. Educational rows use `sourceProvidedFingeringsHighToLow`, a list of explicitly shown alternatives. These may include zero, null, numeric finger IDs or source-native strings. Finger IDs are not fret numbers. Null fingering annotations do not imply an unplayed string; `statesHighToLow` supplies the allocation. Alternative fingerings do not create additional empirical observations. Neither field supplies a human-ease label or overrides engine contact hypotheses.

`sourcePresentation` records such categories as `chapter-primary-example` and `selected-root-position-exercise`; these are local pedagogical roles. Reference `sourceOrder` preserves array order. ChordPro's `primaryRecommendation:true` means the configured default diagram for that label; it is still an UNKNOWN-origin reference record and cannot establish manual preference. Chords-db leaves `primaryRecommendation:null`; position array order is not converted to an endorsement rank.

## Source-specific conversion

| Source | Conversion and preserved limits |
|---|---|
| tombatossals/chords-db | Native `frets` and `fingers` run low E to high E. Positive displayed frets become `fret + baseFret - 1`; zero and -1 stay unchanged, then vectors reverse. The source `capo` boolean describes barre rendering, not a physical capo. `major` suffix becomes empty and `minor` becomes `m`; native key/suffix/position remain in `rawNative`. Derived sounding MIDI exactly matches all 3,283 source MIDI lists. |
| ChordPro | `copy` aliases resolve recursively with cycle/missing-target checks. Positive frets receive `(base ?? 1) - 1`, then vectors reverse. Original alias/name/native record and resolved `sourceBaseFret` remain available. No-chord/all-muted records remain inventory with `NO_CHORD`; they cannot become musical candidates. |
| UCI 575 | The semicolon-delimited CSV provides root/type/formula, finger labels and note names, but no fret numbers or MIDI octaves sufficient to reconstruct an allocation. All 2,632 `statesHighToLow` values stay null; `capoFret` stays null. Finger strings are retained, never substituted for fret coordinates. |
| Kansas handbook | Manual visual transcription of 39 inspected chapter diagrams; the low-E-left visual orientation is reversed to canonical order. Multiple photos/diagrams/fingerings for one allocation collapse. Page numbers, diagram positions, source fingerings and rights attribution remain. Text-only transposition suggestions and repeated summary diagrams add no votes. |
| Wikimedia lessons | Six acquired jazz diagrams are visually transcribed with asset hashes; six additional allocations come from explicit open-chord fret/string prose. All share `wikimedia-guitar`. The 18 unacquired jazz diagram occurrences stay in the separate acquisition inventory, with no invented states. Artwork authorship alone is not the basis for selection eligibility. |

The adapters are [acquire-open.mjs](../../../scripts/web-voicing-corpus-v2/acquire-open.mjs) and the manually audited educational files described in [educational-discovery.md](educational-discovery.md). [prepare-curated.mjs](../../../scripts/web-voicing-corpus-v2/prepare-curated.mjs) concatenates the two audited educational files, records their SHA-256 hashes and adds the explicit eligibility basis. It does not repair musical coordinates or infer labels.

The deliberately unresolved Kansas rows remain unresolved: three grouped diminished interpretations and the source `C9` example containing no dominant seventh. The parser's separate `Maj7` spelling omission was corrected before evaluation, with three affected row IDs and before/after hashes in [notation-corrections.json](notation-corrections.json). The correction accepts the written major-seventh suffix; it does not relabel a voicing based on its notes.

## Identity and duplicate control

Under the enforced standard-tuning/zero-capo domain, `shapeKey` is the full comma-separated six-state tuple. Integrated allocation identity additionally serializes tuning. Query identity contains quality, root, context and any explicit slash-bass obligation. The evaluator's observation identity is `lineageId | queryKey | shapeKey`: duplicate pages, native aliases or fingering alternatives within a source/query/allocation cannot add votes.

`shapeFamilyKey` retains an open allocation exactly, prefixed `open:`. A closed allocation is prefixed `closed:` and subtracts its minimum stopped fret from every sounded fret while preserving physical string positions and mute tokens. For example, `[3,3,4,5,5,3]` and `[5,5,6,7,7,5]` share a closed physical family; `[0,0,1,2,2,0]` and `[0,0,3,4,4,0]` do not share an open family. The fixed tuning constraint is part of this study identity; extending it to other tunings would require including tuning/capo explicitly in every outer key.

Model family support is chord-quality-conditioned. Withholding is deliberately broader: the evaluator removes the entire physical family globally across roots, qualities and contexts for leave-family and joint source/family trials. Root ID, query ID, source ID, allocation ID and family ID never enter the fixed feature vector. Exact physical overlap is not by itself proof of copying or independence.

## Mapping results and missingness

`rows.jsonl` has one object per original row. A successful result contains `mapped:true`, `queryKey` and a `candidate` record: exact states/keys, classic integer numerator and one-based rank, status, factual descriptors, classic scalars, physical reasons/metrics, reference geometry/contact covariates, slices and optional score ledger. Production physical `humanValidation` remains `absent`. The legacy-region flag describes an intersection with historical policy gates and never removes a survivor.

An excluded result contains `mapped:false` and an explicit `reasons` array. Preprocessing failures include unknown orientation, unsupported quality, null/malformed states, tuning/capo/fret-domain exclusions and compiler conflicts. A valid compiled query with an absent exact shape additionally reports note/formula mismatch, missing required tones, distinct-pitch floor or slash-bass mismatch where applicable. These categories overlap; counts of reason occurrences need not sum to the excluded-row total. No label is silently repaired to eliminate an exclusion.

Ambiguous/nonstandard observations are missing comparable evidence, not negative preference labels. Structurally absent targets under otherwise valid queries remain retrieval misses in the evaluator's declared denominator. The final curated set has 51 inventory rows, 47 mapped targets and four intentional ambiguous exclusions. The separate reference set has 7,070 inventory rows, 1,691 mapped targets and 5,379 exclusions. No reference row is promoted into curated training.

Universe caches contain complete classic-v1 order with explicit columns `[statesHighToLow, scoreNumerator, physicalStatus]`, plus query metadata. Cache position plus one is classic rank. Every PASS and UNCERTAIN survivor is retained. Scores use denominator 110000; ties use the numeric physical-string tuple. Summary paths/hashes connect each cache to its query. Sparse/absent slices, null source annotations and unsupported training domains never mean zero difficulty, zero popularity or successful protection.
