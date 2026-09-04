# DadaGP 권리·배포 Gate

- 확인일: 2026-09-04
- 원칙: 코드 라이선스, 논문 라이선스, corpus에 포함된 곡·탭 권리를 서로 대체 가능한 것으로 해석하지 않는다.

| 활용 | 현재 상태 | Phase 0 처리 |
|---|---|---|
| decoder/encoder 코드 사용 | MIT로 확인됨 | 코드 범위에서 가능 |
| 로컬 corpus 내부 연구·검증 | 저자가 연구 목적으로 제공했으나 허용 문구의 정확한 범위 미확인 | 내부 benchmark에 한정한 **CONDITIONAL** |
| 비식별 aggregate 통계 저장 | 명시적 서면 범위 미확인 | 저장소에는 최소 aggregate만 저장, 외부 공개 전 재확인 |
| 관측 shape/frequency/score의 상업 제품 반영 | 미확인 | **BLOCKED** |
| corpus 기반 모델 학습·가중치 배포 | 미확인 | **BLOCKED** |
| 원본 GP/token 또는 per-song 파생물 재배포 | 허가 근거 없음 | **PROHIBITED** |

## 저자에게 확인할 unresolved 질문

1. 전달된 corpus를 비상업·상업 제품의 내부 평가에 각각 사용할 수 있는가?
2. 곡을 식별할 수 없는 aggregate 빈도와 benchmark 수치를 공개 저장소에 게시할 수 있는가?
3. 정규화 chord shape, transition count, empirical ranking score를 제품에 포함할 수 있는가?
4. 학습된 모델 또는 모델 가중치 배포가 허용되는가?
5. 원본 저작권자·탭 작성자 권리와 삭제 요청을 다루는 별도 정책이 있는가?

서면 답변과 적용 버전, 날짜, 조건을 확보하기 전에는 `unresolved`를 자동으로 `confirmed`로 승격하지 않는다.
