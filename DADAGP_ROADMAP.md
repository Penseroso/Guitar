# DadaGP 기반 Guitar 앱 고도화 실행 로드맵

- 작성일: 2026-09-04 (Asia/Seoul)
- Guitar 기준 커밋: `55f9436`
- 근거 문서: [`DADAGP_VALIDATION.md`](./DADAGP_VALIDATION.md)
- 전체 판정: **CONDITIONAL GO**

> 이 문서는 단계의 목적, 우선순위, 의존성과 현재 시점의 진입·종료 기준을 정하는 상위 로드맵이다. 각 Phase의 세부 실행계획과 정량 threshold는 해당 Phase 진입 직전에 최신 corpus benchmark, 전 단계 결과, 제품 철학 및 라이선스 상태를 바탕으로 다시 수립한다. 아래 threshold는 현재 조사에 근거한 provisional gate이며 자동 승인 조건이 아니다.

## Summary

DadaGP는 앱을 대체할 엔진이 아니라, 현재의 연역적 이론·운지 엔진을 검증하고 관측 근거를 추가하는 offline evidence layer로 사용한다.

우선순위는 다음과 같다.

`corpus 통제·재검증 → Chord 오류 교정 → ranking/surface 실증 → chord-context 확보 → Progression 재설계 판단`

Scale의 연주 동선 연구는 corpus 통제 완료 후 별도 트랙으로 진행할 수 있다. 생성 모델, raw corpus 배포, 즉각적인 전체 앱 리빌드는 보류한다.

## 유지·교정·확장·보류

| 구분 | 영역 |
|---|---|
| 유지 | 순수 domain 중심 구조, Scale 공식·모드 회전, Chord registry와 deductive generator, Progression 편집 UI와 문서 조작 개념 |
| 교정 | Chord hard-playability 반례, ranking/surface 편향, Progression의 문자열 기반 화음 해석·4/4 고정·Ionian 고정·상태 자동 초기화 |
| 확장 | 재현 가능한 corpus benchmark, 관측 빈도 prior, 명시적 GP chord diagram, voicing 전환 문맥, Scale fret/string 이동 통계 |
| 조건부 리빌드 | 기타 연주 중심 제품 철학을 선택할 경우 Progression domain model과 playback/voicing 연결 |
| 보류 | DadaGP 기반 생성 모델, genre 개인화, 7현·희귀 tuning 제품화, raw dataset runtime 포함 |
| 폐기하지 않음 | Scale/Chord 이론 엔진. 데이터 빈도로 연역 규칙을 대체하지 않는다. |

현재 수치는 탐색적 기준선으로만 사용한다. 특히 chord 해석 86.9%, raw shape 재현 92.8%, surface 재현 51.0%, hard-playability 통과 94.0%, ranking–빈도 상관 `r=0.266`은 중복 제거·곡 단위 보정 후 다시 산출한다.

## Phase 0. Corpus 통제와 Benchmark v1 — GO

**실행 상태 (2026-09-04): 기술적 완료.** 26,181개 metadata 항목을 전부 resolved/excluded로 통제했고 leakage-safe split과 재현 manifest를 생성했다. 제품 활용은 권리 확인 전까지 차단한다. 상세 결과는 [`DADAGP_PHASE0_REPORT.md`](./DADAGP_PHASE0_REPORT.md)를 따른다.

### 기대 가치

- 이후 모든 판단이 동일한 corpus와 측정법을 사용하게 한다.
- 반복 리프, 중복곡, tie, tuning 차이가 제품 결정을 왜곡하는 것을 막는다.
- DadaGP의 사용 가능 범위를 기술·법적으로 분리한다.

### 진입 조건

- 즉시 진입할 수 있다.
- 기존 검증 결과를 탐색적 baseline으로 사용한다.
- 구체적인 작업 범위와 threshold는 Phase 0 착수 계획에서 재수립한다.

### 수행 범위

- 원본·token·round-trip 파일의 hash와 song identity를 연결한다.
- exact duplicate와 artist/title 중복 후보를 먼저 묶고 난 뒤 song/artist 단위 split을 만든다.
- Reference(독립 fingering fixture), Corpus(deduplicated 직접 관측), Exploratory(단일 occurrence·추론·비표준 cohort)를 분리한다.
- event 빈도, song-presence, unique-shape, genre/tuning별 지표를 병기한다.
- corpus는 개발 환경 밖으로 배포하지 않고 저장소·빌드 입력에서 격리한다.
- 코드 MIT와 corpus/파생물 사용 권한을 별도 확인한다.

