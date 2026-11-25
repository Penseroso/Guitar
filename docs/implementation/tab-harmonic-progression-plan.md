# TAB 화성 진행 분석: 구현 분석 및 단계 계획

상태: **계획만 작성, 제품 구현 미착수**. 조사 기준은 로컬·GitHub가 일치한
`feat/tab-timing-inspection` / `1339c6c4af10e7c2b8fc87593cc85ccbddfdc862`.
기존 [P4-C 평가](tab-p4-next-gate.md)의 미정 계약을 이번 계획에서 구체화한다.
당시의 NO-GO를 명시적 화성 문맥 연결 전체의 영구 보류로 해석하지 않는다.

목표는 사용자가 제공한 반주 문맥으로 선율을 이해하고, 이후 자동 분석의
근거를 확보하는 것이다. 새 엔진·시간 모델 구축 자체를 완료 기준으로 삼지 않는다.
서브에이전트는 데이터/UI 계약, 기존 엔진 재사용, 자동화 반례를 독립 조사했다.
이번에는 코드·테스트를 추적했으며 새 테스트 실행이나 정확도·성능 측정은 하지 않았다.

## 판단과 구현 순서

| 단계 | 사용자에게 주는 결과 | 복잡도·의존성 | 판정 |
| --- | --- | --- | --- |
| **1A 제공된 코드 진행 연결** | 시간 없는 TAB도 범위에 코드를 지정하고 각 원본 음의 코드 도수·포함 여부 확인 | 중간: 별도 문맥 상태, 범위·Undo 계약, 입력 UI | **계획 기준 구현 GO** |
| **1B 명시적 시간 연결** | 표기 음 하나가 코드 경계를 넘을 때 문맥별 관계 확인 | 중간~높음: 1A + 정확한 코드 경계, P3.3 모델·좌표 검증 | 1A 후 순차 GO; sounding 해석 제외 |
| **2A 조건부 진행 분석** | 실제 입력 순서의 dominant/applied/subV 접근형, 근거·누락 문맥 확인 | 중간~높음: 1A; 시간·자동 조성은 필수 아님 | 제한 어휘의 observer 구현 GO |
| **2B 선율의 화성적 역할** | 선택된 선율의 실제 이동·코드 도수 변화, 제한된 경과/이웃/계류 해석 | 높음: 1A, 명시적 선율; 규칙에 따라 1B·리듬·준비/해결 증거 | 사실부터 GO; 역할별 검증 후 확대 |
| **3 자동 구간·국소 조성·전조** | 경계/화음/조성의 대안과 불확실성을 자동 제안 | 매우 높음: 독립 주석 예제, 비교 기준, 가설 간 의존성 평가 | **오프라인 탐색 GO, 제품 확정 추론은 검증 후** |

권장 출시 순서는 **1A → 2A와 2B의 이동 사실 → 1B → 검증된 2B 역할 → 3**이다.
강박·지속·계류에 필요한 시간만 후속 조건으로 둔다. 코드 순서와 음별 도수까지
완전한 시간 입력이나 자동 조성 추론을 기다리게 만들지 않는다.

초기 계획 가정은 **시간 미입력 TAB 지원, 코드 이름은 카포 반영 실음 기준**이다.
사용자에게 두 선호를 질문했으며 답변이 오면 해당 계약을 조정한다.

## 현재 구현에서 확인한 재사용 경계

