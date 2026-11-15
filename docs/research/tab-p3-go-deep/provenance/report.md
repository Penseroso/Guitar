# GO1 심층 평가: fact·ID·출처·정확한 분수 보존

**판정: ADOPT / GO — 현재 스냅샷의 사실과 출처를 보존하는 수용 계약.**
ID만을 전역 식별자·캐시 키로 쓰거나, Number/BigInt/틱 구현 중 하나를 확정하는 승인은 아니다.
현재 `/workspace/Guitar-p2` 제품은 읽기 전용으로 조사했다. 이전 P3 요약을 반복하지 않고
실제 편집 수명과 유리수 한계만 추가 검증했다. 제품 코드·의존성·공개 자산은 변경하지 않았다.

## 실제 확인: ID는 내용 버전이나 출처와 같지 않다

[20개 새 reducer/API fixture](provenance-probes.ts.txt), [결과](provenance-results.json):
모든 수작업 기대값 통과, 이전 상태를 freeze해 입력 변경 0건.

| 실제 호출 | 확인된 동작 / 보존해야 할 구분 | 코드·기존 테스트 근거 |
| --- | --- | --- |
| `parseAsciiTab` | `moment-0`, `note-0-0` 등 위치 기반 로컬 ID. 같은 MIDI 반복도 별도 ID. `note.source`는 원본 1-based line/column. | [ascii.ts:176](/workspace/Guitar-p2/src/domain/tab/ascii.ts:176), [동일 파일:195](/workspace/Guitar-p2/src/domain/tab/ascii.ts:195), [ascii.test.ts:125](/workspace/Guitar-p2/src/domain/tab/ascii.test.ts:125) |
| `set-fret` no-op / 변경 | 같은 프렛은 동일 state/document. 실제 변경은 **같은 note ID**, 새 MIDI, `source:null`; 기존 duration은 유지하고 기존 기법·무효화된 지속 링크는 정리. | [editing.ts:28](/workspace/Guitar-p2/src/domain/tab/editing.ts:28), [editing.test.ts:41](/workspace/Guitar-p2/src/domain/tab/editing.test.ts:41) |
| `set-duration`, `set-beat-offset` | 6/8→3/4, 0/9→0/1로 정확한 값을 정규화. note ID와 원본 프렛 source는 유지. source는 새 duration의 입력 출처가 아니다. | [input-capabilities.ts:86](/workspace/Guitar-p2/src/domain/tab/input-capabilities.ts:86), [동일 파일:98](/workspace/Guitar-p2/src/domain/tab/input-capabilities.ts:98) |
| `set-mute` / `set-rest` | 기존 note를 제거하고 같은 position에 새 종류의 사실을 작성한다. mute/rest에는 독립 event ID가 없다. 원래 note ID를 새 pitched event로 되살리면 안 된다. | [input-capabilities.ts:126](/workspace/Guitar-p2/src/domain/tab/input-capabilities.ts:126), [동일 파일:138](/workspace/Guitar-p2/src/domain/tab/input-capabilities.ts:138) |
| `set-sustain` | 반복 note를 제거하고 origin note ID를 참조. 변환 대상 duration은 continuation으로 옮긴다. origin 프렛 변경 또는 중간 mute는 링크를 제거할 수 있다. | [input-capabilities.ts:178](/workspace/Guitar-p2/src/domain/tab/input-capabilities.ts:178), [input-state.test.ts:92](/workspace/Guitar-p2/src/features/tab-analysis/input-state.test.ts:92) |
| split/join / insert/delete | 생존 position/note ID·프렛 출처는 유지해도 measure/index/선택 인덱스가 변한다. 마지막 position 삭제는 ID를 남기고 내용을 비운다. timed origin을 모르는 split/join은 거절한다. | [editing.ts:65](/workspace/Guitar-p2/src/domain/tab/editing.ts:65), [동일 파일:146](/workspace/Guitar-p2/src/domain/tab/editing.ts:146), [동일 파일:160](/workspace/Guitar-p2/src/domain/tab/editing.ts:160), [input-state.test.ts:18](/workspace/Guitar-p2/src/features/tab-analysis/input-state.test.ts:18) |
| tuning/capo | ID·fret·source를 유지하면서 MIDI를 `tuning[string]+capo+fret`로 다시 계산한다. MIDI에 capo를 다시 더하면 이중 이조다. | [editing.ts:175](/workspace/Guitar-p2/src/domain/tab/editing.ts:175), [state.test.ts:72](/workspace/Guitar-p2/src/features/tab-analysis/state.test.ts:72) |
| 새 import / 같은 내용 재import | `5-7`→`9-11`은 같은 로컬 note ID·source 좌표에 다른 MIDI가 들어온다. 같은 내용을 다시 import해도 객체는 새 스냅샷이다. | [state.ts:155](/workspace/Guitar-p2/src/features/tab-analysis/state.ts:155), [state.test.ts:232](/workspace/Guitar-p2/src/features/tab-analysis/state.test.ts:232) |
| Undo/Redo / 분기 / Reset | Undo/Redo는 이전 document 객체를 복원. `nextId`는 edit snapshot 밖에 있어 undo 분기에서 되감지 않지만 Reset은 새 세션의 ID 공간을 시작한다. | [state.ts:18](/workspace/Guitar-p2/src/features/tab-analysis/state.ts:18), [동일 파일:79](/workspace/Guitar-p2/src/features/tab-analysis/state.ts:79), [동일 파일:253](/workspace/Guitar-p2/src/features/tab-analysis/state.ts:253), [state.test.ts:244](/workspace/Guitar-p2/src/features/tab-analysis/state.test.ts:244) |