### Provisional 종료 기준

- 26,181곡 전부가 manifest에 포함되거나 명시적 제외 사유를 가진다.
- deduplicated split 사이에 동일 body hash가 남지 않는다.
- tie 제외, tuning 정규화, chord ambiguity 정책이 고정되고 동일 입력에서 결과가 재현된다.
- 기존 수치와의 차이가 duplicate/tie/cohort 변화로 설명된다.
- 내부 연구, 파생 통계, 모델/점수, 상업 제품, 재배포의 허용 범위가 각각 문서화된다.

### 중단·판정 기준

- corpus 사용 권한이 내부 분석조차 허용하지 않으면 이후 전 단계 **NO-GO**다.
- 상업적 파생물 권한만 불명확하면 benchmark는 계속하되 제품 반영은 보류한다.

## Phase 1. Chord Correctness Gate — GO, Phase 0 의존

**실행 상태 (2026-09-04): GO 완료.** Reference/Corpus/Exploratory evidence tier와 자동 gate를 구축하고 일반화된 hard-rule 교정을 적용했다. 상세 결과는 [`DADAGP_PHASE1_REPORT.md`](./DADAGP_PHASE1_REPORT.md)를 따른다.

### 기대 가치

- 이미 강한 deductive generator는 유지하면서 실제 관측 shape를 잘못 거절하는 규칙만 교정한다.
- 가장 명확한 현재 결함을 가장 낮은 제품 위험으로 제거한다.

### 현재 근거

- D major `x5777x`가 12,752회·479곡에서 관측됐으나 hard filter가 거절했다.
- 같은 A-shape 계열 8개 조옮김이 총 59,797회 관측됐다.
- 현재 raw generator는 해석 가능한 attack의 92.8%를 재현하므로 전면 교체보다 국소 교정이 타당하다.

### 진입 조건

- Benchmark v1에서 A-shape 반례가 중복 제거 후에도 여러 독립 곡에서 재현된다.
- 해당 shape가 multi-song·artist·transposition 또는 독립 Reference의 복수 증거로 지지된다.
- 세부 correction 범위와 threshold는 Phase 1 착수 계획에서 재수립한다.

### 수행 범위

- hard filter rejection reason별 상위 반례를 검수한다.
- 물리적으로 불가능한 shape와 단지 비전형적인 shape를 분리한다.
- hard constraint는 명백한 불가능성에만 사용하고, 불편함·희소성은 ranking으로 내린다.
- 기존 chords-db fixture와 DadaGP 반례를 동일 regression 기준에 포함한다.

### Provisional 종료 기준

- A-shape와 전 조옮김이 생성·통과한다.
- Reference false-reject 2% 이하, Corpus-strong song-macro false-reject 1% 이하이며 very-strong 및 Reference-corroborated hard reject가 0이다.
- deduplicated raw exact-shape recall이 재검증 baseline보다 1%p 이상 하락하지 않는다.
- 기존 테스트와 추가 반례 테스트가 모두 통과한다.

### 중단·판정 기준

- 반례 대부분이 탭 오류이거나 tuning 해석 오류로 판명되면 엔진 교정을 중단하고 parser/QC 단계로 되돌린다.

## Phase 2. Chord Ranking·Surface Evidence — CONDITIONAL GO

### 기대 가치

- 가능한 shape를 생성하는 능력과 사용자가 먼저 보게 되는 shape의 품질 사이의 격차를 줄인다.
- 현재 surface recall 51.0%, Recall@5 26.3%, 빈도 상관 `r=0.266`이라는 약점을 직접 다룬다.

### 진입 조건

- Phase 1 correctness gate를 통과한다.
- 파생 빈도·점수의 제품 사용 권한을 확인한다.
- song-macro 기준으로 안정된 관측 분포를 확보한다.
- 평가 목표와 threshold는 Phase 2 착수 계획에서 재수립한다.

### 원칙과 수행 범위

- deductive correctness/playability 점수와 empirical evidence 점수를 분리한다.
- 빈도는 후보 생성이나 hard rejection에 사용하지 않고, 합법적 후보 사이의 선택 근거로만 사용한다.
- 전체 빈도와 genre/tuning 조건부 빈도를 구분하며, 표본이 부족하면 조건 없는 논리 ranking으로 복귀한다.

### Provisional 종료 기준

