# DadaGP Phase 0 결과 — Corpus Control & Benchmark v1

- 실행일: 2026-09-04 (Asia/Seoul)
- 기준 커밋: `55f9436`
- 정책: [`DADAGP_BENCHMARK_POLICY.md`](./DADAGP_BENCHMARK_POLICY.md) `phase0-v1`
- aggregate: [`DADAGP_PHASE0_SUMMARY.json`](./DADAGP_PHASE0_SUMMARY.json)
- 기술 판정: **GO**
- 제품 활용 판정: **CONDITIONAL GO / 권리 확인 전 BLOCKED**

## 실행 결과

| 항목 | 결과 | 기준 | 판정 |
|---|---:|---:|---|
| metadata 상태 기록 | resolved 26,160 + excluded 21 = 26,181 | 100% 상태 보유 | PASS |
| 경로 resolution | 99.9198% | 99.8% 이상 | PASS |
| song split validation | 2,569 / 26,160 = 9.8203% | 7–13% 경고 범위 | PASS |
| song split body/identity leakage | 0 / 0 그룹 | 각각 0 | PASS |
| artist split validation | 2,495 / 26,160 = 9.5375% | 7–13% 경고 범위 | PASS |
| artist split body/identity/known-artist leakage | 0 / 0 / 0 그룹 | 각각 0 | PASS |
| 재실행 private manifest SHA-256 | `b7a2f935a798c9ebcb91ec6ee70929ef6f725760261ef7ff18e40325c81765a2` | dedup group ID 추가 후 재동결 | PASS |
| 원본 corpus·private manifest Git 격리 | `.gitignore` 적용 | status 비노출 | PASS |
| 제품 활용 권리 | 서면 범위 미확인 | 용도별 확인 | BLOCKED |

## Benchmark v1 inventory

| 항목 | 실측 |
|---|---:|
| 해석된 token 파일 | 26,160 |
| token | 116,685,978 |
| 포맷 | GP3 13,821 / GP4 12,311 / GP5 28 |
| guitar note token | 43,090,388 |
| negative fret note | 633,318 |
| string 7 note | 102,683 |
| 최대 fret | 34 |
| exact music-body 중복 | 830그룹 / 1,694파일 |
| 정규화 artist/title 중복 후보 | 2,562그룹 / 6,030파일 |

21개 제외 항목은 metadata가 지시한 token 경로가 로컬 파일시스템에 존재하지 않는다. 모두 manifest에 `metadata-path-not-found`로 남겼으며 downstream denominator에는 포함하지 않는다. 다수 경로에 깨진 문자 표기가 있어 encoding/path export 문제일 가능성이 높지만, Phase 0에서는 다른 곡으로 잘못 연결할 위험 때문에 자동 fuzzy match를 하지 않았다.

## 기존 탐색 결과와 차이

| 지표 | 기존 탐색 | Benchmark v1 | 설명 |
|---|---:|---:|---|
| token 파일 | 26,181 | 26,160 resolved + 21 excluded | metadata 개수와 실제 해석 가능 파일을 분리 |
| token | 116,763,466 | 116,685,978 | 미해결 21개를 denominator에서 제외 |
| exact 중복 | 833그룹 / 1,700파일 | 830그룹 / 1,694파일 | resolved cohort와 `start` 이후 body hash 정책 적용 |
| identity 후보 | 2,485그룹 / 5,842파일 | 2,562그룹 / 6,030파일 | Unicode·구두점·숫자 버전 suffix 정책을 명시적으로 재정의 |

따라서 기존 chord coverage 86.9%, raw shape recall 92.8%, surface recall 51.0%, hard-playability 94.0%, ranking 상관 `r=0.266`은 폐기하지 않지만 Benchmark v1 수치로 간주하지 않는다. Phase 1 앞단에서 새 manifest, tie 정책, cohort, song-macro weighting으로 다시 측정해야 한다.

## 생성된 산출물

- 재현 스크립트: `npm run benchmark:dadagp`
- 정책 단위 테스트: `npm run test:dadagp`
- 비식별 aggregate: `DADAGP_PHASE0_SUMMARY.json`
- 로컬 전용 manifest: `.dadagp/phase0-manifest.jsonl`
- 로컬 전용 제외 목록: `.dadagp/phase0-exclusions.json`
- 권리 gate: [`DADAGP_RIGHTS_MATRIX.md`](./DADAGP_RIGHTS_MATRIX.md)

## 종료 판정과 다음 단계

기술적 corpus-control gate는 통과했다. Phase 1의 내부 chord correctness benchmark는 **CONDITIONAL GO**다. 다만 DadaGP-derived shape, frequency 또는 score를 제품 코드·ranking·배포물에 반영하는 작업은 저자의 서면 사용 범위를 확인하기 전까지 진행할 수 없다.

Phase 1 진입 시 Reference/Corpus/Exploratory tier, multi-song·artist·transposition 기준과 false-reject threshold를 새로 수립한다. 사람 검수는 필수 gate로 사용하지 않는다.
