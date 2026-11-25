# GO 심층: 주장·coverage의 최소 계약

대상은 현재 재검증된 P2 작업본이다. 이 절은 새 시간축을 구현하지 않고 **무슨 주장을 입력만으로
정당화할 수 있는가**를 구분한다. 새 데이터 타입이나 UI·알고리즘 방향을 확정하지 않는다.

## 새 근거와 입증 범위

[13개 의미 fixture](fixtures.json)에 기존 `inspectTabTiming`/`analyzeTabSelection`을 실행했다.
원본 13개와 미입력 값만 채운 12개를 합쳐 **25개 API document / 6개 completion 쌍**을 확인했다.
입력은 freeze했고 변경 0, 구조 invalid 0, 미입력 timing 보완 전후 음악적 projection 변화 0이었다.
[probes.ts](probes.ts.txt) / [results.json](results.json). 이 숫자는 새 timeline 정확도 시험이 아니다.

| 같은 원본 입력에서 열려 있는 조건 | 두 completion / 결과 차이(수작업) | 결론 |
| --- | --- | --- |
| C01: 앞 note의 길이 미상 | 길이1/2 vs2이면 q=3/2의 집합은 `{b}` vs `{a,b}` | 앞선 이벤트가 끝났다고 index로 판단 불가 |
| C02: 뒤 note의 시작 미상 | onset1/4 vs1이면 q=5/4의 집합은 `{a}` vs `{a,b}` | 뒤 index가 알려진 구간 밖이라는 증거 아님 |
| C03: 앞 bar note 길이 미상 | 길이1 vs3이면 다음 bar q=3/2의 집합은 `{b}` vs `{a,b}` | 앞 bar 영향도 carry-in 검토 필요 |
| C04: 뒤 bar onset 미상 + 알려진 cross-bar 길이 | onset2 vs1이면 그 bar q=5/4의 집합은 `{a}` vs `{a,b}` | 다음 bar note도 교차 구간에 영향을 줄 수 있음 |
| C05: global meter/anchor 미상 | 예시2/4 vs4/4이면 global q=5/2의 집합은 `{a,b}` vs `{a}` | 같은 bar-local 사실이 전역 배치를 유일하게 만들지 않음 |
| C06: 선언 모집단은 `{a}`지만 원본에는 timing 미상 b도 있음 | 두 세계에서 `{a}` 내부 결과는 같아도 원본 전체는 다름 | 선택한 모집단 내 완전성과 전체 원본의 완전성 구분 |

두 completion은 **원래 미입력인 필드만** 다르게 채우며 실제 제품 API의 구조 검사를 통과했다.
집합은 명시적 half-open nominal interval 가정에서 사람이 계산한 기대값이다. P2는 temporal consistency를
검사하지 않으므로 API 통과가 실제 발음·적법한 전체 악보 실현까지 증명한다는 뜻은 아니다.
C03–05의 정규 bar anchor는 반례를 설명하기 위한 가정이지 제품이 승인한 시간축 구현 계약은 아니다.

## partial을 모두 버리거나 모두 완전하다고 할 수 없다

C07은 같은 bar에서 시작·길이가 모두 알려진 note들을 global meter 없이도 비교할 수 있는 양성 사례다.
그러나 알려진 interval만 투영했다고 전체 verticality의 부재/침묵이 증명되지는 않는다.
반대로 미상 길이가 있다는 이유로 모든 시간대를 버려야 하는 것도 아니다.
[독립 challenge](../challenge/coverage-worlds.json)의 b onset1/4·길이 미상은 q=1/2에서는 결과가 달라지지만,
q=1/8에는 영향을 주지 않는다. 이유는 단지 두 예시 세계가 일치해서가 아니라, 선언한 nominal 모델에서
`q < known onset`이라는 하한이 모든 가능한 양의 길이보다 우선하기 때문이다.

가능한 격리 증거는 알려진 onset 하한, 알려진 end 상한, 명시적 좌표로 증명한 미래 bar 경계 등이다.
알려진 future-bar anchor B가 q보다 뒤이고 onset이 비음수라면 그 bar event는 nominal q에 역행하지 않는다.
anchor가 미상인데 bar 번호나 index만으로 같은 격리를 주장하면 안 된다. 어떤 조건이 실제로 증명됐는지를
결과와 함께 보존해야 한다. 이 범위 증명은 partial 전체에 대한 일괄 GO/NO-GO를 대체하는 검증 옵션이다.

