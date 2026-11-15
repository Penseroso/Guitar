# GO 심층 독립 challenge

대상: 이번 GO 심층의 `provenance`, `separation`, `contracts`, `comparator` 새 근거.
제품 `/workspace/Guitar-p2`는 수정하지 않았다. 이전 P3 반례를 새 실행 수로 재집계하지 않았다.

## 후보별 독립 판정

| 후보 | 판정 | 남은 구체 조건 |
| --- | --- | --- |
| GO1: 사실·ID·분수 보존 | **ADOPT / GO 유지** | 현재 snapshot과 원본 출처를 함께 보존한다. ID만을 전역 버전/캐시로 쓰지 않으며, stale ASCII·출처 좌표와 현재 MIDI/작성 값의 동치를 가정하지 않는다. exact arithmetic 방식 선택은 별도다. |
| GO2: written / realized / performance 주장 분리 | **ADAPT / GO 유지** | source occurrence, MIDI note-on, physical picking을 구별한다. 외부 finish 후 같은 ID의 값이 바뀔 수 있으므로 before/after snapshot과 정책 출처를 유지한다. 분리 원칙이 특정 재생 정책 승인은 아니다. |
| C1: 명시적 written interval 관찰 | **조건부 GO 유지** | local/global 좌표, 선언 모집단, nominal/realized 의미를 명시한다. partial facts에서 complete verticality로 넘어가려면 모든 잠재 기여자의 영향 범위를 증명한다. rest/mute/재공격 cutoff와 sustain gap/overlap은 자동 결정하지 않는다. |
| C2: offline 비교 | **조건부 GO 유지** | 요청 operation별 허용·거절, 원본 snapshot/ID/MIDI/분수 sidecar, precision loss 제외가 필요하다. 연구 predicate의 true flags는 실제 exporter의 provenance/coverage 증명이 아니다. 유한 검증 query 밖의 일반 rational query는 미증명이다. |

## 새 독립 반례와 재현

### 큰 anchor에서도 source bounds만으로 exactness가 보장되지 않는다

선언된 정규 bar 가정 `meter32/1`, `measure1024`의 anchor는 130944다.
A의 local onset `1/506`, duration `1/1015`, B의 local onset `1/507`, duration `1/1011`은
각각 현재 합법 bounds 안이다. 정확한 두 끝은 `1/87751473810`만큼 다르지만 float 끝은 같다.
정규화 교차곱 `11490529246453179`와 `11490529246453180`도 Number에서 구별되지 않는다.
실제 Tree에서는 A 끝의 기대 active `{b}`가 canonical float query에서 빈 집합이 된다.
[독립 실행](adversarial.py) / [결과](adversarial-results.json).

이는 현재 P2가 global timeline을 구현한다는 주장이 아니다. 그 anchor를 명시적으로 선택한 경우의
새 산술·reference 반례다. 무조건 Number 사용이나 float+epsilon을 fact authority로 채택할 수 없다는
근거이며, 반대로 BigInt 한 가지 방식의 채택을 강제하는 근거도 아니다.

### partial coverage의 실제 두 세계

새 source는 a의 written interval `[0,1)`, 다른 줄 b의 onset `1/4`와 미입력 length를 가진다.
기존 inspector는 missing-duration 1개를 낸다. b의 길이를 `1/8` 또는 `3/4`로만 채운 두 completion은
모두 P2 구조 검사에 통과하지만 q=`1/2`의 nominal 집합은 `{a}`와 `{a,b}`로 다르다.
q=`1/8`은 알려진 b onset보다 앞이므로 이 닫힌 두-note 모집단에서는 길이와 무관하게 `{a}`다.
따라서 모든 partial을 전부 폐기하는 것도, 알려진 interval을 완전한 집합이라고 하는 것도 과도하다.
[현 API 실행](coverage-worlds.ts.txt) / [결과](coverage-worlds.json).

contracts agent의 6 completion 쌍과 1 양성 fixture, 총 13개 세계의 수작업 active set도
별도 Python Fraction 계산으로 대조해 **13/13 일치**했다.
[별도 계산](check-world-arithmetic.py) / [결과](world-arithmetic.json).
이 검사는 해당 명시적 nominal 가정의 유한 산술을 확인한 것이며 새 timeline 구현 검증은 아니다.

### 연구 comparator의 Tree-only admission 누락 발견·해소

독립으로 찾은 다른 합법 source는 anchor130944에
A `1/501 + 1/999`, B `1/500 + 1/1003`이다. 두 float 끝은 서로 다르지만 정확히 1 ULP만 떨어져
정확한 중점이 오른쪽 끝으로 반올림된다. 초기 연구 predicate는 이 query 불가 조건을 chordify에만
적용해 Tree를 ADMITTED로 표시했는데, 실제 중점 query는 기대 `{artifact:a}` 대신 빈 집합이었다.
[수정 전 재현](tree-only-admission-counterexample.json)을 보존했다.
combined gate는 당시에도 REFUSED였으므로 전체 false match를 승인한 제품 결함은 아니다.

comparator agent가 `no-canonical-strict-interior-query`를 Tree에도 적용하고 이 반례를 추가했다.
최종 **22개 사례: combined 12허용 / 10거절**, Tree 14허용 / 8거절이다.
수정 반례의 Tree REFUSED를 다시 확인했다. 허용된 operation의 유한 끝점·선택 중점에 대해
별도 Stream을 만들고 exact 기대 `(artifactId, MIDI)`와 실제 출력을 대조했다:
**Tree 92 query / chordify 78 query, ID·MIDI 불일치 0**.
[독립 checker](check-final-comparator.py) / [최종 결과·module hash](final-comparator-crosscheck.json).

이 증거는 safe-by-construction binary fixture만의 성공이 아니다. 실제 허용 nonbinary 사례와
Tree-only/combined operation 차이를 포함한다. 그러나 모든 유리수·모든 query에 대한 정리나
제품 exporter/coverage classifier가 구현·검증됐다는 증거는 아니다.

## 남은 gate

1. 실제 exporter에서 문서 세대/내용 버전·범위·외부 origin dependency·현재 MIDI·projection policy를 증명한다.
2. nominal claim 범위와 모든 잠재 기여자의 영향/무영향 근거를 정하고, 미입력·충돌·지원 밖·reference 불가를 구분한다.
3. 채택할 exact arithmetic/직렬화의 합법 최대 입력·성능·메모리·overflow·취소 비용을 측정한다.
   현재 naive BigInt 스트레스나 빠른 float probe를 제품 알고리즘의 성능으로 읽지 않는다.
4. comparator의 요청 query/operation/options/pin별 경계 순서·coalescence·interior/query-rank를 확인한다.
   현재 유한 query set 밖의 임의 rational query는 별도 gate가 필요하다.
5. 실제 제품 UI를 구현할 때만 draft/IME/focus/Escape/무효화/44px/세 너비를 재검증한다.

**최종:** 두 확정 GO의 원칙 접목은 타당하고, 두 조건부 GO는 조건이 구체화됐다.
연구 gate에서 발견한 중점 누락은 해소됐다. 이 범위 밖의 실제 발음·자동 화성/조성 또는 runtime 채택으로
승인을 확대할 근거는 없으며, 제품 엔진이 아직 없다는 이유만으로 적용성 연구 자체를 NO-GO로 만들 필요도 없다.