- 동일한 surface 후보 예산에서 song-macro surface recall이 canonical baseline보다 최소 10%p 개선된다.
- held-out NDCG@5 또는 MRR이 최소 10% 상대 개선된다.
- 주요 chord family와 상위 genre slice에서 5%p를 넘는 퇴행이 없다.
- 새로운 hard false-positive나 불가능한 shape가 추가되지 않는다.

### 중단·판정 기준

- 개선 기준을 넘지 못하면 empirical evidence는 분석 리포트로만 유지하고 앱 ranking에는 반영하지 않는다.

## Phase 3. Scale Performance Evidence — CONDITIONAL GO, Phase 0 후 병렬 가능

### 기대 가치

- 현재 정적인 24-fret 이론 지도를 실제 기타의 이동·포지션·두 음 연주 관습과 연결할 가능성을 평가한다.
- Scale 공식 자체가 아니라 "어떻게 움직이는가"를 보완한다.

### 현재 근거

- 연속 단음 이동 769만 쌍에서 동일 현 60.0%, 인접 현 30.1%, fret 이동 중앙값 1·P90 3이었다.
- 두 음 attack의 87.4%가 인접 현이며 완전5도 계열이 56.7%였다.
- 현재 double-stop의 3rd/4th/6th와 고정 string topology는 전체 두 음 관습의 일부만 표현한다.

### 진입 조건

- 중복 제거 후에도 이동 분포가 train/holdout 및 주요 genre에서 안정적이어야 한다.
- 직접 관측 geometry와 추론된 key/scale 데이터를 분리할 수 있어야 한다.
- 연구 질문과 threshold는 Phase 3 착수 계획에서 재수립한다.

### 수행 범위

- 우선 fret/string transition, position dwell, shifting, interval topology만 연구한다.
- scale/key가 필요한 phrase 추천은 별도의 추론 정확도 gate 뒤로 미룬다.
- fifth/octave/unison을 기존 double-stop 교육 기능에 즉시 합치지 않고 별도 관습으로 평가한다.

### Provisional 종료 기준

- 직접 관측 이동 통계가 song-weighted split 간 10% 이내로 재현된다.
- key/scale 기반 기능은 전문가 표본에서 추론 precision 90% 이상일 때만 후보가 된다.
- 최소 하나의 신호가 전문가 평가 80% 이상 또는 별도 사용자 과제에서 명확한 이득을 보여야 제품 단계로 이동한다.

### 중단·판정 기준

- 유효 신호가 genre/artist 식별자에만 의존하거나 key/scale 추론이 기준에 미달하면 UI 확장은 **NO-GO**다.
- Scale registry와 공식의 리빌드는 DadaGP로 정당화하지 않는다.

## Phase 4. Corpus-Annotated Chord Context 확보 — CONDITIONAL GO

### 기대 가치

- DadaGP token에 없는 chord label·mute·shape context를 원본 GP의 명시적 chord diagram에서 확보한다.
- 독립 chord 추천을 실제 progression상의 voicing transition 추천으로 확장할 수 있는지 판단한다.

### 진입 조건

- 명시적 chord diagram 및 파생 shape 데이터 사용 권한을 확인한다.
- GP parser 또는 GPIF 변환의 round-trip 신뢰도를 검증한다.
- Phase 1의 chord identity와 shape normalization 기준을 확정한다.
- 추출 범위와 threshold는 Phase 4 착수 계획에서 재수립한다.

### Provisional 종료 기준

- 최소 1,000개 deduplicated song과 10,000개 유효 chord transition을 확보한다.
- chord label normalization coverage 95% 이상, string/fret/mute shape 유효율 99% 이상을 달성한다.
- song-level holdout에서 previous-shape context가 chord-only baseline보다 NDCG/MRR을 10% 이상 개선하고, fret 이동·texture consistency를 악화시키지 않는다.

### 중단·판정 기준

- 명시적 diagram 표본이 기준에 못 미치거나 특정 소수 아티스트에 편중되면 Progression 근거로 사용하지 않는다.
- onset 기반 추론을 Reference로 승격하지 않는다.

## Phase 5. Progression Domain 재설계 — CONDITIONAL GO / 대규모 리빌드 후보

### 현재 유지할 부분

- measure/node 편집, drag-and-drop, duration 조절, preset 적용이라는 편집 경험.
- Roman numeral과 harmonic function을 다루는 이론적 기능.

### 재설계가 필요한 부분

