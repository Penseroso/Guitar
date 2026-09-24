# Scale exploration

Scale owns a `ScaleRef` (`group`, registry-backed `scaleId`, and pitch-class `tonic`) in
`useScaleMode`. Chord and Harmony retain their existing context separately. Switching
application modes never copies, resets, or synchronizes Scale's selection. All scales,
including Half–Whole Diminished, follow the same state contract.

## Analysis entry and state

The existing **Play this scale over** cards are the only chord-analysis entry point.
Nothing is selected automatically. A card click does not play audio or select a voicing.
All three existing bases (`primary`, `characteristic`, `containment`) remain distinct.

- Tonic changes transpose the selected chord kind.
- Changing scale identity clears the analysis chord and pentatonic modifiers.
- Parallel previews and bridge-tab changes retain the analysis chord.
- Clear is explicit; unavailable chord IDs cannot establish analysis context.
- The degree-stacked harmonization panel remains a separate question.

`Chord Tones` is disabled until a chord is selected. Its Scale rendering now uses the
actual registry membership, not the legacy fixed-semitone highlight helper.
Missing chord tones (for example G in C Altered over C7#9) are disclosed but never added
to the scale. Modifier notes remain separate practice additions: major pentatonic adds
b3 for major blues; minor pentatonic adds b5 for minor blues.

## Facts, interpretation, and spelling

`getScaleToneAnalysis` composes scale structure, the existing chord registry, and curated
interpretation. It does not introduce a new recommendation engine or modify chord policy.
`getScaleDerivedData` remains independent of this analysis.

Every `ToneFact` carries separate structural and chord-relative degree/name fields.
For C Altered, structural Eb/b3 and Fb/b4 coexist with dominant D#/#9 and E/3.
For C diminished, structural A/6 coexists with chord Bbb/bb7. Membership is a pitch-class
fact; enharmonic spelling cannot change it. A missing chord-relative interpretation is
null, not a guessed role. The two chord spelling fields are paired by a TypeScript union.

Scale identity markers are authored, not computed from a comparison. Altered has a
tension-field identity; symmetric and pentatonic profiles may explain collection structure
without nominating an arbitrary characteristic note. Changing a parallel comparison
never changes identity metadata.

Reviewed identity, tension, and caution interpretations carry `sourceRefs`, resolved by
`SOURCE_CATALOG` to authors, lesson URLs, and locators. Conditions describe the limited
musical context of a claim. Drafts are not rendered as educational assertions. Formula
facts do not prove that a non-chord note is an available tension. Containment by itself
does not authorize tension recommendations, and semitone adjacency is not an avoid-note
classifier. Source integrity is tested; the prose still requires editorial review when changed.

## Relationships and guitar presentation

Parallel comparison holds tonic fixed. Sibling navigation changes tonic and mode together
to preserve the pitch collection. Parent relationships read the registry's construction;
pentatonic parent links are identified as subsets, not the only possible musical parent.
Symmetry reports nonzero transpositions preserving the set, not harmonic equivalence.

Half–Whole is a rotation of the existing diminished parent. The old `Diminished` identifier
is unchanged; Scale presents it as Whole–Half Diminished. Structural and dominant display
formulas are separate. Non-seven-note collections still do not receive tertian harmonization
or symmetric double stops. Their Scale root navigation uses root-only presentation rather
than legacy parent-derived triad labels.

Fretboard annotations are optional, so existing consumers retain their rendering. Scale
supplies contextual names and semantic chord roles: a #9 is not colored as a minor third.
Tone-row focus locates every occurrence, with optional fret/string restrictions; the restrictions
also hide double-stop connections whose endpoints are outside the practice range.

## Verification and extension boundary

Domain tests cover every registered scale at all twelve tonics, selectable chord memberships,
provenance, structural/chord spelling, parent/sibling invariants, and transposition symmetry.
DOM tests cover card keyboard selection, clear, tab retention, contextual membership, drafts,
practice annotations, and real ClientApp mode isolation.

Future all-root non-heptatonic containment belongs in an independent helper, not the seven-note
harmonization function. Harmonic Major, Bebop, new playback sequencing, alternate-tuning
double stops, and Chord/Harmony feature work are outside this change.
