# THE MODUS P3 적용성 검증

**종합 판정: 명시적 표기 시간의 지원 subset은 조건부 GO.** 제품 구현·배포 준비 완료나
새 시간축 엔진·외부 runtime dependency 선택을 뜻하지 않는다. 제품 코드는 변경하지 않았다.

## 기준과 조사 범위

- GitHub master API로 확인한 기준은 `3ef63568353ee395eb3a46e02f27541bfdca8adf`다.
  실제 제품 기준선은 그 위의 **재검증된 미커밋 P2 작업본** `/workspace/Guitar-p2`이며
  [baseline hashes](baseline-manifest.json)로 식별한다. master에 P2가 병합됐다는 주장은 아니다.
- [무변경·산출물 무결성](integrity.json) 기록으로 제품 기준선과 기존 조사본 보존을 확인한다.
- 과거 `/workspace/modus-p3-evaluation`과 `/workspace/Guitar`의 별도 explicit-timeline 후보는
  역사적 참고만 사용했다. 현재 제품 계약이나 구현 정답으로 재사용하지 않았다.
- GO에서 유래한 제품 요소만 심층 검증했다. 제품 모델/분석, alphaTab, music21, 통합 게이트,
  독립 반론 검토를 분담했다. 자동 화성 구간·조성·전조 추론으로 범위를 확장하지 않았다.

## 적용 후보별 결정

| 제품에 적용할 요소 | 판정 | GO/NO-GO의 정확한 범위 |
| --- | --- | --- |
| 원본 note/position ID·줄·register·반복 이벤트·정확한 분수 | **ADOPT / GO** | 기존 사실 계약을 보존. PC 집합화는 인식 경계에서만 사용 |
| 표기 길이·재생 길이·technique 실현의 분리 원칙 | **ADAPT / GO** | 구분 원칙과 자체 fixture만 채택; alphaTab 재생 정책 수치는 채택하지 않음 |
| 명시적 written-time interval 관찰 | **ADAPT / 조건부 GO** | 좌표·temporal relation·coverage를 선언한 지원 subset. full sounding timeline 승인은 아님 |
| music21 slicing/TimespanTree의 offline 비교 | **ADAPT / 조건부 GO** | exact 원본 sidecar·좌표 mapping·정밀도 제외 조건을 만족하는 comparable subset만 |
| 현재 chord registry를 시간 관찰에 연결 | **DEFER / 구현 NO-GO** | 원본 중복과 C6/Am7 대안을 보존하고 시간 관찰의 독립 정확성을 먼저 입증 |
| alphaTab Beat/Voice 모델을 그대로 이식 | **DEFER / as-is NO-GO** | note별 독립 길이와 Voice 배정이 미해결. string=Voice로 매핑하지 않음 |
| MIDI tick·자동 repair·generated rest를 원본 사실의 정답으로 사용 | **REJECT / NO-GO** | 실제 기본값·출처 손실·정밀도 손실이 확인됨 |
| renderer/synth/Python runtime 및 자동 segmentation/key/modulation | **DEFER / 구현 NO-GO** | 이번 적용성 근거로 선택할 수 없음. 별도 측정·검증 필요 |

## 실제 구현과 새 실행 근거

**현재 제품:** [22개 document probe와 context/reducer 확인](product/report.md)은 기존 API를 실행했다.
`analyzeTabSelection`은 notes의 MIDI/PC/order를 소비하며 rest/sustain-only 위치를 analysis `empty`로 본다.
현재 `TabHarmonicSpan`은 index 기반 근거 범위이며 sounding duration이 아니다. timing metadata로 기존
음악적 결과가 바뀌지 않고, C6/Am7 대안과 명시적 major/minor frame 계약이 유지됐다.
P2의 `some`·missing count·zero issues는 시간 투영 준비 완료를 의미하지 않는다.
no-meter에서도 같은 bar의 작성된 onset/length는 남고, cross-bar 길이·note별 독립 길이도 보존된다.

**alphaTab:** [고정 소스의 18개 probe + 독립 기대값의 5개 precision group](alpha/report.md),
선택한 upstream 테스트 **28통과 / 46제외 / 0실패**를 확인했다. `Score.finish→Voice.finish→MIDI`에서
미입력 길이는 quarter가 되고 orphan tie flag는 제거된다. 표기/재생/effect 길이는 분리되지만,
7:4 quarter tuplet 끝은 기대3840/실제3836 tick이었다(11:8도 -2, 13:8도 -10 tick).
동일 MIDI 두 줄의 multiplicity는 남아도 MIDI handler에는 원본 ID/줄이 없다.
6줄 변환은 `alphaString=6-modusString`이고 이미 계산된 MIDI에 capo를 다시 적용하면 안 된다.

