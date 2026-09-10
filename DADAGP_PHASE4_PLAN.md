# DadaGP Phase 4 계획 — Corpus-Annotated Chord Context & Voicing Transition Evidence

- 작성일: 2026-09-10 (Asia/Seoul)
- 정책 버전: `phase4-chord-context-v1`
- 범위: 원본 GP 파일의 명시적 chord diagram 추출, 코드 전환($C_{t-1} \to C_t$) 오프라인 벤치마크 및 보이스리딩(Voice-leading) 연속성 실증
- 제외: 런타임 제품 배포(BLOCKED 유지), 온셋 기반 임의 화음 추론, 비표준 튜닝, 생성 모델

## 1. 배경과 핵심 가설

기존 Phase 1과 Phase 2는 단일 코드(Isolated Chord) 관점에서 물리적 연주 가능성(Hard Playability)과 단독 선호도(Root-specific prior)를 확립했다. 그러나 실제 기타 연주에서 보이싱의 선택은 단독 코드 이름뿐 아니라 **직전 코드의 물리적 위치(Previous Voicing / Fret Register / Texture)**에 의해 결정적으로 좌우된다.

- **가설 1 (Contextual Predictive Power):** 직전 코드의 보이싱 정보($V_{t-1}$)를 조건으로 부여할 때, 단독 코드 빈도 모델($P(V_t \mid C_t)$) 대비 다음 보이싱($V_t$)의 예측 정확도(Recall@K, NDCG@5)가 통계적으로 유의하게 향상된다.
- **가설 2 (Movement Economy & Voice Leading):** 실제 탭의 연속 코드 전환은 프렛 간 이동 거리($|\bar{f}_t - \bar{f}_{t-1}|$)를 최소화하고 발음 현 개수 및 개방현/바레 텍스처의 일관성을 유지한다.
- **가설 3 (Bridge to Progression Domain):** 이 오프라인 전환 데이터는 Phase 5(Progression 모드 재설계)에서 다이어토닉 코드 진행 시 자연스러운 기타 보이싱 연결(Voice-leading cost function)을 설계하고 검증하는 실증 기준선(Ground Truth)이 된다.

## 2. Cohort와 관측 단위

- **데이터 소스:** 로컬 `DadaGP-v1.1` 내의 원본 GP3/GP4/GP5 바이너리 파일.
- **파서 엔진:** `@coderline/alphatab` (Node.js/TypeScript 기반 결정론적 파서).
- **데이터 분할:** Phase 0의 deduplicated split (`phase0-manifest.jsonl`) 및 Song / Artist holdout을 그대로 유지한다.
- **Primary Cohort:**
  - 6현 기타 트랙 (`strings.length === 6`)
  - 표준 튜닝 (`E2-A2-D3-G3-B3-E4`, downtune: 0)
  - 유효 프렛 범위: 0–24, 음수 프렛은 뮤트(-1)만 허용
  - 명시적 Chord Diagram (`beat.chord != null`)이 부착된 이벤트
- **관측 단위 (Chord Transition):**
  - 동일 곡, 동일 기타 트랙 내에서 시간 순으로 연속 등장하는 두 코드 다이어그램 쌍: $(C_{t-1}, V_{t-1}) \to (C_t, V_t)$
  - 반복 리프의 과대 표집을 막기 위해 동일한 $(C_{t-1}, V_{t-1}, C_t, V_t)$ 전환 지오메트리는 한 deduplicated song 내에서 최대 1회만 support에 반영한다.

## 3. 정규화 및 품질 관리 (Normalization & QC)

1. **Chord Label Normalization:**
   - 탭 작성자가 입력한 다양한 코드 문자열(예: `C#m`, `Dbm`, `C#min`, `A7/G`, `Cadd9`, `F#m7b5` 등)을 파싱하여 Root(0–11)와 Quality(앱의 `src/domain/chord/registry.ts` 20개 기본 quality)로 정규화한다.
   - 온셋 베이스 음(slash chord)은 베이스 현 지오메트리와 대조 검증한다.
