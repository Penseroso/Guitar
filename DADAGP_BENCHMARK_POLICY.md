# DadaGP Benchmark v1 정책

- 정책 버전: `phase0-v1`
- 기준일: 2026-09-04
- 적용 대상: Phase 1 이후의 offline corpus benchmark

## 입력과 provenance

- `_DadaGP_all_metadata.json`의 26,181개 항목을 canonical inventory로 삼는다.
- 실제 token 경로를 열 수 없는 항목은 추측 경로로 자동 대체하지 않고 `metadata-path-not-found`로 제외한다.
- 원본 split은 provenance로 보존하되 성능 평가에는 새 leakage-safe split을 사용한다.
- per-song 경로, 제목, hash, split은 `.dadagp/phase0-manifest.jsonl`에만 둔다.

## 중복과 split

- exact duplicate key: `start` token부터 EOF까지 LF 줄바꿈으로만 정규화한 SHA-256.
- identity candidate key: 경로의 artist와 파일명의 title을 Unicode·대소문자·구두점·일반적인 숫자 suffix 기준으로 정규화한 값.
- song-grouped 평가는 exact body와 identity candidate를 union한 component 단위로 나눈다.
- artist-generalization 평가는 위 component에 known `artist_token`을 추가로 union한다. `unknown_artist`는 하나의 거대 artist로 묶지 않는다.
- split leakage 0이 validation 비율의 정확한 10%보다 우선한다.

## Event 해석

- 하나의 track 안에서 `wait` 전까지 연속된 note token을 같은 onset으로 취급한다.
- `nfx:tie`가 연결된 note는 새 attack 수에서 제외하고 sustain으로 취급한다. tie 포함 수치는 보조 진단으로만 분리한다.
- attack shape는 중복 string note, 범위 밖 string/fret, 빈 onset을 QC 사유와 함께 별도 집계한다. 발견 즉시 조용히 clamp하거나 버리지 않는다.
- 원 token의 string/fret geometry를 직접 관측값으로 보존한다. pitch-class 변환은 tuning normalization이 명시된 별도 파생 필드에서만 수행한다.

## Tuning·현·프렛 cohort

- `downtune:0`과 `s1..s6`, fret `0..24`를 product-compatible 기본 cohort로 둔다.
- negative fret은 Drop 계열 정규화 표현으로 별도 cohort에 유지하고 open fret으로 바꾸지 않는다.
- downtune `-1..-6`, negative fret, string 7, fret 25 이상은 각각 별도 결과를 낸다.
- 8현 이상과 encoder에서 제거된 희귀 tuning은 부재가 아니라 관측 불가능으로 기록한다.

## Chord ambiguity

- chord label은 onset pitch-class set이 registry formula와 정확히 일치할 때만 Corpus primary 후보로 인정한다.
- root 또는 chord type 후보가 여러 개면 모든 해석을 보존하고 ambiguity count를 올린다.
- generator coverage는 하나 이상의 합법적 해석이 exact string/fret shape를 재현하면 `ambiguity-expanded`로 집계한다.
- ranking은 expanded Recall@K와, 사전 정의한 단일 해석만 인정하는 strict 지표를 함께 낸다. expanded 값만으로 개선을 승인하지 않는다.
- 추론된 key, scale, functional context는 chord 정답에 사용하지 않는다.

## Weighting과 공개 지표

- 모든 shape/event 결과에 raw occurrence, deduplicated song-presence, unique-shape를 함께 기록한다.
- 반복 riff가 많은 곡 하나가 prior를 지배하지 않도록 제품 판단은 song-macro를 primary로 사용한다.
- 전체 결과 외에 tuning, string count, fret band, instrument family, genre availability cohort를 분리한다.
- genre는 Spotify 기반 noisy metadata이므로 ground truth나 hard filter로 사용하지 않는다.

## Evidence tier

| Tier | 의미 | 허용 용도 |
|---|---|---|
| Reference | DadaGP와 독립된 명시적 fingering fixture | 직접적인 correctness 근거 |
| Corpus | DadaGP에서 직접 관측된 onset/shape | 반복 song·artist·root 수에 따른 playability 근거 |
| Exploratory | 단일 occurrence, ambiguity, 비표준 cohort, key/scale/context 추론 | 가설 생성만 가능 |

단일 GuitarPro occurrence는 정답으로 취급하지 않는다. 동일 relative shape가 5개 이상 deduplicated song에서 관측되면 Corpus-strong, 10곡·3 known artist·3 root 이상이면 Corpus-very-strong으로 승격한다. very-strong shape를 hard reject하면 tab 오류보다 엔진의 일반 가정 오류를 우선 조사한다. 사람 검수는 필수 gate가 아니다.

이 정책을 바꾸면 `policyVersion`을 올리고 baseline과 threshold를 다시 수립한다.