**현재 사실과 import provenance를 분리해야 한다.** 프렛을 바꾼 `source:null`은 올바른 새 authored
fact다. 반대로 retune 후 남은 line/column은 원래 프렛 토큰을 가리킬 뿐 현재 MIDI가 원본과 같다는
뜻이 아니다. `document.source`도 authored 수정 후 원래 ASCII를 유지하며 현재 악보의 직렬화가 아니다.
따라서 stale ASCII를 재파싱해 현재 문서를 대체하거나, 원본 문자열 유지 여부로 사실 동일성을 주장하면 안 된다.
정확한 분수 **값** 보존 역시 6/8이라는 타이핑 lexeme의 영구 보존과는 다르다.

## 파생 결과의 필요한 식별·범위 불변식

- **캐시 식별 / 원본 출처 / 피치 동등성은 서로 다르다.** ID는 현재 문서 안의 note identity,
  source는 import 토큰 위치, MIDI는 현재 피치, PC 집합은 인식용 파생 뷰다.
  같은 MIDI의 다른 줄 2개는 2개 note이며, recognition PC가 1개여도 합치지 않는다.
- 현재 P2는 [document 객체 스냅샷 비교](/workspace/Guitar-p2/src/components/guitar/scale/tab-analysis/TabScoreView.tsx:106)로
  결과를 무효화한다. 로컬 ID만으로 새 import나 undo의 이전 사실에 재연결하면 안 된다.
  향후 worker/저장/직렬화를 통과하면 객체 동일성이 사라지므로, 문서 세대·내용 버전과 요청/범위의
  대응을 증명할 별도 계약이 필요하다. 객체 snapshot, 명시 revision token, 내용 hash는 평가 가능한
  대안이며 여기서 하나를 확정하지 않았다. hash는 직렬화 크기 비용, token은 생명주기 규칙이 필요하다.
- selection-only fixture에서 sustain origin이 선택 밖에 있으면 현재 Analyze의 selected note list는
  0개/`empty`다. full-document fact와 선택 결과의 범위를 혼동하지 않는다. 전체 문맥에서 계산 후
  자를지, 외부 origin dependency를 포함한 범위로 계산할지는 후속 계약 질문이다.
- [analyzeTabSelection:156](/workspace/Guitar-p2/src/domain/tab/analysis.ts:156)은 부분 마디 선택을
  whole-bar collection으로 승격하지 않는다. 파생 관찰도 입력 범위·외부 의존·coverage를 드러내야 한다.
  현재 note metadata/ID를 보존하더라도 피킹·Voice·화성 경계가 새 사실로 생기는 것은 아니다.

## 정확한 분수: 실제 반례와 비용

[6개 독립 산술 실험](fraction-probes.ts.txt), [결과](fraction-results.json).
BigInt는 실험의 정확한 기준 계산용일 뿐 선택된 제품 구현이 아니다.

1. 합법 입력 1/10+1/5와 3/10은 정확히 같지만 Number는 `0.30000000000000004`와 `0.3`이다.
   1/7을 7회, 1/10을 10회 더한 실험도 정확한 1과 다르다.
