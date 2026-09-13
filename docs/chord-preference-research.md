# Chord preference evaluation

Stage 10 status: research is closed. The historical harness was moved to `.research/stage-10-archive/scripts/preference/`; the commands below document the frozen study procedure and are not current production commands.

This offline harness studies additional evidence for chord exploration. It cannot export a runtime profile or change the application. The engine baseline is `3dc7ef8`; domain differences or changed frozen weights block evaluation. The current generator, formula rules, playable geometry, full candidate pool, explicit filters, selection and playback remain application contracts.

## Input authority and quarantine

Supply the authoritative external encoder/decoder and its compatible Python environment explicitly. The adapter calls the decoder directly; differential tests also exercise its encoder. The private certification report records the reference revision and source hash, parser/adapter hashes, input hashes, accepted files and failures. Neither the external source nor raw inputs belong in Git.

```text
npx tsx .research/stage-10-archive/scripts/preference/certify.ts --manifest=PATH --raw-root=PATH --decoder=PATH --python=PATH --output=.research/certification-RUN
npx tsx .research/stage-10-archive/scripts/preference/run.ts --manifest=PATH --raw-root=PATH --observations=.research/certification-RUN/observations.jsonl --certification=.research/certification-RUN/certification.json --output=.research/preference-RUN
```

The default study includes data and ranking audits. `--stage=data` or `--stage=ranking` may be used separately with distinct output directories. Certification is mandatory for either stage. An old cache, changed parser or mismatched manifest fails the gate. Complete runs are immutable. Detailed outputs, source identities, examples and any provenance stay under ignored `.research/`.

The certification cohort is six-string standard tuning with zero transposition. A dropped or additional-string track is excluded for its entire duration. Every included file must match the reference on instrument, beat start, notated duration, rest status, string/fret, tie/dead type, ghost and let-ring flags. A mismatch or reference error quarantines the whole file before any observation is added.

Interpretation is deliberately limited:

- A tie is a continuation flag, not a new attack. It does not prove the previous sounding pitch was valid.
- Beat duration follows the next beat of that instrument or the measure boundary, including the reference's duration correction.
- Rest-only beats are retained for conformance. Notes mixed with a rest token follow reference behavior. Repeated notes on one string follow the reference's first-note rule.
- Let-ring is a notation flag. The decoder does not establish acoustic release time or infer all simultaneously sounding notes.
- Tied and let-ring beats are counted but not used as preference labels. Dead notes and out-of-scope frets are excluded. Ghost notes remain pitched notes.
- Only unambiguous exact pitch-class labels enter this study. Dyads are retained when they have one label. An ambiguous root or omitted-formula role is not guessed. Missing labels are not evidence that a chord is absent from music.

Matching an attack signature to a product voicing does not prove that unobserved strings were muted. Pitch labels describe notated fret pitches, not a reconstructed performance with bends, release envelopes or all previously sounding strings. These limitations are another reason frequency evidence alone cannot authorize product adoption.

The frozen conformance command was `npx vitest run .research/stage-10-archive/scripts/preference/frames.test.ts` with `REFERENCE_PYTHON` and `REFERENCE_DECODER` set. Without the external environment, these tests are explicitly skipped; ordinary unit tests do not certify a dataset. Fixtures cover ties, rests, ringing, ghost/dead notes, duplicate strings, initial silence, interleaved instruments, absent terminal waits, orphan effects, duration corrections and an encoder/decoder roundtrip.

## Experiments and preserved boundaries

| Priority | Experiment | Boundary / decision requirement |
| --- | --- | --- |
| P0 | Differential token certification; duplicate/artist split audit | No unverified observations in downstream results |
| P0 | Shadow search without the monotonic pitch guard | Preserve every baseline candidate; independently validate recovered fingerings before any product proposal |
| P1 | Supported shape preference; condition-specific shape preference | Residual score only; unsupported query falls back; no whitelist or pruning |
| P1 | Non-statistical diversity comparator | Determine whether simpler presentation ordering achieves the benefit |
| P2 | Marginal feature preference | Exploratory comparator, not a trained causal or ergonomic model |
| P3 | Genre preference versus the same non-genre model and permuted artist genre bundles | Require incremental value beyond general popularity and enough independent artists |

