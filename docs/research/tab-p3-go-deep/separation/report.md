# GO2 심층 적용성: 표기·시간 실현·연주 동작의 분리

**GO 유지: 제품에 접목할 것은 분리 원칙과 claim 경계다.** 이번 단계는 새 시간축·재생 엔진을 구현하지 않았다.
현재 제품 API를 실행한 7개 fixture와 pinned alphaTab source API의 새 9개 fixture로 기존 총론보다 좁게 검증했다.
기존 missing-default/tuplet 수치를 재조사하거나 모델·runtime 도입을 다시 평가하지 않았다.

## 새 실행에서 드러난 실제 경계

1. **작성된 값과 후처리된 모델 값이 다를 수 있다.** alphaTab의 `note(fret5) → tieDestination(fret9)`에서
   finish는 destination ID를 유지하면서 fret를 9→5로 바꿨다. 별도로 보관한 before snapshot에는 9가 남는다.
   provenance는 ID만 있으면 충분하지 않다. 그 ID가 가리키는 값이 작성 전/후처리 후 중 무엇인지 구분해야 한다.
2. **MIDI note-on은 물리적인 picking 횟수가 아니다.** hammer-on 관계는 note-on 두 개(MIDI69/71)와
   destination velocity 감소를 출력했다. legato slide는 note-on 하나와 추가 pitch-bend 이벤트를 출력했다.
   둘 다 원본에는 두 note 위치가 있다. `source note occurrence`, `MIDI note-on`, `picked attack`을 같은 계수로 쓰면 안 된다.
3. **beat의 playbackDuration도 최종 note sounding length가 아니다.** staccato fixture에서 표기·beat playback은
   같은 길이였지만 note event는 절반 길이였다. dead-note도 표기 quarter를 유지하면서 더 짧은 event를 출력했다.
   grace는 표기 duration enum은 보존하면서 display/playback 경계를 다시 배치했다.
4. **현재 제품의 명시적 중단은 이전 written duration을 편집하지 않는다.** note@0의 duration4를 만든 후
   @1에 rest, same-string mute, 재공격을 각각 작성해도 원본 duration4가 남았다. 세 경우 모두 P2 invalid=0이다.
   이것은 시간 overlap/truncation을 판단하지 않는 현재 P2 범위에 맞는다. 이 결과를 "4박 동안 실제로 들린다"로 확대할 수 없다.
5. **continuation의 길이를 origin 길이에 합산하는 계약은 아직 없다.** 동일 pitch note@1/duration1을
   `setTabSustain`으로 바꾸면 새 note는 사라지고 `{noteId:a,duration1}`이 남는다. origin의 duration4는 그대로이며
   현재 analyzer의 pitch observation은 a 하나다. 제품은 4+1=5박 sounding length를 출력하지 않는다.
6. **중단 검증과 실제 종료 시간은 별개다.** rest 뒤 sustain reference fixture에서 P2는 `sustain-interrupted`를 내지만
   origin duration4는 유지한다. 반면 upstream source의 tie-across-rest fixture는 origin을 연장하면서 rest marker도 출력했다.
   외부 재생 정책을 받아들여 현재 구조 계약의 오류를 없애거나, P2 진단을 이용해 실제 종료 시간을 만들어서는 안 된다.
7. **현재 분석의 pitch도 범위를 명시해야 한다.** hammer fixture는 authored endpoint 두 개를 분석한다.
   bend fixture는 base MIDI69와 `targetFret12`를 보존하며, target MIDI76의 새 observation이나 연속 pitch trajectory를 만들지 않는다.

위 항목은 실제 source/API 실행 결과다. physical picking·음향 종료·실제 bend 궤적은 이번 입력만으로 확인한 사실이 아니다.

## 제품 claim matrix