2. **누적 길이를 가정하지 않아도**, 최대 합법 meter 32/1, measure 1024의 full-bar 가정 anchor
   130944에서 `A=start 1/506 + length 1/1015`, `B=start 1/507 + length 1/1011`은
   정확한 끝점 차이가 **−1/87751473810**인데 Number 끝점은 둘 다 `130944.00296150627`이다.
   정규화 유리수의 교차곱도 `11490529246453179`와 `11490529246453180`인데 Number로는 같아진다.
   모든 authored numerator/denominator는 1024 이하이며 범위 밖 입력을 이용한 반례가 아니다.
   full-bar anchor는 향후 계약의 가정이고, 현재 P2가 전역 시간 계산을 한다는 주장은 아니다.
3. **산술 스트레스만 별도 수행:** 합법 1/p, p=2..43의 14개 소수 분모 합은
   `21460568175640361 / 13082761331670030`으로 안전 정수 범위를 벗어난다.
   소수 분모 132개에서는 정확한 분자·분모가 각각 약 310자리라 Number 변환은 Infinity다.
   현재 데이터 모델이 note 길이를 누적해 시작값을 추론한다는 뜻은 아니다.
4. 고정 960 tick/quarter는 합법 1/7을 정확히 표현하지 못한다.
5. 단순 BigInt 정규화(GCD 매 덧셈), 다양한 합법 소수 분모: 호스트 Node 7회에서
   1,024항 중앙값 **92.8ms**, 6,144항 **585.8ms**. 큰 공통 분모를 만드는 의도적 산술 부하이며
   제품 타임라인/브라우저/모바일 비용이나 실제 알고리즘 선택의 성능 비교가 아니다.

| 검토 가능한 대안 | 정확성 조건 / 비용·위험 | 현재 판정 |
| --- | --- | --- |
| Number 정수 유리수 + 안전성 검사 | 약분·교차 곱·합산의 중간값까지 safe integer를 증명하고 초과를 명시적으로 거절/우회. 입력 각 성분 bounds만으로 전체 지원을 보장하지 못한다. | 제한된 범위 계약을 정할 때만 평가 GO |
| BigInt 유리수 | 정확한 값·순서 보존 가능. GCD/큰 정수 성장, 직렬화 포맷, worker 비용을 따로 측정해야 한다. `JSON.stringify(BigInt)` 직접 사용 불가. | 후보로 검증 GO, 방식 확정 아님 |
| 마디/공통 anchor와 국소 분수 분리 | 공통 큰 값을 더하지 않고 비교할 여지가 있다. bar crossing·서로 다른 origin·미확정 meter 처리의 정확성을 따로 증명해야 한다. | 추가 검증 후보 |
| 제한된 exact tick grid | 지원 분모가 grid를 나눌 때만 exact. 현재 합법 전체 분모를 임의로 반올림하는 것은 보존 계약 위반이다. | 명시적 좁은 지원 범위에서만 검토 |
| Float+epsilon을 사실의 기준으로 사용 | 같은 값을 다르게, 다른 값을 같게 만들 수 있다. tolerance는 관측 사실의 exact equality/order를 일반적으로 증명하지 못한다. | authoritative fact로 REJECT; 표시/재생 근사와는 구분 |

## GO 수용 조건과 다음 검증

1. 현재 document facts를 원본으로 삼고 import 출처와 authored 변경을 구분한다.
   event kind 변경으로 제거된 ID·출처를 인위적으로 복원하지 않는다.
2. 결과의 문서 세대/버전·선택/문맥/외부 의존을 명시하고, 캐시·비동기 응답은 그 범위 안에서만 연결한다.
   렌더 위치·원본 text 위치·note ID·MIDI·PC를 서로 대용하지 않는다.
3. exact fraction을 보존한다는 계약과 산술·직렬화 대안 선택을 분리한다. 위 반례에 대해 끝점 equality,
   엄격한 ordering, 교환/결합 법칙, bar-local/global 변환 roundtrip을 독립 정확한 기준으로 검증한다.
4. 합법 최대 입력과 초과/unsupported 경로의 정확도·메모리·직렬화/worker·모바일 비용을 측정한 뒤
   지원 범위와 산술 방식을 결정한다. 이번 실험은 새로운 엔진·화면·재생 정책 구현 승인이 아니다.

재현: `/workspace/Guitar-p2`에서 `node --import tsx`로 두 `*-probes.ts` 실행.
기존 제품 테스트를 다시 실행한 것이 아니라, 기존 테스트 근거를 읽고 별도 fixture를 새로 실행한 결과다.
[통합 JSON](results.json)에 원시 결과와 제품 소스 해시를 기록했다.
