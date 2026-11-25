# THE MODUS — GO 후보 심층 적용성 검증

**결론:** 확정 GO 2개는 유지하되 보존·주장의 범위를 좁혔다. 조건부 GO 2개는 지원 조건을 더 구체화했다.
제품에 새 엔진·UI·runtime dependency를 구현하거나 통합 구조를 확정한 결과는 아니다.
현재 재검증된 P2 작업본을 기준으로 삼으며, 이전 P3의 probe 수치를 이번 새 실행으로 재집계하지 않았다.

## 네 후보의 최종 의미

| 후보 | 판정 | 이번에 구체화한 접목 조건 |
| --- | --- | --- |
| GO1: 원본 ID·event·정확한 작성 값 보존 | **ADOPT / GO 유지** | 현재 문서 snapshot·출처 의미·의존성 안에서 보존. 같은 ID를 불변 내용이나 영구 cache key로 취급하지 않음 |
| GO2: written / realized 분리 | **ADAPT / GO 유지** | 작성 occurrence·표기 길이·beat playback·최종 event·physical performance를 구분. 외부 후처리가 작성 값을 덮어쓴 사실도 분리 |
| 조건부1: 명시적 written-time 관찰 | **ADAPT / 조건부 GO** | 좌표·nominal 의미·선언 모집단·영향 격리 근거가 있는 범위만 주장. 알려진 interval과 완전한 verticality는 별개 |
| 조건부2: music21 offline 비교 | **ADAPT / 조건부 GO** | operation별 precision admission·원본 sidecar·boundary/interior query 안전성에 한정. 무손실 exact oracle로 승인하지 않음 |

## GO1 — 보존은 ID의 영구 불변성을 뜻하지 않는다

[새 20개 lifecycle fixture](provenance/report.md)는 실제 reducer/API를 실행했다.
프렛 변경은 같은 note ID를 유지하지만 source를 null로 만들며, retune/capo는 ID와 source를 유지한 채 MIDI를 바꾼다.
새 import는 deterministic ID를 재사용할 수 있고 Undo는 옛 document object를 복구한다.
`document.source`는 편집 후 현재 악보 serialization이 아니고, note.source의 위치는 새 duration의 작성 출처가 아니다.
따라서 **현재 값, imported token의 출처, editable identity, snapshot identity**를 혼동하지 않아야 한다.
ID만 같은 이전 결과의 재사용은 NO-GO다. 무효화는 document/instrument/range/options와 실제 사용한 해석 context에 따른다.
계산 cache의 동치가 증명돼도 Undo 후 UI 결과를 자동 부활시킨다는 뜻은 아니다.
현재 P2의 document/history 변경 시 진단 무효화·재점검 계약은 그대로 유지한다.

정확한 분수의 보존도 원본 글자 그대로 보존한다는 뜻은 아니다. 기존 API는 6/8을 3/4로 정상화한다.
[새 6개 산술 실험](provenance/fraction-results.json)은 유효 입력 bounds 안에서도 float endpoint 충돌과
Number cross-product 한계가 있음을 보였다. 예시 global anchor130944에서 두 exact end 차이는
`1/87751473810`인데 float end가 같고, 교차곱 두 값은 `2^53` 밖에서 같은 Number가 된다.
이 anchor는 정규 full-bar 배치를 선언한 연구 fixture이지 현재 P2의 global timeline 구현이 아니다.
정확성은 GO지만 BigInt·고정 tick·분모 제한 중 어느 구현을 채택할지는 정하지 않았다.
혼합 유효 분모를 반복 합산한 BigInt+매회GCD의 약93/586ms(1024/6144항)는 산술 workload 비용이다.
현재 제품이 이 합산을 수행하거나 새 pipeline이 그 지연을 갖는다는 주장이 아니다.

## GO2 — 분리해야 하는 층이 두 개보다 많다

[새 alphaTab source 9개 + 현재 제품 API 7개 fixture](separation/report.md)에서 다음을 확인했다.
tie destination fret9는 finish 후 같은 numeric ID로 fret5가 된다. before snapshot을 남기지 않으면 후처리 전 값을 잃는다.
hammer는 두 MIDI note-on, legato slide는 한 note-on과 bend event를 냈다. 어느 쪽도 physical picking 횟수를 증명하지 않는다.
staccato는 beat playback 길이를 유지하면서 최종 note event 길이를 줄였다. **beat playback도 최종 발음 길이가 아니다.**

현재 제품에서 written duration4인 note 뒤 @1에 rest/mute/재공격을 넣어도 duration4는 남는다.
동일 pitch note@1/duration1을 sustain으로 바꾸면 origin4와 continuation1이 남고 analyzer의 pitch observation은 하나다.
4+1=5박, 자동 cutoff, union 중 어느 시간 해석도 현재 제품은 출력하지 않는다.
P2가 중간 rest의 끊어진 구조 참조를 진단하는 것과 physical 종료 시각을 아는 것은 별개다.
보존할 것은 작성 occurrence와 marker/값이며, 후처리·재생 정책 결과는 별도 근거와 policy scope가 필요하다.

## 조건부1 — 어떤 partial 주장이 가능한가

[13개 의미 fixture / 25개 기존 API document / 6개 completion 쌍](contracts/report.md)을 새로 확인했다.
미입력 값만 달리 채운 두 세계는 모두 P2 구조 검사에 통과하면서 특정 q의 nominal active set이 다르다.
앞 note 길이, 뒤 note onset, 이전 bar carry-in, 다음 bar onset, 모르는 bar anchor가 각각 이런 차이를 만든다.
이는 실제 연주를 두 번 측정한 결과가 아니라 명시적 nominal 가정의 비식별성을 보이는 반례다.
원본 13개·completion 12개를 freeze해 기존 API에서 변경 0을 확인했으며 새 timeline을 실행하지 않았다.