| 대상 | 지금 사실로 표시 가능한 것 | 현재 미구현/미확정 또는 해석 미지원 | 외부 정책에 속하는 것 |
| --- | --- | --- | --- |
| note의 길이·시작 | 저장된 duration 분수, bar-relative beatOffset, 존재/부재, source ID와 현재 값 | 실제 onset/offset·sounding duration을 출력하는 제품 API 없음 | grace stealing, articulation별 길이 보정 |
| note occurrence | 작성된 note ID/줄/fret/MIDI, 두 endpoint의 별도 occurrence | 두 occurrence가 두 번 pick되었다는 주장 | hammer velocity 보정, slide target note-on 억제 |
| whole-position rest | 명시적 rest marker와 작성된 길이 | 이전 note가 정확히 언제 끊기는지, 앙상블 전체의 침묵 | upstream rest를 음향 종료 규칙으로 소비하는 방식 |
| mute | 해당 position/string의 명시적 mute marker | pitch·noise spectrum·음향 길이 없음 | upstream dead/palm-mute의 고정 길이·tempo 스케일링 |
| 같은 줄 재공격 | 새 note ID와 새 작성 위치; 같은 pitch여도 별도 observation | 이전 written length를 자르거나 바꾸는 실제 시간 계약 없음 | 재생기가 prior event의 종료를 다루는 방식 |
| sustain | origin ID와 continuation 위치/길이, 새 pitch observation을 추가하지 않는 현재 분석 동작 | overlap/gap이 있는 원본·continuation을 어떤 시간 범위로 소비할지 미확정 | tie chain을 합친 note event, destination 정규화·수리 |
| h/p/slide | 명시적 종류·toNoteId·endpoint 위치와 pitch | picked attack 계수, 실제 pitch 변화 곡선·duration 정책 없음 | MIDI event 분해/합침과 velocity·pitch-bend realization |
| bend/release/vibrato | 작성된 marker·targetFret 또는 notation, 원래 base pitch | target 도달 시각·curve·깊이·속도 및 performed pitch population 없음 | player의 pitch-wheel 샘플·기본 curve·amplitude |

"지금 표시 가능"은 기존 모델·P2 진단·현재 analyzer가 제공하는 작성 사실의 안전한 해석 범위다.
새 timeline 결과가 이미 제품에 구현되어 있다는 뜻이 아니다. base MIDI는 주어진 tuning/capo 아래의 원래 fret pitch이며,
bend 구간 전체의 실제 들리는 일정 pitch라는 뜻도 아니다.

## 접목할 계약의 선택지와 위험

- **작성 사실만 유지하는 관찰 단계:** 현재 note/position/technique provenance와 표기 값·불완전성만 전달한다.
  현재 P2와 충돌이 가장 적다. 다만 실제 sounding overlap을 제공하는 기능으로 광고할 수 없다.
- **작성 시간의 별도 projection:** start와 length가 명시된 구간에 대해 local written interval을 도출하되,
  그것을 performed sounding interval과 다른 claim으로 둔다. 이 projection도 현재 제품에는 없다.
  rest/mute/재공격/continuation과 written length가 충돌할 때 오류로 볼지·coverage를 제한할지 계약 결정이 필요하다.
- **실현 정책을 선택하는 후속 단계:** 필요하다면 외부 재생 규칙을 명시적으로 별도 층에 적용할 수 있다.
  이 경우 원본을 수정하지 않고 policy/version/지원 technique과 미지원 범위를 밝혀야 한다.
  어느 정책을 선택할지는 이번 GO의 결론이 아니다.

현재 미확정 예: origin@0 duration4 + continuation@1 duration1.
단순 합산, origin 종료를 continuation 시작으로 강제, 구간 union은 서로 다른 결과를 낸다.
그중 하나를 무심코 구현하면 작성 사실과 연주 정책이 섞인다. 이 fixture가 정책 선택 전에 보존되어야 한다.
P2의 `sustain-interrupted` 같은 구조적 진단을 이 시간 의미 결정의 대용으로 사용하지 않는다.

## 근거 파일·함수

현재 작업본:

