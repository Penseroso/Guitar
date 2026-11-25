# P3 product integration gate

대상은 재검증된 `/workspace/Guitar-p2` 작업본이다. 과거 `/workspace/Guitar`의 unmerged
explicit-timeline 후보와 이전 평가의 GO는 구현 근거나 현재 제품 계약으로 간주하지 않았다.
이번 검토는 소스·테스트·데이터 계약 추적이며 제품 구현/새 UI/브라우저 검증을 수행하지 않았다.

## 확인된 제품 경계

- [TabFraction / TabMoment / TabDocument](/workspace/Guitar-p2/src/domain/tab/types.ts:5):
  분수는 quarter-note 단위, onset은 bar-relative, duration은 note/rest/sustain별 선택 입력이다.
  문서는 여전히 `timing:'order-only'`, meter는 score-wide이고 Voice·tempo·local meter가 없다.
- [analyzeTabSelection](/workspace/Guitar-p2/src/domain/tab/analysis.ts:124)은 `moment.notes`의
  MIDI/PC를 소비한다. candidateCache와 [chordCandidates](/workspace/Guitar-p2/src/domain/tab/analysis.ts:54)는
  PC 집합을 정규화하되 원 note identity는 notes에 보존한다. timing metadata를 더해도 기존 분석이
  바뀌지 않는 [회귀 테스트](/workspace/Guitar-p2/src/domain/tab/input-capabilities.test.ts:255)가 있다.
- [TabHarmonicSpan](/workspace/Guitar-p2/src/domain/tab/harmonic-spans.ts:7)은 index 기반 근거 범위다.
  `simultaneous`와 `whole-bar-collection`을 구분하며 sounding duration이 아니다.
  [observeTabProgressions](/workspace/Guitar-p2/src/domain/tab/harmonic-spans.ts:49)는 명시적 frame,
  유일한 exact 후보, index adjacency가 있어야 관찰 패턴을 낸다. 시간적 verticality 경계로 치환하면
  현재 계약을 깨뜨린다.
- [identifyChordsForPitchClasses](/workspace/Guitar-p2/src/domain/chord/chordRecognition.ts:10)는
  Am7/C6 같은 대안을 함께 유지한다. [테스트](/workspace/Guitar-p2/src/domain/tab/harmonic-spans.test.ts:60)는
  이 모호성 때문에 progression을 만들지 않음을 확인한다. modal scale membership은 tonal center나
  cadence로 승격되지 않는다([테스트](/workspace/Guitar-p2/src/domain/tab/harmonic-spans.test.ts:94)).
- [setTabFret](/workspace/Guitar-p2/src/domain/tab/editing.ts:39)는 tuning+capo+fret로 MIDI를 계산한다.
  [retuneTabDocument](/workspace/Guitar-p2/src/domain/tab/editing.ts:175)는 identity/fret를 보존한다.
  외부 adapter가 이 MIDI를 다시 transpose하면 이중 적용이다.
- TAB Analyze는 [reducer 동기 실행](/workspace/Guitar-p2/src/features/tab-analysis/state.ts:239)이다.
  P2 점검은 [document identity snapshot](/workspace/Guitar-p2/src/components/guitar/scale/tab-analysis/TabScoreView.tsx:105)만
  필요하지만 향후 harmonic result는 frame/scale/chord/selection scope도 포함해야 한다.
  [기존 state](/workspace/Guitar-p2/src/features/tab-analysis/state.ts:275)는 그 context 변경을 stale로 만든다.

## 후보 판정

| 제품 요소 | 판정 | 다음 단계 승인 범위 |
| --- | --- | --- |
| 원본 ID·줄·MIDI·반복 note·정확한 분수와 관찰/추론 구분 | ADOPT / GO | 기존 계약을 새 관찰 결과의 검증 기준으로 유지 |
| 명시적 written-time interval/verticality 관찰 | ADAPT / 조건부 GO | 아래 지원 subset의 계약 검증. full sounding timeline 승인은 아님 |
| 독립 수작업 기대값 + offline reference 비교 | ADAPT / 조건부 GO | 손실 없이 비교 가능한 subset의 검증 역할만. exact 원본 sidecar·좌표 변환·정밀도 제외 조건 기록 |
| revision·취소·늦은 결과 폐기 방식 | ADAPT / 조건부 GO | 비동기 경계가 필요할 때의 수용 기준. Worker 채택은 측정 후 결정 |
| 현 chord registry를 시간적 관찰에 연결 | DEFER | 기존 ambiguity/omission/added-tone 계약을 보존하는 adapter 검증 전 보류 |
| playback 기본값·자동 repair·generated rest를 원본 사실로 수입 | REJECT | 입력에 없는 길이·쉼·전이를 사실로 만들면 안 됨 |
| grammar·자동 local/modal key·tonicization/modulation | DEFER | 현재 GO subset의 적용성 평가와 별도. 이번에 조사/구현 범위를 넓히지 않음 |

## 반드시 정할 계약과 당장 제외할 입력

