# P3 독립 challenge 검토

대상: 현재 재검증된 `/workspace/Guitar-p2`와 이번 `product/alpha/music21/integration` 실행 근거.
제품 파일은 수정하지 않았다. 이전 `/workspace/modus-p3-evaluation` 결과는 현재 제품 검증으로 재집계하지 않았다.

**판정: 선언된 written-time 관찰 subset과 검증 계약의 다음 단계 검토는 조건부 GO.**
현재 제품에 시간축이 없다는 사실은 적용성 단계 자체의 실패가 아니다. 반대로 이번 probe의 성공은
실제 sounding timeline, harmonic segmentation 또는 배포용 라이브러리 통합의 승인도 아니다.

| 검토 주장 | 확인한 근거 | 유지해야 할 조건 |
| --- | --- | --- |
| P2 데이터를 다음 시간 관찰에 활용 가능 | `types.ts:26`의 bar-relative onset, note별 선택 길이와 IDs; `product/results.json`의 새 22개 사례 | `timingInput:'some'`/누락 0/진단 0을 readiness로 대체하지 않는다. 역전된 start, 시간적 sustain gap, 같은 줄의 duration overlap은 P2 진단 범위 밖이다. |
| meter 없이도 국소 관찰 가능 | no-meter fixture의 `[0,1),[1,2)` 작성 좌표는 명시적이다 | bar-local 사실만 인정한다. 모르는 bar 길이로 전역 좌표를 만들지 않는다. 초기 fixture의 같은 줄 overlap은 별도 반례로 분리되었다. |
| 부분 입력에서 알려진 사실 보존 가능 | 원본 note/분수 정보가 사라질 이유는 없다; integration report는 coverage 결정을 미확정으로 둔다 | 알려진 interval subset과 **완전한 verticality**를 구별한다. onset/end가 모르는 note가 그 구간과 겹칠 수 있으면 absence·silence·완전한 chord set은 증명되지 않는다. 구간 격리 가능성 자체를 별도 검증한다. |
| alphaTab에서 분리 원칙·fixture를 차용 가능 | 18 model/MIDI probes, 5 tuplet 그룹; `Beat.updateDurations`, `Note.chain`, MIDI handler source | authored/display/playback을 분리한다는 원칙과 자체 기대값만 GO. missing quarter 기본값, orphan tie repair, raw MIDI를 원본 사실로 수입하는 것은 NO-GO. |
| alphaTab의 note provenance/줄 정보를 adapter에서 다룰 수 있음 | 다른 두 줄의 동일 MIDI probe는 서로 다른 model note/줄을 유지하지만 동일 MIDI tuple을 낸다 | raw tuple에서 원본 ID를 역복원하지 않는다. 원본 sidecar 가능성은 배제하지 않는다. 이 pin의 줄 규약은 실제로 1=low E/6=high E다. `Note.getStringTuning`의 reverse index와 probe `[6,5]`를 독립 확인했다. |
| music21을 offline comparator로 활용 가능 | 선택적 source-preserving Tree/slicing 사례, 수작업 기대값, 4 upstream tests | Tree나 chordify 어느 것도 단독 정답이 아니다. 원본 exact sidecar, 좌표형 변환, precision-loss 거절, duplicates/작성이력 보존이 있어야 한다. 아래 독립 반례를 제외·기록해야 한다. |
| 기존 chord/Harmony를 시간적 관찰에 연결할 가치 있음 | `analysis.ts:124`, `harmonic-spans.ts:7,49`는 notes/PC와 index 근거를 구별하고 명시적 frame과 유일 exact 후보를 요구 | verticality 변화가 화성 경계·기능·조성의 증거가 되지는 않는다. C6/Am7 대안과 modal Scale/major-minor Harmony frame 차이를 유지한다. 실제 adapter는 아직 검증되지 않았다. |

## 독립 재현한 music21 경계

