# TAB Analysis product, theory and input audit

Baseline: fetched origin on 2026-10-04; its default branch is master, not main.
HEAD and origin/master both started at de0ca6c. Working tree was clean.

## Traced pipeline

1. `src/domain/tab/ascii.ts`: six aligned rows, located diagnostics, frets/tuning/capo,
   original source positions. Whitespace supplies order; no rhythmic values.
2. `types.ts` and `editing.ts`: stable note/moment IDs, measure grouping and order-only
   document. `features/tab-analysis/state.ts` normalizes imported empty measures, owns
   history and explicit snapshots; edit/context changes invalidate annotations.
3. `analysis.ts`: contextual spelling and registry-based exact/incomplete/added-tone
   alternatives, with per-analysis pitch-set caching. Does not adopt a winner.
4. `passage-analysis.ts`: observed melodic/dyad movement, repeated interval patterns and
   bounded arpeggio collection windows. New `harmonic-spans.ts` isolates candidate grouping
   from local-window recognition and from key-conditional pattern observation.
5. `annotations.ts`: stable score endpoints, observed/candidate/reference provenance,
   candidate Romans and conditional pattern evidence. `TabScoreView.tsx` lays out lanes
   and exposes evidence; `TabAnalysisWorkspace.tsx` owns import/context/Analyze controls.

Tests traced include parser, editing, passage, annotations, reducer/history, native numeric
editor, touch gestures, Workspace and ClientApp integration. New original guitar exercises
live in `src/domain/tab/fixtures/audit-tabs.ts`, exercised end-to-end by harmonic-spans tests.

## Findings, alternatives and decisions

| Issue and priority | Actual cause | Alternatives and trade-off | Implemented scope / architecture | Regression and inference risk |
| --- | --- | --- | --- | --- |
| Hidden key prerequisite — high | Collapsed Context omitted key in summary; Analyze gave no route to it. | Auto-select an Explore key is convenient but silently equates collection with center. Persistent full context is bulky. | Quiet key shortcut beside Analyze opens/focuses existing controls without assigning a key. Summary includes key; UI calls it pinned reference. Existing state retained. | Opening must not change key or analysis; tested. |
| Minor capability mismatch — high | Pattern observer returned early for every minor frame while UI offered Minor. | Disable Minor would also remove valid Roman coordinates. Broad minor grammar would overreach. | Add bounded V–i and iv–i; enumerate supported major/minor patterns in context. | v–i, major IV–i and wrong-key examples must abstain; tested. |
| ASCII technique rejection — high | Character scanner rejected all technique markers. | Blind stripping turns bend targets into attacked frets. Rich pitch-gesture model is larger than this task. | Accept explicit h/p/slide endpoints and postfix vibrato with located warnings; preserve source columns. Bends/release and unspecified gestures remain actionable errors. | No performance/timing reconstruction; malformed connectors and bend targets tested. Original source remains available. |
| Muted event silently bridged — high | x tokens were diagnosed then removed from the onset map. | A full unknown-pitch event model could preserve more information. Dropping events falsely joins chords/runs. | Retain x-only onset with empty notes, an existing continuity barrier. Reject all-muted input as before. | Mixed pitched+x columns still describe only known pitches. No rest/duration inferred. |
| Arpeggio/progression disconnection — high | Sliding windows existed only as local candidate labels; progression read simultaneous moments. | Using longest windows as chords would arbitrarily segment melody (e.g. C E G D can match an added-note collection). | Small TAB-only span adapter: complete explicit measure, 3–16 consecutive single notes, 3–4 pitch classes. Grouping is candidate; all alternatives retained. Progression requires direct adjacency and a unique exact reading per span. | A bar may contain multiple actual harmonies. Candidate '?' and evidence must survive through UI. Partial selections, gaps, overlap and empty bars tested. |
| Omitted-tone recall — medium | Sequential candidates were exact-only although registry supports omissions. | General partial subsets would produce many invented harmonies. | Whole-bar root/third/seventh shells with only natural fifth missing, only when no exact match exists. Candidate only, excluded from patterns. | Rootless/thirdless/two-note guesses remain unsupported. Missing fifth is never materialized. |
| Mobile discoverability — medium | Unselected header dots were invisible; help mentioned keyboard Delete only. | Permanent delete buttons conflict with direct-score design; replacing gestures expands scope. | Visible quiet header dots, pointer-specific concise hints, existing touch-only hold/trash retained, iOS text callout suppressed. | Touch ergonomics remain device-sensitive; real-device long-press still requires verification. |
| Four-by-four suggests meter — medium | Initial scaffold looks regular although document explicitly has no duration. | One-position bars reduce upfront targets but demand repeated insertion; duration controls require a new timed model. | Retain requested four measures/system and editable scaffold; visible 'Free timing · Positions are not beats.' | Does not encode 4/4. Usability research may still favor a different initial scaffold. |
| Dense annotation/evidence — medium | Lane packing already existed; unsorted spans wasted lanes. Terminal '?' could be ellipsized along with label. | Hard annotation caps lose evidence; permanent side panel conflicts with score-first interaction. | Sort lanes by start, keep '?' outside clipped text, preserve full accessible name, wrap evidence outside score viewport. | Dense scores still require internal scrolling and label selection. No claim of optimal layout for every 1024-position document. |