## 최소 주장 단계의 옵션 — 새 제품 타입이 아님

| 주장 | 필요한 근거 | 주장하지 않는 것 |
| --- | --- | --- |
| 현재 snapshot의 작성 사실 | 원본 필드·ID·문서/설정 scope·validity; 없는 필드는 absent로 유지 | physical sounding, 원본 ASCII와 현재 상태의 동치 |
| 도출한 local written interval | 유효 onset·길이와 명시적 nominal 해석·exact 연산 | 전역 anchor, 재생 gate, picked attack |
| 선언 모집단에서 확실한 구성원 일부 | 해당 interval/관계가 지원되고 q에서 활성인 근거 | 다른 미상 이벤트의 부재, 완전한 pitch set |
| 선언 모집단·좌표에 대한 완전한 nominal 집합 | 모든 잠재 기여자를 분류하거나 영향 없음 증명; 경계·지원 의미 확정 | 전체 실제 연주·ensemble·화성/조성의 확정 |

이 단계는 시간 좌표(local/global), 모집단(source subset/full source), 의미(written/realized) 축을
별도로 둬야 한다는 검토 옵션이다. “complete” 하나로 세 축을 합치지 않는다.
C08의 완전한 written note 하나도 실제 연주자가 일찍 damping한 세계와 길게 유지한 세계를 구별하지 못한다.
두 실제 연주가 같은 실행 규칙을 따른다는 주장이 아니라, **현재 문서에 없는 performance 변수를
입력 사실처럼 만들 수 없다는 비식별성**이다. written completeness 위에 physical completeness가 자동으로 오지 않는다.

## 충돌·continuation은 별도 정책 질문이다

C09–11은 이전 written length가 rest/mute/재공격 뒤까지 남는 입력이다. C12–13은 sustain gap/overlap이다.
실제 P2 invalid=0이고 기존 Analyze는 note observation만 유지한다. 이것은 서로 충돌 가능한 선언을
모두 만족하는 두 연주가 존재한다는 증명이 아니다. 보존·충돌 진단·지원 제외·선택한 realization 정책을
구별해야 한다. 자동 cutoff, gap 연결, 길이 합산·union은 아직 승인된 제품 의미가 아니다.

## 원본 보존의 scope와 적용성

[setTabFret:43](/workspace/Guitar-p2/src/domain/tab/editing.ts:43)는 ID를 유지해도 source를 null로 만들 수 있고,
[retune:183](/workspace/Guitar-p2/src/domain/tab/editing.ts:183)는 같은 ID/source의 MIDI를 바꾼다.
[ASCII import:178](/workspace/Guitar-p2/src/domain/tab/ascii.ts:178)의 ID는 재수입에서 재사용될 수 있다.
따라서 ID 동치≠값/출처 동치, document.source≠현재 상태 serialization이다.
원본 보존 GO는 **현재 snapshot과 그 source association을 정확히 보존**하는 원칙이며 캐시 영구 재사용 승인이 아니다.
[provenance 심층](../provenance/report.md)이 다룬 revision/무효화 조건을 함께 적용해야 한다.

가능한 최소 첫 범위는 (A) 현재 필드·관계를 보존하는 fact ledger, 또는 (B) 선언된 note-only local 모집단의
nominal 관찰처럼 작게 고를 수 있다. B도 필드만 complete하면 충분하지 않고 관계/경계/영향 범위를 증명해야 한다.
이 예시는 구현 방향을 동결하지 않는다. 더 넓은 partial/관계 지원은 해당 증거를 확보한 뒤 비교할 수 있다.
**확정 GO:** 작성 사실 보존과 written/realized 주장 분리. **조건부 GO:** 지원 subset·coverage 계약의 검증.
실제 sounding 자동 확정은 이번 GO의 산출물이 아니다. 기존 Analyze·P2 점검·IME/focus/무효화 계약은 유지한다.
