# P3 alphaTab 적용성 검증

기준: `CoderLine/alphaTab@5f50046a0e76229af5509f5a28e9567d5af634f0`.
실제 대상은 source의 model→finish→MIDI 경로다. 제품 `/workspace/Guitar-p2`는 읽기 전용으로 참조했고 변경하지 않았다.
18개 새 source-level probe, 독립 기대값을 가진 5개 tuplet 경계 검사와 선택적 upstream 테스트를 실행했다.

## 제품에 남길 요소와 판정

| 요소 | 판정 | 제품 적용 조건 |
| --- | --- | --- |
| 표기 길이·재생 길이·effect 결과의 구분 | **ADAPT / GO** | 분리 원칙과 검증 항목만 채택. 입력 사실과 실현 정책을 별도로 표기하고, alphaTab 재생값을 작성된 사실로 역변환하지 않는다. |
| 반복 attack·지속·같은 음의 중복을 따로 확인하는 fixture | **ADAPT / GO** | THE MODUS ID/줄/실제 MIDI를 함께 보존한 자체 fixture가 기준. 상위 프로젝트 테스트 코드 복사 없이 수작업 기대값 사용. |
| alphaTab Beat/Voice/MasterBar를 현 모델에 그대로 도입 | **DEFER / NO-GO as-is** | THE MODUS에는 Voice와 지역 박자 변경이 없고, 같은 Position의 note별 독립 길이가 가능하다. Beat의 공통 표기 길이로 옮길 때의 손실과 Voice 배정이 미해결이다. string을 Voice로 간주하면 안 된다. |
| MIDI 이벤트를 제품의 정확한 시간·원본 출처 기준으로 사용 | **REJECT as authority / NO-GO** | tick 절삭·누락 기본값·tie repair·ID 부재가 확인됐다. 향후 재생 reference로 검토할 수는 있지만 authored timeline의 정답은 아니다. |
| renderer/synth를 실제 제품 runtime에 포함 | **DEFER / NO-GO now** | 이번 stage에 필요하지 않다. cold load, browser bundle/assets, memory, cancellation, OS/mobile, attribution 배치가 미검증이다. |

GO는 원칙과 제품별 검증 항목을 접목할 수 있다는 뜻이다. 시간축 구현 방식·새 엔진·외부 dependency 채택을 확정하지 않는다.

## 확인한 호출 경로·소스 근거