- `displayDegree/coreDegree` 문자열과 fallback 중심의 chord identity.
- 사실상 4/4에 고정된 duration 처리.
- 선택 scale과 무관하게 Ionian을 표시하는 progression 시각화.
- key/scale/mode 변경 시 progression을 초기화하는 상태 생명주기.
- 실제 guitar voicing과 분리된 compact MIDI playback.
- 각 chord를 독립적으로 고르는 구조 대신 전후 voicing movement를 평가하는 progression-level 선택.

### 진입 조건

- 제품 철학이 "일반 화성 편집기"가 아니라 "기타에서 실제로 이어 연주할 수 있는 진행 설계"로 결정된다.
- Phase 1 correctness와 Phase 4 context gate를 모두 통과한다.
- Chord engine이 progression의 단일 후보 공급원이 될 수 있어야 한다.
- domain migration과 제품 acceptance threshold는 Phase 5 착수 계획에서 새로 수립한다.

### Provisional 종료 기준

- 기존 11개 preset과 secondary dominant, tritone substitute, modal interchange 동작이 보존된다.
- 선택한 scale/key가 progression 해석과 표시 전반에 일관되게 반영된다.
- 각 node가 정규화된 chord identity와 선택 voicing을 보유하고 실제 guitar pitch로 재생된다.
- 독립적인 chord top-1 선택 대비 progression 전체 fret 이동량이 20% 이상 감소한다.
- context benchmark가 Phase 4의 개선치를 유지한다.
- 기존 문서가 존재한다면 명시적 migration 또는 안전한 재생성이 검증된다.

### 판정 분기

- 기타 중심 철학 확정 + context gate 통과: **GO**
- 이론 편집기 철학 유지: domain 전면 리빌드는 **NO-GO**, 현재 구조를 국소 교정
- 철학 미정 또는 신뢰 가능한 context annotation 부족: **CONDITIONAL GO 유지**, 연구 prototype 이상 진행하지 않음
- Progression UI 전체 재작성: **NO-GO**. domain·playback 경계가 확정된 뒤 필요한 부분만 변경

## 후순위 및 명시적 NO-GO

- **7현·희귀 tuning:** 현재 s7 관측곡 하한이 164곡이고 encoder가 희귀 tuning을 제거하므로 DadaGP 단독 근거로는 NO-GO.
- **장르 개인화:** unknown genre 25%, 다중 genre 69%, rock/metal 편향 때문에 충분한 slice 검증 전까지 NO-GO.
- **생성 모델/자동 작곡:** 라이선스, 중복, 장기 구조 평가, 제품 철학이 해결되지 않았으므로 현 단계 NO-GO.
- **raw corpus 제품 탑재·배포:** 명시적 허가와 별도 배포 전략이 없는 한 NO-GO.
- **Scale/Chord 엔진 폐기:** 현재 강한 연역 재현율과 앱의 logic-first 철학에 반하므로 NO-GO.

## 인터페이스와 검증 기본값

- Phase 0–4는 offline benchmark와 domain 검증 단계이며 사용자 UI·공개 API를 변경하지 않는다.
- empirical evidence는 항상 선택적이며 데이터가 없거나 신뢰 기준을 통과하지 못하면 기존 deductive 결과로 복귀한다.
- 대규모 타입 변경 가능성이 있는 것은 Phase 5의 Progression 문서 모델뿐이며, 해당 단계 진입 전에는 고정하지 않는다.
- 모든 단계는 event-weighted 수치뿐 아니라 song-macro와 unique-shape 지표를 함께 사용한다.
- 현재 25개 테스트 파일·204개 테스트 통과 상태를 회귀 기준으로 유지하되, 각 Phase 진입 시 최신 테스트 기준선을 다시 기록한다.

## Phase 운영 원칙

각 Phase를 시작할 때 다음 순서로 별도 세부 계획을 만든다.

1. 직전 Phase 산출물과 최신 저장소 상태를 다시 조사한다.
2. 해당 Phase에서 검증할 단일 핵심 가설과 제외 범위를 확정한다.
3. baseline을 재산출하고 threshold의 근거와 실패 비용을 검토한다.
4. 진입·종료·중단 기준을 승인한다.
5. 구현 또는 분석을 수행한 뒤 다음 Phase 진입 여부를 다시 판정한다.

따라서 이 로드맵의 Phase 순서와 의존성은 유지하지만, 세부 구현안과 숫자 threshold는 각 Phase 앞단에서 자동 승계하지 않는다.
