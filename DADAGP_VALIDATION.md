# DadaGP-v1.1 데이터셋 × Guitar 저장소 검증 결과

> Evidence tier 명칭과 사람 검수 정책은 후속 Phase 1에서 개정되었다. 현재 기준은 [`DADAGP_BENCHMARK_POLICY.md`](./DADAGP_BENCHMARK_POLICY.md)의 Reference/Corpus/Exploratory 체계이며, 아래 Gold/Silver 표현은 최초 조사 당시의 역사적 기록이다.

- 조사일: 2026-09-04 (Asia/Seoul)
- Guitar 기준 커밋: `55f9436`
- 데이터셋: 로컬 `DadaGP-v1.1`
- 판정: **CONDITIONAL GO**

## DadaGP 데이터셋 구조 및 품질 요약

DadaGP는 학습된 "디코더 모델"이 아니라, GuitarPro 파일과 이벤트 토큰 사이를 변환하는 결정론적 encoder/decoder와 대규모 탭 코퍼스다. 따라서 즉시 앱 기능을 강화한다기보다, 현재의 연역적 엔진을 검증할 관측 자료라는 가치가 더 크다. [공식 저장소](https://github.com/dada-bots/dadaGP), [논문](https://archives.ismir.net/ismir2021/paper/000076.pdf)

| 항목 | 로컬 실측 |
|---|---:|
| 곡/토큰 파일 | 26,181 |
| 전체 토큰 | 116,763,466 |
| 총 용량 | 3.66 GB, 104,739개 파일 |
| 원본 | GP3 13,835 / GP4 12,318 / GP5 28 |
| 파생 GP5 | 곡마다 PyGuitarPro 변환본과 token→GP5 round-trip본 |
| 메타데이터 | artist, 다중 genre, validation 여부 |
| 기타가 등장하는 곡 | 25,111곡, 95.9% |
| 실제 기타 note token | 약 4,312만 |
| 7번 현 note | 102,683개, 최소 164곡 |

구조적으로 신뢰성 있게 직접 추출 가능한 것은 다음이다.

- 트랙별 이벤트 시점과 `wait` 간격, 960 ticks/quarter 기준 리듬
- guitar string/fret, open string, 동시 발음 구조
- `clean0/1`, `distorted0/1/2` 등 대략적인 악기 그룹
- tie, palm mute, let ring, hammer, slide, bend, vibrato, harmonic 등의 명시된 기보 효과
- 전역 반음 하향 조율량과 Drop D/Drop A 계열의 음높이 정규화
- 파일명 기반 곡/아티스트 식별자와 Spotify 조회 기반 다중 genre 메타데이터

그러나 이것은 실제 연주자의 센서·오디오 데이터가 아니라 사용자가 작성한 "연주 지시형 탭"이다. 현·프렛은 관측할 수 있지만 왼손 손가락 번호, 실제 바레 여부, 스트로크에서 의도적으로 뮤트한 현, 연주 난도와 실제 퍼포먼스 품질은 제공되지 않는다. encoder도 left/right-hand fingering을 명시적으로 버린다. [encoder 소스](https://github.com/dada-bots/dadaGP/blob/main/dadagp.py)

주요 품질 문제는 다음과 같다.

- 정확히 같은 음악 body hash를 가진 파일이 833개 그룹, 1,700개 파일이다. 이 중 162개 그룹은 train/validation 양쪽에 걸친다.
- 정규화한 artist/title 기준으로는 2,485개 중복 후보 그룹, 5,842개 파일이며 545개 그룹이 split을 넘는다. 이 수치는 버전·편곡까지 합칠 수 있는 휴리스틱이다.
- unknown artist 8,138곡(31.1%), unknown genre 6,533곡(25.0%), 다중 genre 18,056곡(69.0%)이다.
- rock/metal 계열이 크게 과대표집되어 있다. genre는 음악 자체 분석값이 아니라 Spotify의 artist/song 조회 결과다.
- `downtune:0`이 22,190곡(84.8%)이고 나머지는 -1~-6이다. Drop tuning은 음수 fret(-1/-2)로 정규화되며 633,318개 note가 해당한다.
- 15프렛 초과 note 627,580개, 24프렛 초과 4,795개, 최대 34프렛이 있다. 일부는 확장 프렛 악기이고 일부는 탭 오류 가능성이 있다.
- 7현 곡 164개는 s7 note가 실제 등장한 하한이다. 7번 현이 존재하지만 사용되지 않은 트랙은 token만으로 식별되지 않는다. 8현 이상과 희귀 tuning은 encoder에서 제외된다.
- tempo는 10 BPM 단위로 반올림되고, time signature는 token화되지 않는다. 마디 tick 합계로 3/4와 6/8을 구분할 수 없다.
- 악기 프로그램은 clean/distorted/bass/leads/pads로 손실 압축된다. `leads`는 반드시 기타 리드가 아니다.
- 로컬 metadata 경로와 실제 파일명이 맞지 않는 53건이 있다.
- "틀린 탭" 여부는 원곡 정렬·전문가 검수 없이는 판정할 수 없다. 빈도는 정확성의 증거가 아니다.

## 현재 앱에서 직접 검증 가능한 영역

현재 브랜치의 실제 함수들을 DadaGP에 직접 실행했다. 비교 cohort는 `downtune:0`, guitar track, string 1–6, fret 0–15, 3개 이상 distinct pitch class인 동시 attack이며 tie continuation은 새 attack에서 제외했다.

| 검증 대상 | 탐색적 결과 | 해석 |
|---|---:|---|
| 20개 chord registry로 정확 해석 가능한 attack | 1,924,226 / 2,214,631 = **86.9%** | 현 화음 어휘가 실제 동시 발음의 큰 부분을 설명 |
| 해석된 attack을 raw deductive generator가 정확한 string/fret로 재현 | **92.8%** | 연역 생성 구조 자체는 강함 |
| 현재 UI surface에 동일 shape가 포함 | **51.0%** | 생성보다 선택·노출 단계의 손실이 큼 |
| ambiguity-expanded Recall@5 / @20 / @50 | **26.3% / 38.3% / 50.6%** | 현재 점수 순서가 사용 빈도 순서는 아님 |
| engine score와 `log(관측 빈도)` 상관 | **r = 0.266** | 약한 양의 상관만 존재 |
| hard playability 통과 | **94.0%** | 약 6%의 관측 shape를 물리 규칙이 거절 |

현재 chord engine은 `src/domain/chord/voicingSearch.ts` 자체보다 `src/domain/chord/fretGeometry.ts`의 hard playability와 `src/domain/chord/deductiveRanking.ts`의 ranking에서 더 많은 검증 이득을 얻는다.

명확한 반례도 확인됐다.

- 표준 A-shape 미니 바레인 D major `x5777x`가 12,752회, 479곡에서 관측됐지만 현재 엔진은 `barre-behind-unreachable-position`으로 거절한다.
- 같은 패턴의 8개 조옮김만 합쳐 59,797회 관측됐다.
- 현재 규칙이 낮은 프렛의 root finger와 높은 프렛의 3-string mini-barre를 "나란히 놓인 도달 불가능한 그룹"으로 판단하기 때문이다.
- 반대로 흔한 open D, C, E, Am, Em은 각각 대체로 rank 1–5에 들어가므로 low-position/open/root-bass 선호는 방향상 실제 분포와 일치한다.

Scale 영역은 이론 공식을 직접 검증하기보다 연주 관습을 검증할 수 있다.

- 표준 기준 monophonic 연속 이동 769만 쌍에서 동일 현 이동 60.0%, 인접 현 이동 30.1%, fret 이동 중앙값 1, 90백분위 3이었다.
- 정확히 두 음이 attack된 onset은 294만 건이며 87.4%가 인접 현이었다.
- 그중 완전5도 계열이 약 56.7%로 가장 컸다. 현재 `src/domain/scale/doubleStops.ts`는 generic 3rd/4th/6th만 다루므로, 전체 실제 2-note 관습을 대표하는 기능은 아니다.
- key/scale을 모르는 상태에서 semitone interval과 string topology만 근사 비교하면 현재 interval·string-pair·4-fret 규칙에 들어오는 것은 약 25.9%다. 이는 오류율이 아니라 현재 기능의 의도적 범위가 좁다는 의미다.
- 개별 note의 약 98.5%가 non-negative fret 기준 15프렛 이내다. Scale 화면은 이미 24프렛까지 표시하므로 단순 범위 확대 필요성은 낮다.

## 보완 가능성이 높은 영역

가치가 높은 순서는 다음과 같다.

1. **Chord hard-filter 반례 corpus**

   빈번한데 엔진이 거절하는 shape를 모아 hard rule을 검증한다. DadaGP가 가장 즉각적이고 강하게 기여하는 부분이다.

2. **연역 엔진 위의 관측 prior**

   엔진은 가능한 shape를 계속 연역적으로 생성하고, DadaGP는 빈도·장르·포지션·이전 shape를 별도의 evidence score로 제공한다. 앱 철학과도 가장 잘 맞는다.

3. **명시적 chord diagram 추출**

   token에는 chord label이 없지만 원본 GP의 chord diagram annotation은 label, `x/open/fret`, 이전·다음 shape를 함께 제공할 수 있다. 별도 연구에서도 DadaGP에서 이를 추출해 이전 voicing 문맥이 추천 성능을 개선함을 보였다. [연구](https://arxiv.org/abs/2407.14260), [추출 코드·파생 데이터](https://github.com/adhooge/guitar-chord-diagram-suggestion)

4. **Scale phrase/position 통계**

   단일 note의 fret/string transition, 포지션 체류, shifting, technique 결합을 파생하면 현재 정적인 scale map에 "어떻게 움직이는가"라는 새 계층을 줄 수 있다. 단, scale/key inference 이후에만 가능하다.

5. **Double-stop 범위 재검토**

   현재 3rd/4th/6th 교육 기능은 유지하면서, fifth/octave/unison과 장르별 실제 빈도를 별도 연주 관습으로 다룰 근거가 충분하다.

현재 단계에서 과도하거나 신뢰하기 어려운 활용은 다음이다.

- 데이터 전체로 생성 모델을 먼저 학습하거나 앱을 전면 재구축
- 빈도가 높은 shape를 곧바로 "가장 쉽거나 가장 좋은 shape"로 간주
- onset pitch만으로 chord progression을 정답화
- technique token 부재를 "그 기법이 사용되지 않음"으로 해석
- DadaGP로 exotic tuning·8현 이상 지원을 설계
- raw dataset이나 decoder를 앱 runtime/deployment에 포함

## 검증 방법과 핵심 지표

권장 검증 단위는 3계층이다.

- **Gold:** 원본 GP의 명시적 chord label/diagram
- **Silver:** 중복 제거 후 동시 attack에서 정확한 chord formula로 해석되는 shape
- **Exploratory:** key/scale/chord를 통계적으로 추론한 phrase

핵심 절차와 지표:

- 파일 hash와 정규화 song identity로 중복 제거 후 song/artist 단위 split
- standard/drop/7-string, clean/distorted, genre, fret band별 별도 집계
- chord recognizer: coverage, ambiguity rate, chord별 precision/recall
- generator: exact string/fret recall, played-string recall, pitch-class recall
- hard rule: false-reject rate와 rejection reason 분포
- ranking: Recall@K, MRR, NDCG@K, Spearman/Kendall 상관
- surface: 곡 단위·event 단위 coverage를 함께 측정
- progression/context: 이전 shape 조건부 Recall@K와 이동거리·texture consistency
- Scale: fret/string transition matrix, position dwell, fret jump P50/P90, double-stop interval/string-pair coverage
- 빈번한 shape와 hard reject 각각 song-stratified 전문가 표본 검수
- 반복 리프의 과대 가중을 막기 위해 raw occurrence, song-presence, unique-shape 지표를 모두 병기

현재 수치는 중복을 유지한 event-weighted 탐색 결과이므로 최종 benchmark가 아니라 가능성 입증용 baseline이다.

## 주요 리스크 및 unresolved 사항

- GitHub의 MIT 라이선스는 encoder/decoder 코드에 적용된다. 로컬 데이터 패키지에는 별도 corpus 라이선스가 없고, 공식 README는 데이터 접근을 "research purposes"로 안내한다. 논문의 CC BY 4.0도 논문 자체의 라이선스이지 곡 파일의 배포 허가는 아니다.
- 원본은 상업 음악의 사용자 작성 탭을 다수 포함한다. 내부 분석, 파생 통계, shape 데이터, 모델 가중치, 상업 서비스 사용, 원본/파생물 재배포 각각에 대해 저자의 서면 허용 범위를 확인해야 한다.
- explicit chord diagram 전체 추출에는 GP parser 호환성 또는 GuitarPro 8/GPIF 변환 과정이 필요하다. 현재 로컬 환경에는 해당 파이프라인이 준비되어 있지 않다.
- genre·artist 결측과 rock/metal 편향 때문에 전 장르 공통 추천 prior로 사용하면 왜곡될 수 있다.
- 탭은 작성자의 의도이지 실제 공연 빈도·손가락 난도 ground truth가 아니다.
- 현재 저장소에서 `DadaGP-v1.1/` 전체가 untracked이면서 ignore되지 않았다. 3.41 GiB가 실수로 커밋될 위험이 있다.
- Git remote 자체는 정상이다. 조사 당시 `chord-mode-rebuild`의 HEAD `55f9436`은 `origin/master`와 일치하며, 로컬 `master`만 40커밋 뒤에 있었다.

## 실제 활용 가치 판정

**CONDITIONAL GO**

- **GO:** 내부/offline chord-engine 검증, hard-filter 반례 발견, ranking 진단, scale movement·double-stop 통계.
- **CONDITIONAL GO:** 중복 제거·명시적 chord annotation 추출·전문가 검수·사용 허가가 완료된 뒤 관측 prior와 문맥 기반 추천에 활용.
- **NO-GO:** raw dataset의 제품 배포, DadaGP 빈도로 기존 이론 엔진 대체, 곧바로 Scale/Progression 전면 리빌드, 생성 모델 우선 개발.

결론적으로 현재 구조를 폐기할 이유는 없다. DadaGP는 Scale에서는 장기적인 연주 경로 데이터, Chord에서는 즉시 가치가 있는 검증·보완 자료, Progression에서는 명시적 chord diagram 문맥을 확보한 뒤 사용할 수 있는 후속 자원이다. 가장 먼저 바뀌어야 할 것은 앱이 아니라 검증 체계다.
