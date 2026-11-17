# Follow-up planning: supplied-context conditional analysis

Read-only baseline HEAD1339c6c4af10e7c2b8fc87593cc85ccbddfdc862 on
feat/tab-timing-inspection; working tree was clean at inspection. No product, test,
tracked documentation or Git mutation. This is planning evidence, not implementation,
new test execution or a measured musical-accuracy/usability claim.

## Reuse decision

1. **ADAPT now after the context-assignment contract exists:** shared resolveChord,
   getScaleStructuralTones, spelling and formula membership. Current analysis.ts:62-101
   already accepts independent scale/chord roots; its tests:48-65 cover Dm/G7 against
   Cscale and separate scaleDegree/chordDegree/Roman. A user-asserted chord does NOT
   need to be a recognizer candidate of the melody's PCs. A melody D alone under user
   Cmajor can be a formula nonmember even though no C chord can be identified from D.
   Do not discard the user context, insert C/E/G, or turn nonmembership into wrong-note,
   available9, passing or avoid certainty. Current written-point-analysis references
   support only scale/frame and test:201 explicitly ignores unrelated chord context;
   connecting supplied region chords needs an explicit adapter contract, not a hidden
   extra field in the existing point API.
2. **ADAPT bounded existing observer:** observeEnding(frame,before,target,context),
   ending-observation.ts:38-123. It actually examines a supplied pair and flags missing
   phrase/bass/soprano evidence; authentic targets are narrowly supported major/minor
   triads or Picardy major, not arbitrary extended chords. relations.test.ts:161-203
   tests missing evidence, inversion/soprano and out-of-scope Gmaj7/Cmaj7 cases. A plain
   G7→C pair may establish supported motion but not an authentic cadence without the
   supplied ending conditions. ChordRef's default root bass (roman.ts:29) is not a
   confirmed inversion, guitar minimum is not ensemble bass, and the top/current TAB
   note cannot silently establish final soprano. Do not set confirmation booleans merely
   because source timing exists. Callers must validate the frame/chords and keep the
   context.before association consistent with the resolved operand.
3. **ADOPT factual chord comparison; DEFER detection:** facts.ts:4-7 yields root motion
   and shared/added/removed PCs. exploreRelation('tritone'), relations.ts:122-131,
   generates G7/C versus Db7/C comparisons and theoretical guide equivalence under the
   jazz/pop lens. relations.test.ts:97-114 preserves different actual formulas and lens
   restrictions. Observing user Db7→C does not prove G7 was played, removed or intended.
   A bounded pair observer could propose a subV interpretation under explicit conditions,
   but comparison generation is not substitution detection.
4. **ADOPT illustrative tendencies only; new observation matching needed:**
   connectChords(), connections.ts:18-19,23-41,52-91, accepts formula tones/PCs, not actual
   MIDI occurrences, octaves, voice IDs or timings. G7→C draws B→C,F→E; triadic nearest
   ties stay unlinked. voice-leading.test.ts:22-47,96-98 proves these rules and invariance
   to destination inversion. Identical chord labels can be played with B4→G4 or G3→G4;
   the same theoretical diagram does not establish those performed voices or a held
   note. A supplied melody track can be checked against a theoretical line only through
   a separate bounded observer that preserves actual note IDs/register and explicitly
   states whether it tests pitch-class tendency, written motion or performance.

## Function/applicability boundaries

- exploreRelation() is mostly a generator: relations.ts:70 validates context.before but
  dominant/ii-v branches:90-92,134-143 generate the approach relative to target rather
  than compare the observed preceding chord. A Dm target in C will generate A7→Dm even
  with no preceding observation (or an unrelated valid preceding chord). statusmatched
  therefore describes bounded rule applicability, not detection. provenanceillustration
  remains essential. Existing live tests:72-77 verify E7 as V7/vi without changing Cframe.
- A7→Dm in C can motivate a conditional applied-dominant reading V7/ii in a NEW supplied-
  pair observer. It does not establish Dtonicization, still less modulation. romanLabel
  alone supplies key-relative VI7 for A7; generating V7/ii requires a target relation.
  target-policy.ts:10-24 separates local target eligibility from global tonic family.
  Keep the pinned key intact; local-center establishment belongs to later distinct work.
- The old interpretChordAgainstTonalCenter is not a score adjudicator. Its branch
  functional-interpretation.ts:160 labels every half-diminished7 as predominant regardless
  of root; :114-122 can label a dominant a Cadential Dominant from vertical frame data.
  Reusing that prose as observed function would add false certainty. Preserve its current
  related-scale suggestion role; no rewrite or frozen engine-policy change is required.
- getScaleToneAnalysis(), scale-tone-analysis.ts:93-102, is for selectable same-tonic
  curated chord/scale contexts, not arbitrary user Cscale/Dm chord pairs. Membership and
  dual spelling primitives are reusable; its authored tension/caution statements require
  their original pairing/provenance/conditions. Tests:56-99 distinguish sus4, contextual
  natural11 caution, Altered Eb/Fb versus D#/E and containment without tension promotion.

## General melody roles need new bounded observers

- Existing relations.ts:264-293 'passing' observes THREE CHORDS with middle fully dim7,
  supplied bass/inversions and passing rhythmic-role evidence; it is not a melodic
  passing-tone classifier. Its passing interpretation can be unsupported while another
  enharmonic leading-tone interpretation remains possible; consume per-interpretation
  statuses, not only top-level status. Tests relations.test.ts:147-158 preserve missing
  neighbors and ambiguity.
- For a selected melodic passing variant, declare the supported population/style first:
  at least a preceding/middle/following note in an explicitly selected or proven single
  melodic voice, correct temporal order, contextual harmonic assignment at each note,
  step/direction evidence, and rhythmic/metrical role if that variant requires it.
  Accented passing tones exist, so unknown accent is not proof of a universal rejection.
  Raw guitar strings or min-to-min matching must not invent a melodic voice.
- A sus4 formula is not a prepared suspension. A bounded suspension reading needs the
  selected rule's preparation, retention across the supplied chord change and resolution
  evidence in the same assigned voice, plus the required timing/accent/style context.
  Current written source intervals may establish only nominal retention; continuation/
  gesture markers are not performed sound. F over C may be an11 colour, passing F→E or
  a prepared4–3 suspension depending on missing evidence. No current helper adjudicates
  those alternatives. Leave unsupported/missing/conflicting evidence distinct.

## Suggested sequence within item2, not a new engine commitment

A. Join user-claimed chord regions to nominal note observations with explicit provenance,
   anchors, ambiguity/conflict and stale/history rules from item1; show membership and
   independent scale/chord spelling facts without changing source notes.
B. Adapt narrow supplied-pair/ending observers and separately reviewed applied/subV rules;
   preserve matched/possible/insufficient-context/unsupported plus explicit missing facts.
C. Add only a declared melodic role family after voice/time/context evidence is available;
   independent counterexamples include melodyD/userCmajor, A7→Dm under pinnedC, Db7→C
   without any observedG7, theory B→C versus actual B4→G4, G7→C with no phrase end, and
   F over C with competing passing/suspension/colour readings.
Automatic boundaries, key selection or modulation are not prerequisites for these
conditional stages, and are not authorized by this planning evidence.