1. **표기 길이 vs 실제 발음:** 다음 구현 전 결과가 written intervals인지, performance realization인지
   명시해야 한다. h/p/slide endpoint는 원본 note event지만 반드시 picked attack은 아니다.
   bend/release/vibrato의 시간별 pitch·길이, let-ring/gate/velocity는 현재 모델로 결정할 수 없으므로
   성능적 발음 주장 subset에서 제외한다. 표기 base MIDI 관찰까지 폐기할 필요는 없다.
2. **국소 좌표 vs 전역 좌표:** bar-local onset+duration이 있으면 meter 없이도 같은 bar 안의 상대 관계는
   검증할 수 있다. 여러 bar의 절대 순서/offset에 필요한 anchor가 없으면 global 비교만 제외한다.
   P2의 missing-meter 정보나 `timingInput:'some'`를 분석 가능/불가의 전역 게이트로 재사용하지 않는다.
3. **시간적 충돌과 continuation:** 이전 note duration이 rest/mute/재공격을 통과하는 경우와 continuation
   onset이 origin end보다 앞/뒤인 경우의 의미·오류/지원범위를 다음 구현 전에 정해야 한다.
   지금 지원 subset에서는 이 관계를 자동 truncate/extend/merge하지 않고 해당 temporal interpretation을
   제외한다. 구조적 참조가 정상이라는 P2 결과만으로 연속 발음이 증명되지는 않는다.
4. **부분 coverage:** missing onset/length, unknown gaps, 표기 rest, unsupported technique를 서로 구분한다.
   확인 가능한 다른 구간을 전부 버릴 필요는 없지만 결과의 국소/완전 coverage를 표시해야 한다.
   알려진 interval은 완전한 verticality가 아니다. 시간 미상 note가 알려진 구간에도 겹칠 수 있으므로
   격리 근거 없이 완전한 pitch set·absence·silence를 주장하지 않는다. 실제 합성 fixture로 구간 격리
   가능성을 검증하기 전 어느 오류가 국소인지 단정하지 않는다.
5. **연산·경계:** 개별 분수 입력의 0..1024 bounds는 누적/비교 연산의 정밀도 보증이 아니다.
   exact arithmetic과 half-open boundary, 동시 끝/시작, 큰 분모와 좁은 간격은 다음 구현의 필수 검증이다.
   외부 reference가 표현/조회하지 못하는 좁은 경계는 non-comparable로 분리하며 제품 입력 오류로 판정하지 않는다.
   string=Voice 추정이나 빈 열=rest 추정은 허용하지 않는다.

우선순위는 1–4의 의미/coverage 결정을 먼저, 그 후 최대 편집 크기에서 연산·메모리·취소 비용 측정이다.
이 목록은 해결 구조나 새 엔진 데이터 타입을 미리 확정하는 설계가 아니다.

## 비동기·UI·라이선스 경계

[Chord RevisionGate](/workspace/Guitar-p2/src/domain/chord/engine/workerProtocol.ts:241)와
[createEngineClient](/workspace/Guitar-p2/src/components/guitar/chord/engineClient.ts:17)는 session/request/view/operation
revision, 취소, bounded message, 이전 worker 결과 폐기를 실제 구현한다.
[superseded/cancel 테스트](/workspace/Guitar-p2/src/domain/chord/engine/workerService.test.ts:56)도 있다.
원리는 참고할 수 있지만 닫힌 `engine-worker-v2` payload는 TAB transport가 아니다.
Worker/Python을 도입해야 한다는 결론이나 새로운 async TAB 실행의 성능 검증 결과는 없다.
무효화는 실제 의존성별이어야 한다. written-time 사실은 document/instrument와 계산 범위·옵션에,
화성적 reading은 추가로 frame/scale/chord 등 해당 해석에 사용한 context에 의존한다.
단순 조성 참조 변경만으로 P2 표기 사실이 무효가 되는 것은 아니다.

NON VERBATIM / INTUITIVE는 그대로 유지한다: 악보/선택과 다음 행동을 우선하고 coverage·지원 상태는
짧은 상태/개수로, 근거·기술 제한은 선택 상세로 둔다. P2 draft/IME·focus·Escape·44px 계약을 재사용하고
실제 UI를 구현할 때 세 너비에서 다시 검증해야 한다. 이번 source-only P3 평가가 UI 검증은 아니다.

외부 코드 도입은 선택하지 않았다. 로컬 pinned source의 LICENSE를 확인한 범위에서 alphaTab은 MPL-2.0,
music21은 BSD-3-Clause, Impro-Visor 조사 코드 고지는 GPL-2.0-or-later다. 사전/모델/자산/코퍼스 권리는 별도다.
일반 아이디어의 독립 구현과 소스/사전 복사·라이브러리 배포를 구분하고, 후자를 선택할 때 배포 범위를 검토한다.

**Gate 결론:** 명시적 표기 시간의 지원 subset 검토는 조건부 GO. Offline 비교도 정밀도·좌표·원본 추적이
보장되는 comparable subset에 한한 조건부 GO다. 수작업 기대값을 외부 출력으로 대체하지 않는다.
현재 제품이 실제 sounding timeline·시간 기반 harmonic segmentation을 이미 지원한다거나,
미확정 temporal semantics를 포함한 구현이 바로 승인됐다는 결론은 NO-GO.
