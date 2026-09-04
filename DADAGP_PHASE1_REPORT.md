# DadaGP Phase 1 결과 — Chord Hard-Rule Correctness

- 실행일: 2026-09-04 (Asia/Seoul)
- 기준 baseline: Phase 0 manifest `b7a2f935a798c9ebcb91ec6ee70929ef6f725760261ef7ff18e40325c81765a2`
- 정책 버전: `phase1-evidence-v1`
- aggregate: [`DADAGP_PHASE1_SUMMARY.json`](./DADAGP_PHASE1_SUMMARY.json)
- 판정: **GO**

## Evidence tier

| Tier | 자동 승격 조건 | 용도 |
|---|---|---|
| Occurrence | 단일 GuitarPro occurrence | 참고만 사용 |
| Corpus-strong | 동일 relative family가 deduplicated song 5개 이상 | hard-rule 오류 우선 조사 |
| Corpus-very-strong | 10곡·3 known artist·3 chord root 이상 | 독립적인 hard-rule 반례 |
| Reference-corroborated | Corpus-strong family가 독립 `chords-db` geometry와 일치 | 엔진 교정 직접 근거 |
| Exploratory | ambiguity, tie-only, 비표준 cohort, 단일 occurrence·추론 | gate에서 제외 |

사람 검수는 사용하지 않았다. DadaGP occurrence 하나를 정답으로 취급하지 않고 deduplicated song, artist, root/transposition의 독립 반복성을 근거로 사용했다.

## 표본과 baseline

- Reference: 19개 chord family, 914 labeled position, 902 unique absolute shape, 모두 fingering annotation 보유
- Reference geometry-family holdout: 285 shape
- Corpus primary: `downtune:0`, 6현, fret 0–15, clean/distorted, tie 제외, 3–6 string exact/unambiguous registry match
- Parsed onset 16,677,108건 중 primary 3,906,835건
- 6,782 unique absolute shape, 3,753 relative family
- Corpus-strong 1,070 family, Corpus-very-strong 267 family, Reference-corroborated strong 76 family

교정 전 baseline은 다음과 같다.

| 지표 | Baseline |
|---|---:|
| Reference unique false reject | 103/902 = 11.42% |
| Reference holdout false reject | 32/285 = 11.23% |
| Corpus-strong song-macro false reject | 4,880/133,136 = 3.67% |
| 전체 eligible song-macro false reject | 6,045/137,442 = 4.40% |
| Generator exact-shape recall | 94.44% |

## 일반화된 엔진 교정

1. 동일 fret의 음을 하나의 barre 또는 전부 독립 손가락으로 처리하던 all-or-nothing 가정을 제거했다. 가능한 부분 mini-barre 조합 중 최소 finger-group cover를 계산한다.
2. Barre가 항상 nut에 가장 가까워야 한다는 hard rule을 제거했다. `x5777x`처럼 낮은 root finger 뒤에서 ring/pinky mini-barre를 사용하는 관습을 허용한다.
3. 좌표만으로 5개 group이 계산돼도 roll·부분 barre 등의 실제 기법을 완전히 배제할 수 없으므로 uncertain/awkward로 유지하고, 6개 독립 group부터 hard reject한다.
4. 기존 95mm를 편안함·ranking 기준으로 유지하고, hard impossibility cutoff는 180mm로 분리했다. 불편함과 불가능성을 같은 threshold로 처리하지 않는다.

Chord/root별 whitelist나 corpus shape table은 추가하지 않았다.

## 최종 결과와 Gate

| 지표 | 종료 기준 | 결과 | 판정 |
|---|---:|---:|---|
| Reference unique false reject | ≤2% | 0/902 = 0% | PASS |
| Reference holdout false reject | ≤2% | 0/285 = 0% | PASS |
| Corpus-very-strong topology reject | 0 | 0 | PASS |
| Reference-corroborated strong reject | 0 | 0 | PASS |
| Corpus-strong topology family reject | ≤1% | 0/1,070 = 0% | PASS |
| Corpus-strong song-macro reject | ≤1% | 5/133,136 = 0.0038% | PASS |
| Song holdout / artist holdout | 각각 ≤1% | 0.0152% / 0.0161% | PASS |
| 전체 eligible song-macro reject | ≤2% | 253/137,442 = 0.1841% | PASS |
| 전체 song / artist holdout | 각각 ≤2% | 0.1987% / 0.2117% | PASS |
| Baseline 대비 strong reject 감소 | ≥50% | 99.90% 감소 | PASS |
| Transposition topology / span monotonicity 위반 | 0 / 0 | 0 / 0 | PASS |
| Generator recall 비열등성 | ≥-0.25%p | +4.148%p, 최종 98.59% | PASS |
| 기존 Reference pass의 신규 reject | 0 | 0 | PASS |

남은 5개 strong song-presence와 253개 전체 song-presence reject는 180mm를 넘는 low-position absolute stretch다. Very-strong absolute, topology, Reference-corroborated gate에는 해당하지 않으므로 hard cutoff를 무제한으로 완화하지 않았다.

## 재현과 제한

- `npm run benchmark:dadagp:phase1`: aggregate와 private evidence sample 재생성
- `npm run verify:dadagp:phase1`: 앱 regression, DadaGP parser 정책 테스트, 모든 GO gate 강제
- Frozen baseline과 shape provenance는 `.dadagp/`에만 보관한다.
- 결과는 chord correctness에만 적용한다. Ranking·surface frequency·UI·Progression에는 empirical 데이터를 반영하지 않았다.
- DadaGP-derived 제품 반영 권리 gate는 계속 unresolved다. 이번 앱 변경은 corpus table을 배포한 것이 아니라 반복 evidence로 일반 물리 가정을 교정한 것이다.