## Explicit-key decision and future layers

**Maintain the explicit-key requirement at the Roman/named tonal-pattern layer; relax its
product meaning to optional pinned reference.** No global/local-key engine or probability
prior was added. Key-free chord/arpeggio/span candidates already provide useful analysis;
disabling those without a key would be excessive. Roman coordinates intrinsically need a
reference, and automatically selecting it would introduce an untested inference layer.

The pipeline now keeps observed notes → chord/collection alternatives → harmonic-event
grouping candidates → conditional interpretation distinct. Local tonal-context candidates
are explicitly absent, not collapsed into the user reference. Candidate event grouping does
not establish accompaniment or harmonic duration. A supplied frame is applied to the whole
analyzed score but makes no assertion that the entire song stays in that key.

Long-term, local contexts deserve separate scope/provenance and competing readings. Modal
interpretation also needs a center contract, not merely a modal pitch collection. A future
layer should accept phrase/metric/voice evidence and evaluate sustained local coherence,
dominant resolution and cadence context. A secondary-dominant-shaped pair is insufficient
to claim actual modulation; style affects the evidential standard. The common-practice
distinction emphasizes establishment of the new key, often by cadence ([Open Music Theory](https://viva.pressbooks.pub/openmusictheory/chapter/extended-tonicization-and-modulation-to-closely-related-keys/)).

Current regressions explicitly keep A7→Dm in supplied C as VI7→ii coordinates rather than
auto-labeling V7/ii or D minor. D7→G→C observes only the G→C suffix under C. Supplying D
minor changes the conditional reading, not the observed notes/candidates. D Dorian scale
membership alone creates no key or Romans. Key-free spans remain available.

## Harmony reuse and deliberate non-changes

Reused existing registry/required-degree rules, frame validation, note spelling and Roman
formatting. Harmony `relations.ts` generates illustrative relationships; `connections.ts`
models theoretical voice correspondence. Neither identifies performed TAB. Its ending
observer requires phrase/bass/soprano evidence absent here. Importing those generators as
recognizers would create false authority, so the bounded TAB observer remains separate.

No automatic key, modulation, cadence or chord-duration inference; no modal-frame extension,
rootless arpeggio guessing, rhythm entry, playback or new file formats. Bent target pitches
need a pitch-gesture model and explicit notation grammar. Guitar Pro distinguishes bends
as pitch-changing effects ([official effects guide](https://www.guitar-pro.com/docs/gp8/score/note/symbols/effects)).
Pitch aggregation alone also cannot resolve non-harmonic tones, a limitation noted by
[music21's harmony documentation](https://music21.org/music21docs/moduleReference/moduleHarmony.html).

## Validation and release judgment

Final relevant regression suite: **35 files / 852 tests passed**. Scope includes TAB
parser/document/passage/annotations, editor history and gestures, Scale/ClientApp integration,
shared scale, Harmony, chord recognition and harmonic-workspace state. Original fixtures
cover pure melody, broken chords, simultaneous progression, ambiguous Am7/C6, omitted-fifth
G7, technique notation, major/minor and transposition. Negative cases cover partial bars,
unknown-pitch interruptions, absent key, modal collection, chromatic pairs and wrong frames.

TypeScript, scoped ESLint, `git diff --check` and final `npm run build` passed. Real-browser
default and changed states were inspected at **390, 768 and 1335px**. No page overflow
(content widths 375, 753 and 1320px); dense systems scroll internally. No browser console
warnings/errors appeared. Verified key shortcut without implicit key assignment, explicit
Analyze, three-bar candidate progression and its evidence, minor V–i, technique import,
actionable bend rejection without replacing the existing document, direct fret 24 entry,
column insertion, keyboard range deletion, empty placeholder retention and Undo.

An eight-bar mixed example was inspected at all three widths. Candidate '?' stays visible
outside clipped labels and evidence wraps at narrow widths. Screenshots: [dense desktop](screenshots/tab-audit-dense.png),
[candidate evidence](screenshots/tab-audit-desktop.png), [tablet](screenshots/tab-audit-tablet.png),
[mobile editing](screenshots/tab-audit-mobile.png), [mobile evidence](screenshots/tab-audit-mobile-evidence.png).
Touch hold timing, cancellation, scrolling/dismissal and selected-range deletion are covered
by automated pointer-event tests. Browser tooling supports viewport changes but no physical
touch synthesis: **real-device long-press ergonomics remain unverified**. These checks are
regressions, not an empirical recall/precision benchmark over a real-song corpus.

GO applies to a bounded, order-only TAB exploration tool with explicit uncertainty.
NO-GO applies to presenting it as a comprehensive automatic song/key/modulation analyzer.
Remaining risks are incomplete real-world ASCII grammar, grouping ambiguity, unsupported
chromatic/modal/local-context interpretations and physical mobile gesture ergonomics.
