# #1 통합 표준 리포 설계 문서와 ADR 초안

## 변경

- `docs/design.md`: 조사 결과, 핵심 결정, 중앙 리포 구조, A안·B안 배포 흐름, 파일 분류표, manifest, `sync.config` 스키마와 초기값, 레지스트리와 포트 체계, 감지·안내 흐름, 충돌 처리 규칙, 인프라 예외, GitHub App, 단계별 적용 계획
- `docs/adr/0001`~`0006`: A안·B안 역할 분담, GitHub App, 감지·안내만 하는 이유, 자체 패키지 출처 확인, shared-aws-infrastructure 예외, 포트 슬롯 배정
- `README.md`: 현재 상태를 설계 검토 단계로 갱신

## 반영한 사용자 결정

| 질문 | 결정 |
|---|---|
| 인프라 원본 | shared-aws-infrastructure를 독립 원본으로 승격 |
| tsconfig | A안 패키지 |
| standards-check | 하위 리포에 복사 |
| 포트 | 슬롯 기반으로 전체 재배정, 7개 앱의 e2e 포트 확정 |
| 공통 스킬 | `std-*`, 기존 `<proj>-*`는 고유 스킬 |
| 동기화 PR 갱신 | 처음 SHA 브랜치를 유지하고 제목·본문만 최신 SHA로 갱신 |
| `^` 범위 고정 | 첫 동기화 PR에 포함 |
| design-tokens | 1단계에 포함 |
| 도메인·AWS 접두어 | `null` 키로 준비 (`projects.json`의 `service`, `aws`, `platform.json`) |

## 요구사항과 달라진 점

- GitHub App 권한에 Workflows: write를 추가했다. 워크플로 파일을 동기화하려면 이 권한이 필요하다(ADR-0002).
- 관리 대상 `.npmrc`에 `ignore-scripts=true`를 넣는다(design.md 4.3).
- 테스트 DB 이름은 `<name>_test`로 분리한다.

## 검증

- 문서만 변경했으므로 실행할 테스트가 없다.
- 임시 Node 스크립트(내장 모듈만 사용)로 다음을 확인했다.
  - 문서 9개의 상대 링크: 깨진 링크 0개
  - 포트 공식: 99개 슬롯 × 6종 = 594개 포트가 모두 서로 다름
  - 예약 포트와 겹침: 처음에는 1건(슬롯 28 api = 3128)이 있었다. 3128을 예약 목록에서 빼서 0건으로 만들었다.
- 포트 범위를 정할 때 이 PC의 예약 포트(`netsh ... excludedportrange`: 50000–50059)와 사용 중인 포트(55536)를 확인했다.
