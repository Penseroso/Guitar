# P4-C applicability gate after P4-A/B

Scope: assessment only, after A equivalence and B core/source/browser/regression
gates passed. No region annotation, segmentation or new analysis engine was built.
See [P4-A](tab-chord-candidates.md) and [P4-B](tab-written-point-readings.md).

## What the completed work establishes

`written-point-analysis.ts` reuses the independent Across inspector and the shared
formula candidate adapter. Existing Scale structural tones and key-relative spelling
are useful references. Harmony's relation generator and legacy functional interpreter
do not observe a TAB timeline; its bounded `observeEnding` pair observer is not a
general temporal score analyzer either. All source occurrences survive the layer.
The new UI exposes a hypothesis only after deliberate selection and makes its
degree/membership consequences inspectable without saving that hypothesis as fact.

This is technically useful for comparing competing formulas, examining a guitar
part against a supplied scale, and explaining an observed note **if** a candidate
chord is assumed. Formula consistency and interaction correctness were verified.
Real-world harmonic-label accuracy, participant comprehension and learning benefit
were not measured; browser inspection cannot establish those outcomes.

## Alternatives and decision

| Candidate | Decision now | Evidence and boundary |
| --- | --- | --- |
| Single complete nominal point, optional formula alternatives, explicit reference degrees | **ADAPT / GO, delivered in B** | Existing engines suffice; manual counterexamples, invariants and guarded UI pass. No new engine or external runtime is needed. |
| Task-based evaluation of the delivered point inspector | **GO for validation** | Determine whether users distinguish source facts, a selected formula hypothesis and supplied references. This needs users/examples, not more inference code. |
| User-authored chord context attached to a time region | **DEFER / implementation NO-GO now** | A selected candidate is an ephemeral lens. Stable region anchors, explicit author provenance, overlapping/conflicting context and edit/history invalidation contracts do not exist. Require a separate product contract before persistence/UI work. |
| Merge equal point sets into written regions | **DEFER / implementation NO-GO now** | Endpoint constancy can describe nominal geometry, but cannot establish a harmonic segment. Region-wide completeness, performance cost and provenance need a new bounded contract; point tests do not certify it. |
| Automatic harmonic segmentation or time-based progression | **DEFER / NO-GO now** | No independently labelled corpus, boundary convention or ambiguity/abstention metric. Existing source-order progression must not silently become time-based. |
| Passing/tension/avoid roles, local/modal center, tonicization/modulation | **DEFER / NO-GO now** | Guitar-only input lacks confirmed accompaniment, bass and phrase evidence. Major/minor key coordinates and modal scale membership do not prove harmonic function or a detected key. |
| Sounding reconstruction or external runtime replacement | **DEFER / NO-GO in P4** | Written base MIDI omits performed sustains, gestures and voice realization. No demonstrated need justifies new licensing/runtime/integration cost here. |

## Counterexamples that prevent automatic promotion

- **C/E/G/A** retains C6 and Am7 exact alternatives. Even a complete written point
  does not select a root, bass, function or surrounding harmony.
- A change of one written note/end can change a PC set inside a sustained harmonic
  reading. Conversely, equal sets can serve different harmony. Endpoint equality
  is neither a harmonic boundary nor proof that no harmonic boundary occurred.
- **E/B♭** does not supply C: an absent accompaniment root cannot be inserted to
  force C7. Likewise a guitar's lowest represented note cannot establish ensemble bass.
- A globally partial snapshot can prove an earlier point complete, while a later
  point remains partial. An observed range, all known endpoints, or one complete
  sample does not prove a whole region complete.
- A complete nominal gap is not silence. Continuations/techniques remain literal
  metadata; arbitrary sounding interpretation would exceed the tested population.

These boundaries follow the current `inspectTabAcrossBarsWrittenNotesAt`,
`analyzeTabWrittenPoint`, `describeTabWrittenPointCandidate`, existing
`observeTabProgressions` and their tests, and agree with the earlier
[product applicability study](../research/tab-p3-applicability/product/report.md)
and [P3 deep boundary work](../research/tab-p3-go-deep/README.md).

## Next acceptance criteria

1. Evaluate representative monophonic/polyphonic, incomplete-time and ambiguous
   examples using the delivered inspector. A task must identify which notes are
   observed, compare C6/Am7 without choosing a fabricated answer, explain a supplied
   scale degree, and recognize when timing cannot support a complete set. Record
   task success/confusion and compare with existing Analyze; predeclare the required
   outcome before collecting results. No fabricated accuracy/usability percentage.
2. Before region context work, specify whether an entry is an explicit user claim
   or a temporary hypothesis; define exact coordinate/source anchors, invalidation
   under edits, scope overlap/conflict and history behavior. Preserve source facts.
3. Before automatic temporal interpretation, define the supported musical population,
   independent reference annotations, boundary ambiguity, false-certainty/abstention
   measures and device budgets. Keep written, sounding and harmonic correctness
   separate; the current finite fixtures are not a labelled harmonic corpus.

**P4-C assessment complete. Next GO is validation of the delivered point workflow;
expanded inference/region implementation remains NO-GO pending those contracts and
evidence.** This does not predetermine the later algorithm or UI direction.

[Independent decision review](tab-p4-next-gate-validation/source-decision-review.md)
confirmed these boundaries. Its nonblocking Harmony wording clarification was
applied without changing a product contract or implementation.