Conditions currently tested are all candidates, high position 11–15, three sounding strings, bass third, top flat seventh and no open strings. These are retrospective subsets of observations, not observed user intent. Accompaniment roles, proximity to a selected voicing and context-dependent omitted formulas need separately labeled tasks before evaluation. There is no new product control implied by these experiments.

The shadow search changes one guard in memory only. Its audit reports conservation, duplicate candidates, missing observed shapes, hand feasibility, crossed pitch ordering and support across songs/artists. Recovered reachability alone does not establish comfort or user preference.

## Evaluation protocol

Build connected components over the complete resolved manifest using song identity, artist grouping, known artist token and exact file/body duplicates. An alias bridge remains effective even if its observation was excluded. Unknown artists can inform descriptive inventory; preference evaluation uses known artists. Unrecognized aliases remain a limitation requiring review.

Use five outer component folds. For each fold, one is test, the next is calibration and three are fit. A separate family-held-out track removes both test and calibration shape families from fit. Hyperparameters are selected only on calibration. Historical development data, including these resampled folds, does not become a new independent holdout by renaming it.

Compare alpha 0, 0.1, 0.25 and 0.5. Require at least 30 songs and 10 artists per supported query; exact shape support requires five songs and three artists. Ranking uses a fixed score scale independent of filtered list size. Alpha zero returns baseline order. Every method must retain the candidate set. Feature histograms are exploratory marginal frequencies; correlated features and prolific artists can still bias them.

Primary outcomes are song-macro recall at 6 and query/context-macro NDCG at 6. NDCG uses the same original genre contexts for all methods, including the permuted comparator; this keeps personalized rankings comparable. Ungenerated targets remain in recall and ideal-gain denominators. Recall at 18 is a guard. Genre is a deterministic choice among existing multi-label tags, not independently verified musical intent.

Natural/all comparisons use a paired component bootstrap with 1,000 draws and Holm correction across methods. A practical effect means recall improvement of 0.03 or relative NDCG improvement of 5%. These intervals are development evidence. Condition and high/unseen/family slices currently report descriptive changes and support counts, not confirmatory significance. Genre comparisons against the non-genre model are also descriptive. One artist-level genre permutation within fit data is a negative control, not a permutation significance test; calibration and test genre labels remain fixed.

**Product adoption is NO-GO from this harness alone.** A confirmatory study must establish a practical primary benefit and rule out more than 0.02 recall loss at 6 or 18 for protected position, string count, bass/top, open/closed, chord-family, genre and unseen-shape slices. Sparse slices below 30 songs/10 artists remain unresolved and require fallback. Reject changes whose benefit depends on seen-shape memorization, artist identity, low-register concentration or loss of candidate reachability.

## Independent usability validation

Pilot with four guitarists to debug tasks, then recruit a separate 24 participants. Neither cohort has been run by this tooling. Freeze candidates, task set, ordering variants and analysis before the evaluation cohort starts. Counterbalance baseline and proposal order, conceal method names and preserve identical playback/selection behavior.

Use first-choice, voicing comparison, specified position, bass/top and accompaniment tasks with playable and unfamiliar chords. Record time to a satisfactory played selection, success against the explicit constraints, corrections, exploration depth and stated preference. Include desktop/mobile and participants with different playing experience. Pilot data cannot tune on evaluation participants.

Require at least 15% lower median task time and success non-inferiority within 0.05, with participant-paired uncertainty intervals and prespecified failure slices. A frequency-based gain without a practical task benefit is insufficient. A deployment proposal requires the offline guards, independent fingering checks and this usability evidence; exporting or activating learned weights remains a separate step.