- [types.ts:14–38](/workspace/Guitar-p2/src/domain/tab/types.ts:14): note duration/technique, position rest/mute/continuation 원본 필드.
- [setTabDuration:98](/workspace/Guitar-p2/src/domain/tab/input-capabilities.ts:98): note/rest/continuation별 길이 보존.
- [setTabRest:126](/workspace/Guitar-p2/src/domain/tab/input-capabilities.ts:126), [setTabMute:138](/workspace/Guitar-p2/src/domain/tab/input-capabilities.ts:138): 현재 위치의 구조를 편집하며 이전 note duration을 sound length로 바꾸지 않음.
- [setTabSustain:178](/workspace/Guitar-p2/src/domain/tab/input-capabilities.ts:178): 새 note를 continuation으로 소비하고 그 note의 duration을 보존.
- [analyzeTabSelection:120](/workspace/Guitar-p2/src/domain/tab/analysis.ts:120): `moments.flatMap(moment.notes)` 기반 pitch observation. sustain·mute·rest를 새 pitch로 추가하지 않음.
- [inspectTabTiming:145](/workspace/Guitar-p2/src/domain/tab/timing-inspection.ts:145): reference의 구조 중단을 진단하며 원본 길이는 변경하지 않음.

alphaTab `5f50046a0e76229af5509f5a28e9567d5af634f0`:

- [Note.chain:1221–1229](https://github.com/CoderLine/alphaTab/blob/5f50046a0e76229af5509f5a28e9567d5af634f0/packages/alphatab/src/model/Note.ts#L1221): tie destination 원본 값 정규화.
- [Note.finish:830–895](https://github.com/CoderLine/alphaTab/blob/5f50046a0e76229af5509f5a28e9567d5af634f0/packages/alphatab/src/model/Note.ts#L830): tie/hammer/slide의 연결과 후처리.
- [Beat.updateDurations:889](https://github.com/CoderLine/alphaTab/blob/5f50046a0e76229af5509f5a28e9567d5af634f0/packages/alphatab/src/model/Beat.ts#L889)와 [Voice.finish:215](https://github.com/CoderLine/alphaTab/blob/5f50046a0e76229af5509f5a28e9567d5af634f0/packages/alphatab/src/model/Voice.ts#L215): 표기/재생 경계와 grace 재배치.
- [MidiFileGenerator._getNoteDuration:1185](https://github.com/CoderLine/alphaTab/blob/5f50046a0e76229af5509f5a28e9567d5af634f0/packages/alphatab/src/midi/MidiFileGenerator.ts#L1185): beat playback에서 최종 note 길이를 별도로 결정.
- [_generateNote:1051](https://github.com/CoderLine/alphaTab/blob/5f50046a0e76229af5509f5a28e9567d5af634f0/packages/alphatab/src/midi/MidiFileGenerator.ts#L1051), [_getNoteVelocity:1301](https://github.com/CoderLine/alphaTab/blob/5f50046a0e76229af5509f5a28e9567d5af634f0/packages/alphatab/src/midi/MidiFileGenerator.ts#L1301): legato note-on 억제와 hammer destination velocity 보정.

## 검증·재현

`probes.ts`는 모델의 before/after-finish/after-generate snapshot을 따로 기록하고 수작업 기대 차이를 assertion한다.
제품 7개 fixture는 기존 API로 입력을 구성한 후 deep-freeze하여 P2 inspector/현 analyzer의 무변경을 확인했다.
원본 object graph를 runtime에 넘기는 adapter나 새 sound projection은 구현하지 않았다.

```sh
TSX_TSCONFIG_PATH=/workspace/modus-p3-go-deep/separation/tsconfig.json node --import /workspace/Guitar-p2/node_modules/tsx/dist/loader.mjs /workspace/modus-p3-go-deep/separation/probes.ts
```

[새 실행 결과](results.json) · [fixture/기대값 코드](probes.ts.txt) · [source hash](manifest.json).
원칙 접목은 코드 복사가 아니다. 외부 구현·runtime 의존성을 제품에 추가하지 않았고 기존 라이선스 검토 범위를 넓히지 않았다.