2. **Diagram Validation:**
   - 6개 현에 대해 각각 Fret 값($-1$은 뮤트, $0$은 개방현, $1 \le f \le 24$는 운지)을 가진 배열 $[f_1, f_2, f_3, f_4, f_5, f_6]$로 표준화한다.
   - 발음 현이 2개 이하이거나 물리적 스팬이 비정상적인 손상 다이어그램은 QC issue로 분류한다.
3. **Reference & Evidence Tiers:**
   - **Corpus Direct:** 원본 GP에 명시된 다이어그램 및 전환.
   - **Excluded / Exploratory:** 비표준 튜닝, 7현, 온셋만 있고 다이어그램이 없는 마디의 임의 추론 화음.

## 4. 비교 기준선 및 평가 모델

- **Baseline 0 (Pure Deductive):** Phase 1의 물리적 연역 점수 기반 랭킹 (문맥 미반영).
- **Baseline 1 (Chord-only Empirical Prior):** Phase 2의 단독 코드 빈도 모델 $P(V_t \mid C_t)$ (문맥 미반영).
- **Candidate 1 (Fret-Distance Minimization Heuristic):** 연역 엔진 후보군 중 직전 보이싱의 중심 프렛과의 거리 차이 $|\bar{f}_t - \bar{f}_{t-1}|$에 페널티를 부여하는 기하학적 최소 이동 모델.
- **Candidate 2 (Preceding-Voicing Context Prior):** 직전 보이싱 조건부 빈도 모델 $P(V_t \mid V_{t-1}, C_t)$.
- **Candidate 3 (Hybrid Deductive + Transition Cost):** 연역적 운지 점수 + 프렛 이동 비용 + 바이그램(Bigram) 관측 prior의 선형 결합.

## 5. 진입·종료 Threshold

| 구분 | 지표 | 기준 |
| :--- | :--- | :---: |
| **데이터 충분성** | Deduplicated 유효 곡 수 | $\ge 1,000$ 곡 |
| | Deduplicated 유효 전환 쌍 | $\ge 10,000$ 쌍 |
| **품질(QC)** | Normalization 성공률 | $\ge 95\%$ |
| | Shape / Fret 유효율 | $\ge 99\%$ |
| | QC issue rate | $< 1.0\%$ |
| **일반화 성능** | Song holdout Recall@3 개선 | Baseline 1 대비 $95\%\text{ CI} > 0$ |
| | Artist holdout Recall@3 개선 | Baseline 1 대비 $95\%\text{ CI} > 0$ |
| | NDCG@5 상대 개선율 | $\ge +10\%$ |
| **물리적 이동성** | 평균 프렛 점프 거리 ($\Delta\text{fret}$) | Baseline 0/1 대비 $\ge 20\%$ 감소 |
| | 텍스처 일관성 (발음 현 개수 차이) | 비퇴행 |

## 6. 판정 분기 및 안전장치

- **GO:** 데이터 충분성·QC·holdout 예측력·물리적 이동성 게이트를 모두 통과 -> Phase 5의 기타 중심 Progression 보이스리딩 엔진 설계 승인.
- **CONDITIONAL GO:** 전체 전환 개선은 유의하나 특정 빈출 코드 쌍(예: `I-V`, `ii-V-I`)에 편중된 경우 -> 한정된 전환 규칙으로만 보완.
- **NO-GO:** holdout에서 문맥 모델이 Baseline 1을 상회하지 못하거나 QC 이슈가 1%를 초과하는 경우 -> Phase 5에서 다이나믹 보이싱 전환 대신 정적 보이싱 유지.
- **권리 안전장치:** 본 Phase 4의 산출물(전환 매트릭스, 다이어그램 통계)은 순수 오프라인 벤치마크 및 연역적 비용 함수의 파라미터 튜닝 근거로만 사용되며, 원본 데이터 및 다이어그램 표는 런타임/프로덕션에 배포하지 않는다 (`BLOCKED_PENDING_WRITTEN_RIGHTS`).