1. **query 좌표형:** `a:[0,1/10), b:[1/10,1/5)`의 Tree가 float 0.1을 저장한다.
   `getVerticalityAt(Fraction(1,10))`은 start 없음/overlap a, `getVerticalityAt(0.1)`은 start b/overlap 없음이다.
   `tree/spans.py:80,82`의 float 변환과 `tree/trees.py:1420–1422`의 query 경로를 대조했다.
   따라서 “원본 duration은 Fraction이므로 Tree도 정확하다”는 주장은 **NO-GO**다.
2. **제품 유효 분수의 좁은 overlap:** a onset `167/1001`, length `601/1002`, b onset `772/1007`.
   원본 분자·분모는 모두 현재 1024 bounds 이내이고 a끝−b시작은 정확히 `1/1010023014`다.
   Tree의 canonical float 좌표 query에서는 a,b가 있지만 chordify에는 `[60,64]` slice가 없다.
   `stream/base.py:6457`의 `isclose(...,abs_tol=1e-7)`가 이 구간을 건너뛴다.
   이 반례는 범위 밖의 `1/65536` 입력을 제품 병목으로 과장한 결과가 아니다.

별도 Python 실행으로 두 반례를 재현하고 [library-boundaries.json](library-boundaries.json)에 기록했다.
정확한 유리수 계산은 [bounds.json](bounds.json)에 독립 기록했다. float canonicalization만으로
모든 정밀도 문제가 해결된다는 결론은 내리지 않았다.

## 승인 차단 / 미확정 결정 / 이후 검증의 구분

- **차단해야 할 주장:** 현행 P2=시간축 준비 완료, raw alphaTab MIDI=정확한 원본 timeline,
  music21=유일 exact oracle, blank/empty slice=작성된 rest, string=Voice,
  verticality=화성 경계/자동 tonal center. 현재 근거는 이 주장들을 지지하지 않는다.
- **다음 구현 전에 정할 결정:** written interval과 performed sounding의 범위, local/global 좌표,
  cross-bar 길이, 재공격/쉼/뮤트와 이전 duration의 관계, sustain gap/overlap, partial coverage 계약.
  적용성 GO가 이 선택을 대신하지 않는다.
- **실제 구현 후 검증할 항목:** exact arithmetic/경계/원본 ID, memory·최대 크기·취소/늦은 결과,
  UI draft/IME/focus/Escape/44px/세 너비. 아직 없는 엔진의 성능·정확도를 이번 수치로 주장할 수 없다.
- **현재 수치의 한계:** alpha upstream test는 74 total 중 28 pass/46 skipped다. 실행 전체 통과라는
  표현으로 바꾸면 안 된다. host warm source probes와 music21 dense slicing은 서로 다른 연산이다.
  p95/SLO·브라우저·실기기 성능 또는 속도 순위로 해석하지 않는다.
- **라이선스:** pinned alphaTab MPL-2.0, music21 BSD-3-Clause를 실제 LICENSE와 대조했다.
  원칙의 독립 구현과 코드/자산/사전 배포는 구별하며 이번에 배포 적법성 전체를 승인한 것은 아니다.

## 결론

product/alpha/integration 및 최종 music21 보고서의 수정된 범위·한계 표기는 위 challenge와 일치한다.
music21 보고서와 새 실행 JSON은 query 타입·좁은 overlap·자동 rest·tie/ID 손실을 알려진 divergence로 기록한다.
최종 합성 [보고서](../README.md)의 문구·수치도 대조했다. 22개 제품 사례, alpha 18 probe/5 precision
group 및 28 통과/46 제외, music21 11 semantic probe/4 upstream test가 원시 근거와 일치한다.
합성 보고서는 known interval과 complete verticality를 구별하고 comparable subset 및 미구현 bridge를
조건화하므로 추가 승인 차단 모순은 없다.
따라서 **원칙·관찰 계약·선언 subset의 offline 검증 활용은 조건부 GO**, 외부 모델 전체 이식이나
표기에서 실제 발음/화성/조성을 자동 확정하는 통합은 **NO-GO/DEFER**다.
P3 자체에 새 제품 엔진 구현이나 전체 UI 재검증을 요구하지 않는다.
