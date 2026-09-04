# DadaGP Phase 0 실행 계획 — Corpus Control & Benchmark v1

- 수립일: 2026-09-04 (Asia/Seoul)
- 기준 커밋: `55f9436`
- 상위 문서: [`DADAGP_ROADMAP.md`](./DADAGP_ROADMAP.md)
- 상태: **기술적 완료 / 제품 활용 권리 gate 미해결**

## 핵심 가설과 범위

핵심 가설은 DadaGP를 앱 기능이나 정답 데이터로 사용하기 전에, 모든 곡의 provenance·중복·split·품질 cohort를 재현 가능하게 통제할 수 있다는 것이다.

이 Phase는 로컬 corpus inventory, exact music-body hash, 정규화 artist/title 중복 후보, song-grouped 및 artist-grouped split, evidence tier, 라이선스 gate만 다룬다. Chord recognition·ranking·Scale 통계의 재산출과 앱/UI 변경은 다음 Phase의 범위다.

## 정책

- `start` 이전의 artist/genre/downtune/tempo header를 제외한 token sequence를 exact music body로 정의한다. 줄바꿈만 LF로 정규화하며 음악 token 자체는 변경하지 않는다.
- artist/title identity는 경로와 파일명의 Unicode·대소문자·구두점·일반적인 `(2)` 버전 suffix를 정규화한 보수적 중복 후보이다. 동일 곡의 확정 판정으로 사용하지 않는다.
- song split은 exact body와 정규화 identity를 한쪽 split에 묶는다.
- artist split은 song split 조건에 더해 알려진 metadata artist를 한쪽 split에 묶는다. `unknown_artist` 전체는 하나의 artist로 취급하지 않는다.
- split은 group의 안정 hash를 10개 bucket으로 나눠 1개를 validation에 할당한다.
- 곡명·경로·per-song hash가 포함된 manifest는 `.dadagp/`에만 저장하고 Git에서 제외한다. 저장소에는 aggregate 결과만 둔다.
- DadaGP와 독립된 명시적 fingering을 Reference, deduplicated 직접 관측을 Corpus, 단일 occurrence·추론·비표준 cohort를 Exploratory로 둔다.

## 조정된 진입·종료 threshold

### 진입

- metadata가 로컬에 존재하고 파싱 가능해야 한다.
- corpus는 저장소와 제품 build 입력에서 격리할 수 있어야 한다.
- 내부 연구 목적 분석과 제품 반영의 법적 gate를 분리한다.

### 기술적 종료

- metadata 26,181건의 100%가 `resolved` 또는 사유가 있는 `excluded` 상태로 manifest에 기록된다.
- 경로 resolution rate가 99.8% 이상이다. 미해결 항목은 downstream denominator에서 제외하고 수와 사유를 공개한다.
- song-grouped split에서 exact-body leakage와 identity-candidate leakage가 각각 0이다.
- artist-grouped split에서 위 두 leakage와 known-artist leakage가 각각 0이다.
- 동일 corpus·정책으로 재실행했을 때 timestamp를 제외한 aggregate와 private manifest SHA-256이 같다.
- corpus 및 private manifest가 `git status`에 나타나지 않는다.
- 정책 단위 테스트와 현재 앱 회귀 테스트가 통과한다.

validation 비율 10%는 목표이지 hard gate가 아니다. artist 단위 grouping은 큰 artist cluster 때문에 비율을 흔들 수 있으므로 7–13%를 경고 범위로만 사용하고 leakage 0을 우선한다.

### 법적 종료

- 코드 MIT와 corpus 권리를 분리해 기록한다.
- 내부 연구, aggregate 통계 저장, shape/score 제품 반영, 모델 학습, 원본·파생 파일 재배포를 각각 `confirmed`, `unresolved`, `prohibited`로 관리한다.
- 서면 범위가 확인되기 전에는 aggregate benchmark 외의 제품 반영, 학습, 배포를 진행하지 않는다.

## 판정

- 기술 기준 통과 + 내부 연구 허용: Phase 0 **GO 완료**, Phase 1 내부 검증 진입 가능.
- 기술 기준 통과 + 제품 파생물 권리 미확인: Phase 1 연구는 **CONDITIONAL GO**, 제품 반영은 차단.
- 내부 분석 권리 부재 또는 leakage 제거 실패: 이후 DadaGP 단계 **NO-GO**.

## 실행 종료 기록

기술 threshold는 모두 통과했다. 상세 수치와 다음 단계 판정은 [`DADAGP_PHASE0_REPORT.md`](./DADAGP_PHASE0_REPORT.md)에 기록한다. 권리 matrix가 unresolved이므로 Phase 1 내부 연구만 CONDITIONAL GO이며 제품 반영은 차단한다.