| 근거 | 확인된 동작 | 결정 |
| --- | --- | --- |
| [TAB 모델](../../src/domain/tab/types.ts#L26) | 안정된 moment/note ID, 가변 position 수, mutable 마디 번호. 진행·영역·Voice 없음 | ID 재사용. 마디 번호만 영역 키로 쓰지 않음 |
| [state/history](../../src/features/tab-analysis/state.ts#L17), [회귀 테스트](../../src/features/tab-analysis/state.test.ts#L87) | `context.chord`는 선택/편집 시 초기화, 전체 Analyze에서 제거, 편집 history 밖 | 저장할 진행 문맥으로 재사용 금지. 별도 sidecar 필요 |
| [선택 분석](../../src/domain/tab/analysis.ts#L62), [독립 scale/chord 테스트](../../src/domain/tab/analysis.test.ts#L46) | 주어진 chord와 scale의 근음을 분리해 membership·도수·철자 계산 가능 | 사실 계산 ADAPT. raw cached PC 대신 검증 MIDI를 사용 |
| [P4 point API](../../src/domain/tab/written-point-analysis.ts#L73) | complete nominal point에서만 후보 생성, 선택 후보에만 설명 | 유지. 제공 화음 연결을 이 gate나 후보 목록에 종속시키지 않음 |
| [Roman/resolve](../../src/domain/harmony/roman.ts#L20), [테스트](../../src/domain/harmony/roman.test.ts#L45) | 명시적 frame의 `V7/vi`, canonical formula, 지원 범위의 slash bass | ADOPT. 일반 코드명 전체를 파싱하는 함수는 없음 |
| [기존 progression](../../src/domain/tab/harmonic-spans.ts#L49), [모호성 테스트](../../src/domain/tab/passage-analysis.test.ts#L221) | 인접 source span의 제한된 ii–V–I/V–I/IV–I, exact 대안 모호하면 유보 | 기존 의미 보존. supplied progression의 검출기로 가장하지 않음 |
| [exploreRelation](../../src/domain/harmony/relations.ts#L69) | 선행 화음의 형태를 검증해도 dominant/ii-v/tritone는 target으로부터 예시 생성 | 어휘·설명 재사용만. `matched`를 악곡 검출 성공으로 해석 금지 |
| [observeEnding](../../src/domain/harmony/ending-observation.ts#L38), [증거 요구 테스트](../../src/domain/harmony/relations.test.ts#L161) | 실제 제한된 pair observer. 종지에는 phrase/bass/soprano 조건 요구 | 조건을 지키는 adapter 재사용. extended chord 지원을 임의 확대하지 않음 |
| [connections](../../src/domain/harmony/connections.ts#L52) | formula degree/PC의 이론적 성부 대응, 실제 MIDI·voice 입력 없음 | 실제 선율 이동 observer와 분리 |
| [scale-tone analysis](../../src/domain/chord/scale-tone-analysis.ts#L93) | 같은 tonic의 선별 chord-scale pairing에서 조건부 tension/caution | 임의 C scale + Dm/G7의 일반 역할 분석기로 사용 금지 |
| [legacy function](../../src/domain/chord/functional-interpretation.ts#L114) | 수직 문맥에 근거한 교육적 기능 heuristic, tonic fallback 존재 | 악곡 기능 판정 경로에 연결하지 않음 |

## 1. 코드 진행과 TAB 연결

### 1A: 시간 없이도 성립하는 제공 문맥

**권장 데이터 방식:** `TabDocument`를 재작성하지 않고 편집 상태의 별도
`suppliedHarmony` sidecar를 둔다. 저장된 문맥은 사용자 주장이고 P4의 일시적
`If C` 선택은 탐색 가설이다. 가설을 자동 저장하지 않는다.

각 항목은 자체 ID, 논리적 score identity, 명시적 시작/끝 moment ID, absolute
`ChordRef`, 입력 원문/종류와 출처를 가진다. 첫 버전 범위는 **양 끝 moment를
포함하는 source-position 범위**로 고정한다. 마디 단위 지정도 이를 명시적으로
선택하는 UI 단축일 뿐, 마디가 실제 화성 길이라는 추론이 아니다.
새 import가 기존과 같은 ID 문자열을 만들더라도 문맥이 넘어가지 않도록
score identity와 함께 검증한다. 상태 저장·Undo는 지원하되 ASCII에 코드를
끼워 넣거나 새로운 교환/파일 저장 포맷을 이번 범위에 추가하지 않는다.
여기서 상태 저장은 세션 편집 상태를 뜻한다. logical score identity는 일반 프렛·
튜닝·split/join 편집에서 유지하고 import/reset에서 바꾸며, 파생 분석 revision과
구분한다. Undo는 **score identity + document + suppliedHarmony**를 원자적으로 복원한다.

대안은 마디 번호만의 label과 exact-time 전용 저장이다. 전자는 재번호·마디 내 코드
변화에 취약하고 후자는 시간 미입력 TAB을 배제한다. 마디 지정은 source-range
생성 단축으로, exact-time은 아래 별도 binding으로 두는 이유다.

계약:

- 서로 겹치지 않는 명시적 범위만 확정. 미지정 gap은 문맥 없음이고 앞 코드를
  자동 연장하지 않는다. 첫 버전은 한 범위의 여러 대안/복합 코드 입력을 보류한다.
- `C Am F G`라는 순서만으로 TAB 배치를 만들지 않는다. 범위 지정 또는 사용자가
  선택한 “선택한 마디당 한 코드” 배치의 미리보기·확정이 필요하다.
- 처음에는 기존 root/quality/bass picker와 등록된 `ChordRef` 검증을 재사용한다.
  연속 입력 편의는 같은 계약 위에 제한된 symbol/Roman parser와 배치 미리보기를
  후속 추가한다. 미지원 suffix, `C6/9`와 slash bass, `V7/ii`를 오파싱하지 않으며
  알 수 없는 입력을 C/major 등으로 바꾸지 않는다.
- Roman은 명시적 major/minor frame이 있어야 resolve한다. 입력 시 absolute chord를
  고정하고 raw Roman과 당시 frame을 보존한다. 이후 Key 참조 변경은 실제 코드를
  바꾸지 않고 새 참조의 조건부 Roman만 갱신한다. 진행 전체의 재해석/이조는
  별도 명시적 명령과 미리보기·Undo 계약으로 후속 검토한다.
- 기본 코드는 실음 기준이다. 카포/튜닝은 이미 note MIDI에 반영돼 있으므로 코드에
  다시 더하지 않는다. 운지 이름 입력 지원은 별도 pitch-basis 계약이 필요하다.
- 단음 D 아래 사용자 Cmajor도 유효하다. 코드가 기타 음집합의 인식 후보에 없어도
  거부하지 않으며, C/E/G를 관찰된 음표에 삽입하지 않는다.
- 시간 없는 결과는 해당 원본 occurrence와 코드의 관계이다. 길이·지속·동시 발음은
  주장하지 않는다. invalid note는 위치별 진단하고 다른 유효 음의 관계를 보존한다.
- 1A는 각 음의 관계를 보여줄 수 있으나 다성 TAB의 어느 음이 선율인지는 추정하지
  않는다. 선율 이동 분석에는 사용자 선택 note ID 열 또는 검증된 단선율 범위가 필요하다.
  시간 없는 단음 position 열은 `source-order`로 분석할 수 있지만 시간적 비중첩이나
  성부를 증명하지 않는다. 기존 `texture: monophonic`도 single-note column 분류이지
  duration overlap 검사 결과가 아니므로 계류·시간적 voice 검증에 재사용하지 않는다.

편집·수명:

| 변화 | 제공 문맥의 처리 |
| --- | --- |
| 범위 앞/뒤 position 삽입·index 재번호 | 끝 ID가 살아 있으면 원래 범위 유지 |
| 양 끝 사이 position 삽입 | 그 범위의 새 위치로 포함; 분석은 stale |
| 내부 위치 삭제 | 양 끝이 남으면 범위 유지; 새 실제 순서로 재분석 |
| 끝 ID 삭제·뒤집힌/끊어진 참조 | `needs-review`; 이웃 위치로 자동 대체 금지 |
| 마디 split/join·재번호 | source ID 범위 유지, 파생 시간 연결만 재검증 |
| 프렛/튜닝/카포 변경 | 제공 실음 코드 유지, note 사실·분석 재계산. 자동 이조 없음 |
| 성공 import | 새 score 문맥 시작; 이전 score와 문맥은 같은 Undo snapshot에서 복구 |
| reset | 기존 clear-all 계약대로 score·문맥·history 초기화; reset Undo 기능을 추가하지 않음 |
| 문맥 편집·범위 편집·Undo/Redo | 문맥과 악보를 같은 edit history에서 원자적으로 복원; 이전 분석 자동 부활 금지 |

현재 cursor의 nearest fallback은 편집 편의용이다. 삭제된 화성 범위 끝을
인접 note로 옮기는 규칙으로 재사용하지 않는다.

UI는 악보 옆 범위 선택→`Add chord`→짧은 입력/확정, 악보 위의 제공 코드 표기를
기본 흐름으로 둔다. 원문·좌표·근거는 Details에 둔다. 미확정 프렛·분수·코드명·IME를
각각 구분하고 명시적 확정/취소 전에 **새 진행 분석·적용·이동**이 값을 저장/폐기하지 못하도록
기존 timing guard 원칙을 확장한다. pointer-down/blur/keyboard/Escape와 focus 복귀를
브라우저에서 검증한다. 코드 확정은 의도된 한 번의 history 편집이고 보기·질의는 편집이 아니다.
기존 Analyze의 유효 프렛 draft 직접 commit 동작은 유지한다. 새 코드 입력의 임시값을
기존 분석 버튼의 blur로 저장하거나 취소하지 않도록 입력 계약을 따로 검증한다.

### 1B: 명시적 시간 연결

source-position과 exact written-time은 서로 다른 binding 타입으로 둔다.
초기에는 **항목당 binding 한 종류**이며 한 분석에서 두 종류를 자동 병합하거나
한쪽에 우선권을 주지 않는다. 1A 범위는 source 양 끝을 포함하므로 같은 position을
공유하면 겹침이다. 반면 exact `[a,b)`와 `[b,c)`는 접하는 별도 구간이며 충돌이 아니다.
시간 연결은 사용자가 선택하고 **코드의 시작과 끝 `[start,end)`를 명시**해야 한다.
단순히 source 범위에 포함됐다는 이유로 global time까지 같은 코드라고 추정하지 않는다.
offset이 소유 마디를 벗어나는 입력도 원래 source ownership과 실제 투영 시간을 보존한다.

P3.3의 regular-bar 모델, exact rational arithmetic, 검증된 원본 interval을 재사용한다.
모델·meter·좌표의 revision을 기록하고 바뀌면 파생 binding을 재검증한다. 못갖춘마디·변박·
실제 발음 복원은 이 단계에 추가하지 않는다. 알려진 한 interval과 명시적 코드 구간의
교집합은 다른 음이 미입력이어도 보존한다. 모르는 시작/길이는 임의로 채우지 않는다.
“그 시점의 전체 음집합”을 말할 때만 기존 point-completeness proof가 필요하다.

코드 경계를 넘는 원본 음은 ID 하나에 문맥별 관계 구간을 붙인다. 새 note/재공격/
실제 sustain을 생성하지 않는다. 예: E의 nominal interval이 C→Am 경계를 넘으면
동일 occurrence의 `3 → 5`를 설명할 수 있지만 실제로 그 길이 동안 울렸다고 주장하지 않는다.

## 2. 제공 문맥 아래 음악 분석

**배치 위치:** 기존 엔진 위에 얇은 TAB 문맥 연결·관찰 계층을 둔다. 기존 Analyze와
P4 API의 기본 계약을 바꾸거나 Harmony 예시 생성을 악곡 관찰기로 대체하지 않는다.
기존 Analyze 단일 context의 확장은 다중 구간·출처·history를 해결하지 못하고,
외부 엔진 교체는 현재의 누락 입력·source binding 문제를 대신 해결하지 못한다.

구현 책임의 초안은 다음과 같다. 파일/API 명칭은 가칭이며 공개 계약을 고정하지 않는다.

- `supplied-harmony.ts`: 제공 문맥의 validation과 source binding. 위치 lookup은
  assigned/no-context/conflict/needs-review를 구분한다.
- `contextual-analysis.ts`: 검증된 note와 직접 제공 `ChordRef`의 관계. 시간 버전은
  별도 exact binding을 입력받고, 잘못된 전체 모집단 gate로 개별 사실을 버리지 않는다.
- `progression-observation.ts`: 실제 bound 코드 pair/짧은 sequence와 명시적 frame을
  비교하는 제한된 관찰. 기존 `harmonic-spans.ts`에 supplied 데이터를 observed 후보로 위장해 넣지 않는다.
- `state.ts` 및 TAB workspace/score: sidecar·원자적 history·범위 입력·선택 상세.
  P4의 후보 탐색 상태와 제공된 진행 상태를 공유하지 않는다.
- 자동화 prototype/평가기는 연구 영역에 두고 제품 runtime의 기본 경로로 import하지 않는다.

결과는 ① 원본 note/사용자 코드/frame 등 입력 사실 ② 계산된 도수·이동·패턴 일치
③ 조건부 기능 해석과 미충족 조건을 분리한다. 항목별 근거 ID·범위·규칙 버전·
지원 상태를 남긴다. top-level `possible/matched`만으로 모든 해석을 승격하지 않는다.
아래의 실제 입력 음/코드란 생성 예시가 아닌 원본 입력을 뜻하며, 실제 연주 측정을
뜻하지 않는다. 이동 결과에는 `source-order` 또는 검증된 `written-time-order`를
명시한다. 양쪽 순서가 충돌하면 진단하고 시간적 준비·해결 근거로 사용하지 않는다.

### 2A: 실제 제공 코드 순서를 읽는 observer

우선 어휘는 명시적 major/minor frame의 **V–I/i, ii–V–I, V7/x 접근,
jazz/pop의 subV 접근**으로 제한한다. 실제 before/target의 root·canonical formula·
순서·문맥 연결을 검증한다. 기존 target eligibility/철자/비교 함수를 재사용하되
생성된 예시가 입력 pair와 같다는 검사 없이 진행 분석 결과로 내보내지 않는다.
문맥 gap·needs-review 범위를 건너뛰어 인접 진행으로 만들지 않는다.

- C major의 사용자 A7→Dm: **V7/ii로 해석 가능한 접근형**. D의 조성 확립이나 전조 아님.
  같은 A7이라도 다음 코드가 다른 반례에서 같은 결과를 강제하지 않는다.
- 사용자 Db7→C: jazz/pop 문맥의 **subV 접근 해석 가능성**. 실제로 G7이 대체됐다는
  역사나 작곡 의도는 검출하지 않는다. classical lens의 증6화음과 자동 동일시하지 않는다.
- G7→C: 코드 진행 사실과 dominant motion은 설명하되, phrase ending/bass/soprano가
  없으면 완전정격종지를 확정하지 않는다. `resolveChord`의 기본 root bass나 기타의
  최저음으로 `bassConfirmed`를 채우지 않는다. 기존 `observeEnding`의 제한 어휘를 지킨다.
- 일반 tonic substitute/borrowed/modal interchange는 첫 어휘 밖이다. 하나의 root나
  공통음만으로 기능을 붙이지 않고, 필요한 actual-pair 규칙·반례를 검증한 뒤 확장한다.

### 2B: 선율 사실부터, 역할은 규칙별로

1. **먼저 출시할 사실:** 명시적으로 고른 선율 occurrence의 음정·방향, 각 코드 아래
   도수 변화, 공통 PC, 목표 화음의 실제 구성음 도달. 예: 선택 선율 B4→C5는 +1반음,
   F4→E4는 −1반음. 이론적 guide-tone 도식과 실제 선택 음을 별도로 대조한다.
2. **다음 제한된 후보:** 명시된 단선율의 C–D–E를 C 아래에서 경과 진행형,
   C–D–C를 이웃 진행형으로 검토한다. 전후음·step·방향·코드 배치를 확인하고,
   강약/시간이 없으면 비강세 경과음 등 요구 증거가 더 많은 분류는 유보한다.
   규칙이 약박형만 지원한다면 그 하위형을 명시하고 강박 경과음 전체를 오류로 만들지 않는다.
3. **시간·준비 증거 이후:** 동일 선율의 준비–nominal retention–해결이 확인되는
   제한된 4–3 계류 유형을 평가한다. 재공격된 F→E, 준비 없는 F, 알려지지 않은 길이,
   다른 voice의 해결은 반례다. 현재 sustain/technique metadata를 sounding 증거로 승격하지 않는다.

문자 그대로의 formula 포함 여부, chord-relative interval, 교육적 tension 해석,
악곡에서의 선율 기능은 별개다. 비구성음 D를 무조건 오음/available 9/avoid/passing으로
정하지 않는다. F over C는 문맥에 따라 11 색채·경과·계류가 달라질 수 있다.
다성 TAB에서는 string=voice, highest note=melody, nearest pitch=같은 성부 규칙을 만들지 않는다.

## 3. 자동 구간화·국소 조성·전조

이를 하나의 “자동 분석” 기능으로 출시하지 않는다. 1·2와 독립된 오프라인 평가에서
**경계, 화음, 국소 중심, 전조**를 각각 측정하고 상호 의존성을 확인한다.

1. **평가 계약·예제부터:** guitar-only/단선율/반주 포함, 완전·부분 timing,
   모호한 화음, 짧은 tonicization/지속된 modulation/안정된 mode/비조성 예제를 분리한다.
   독립 주석의 실제 경계·허용 대안·불확실 구간을 기록하고 development/calibration/test를
   곡 단위로 분리한다.
   사용자가 입력한 코드나 모델 출력은 자동으로 독립 정답이 되지 않는다.
   동일 곡의 편곡·이조 변형은 같은 held-out 그룹에 묶어 정보 누출을 막는다.
2. **구간/화음 baseline:** 명시적 timing이 있는 지원 subset에서 endpoint 변화를
   관찰 후보 경계로만 사용한다. 경계를 합치거나 여러 경계 후보를 유지하는 bounded
   cost/sequence baseline을 비교하되 음집합 변화=화성 변화 규칙으로 확정하지 않는다.
   고정 frame이 있는 실험과 frame 없는 실험을 구분한다. order-only 후보는 position
   좌표로만 평가하고 시간 정확도 수치에 섞지 않는다.
3. **국소 중심 baseline:** 주어진 코드 구간에 대해 제한된 window/profile와
   chord-function sequence 근거를 비교한다. 먼저 oracle 경계/화음에서 평가한 뒤
   자동 후보와 연결해 오류 전파를 측정한다. global key 참조를 자동으로 덮어쓰지 않는다.
   장·단조 profile 성능으로 modal center 지원을 주장하지 않는다. 다음 세 실험을
   분리한다: **제공/oracle 구간·화음→key, 제공/oracle key→구간, joint/end-to-end**.
   제공된 key를 넣은 성적을 자동 key 추론의 성적으로 보고하지 않는다.
4. **tonicization/modulation 분리:** A7→Dm 한 쌍은 local target 가능성이다.
   반복 지지·머무름·후속 기능·cadential/phrase 근거의 지속을 조합하는 가설을 비교한다.
   고정된 마디 수로 전조를 정의하지 않는다. 경계와 key 가설을 함께 고려해야 할 경우
   후보 폭을 제한한 공동 탐색을 비교하며, 구간화→key의 한 방향 의존을 정답으로 고정하지 않는다.
5. **제품 후보 gate:** 검증된 subset에만 제안과 근거·대안·거절 사유를 노출한다.
   사용자 채택 전 supplied context로 저장하지 않으며, 근거가 부족하면 무판정이 정상이다.

비교 후보는 기존 TypeScript formula/정확 시간과 작고 설명 가능한 통계/sequence baseline을
우선한다. music21 profile 등 외부 접근은 오프라인 비교 대상으로만 검토할 수 있으며,
이전 slicing 연구가 key 정확도를 검증한 것은 아니다. 신경망·외부 런타임·새 배포 의존성은
개선 폭·데이터 적합성·비용·라이선스 검토 후 별도 결정한다. 이번 계획은 특정 기법을 채택하지 않는다.
제공된 코드 순서·위치 구간으로 시작하는 연구는 1·2의 전체 출시나 완전한 global
written population을 기다릴 필요가 없다. timing이 없으면 duration weighting을
임의로 추가하지 않고, 그 조건에 맞는 별도 baseline으로 평가한다.

평가에는 일대일 boundary matching의 precision/recall과 주석 해상도·불일치 범위에
근거해 사전 정의한 tolerance,
과도한 구간 분할, 허용 대안별 label 오차,
false-certainty/무판정 비율, confidence를 노출할 경우 calibration, local-key span과
modulation event 오차를 포함한다. 곡·화성 유형별 실패를 보고하고 user context 제공 여부를
분리한다. precision과 coverage를 함께 비교하며 쉬운 complete 사례만 남긴 정확도로 포장하지 않는다.
탐색/dev baseline과 주석 난도를 확인한 후 정확도 목표·최소 개선·기기 지연/메모리
한도를 정하고, untouched held-out 개봉 전에 고정한다. calibration은 별도 분할에서
수행하고 test 결과를 보고 수용 기준을 낮추지 않는다. profile 상관이나 formula fit을
검증 없이 음악적 확률로 표시하지 않는다.
긴 분석의 취소·revision 변경 후 stale 결과 폐기도 비용·수명 검증에 포함한다.

초기 실험 대안은 다음처럼 작게 비교한다. 아래 기법은 채택 결정이 아니다.

| 비교 대상 | 기대 가치·비용 | 핵심 실패 위험 |
| --- | --- | --- |
| 고정 마디/단순 PC 변화 baseline | 구현·실행이 저렴하며 새 접근의 개선을 판단할 비교점 | arpeggio·장식음마다 과분할, 동일 음집합의 다른 기능 누락. 제품 정답 규칙으로 사용하지 않음 |
| 후보 구간 cost + 제한된 DP/HMM 계열 sequence | 개별 음 변화보다 구간 일관성·경계 비용을 함께 비교. 후보 폭·길이를 제한해 비용 측정 | 바른 화음이 후보에 없으면 확신 있는 오답. 기존 root-required 인식 목록을 실제 화성 전체로 취급하지 않음 |
| local PC profile vs chord-function sequence | 단순 분포 기준과 진행 문맥의 실질적 개선을 분리 측정. 후자는 chord 오류에 민감 | relative major/minor 혼동, 짧은 target을 전조로 오판, modal/non-tonal 자료에 major/minor 강제 |
| 공동 sequence/학습 기반 비교기 | 구간·화음·key의 상호 의존성을 다룰 가능성 | 상태 공간/데이터·기기 비용과 도메인 차이. 기존 baseline보다 나은지 확인하기 전 제품 통합하지 않음 |

자동 후보에는 unknown/지원 밖/다중 해석 경로를 둔다. 기존 인식기가 rootless C7을
생성하지 않는다는 이유로 실제 반주가 C7일 수 없다고 결론내리지 않는다. 시간 없는
분포 실험은 note-count 기반임을 명시하고, 누락 duration을 같은 길이로 채운
duration-weighted 분석과 혼동하지 않는다.

## 수용 기준과 첫 착수 범위

| Gate | 수용할 결과 | 필수 반례/회귀 |
| --- | --- | --- |
| **1A** | 입력 진행을 지정 범위에 적용하고 단선율/다성의 각 음 관계를 설명. 자동 인식 후보와 무관하게 supplied chord 사용 | 단음 D+사용자 C, 미지정 gap/충돌, anchor 삭제/import ID 충돌, 카포 이중이조 없음, Key 변경이 실제 chord를 바꾸지 않음, context+score 원자적 Undo |
| **2A/기초 2B** | 실제 입력 순서에서 제한된 관계와 선택 선율 이동을 근거와 함께 표시 | A7→Dm와 A7→다른 화음, Db7→C에 가상 G7 삽입 없음, G7→C+종지 증거 없음, 실제 B4→G4에 B→C 해결 오판 없음 |
| **1B** | exact 경계에서 원본 occurrence 하나의 문맥별 관계를 보존 | half-open 경계, 다른 note 결측에도 알려진 관계 유지, offset≥마디길이 원본 소유권, meter 모델 변경, 불명 onset/length 무보정 |
| **역할별 2B** | 선택한 규칙의 필요한 증거가 있을 때만 후보 역할; 부족/상충/지원 밖 구분 | C–D–E/C–D–C, 강박·약박 variants, F의 경과/계류/색채 모호성, 다성 연결·tie/재공격·등록음 차이 |
| **3** | 독립 주석·held-out에서 명시된 baseline 대비 가치와 무판정 신뢰성을 입증 | 동일 PC 다른 화성, changing set/same harmony, C6/Am7, transient target/실제 전조, mode/relative-major-minor/비조성, missing timing/반주 없음 |

각 구현 gate는 기존 P0–P4 회귀와 함께 input/IME/focus/history를 검증한다. 새 UI는
390/768/1335px, 44px, reduced motion, 가로 overflow와 실제 브라우저 이벤트 순서를 확인한다.
source anchor 삭제를 cursor처럼 자동 보정하거나 다른 레이어의 무효 결과를 재사용하지 않는다.
대량 입력은 기존 1,024 position/6,144 note 한도에서 mapping·pair 분석·표시를 측정하고,
목록은 bounded render, 관찰 계산은 변경 범위 중심으로 설계한다. 모든 endpoint×모든 화음×모든 key의
사전 전개를 기본으로 도입하지 않는다.

**다음 구현 착수 단위는 1A의 sidecar·history·범위 연결·입력 UI와 음별 관계까지다.**
독립 브라우저/음악 반례 검증을 함께 완료한 후 2A/기초 2B로 이동한다. 3은 연구 계획이므로
이 문서의 GO가 제품 자동 추론 구현을 일괄 승인한 것은 아니다. 제품 코드·의존성은 이번에 수정하지 않는다.

독립 검토에서 source-only monophony와 실제 voice 구분, 기존 Analyze/Reset 의미,
logical score identity의 Undo, position/time 경계의 차이, 자동화의 세 평가 경로와
held-out 기준 고정 시점을 보완했다.
[검토 정리](tab-harmonic-progression-plan-review/review-notes.md) ·
[기존 엔진 조사](tab-harmonic-progression-plan-review/conditional-reuse-review.md) ·
[배치·편집 대안](tab-harmonic-progression-plan-review/product-contract-review.md).