- [Score.finish:432](https://github.com/CoderLine/alphaTab/blob/5f50046a0e76229af5509f5a28e9567d5af634f0/packages/alphatab/src/model/Score.ts#L432)
  → Track.finish → Staff.finish → Bar.finish →
  [Voice.finish:171](https://github.com/CoderLine/alphaTab/blob/5f50046a0e76229af5509f5a28e9567d5af634f0/packages/alphatab/src/model/Voice.ts#L171).
  Voice는 beat를 chain하고 display/playback tick을 각각 누적한다(200–286).
- [Beat.duration:329](https://github.com/CoderLine/alphaTab/blob/5f50046a0e76229af5509f5a28e9567d5af634f0/packages/alphatab/src/model/Beat.ts#L329)는 Quarter 기본값이다.
  `_calculateDuration`/`updateDurations`(870–919)는 full-bar rest, dot, tuplet, grace 정책으로 display/playback 길이를 계산한다.
- [Note.chain:1221](https://github.com/CoderLine/alphaTab/blob/5f50046a0e76229af5509f5a28e9567d5af634f0/packages/alphatab/src/model/Note.ts#L1221)는 tie origin을 찾지 못하면 `isTieDestination=false`로 바꾸며,
  찾으면 destination fret/octave/tone을 origin 값으로 바꾼다. `findTieOrigin`(1131)은 앞선 beat의 같은 줄을 탐색한다.
- [MidiFileGenerator._generateNote:957](https://github.com/CoderLine/alphaTab/blob/5f50046a0e76229af5509f5a28e9567d5af634f0/packages/alphatab/src/midi/MidiFileGenerator.ts#L957)
  → `_getNoteDuration`(1185–1293)는 tie, slide, let-ring, staccato, dead/palm-mute의 실현 길이를 계산한다.
  1051–1054는 tied/legato slide target의 새 attack을 억제한다.
- [MidiUtils:8,58](https://github.com/CoderLine/alphaTab/blob/5f50046a0e76229af5509f5a28e9567d5af634f0/packages/alphatab/src/midi/MidiUtils.ts#L58): QuarterTime=960,
  `applyTuplet=((ticks*denominator)/numerator)|0`. 이는 재생 tick 정밀도 계약이며 exact rational 보존 계약이 아니다.
- [IMidiFileHandler.addNote:33](https://github.com/CoderLine/alphaTab/blob/5f50046a0e76229af5509f5a28e9567d5af634f0/packages/alphatab/src/midi/IMidiFileHandler.ts#L33)는 track/start/length/key/velocity/channel만 받고 note ID·줄·원본 위치는 받지 않는다.
- [Note.id:156/string:226](https://github.com/CoderLine/alphaTab/blob/5f50046a0e76229af5509f5a28e9567d5af634f0/packages/alphatab/src/model/Note.ts#L156)는 전역 증가 numeric ID와 1=가장 낮은 줄 규약을 사용한다.
  THE MODUS의 string ID와 고음 우선 0..5 규약과 다르다.
  이는 주석만 따른 판단이 아니다. [Tuning 기본값:77](https://github.com/CoderLine/alphaTab/blob/5f50046a0e76229af5509f5a28e9567d5af634f0/packages/alphatab/src/model/Tuning.ts#L77)은
  `[64,59,55,50,45,40]`(고음→저음)이고 `getStringTuning`(657–659)는 `tuning[length-string]`를 읽는다.
  새 probe의 실제 결과도 alphaTab string6/fret0=MIDI64, string5/fret5=MIDI64다.
  따라서 현재 6줄 제품과의 대응은 `alphaString = 6 - modusString`이며 단순 `+1` 변환이 아니다.
  확인한 pin에서는 이 주석과 구현의 충돌이 없다.
  `stringTuning`/`calculateRealValue`(653–708)는 tuning/capo/transpose/harmonic을 적용하므로 이미 계산된 THE MODUS MIDI를 이 경로에 넣을 때 중복 적용을 피해야 한다.
- Upstream 검증 근거:
  [Beat.test.ts](https://github.com/CoderLine/alphaTab/blob/5f50046a0e76229af5509f5a28e9567d5af634f0/packages/alphatab/test/model/Beat.test.ts),
  [effect-note-durations:2227](https://github.com/CoderLine/alphaTab/blob/5f50046a0e76229af5509f5a28e9567d5af634f0/packages/alphatab/test/audio/MidiFileGenerator.test.ts#L2227).
  plain/tuplet/dots/triplet-feel/on-beat/before-beat grace snapshots는 upstream 재생 정책을 검증한다. THE MODUS의 missing/unknown 계약을 검증하는 테스트가 아니다.

## 새 실행에서 확인한 결과

| 입력 | 실제 source 실행 결과 | 제품상 의미 |
| --- | --- | --- |
| 길이를 주지 않은 note | 0에서 길이960 tick(quarter) note 생성 | unknown duration 보존 불가; adapter가 먼저 불완전 입력을 구분해야 한다. |
| 첫 note의 orphan tie flag | finish 후 false, 새 quarter attack 발생 | 작성된 오류 출처를 재생 결과만으로 복구할 수 없다. |
| quarter attack + 명시적 tie destination | 두 beat가 1920-tick 한 attack으로 출력 | attack/continuation 구분은 유용하나 repair 여부·작성자 ID를 따로 보존해야 한다. |
| 같은 pitch의 인접 재공격 | 0,960 tick 두 attack 유지 | pitch-class 집합만으로 압축하면 안 된다. |
| 같은 beat의 high-E open와 B-string fret5 | MIDI64의 동일 tuple 두 개; model note IDs/줄은 서로 다름 | MIDI에는 multiplicity가 남지만 각 event의 source ID/줄은 없다. 동일 tuple 정렬만으로 source를 복원하면 모호하다. |
| 동일 입력 score 재생성 | MIDI tuple은 동일, model numeric IDs는 달라짐 | alphaTab가 생성한 ID는 원래 THE MODUS ID가 아니다. |
| let-ring + 다른 줄의 두 attack + rest | 원음960→2880 tick으로 연장 | default GuitarPro mode의 재생 정책이다. 표기 길이가 새로 관찰된 사실은 아니다. |
| let-ring + 같은 줄 재공격 | 원음960 tick에서 끝남 | same-string interruption 정책 확인. |
| before-beat sixteenth grace | 앞 note display960/playback840; grace display0/playback120 | 표기와 실현 시간 분리 원칙은 적용 가치가 높다. 수치 정책 자체를 복제할 이유는 없다. |
| 3/4 full-bar rest / empty beat | rest2880 / empty rest marker, beat960 | library rest/placeholder를 THE MODUS의 작성된 쉼표나 침묵 근거로 취급하면 안 된다. |

같은 beat unison probe는 실제 다른 두 줄을 쓴다. 별도의 two-voice unison probe는 upstream 모델만의 multiplicity 검사이며 THE MODUS에 같은 줄 복수 Voice를 허용하자는 제안이 아니다.
Own adapter가 source ID sidecar를 유지하는 것은 가능하다. 이번 결과는 alphaTab Note 모델이 원본 ID를 절대 보존할 수 없다는 주장이 아니라, 자동 생성 ID와 ID 없는 MIDI handler만으로 제품 provenance가 충족되지 않는다는 확인이다.

Tuplet 기대값은 해당 그룹의 quarter 총량×960으로 따로 계산했다. 3:2/5:4는 일치하지만:

| Quarter tuplets | 기대 끝 tick | 실제 끝 tick | 오차 |
| --- | ---: | ---: | ---: |
| 7:4 | 3840 | 3836 | -4 |
| 11:8 | 7680 | 7678 | -2 |
| 13:8 | 7680 | 7670 | -10 |

## 비용·재현성·라이선스

- Source-level Node `Score.finish + MIDI generate`, **18 fixtures + 5 precision groups** 완료.
  선택적 upstream 테스트 **2파일 / 28통과 / 46제외 / 0실패**. 전 upstream suite 통과 주장은 하지 않는다.
- warmed synthetic 실행 1024 notes median **1.84ms**(7회), 6144 notes median **5.85ms**(3회), 최대 **19.18ms**.
  생성/표시/재생을 모두 포함한 제품 지연이 아니다. 6144 notes의 여섯 합성 Voice는 부하용이며 string=Voice 매핑 제안이 아니다.
  cold load/브라우저/메모리/오디오/UI/worker 전송 비용은 미측정이라 runtime GO의 근거가 될 수 없다.
- cached repo `git status --short`는 전후 깨끗하다. 이전 실행에서 생성된 72개 generated source를 재사용했다.
  소스 pin만으로 생성물까지 같다고 가정하지 않고 [manifest.json](manifest.json)에 생성물·테스트·핵심 소스·실행기 hash를 함께 기록했다.
- [package LICENSE](https://github.com/CoderLine/alphaTab/blob/5f50046a0e76229af5509f5a28e9567d5af634f0/packages/alphatab/LICENSE)는 MPL-2.0이다.
  [LICENSE.header](https://github.com/CoderLine/alphaTab/blob/5f50046a0e76229af5509f5a28e9567d5af634f0/packages/alphatab/LICENSE.header)는 rendered score attribution과 integrated libraries/assets의 MIT/OFL 고지도 포함한다.
  원칙·수작업 fixture 접목과 구현 코드/renderer/assets 포함은 별개다. 파일 단위 코드를 복사·수정·배포하거나 renderer를 도입할 때 source/notice/attribution 의무를 별도로 검토해야 한다. 법률적 호환성을 확정한 결과는 아니다.

산출물: [probe source](probes.ts.txt), [raw results](results.json), [upstream test results](upstream-tests.json), [test config](vitest.config.mjs.txt).
재현:

```sh
TSX_TSCONFIG_PATH=/workspace/modus-p3-current/alpha/tsconfig.json node --import /workspace/Guitar-p2/node_modules/tsx/dist/loader.mjs /workspace/modus-p3-current/alpha/probes.ts
node /workspace/Guitar-p2/node_modules/vitest/vitest.mjs run --config /workspace/modus-p3-current/alpha/vitest.config.mjs --testNamePattern='BeatTests|effect-note-durations|full-bar-rest|time-signature|tickshift-flat' --reporter=json --outputFile=/workspace/modus-p3-current/alpha/upstream-tests.json
```

제품 코드/의존성/기존 조사본은 변경하지 않았다. renderer·synth·상용 앱 REA는 이번 적용성 판정의 필수 대상이 아니다.