**music21:** [새 비교·출처·정밀도 관찰](music21/report.md)과 upstream 4개 테스트를 확인했다.
11개 semantic probe의 통과는 **예상한 차이까지 재현했다는 뜻**이지 무손실 비교 성공률이 아니다.
기본 chordify는 unison을 합칠 수 있고, slicing tie·gap rest는 library 생성물이며 stripTies는
continuation identity를 합친다. source sidecar 없이 작성 사실을 복원할 수 없다.
Timespan은 float 좌표다. 경계 `1/10`의 직접 Fraction query는 이전 a를,
library 좌표 `0.1` query는 새 b를 반환했다. query mapping과 exact 원본 보존이 모두 필요하다.
현재 입력 bounds 안의 `a:167/1001 + 601/1002`, `b:772/1007`은 exact overlap이
`1/1010023014`지만 chordify에는 그 overlap slice가 없다. 단순 작은 분모 입력 제한만으로 안전하지 않다.
수작업 기대값이 1차 기준이며 reference의 정밀도 제한은 non-comparable로 분류해야 한다.
[독립 반론 검토](challenge/report.md)도 두 music21 반례를 별도 실행으로 재현했으며,
표기 시간의 지원 subset 조건과 아래 coverage 한계를 유지하는 조건부 GO에 동의했다.

## 다음 구현 전에 정할 계약

1. **written vs realized:** note event를 picked attack으로 단정하지 않는다. bend/release/vibrato의
   pitch trajectory·dwell/gate는 현 데이터로 정할 수 없다. 작성된 base MIDI 사실은 별도로 유지한다.
2. **local vs global:** 같은 bar의 알려진 interval과 bar 간 global anchor를 구분한다.
   anchor 부족 때문에 알려진 국소 사실까지 폐기하거나 meter·onset·rest를 자동 생성하지 않는다.
3. **continuation과 충돌:** sustain gap/overlap, 이전 길이가 rest/mute/재공격을 통과하는 경우의 의미와
   제외 조건을 정한다. P2의 구조적 참조 통과는 연속 발음의 증명이 아니며 자동 trim/extend/merge하지 않는다.
4. **coverage:** 알려진 interval 보존과 완전한 verticality는 다르다. 시간 미상 note가 다른 곳에 있으면
   알려진 구간에도 겹칠 수 있다. 격리 근거 없이 완전한 pitch set·absence·silence를 주장하지 않는다.
   일부 구간 제외가 다른 구간의 완전성을 보증하지도 않는다. 오류·미입력·지원 밖·비교 불가를 구분한다.
5. **정확성·수명:** exact 연산과 동시 시작/끝, 좁은 경계를 검증한다. 결과 무효화는 실제 의존성별로
   정한다(document/instrument/range/options, 화성 해석에는 사용한 context 추가). Worker 채택은 미정이다.

[통합 계약·16개 수용 조건](integration/report.md)은 제안된 검증 설계다. 새 엔진을 실행한 결과가 아니다.
현재 chord worker의 revision/취소 원리는 참고 가능하지만 닫힌 protocol을 TAB에 그대로 쓰지 않는다.

## 비용·라이선스·판정 한계

- alphaTab warm source finish+MIDI는 6,144 notes median5.85ms(3회). music21의 다른 연산인
  tree build는 4.22–4.36초, chordify는 3.37–7.87초(각2회)였다. 속도 순위나 p95/SLO가 아니다.
  cold load·memory·실제 앱/모바일·worker 전송/취소 비용은 미측정이므로 runtime GO 근거가 없다.
- alphaTab은 MPL-2.0이며 renderer attribution/통합 자산 고지가 별도다. music21 코드는 BSD-3-Clause,
  코퍼스 권리는 별도다. 원칙·자체 fixture 접목과 코드/자산 복사·배포는 구분한다. 법적 호환성 확정은 아니다.
- NON VERBATIM / INTUITIVE는 악보와 짧은 상태·개수를 우선하고 기술 근거를 상세로 숨기는 계약으로 유지한다.
  새 UI를 만들지 않았으므로 P3 UI 검증을 통과했다는 주장은 하지 않는다.
- 실제 구현에 들어갈 수 있는 범위는 위 조건을 확정한 **읽기 전용 표기 시간 관찰 subset**이다.
  자동 화성 경계·기능·local/modal center·tonicization/modulation과 제품 dependency 선택은 승인하지 않았다.

연구용 TypeScript/MJS 소스는 앱 타입 검사에 포함되지 않도록 `.ts.txt` / `.mjs.txt`로 보관한다.
원본 바이트와 실행용 워크스페이스 파일은 유지하며, [아카이브 경로 기록](archive-paths.json)에서 대응을 확인할 수 있다.