반대로 partial 전체를 버릴 필요도 없다. [독립 coverage 반례](challenge/coverage-worlds.json)의 a[0,1),
b onset1/4·길이 미상은 q1/2에서는 `{a}`/`{a,b}`가 가능하지만 q1/8에는 b가 시작 전이다.
두 예시의 일치만으로 완전성을 주장하는 것이 아니라, **모든 잠재 기여자에 대한 시작 하한·끝 상한 등 무영향 증명**이 필요하다.
새 unknown-start note가 추가되면 앞의 격리 결론도 무효가 될 수 있다.

가능한 최소 주장 단계는 아래와 같다. 제품 타입이나 구현 방향을 확정한 계층이 아니다.

1. 현재 snapshot의 작성 사실과 미입력 상태.
2. 선언한 해석·좌표에서 exact하게 도출한 local written interval.
3. 선언 모집단에서 q에 확실히 속하는 구성원 일부.
4. 모든 잠재 기여자를 분류하거나 무영향을 증명한, 그 모집단·좌표에 대한 완전한 nominal 집합.

좌표(local/global), 모집단(subset/full source), 의미(written/realized)는 별도 축이다.
완전한 written 집합도 damping·picked attack·bend trajectory·앙상블 침묵을 증명하지 않는다.
rest/mute/재공격과 기존 길이의 충돌, sustain gap/overlap은 서로 다른 정책 선택이며,
모든 선언을 만족하는 두 실제 연주가 존재한다는 반례로 포장하지 않았다.
최소 범위로 작성 사실 기록이나 note-only local 선언 모집단 관찰을 고를 수 있지만, 어느 쪽도 이번에 고정하지 않는다.

## 조건부2 — offline comparator의 admission은 별도 검증 대상이다

[새 admission 실험](comparator/report.md)은 reference 실행 성공이나 결과 일치를 안전성의 정의로 쓰지 않는다.
새 22개 사례의 통합 판정은 12 admission / 10 refusal이며 정확도 점수가 아니다.
Tree만의 판정은 14/8, chordify는 12/10이다. 선언한 boundary와 각 interval의 선택 midpoint만 검사했다.
원본 exact 값·출처·coverage·선언된 fixed-pitch interval과 좌표가 먼저 있어야 한다.
operation별로 endpoint 구별/순서, canonical query, strict interior 표현, projection의 작은 경계 생략을 점검해야 한다.
unknown onset/length, 미해결 continuation/실현 정책, 누락된 원본 association은 timing 오류가 아니라 비교 거절 사유다.
generated ties/rest·중복 MIDI·재공격은 원본 sidecar에서 구분한다. library slice ID를 source event ID와 동일시하지 않는다.

large-anchor 경계 충돌에서 잘못된 empty 집합을 agreement로 세면 안 된다.
Tree와 chordify는 손실 경로가 다르므로 한쪽의 통과/거절을 다른 쪽의 admission으로 대신할 수 없다.
독립 반례는 서로 다른 float endpoint 사이에서도 midpoint가 endpoint로 반올림돼 Tree-only admission이 틀릴 수 있음을 보였다.
연구 predicate를 보완하고 이 사례를 추가해 재실행했다. 임의의 다른 rational query는 별도의 표현·순서 검증이 필요하다.
초기 통합 판정은 이미 refusal였고 제품 결함이 아니다. [독립 재검토](challenge/report.md)는 최종 admission 사례의
Tree 92개/chordify 78개 query에서 ID+MIDI multiset 불일치 0을 확인했다. 이전 반례와 수정 전 결과도 보존했다.
이번 연구 predicate 자체도 독립 반례로 검증하며, 일반 분수 전체를 안전하다고 승인한 adapter는 아니다.
수작업·exact 기대값은 1차 기준이고 제외/불일치/미입력은 정확도 분모나 “제품 오류”에 섞지 않는다.

## 다음 결정과 검증 범위

먼저 claim의 모집단·좌표·nominal 의미와 rest/mute/sustain 정책·제외 범위를 정하고,
그 범위의 identity/산술/coverage/비교 admission을 구현 후 다시 검증할 수 있다. 특정 새 엔진 구조를 선택하지 않았다.
기존 Analyze·P2 점검의 의미와 draft/IME/focus/Escape는 유지하며, 새 UI가 없으므로 NON VERBATIM/INTUITIVE의
새 브라우저 수용 검증을 주장하지 않는다. 기술 제한은 선택 상세로, 기본 흐름은 악보와 짧은 상태를 우선한다.
외부 코드 복사·runtime dependency·라이선스 배포 판단을 새로 승인하지 않았고 기존 DEFER 대상을 재개하지 않았다.
제품 런타임·자산·의존성은 유지했다. 최종 정리에서 이전 회귀 테스트의 타입 옵션 1건과
조사 소스의 텍스트 아카이브 형식만 바로잡았다. [정정 기록](artifact-compatibility.json)과
[최종 무결성 기록](integrity.json)에 범위·전후 hash를 남겼다.
이전 P3 수치를 새 심층 검증 실적으로 재사용하지 않았다.

연구용 TypeScript/MJS 소스는 앱 타입 검사에서 분리한 `.ts.txt` / `.mjs.txt` 아카이브다.
[원본 실행 경로·바이트 해시](archive-paths.json)를 보존했다. 재현은 별도 연구 환경에서 수행한다.

최종 자료 정리 검증: 기존 회귀 테스트 17개, TypeScript 검사, 해당 테스트 lint, 기본 프로덕션 빌드 통과.
