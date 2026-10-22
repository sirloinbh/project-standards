# #44 레지스트리·버전·동기화 설정 원본 파일과 충돌 검사

## 변경

| 파일 | 내용 |
|---|---|
| `scripts/lib/schema.mjs` | 외부 패키지 없는 JSON Schema 검증기. 이 리포가 쓰는 키워드만 지원하고, 지원하지 않는 키워드를 만나면 조용히 넘어가지 않고 오류를 낸다 |
| `registry/projects.json`, `projects.schema.json` | 8개 앱의 슬롯·포트·DB·리포 이름·기능 여부·고유 스킬. 도메인과 AWS 접두어는 `null`(미정) |
| `registry/platform.json`, `platform.schema.json` | 포트 공식, 예약 포트, 루트 도메인(`null`), AWS 리전 `ap-northeast-2`(workout-memo `infrastructure/variables.tf` 기본값) |
| `versions.json`, `versions.schema.json` | Node 24.21.0, npm 11.19.0, PostgreSQL 17, Docker 이미지 3종, Terraform `>= 1.6.0`, 외부 Action 4종의 커밋 SHA, A안 패키지(아직 배포 전이라 `null`) |
| `sync.config.json`, `sync.config.schema.json` | app·infra 프로필, 대상 9개, `maxRollout` 0 |
| `scripts/lib/registry.mjs`, `scripts/registry-check.mjs` | 스키마 검사와 파일 간 검사: 슬롯·이름·리포·DB·서비스 주소·AWS 접두어 중복, 모든 포트의 전역 중복, 포트 공식, 예약 포트(99개 슬롯 전체 기준), 동기화 대상과 레지스트리 일치, 만료된 허용 차이 경고 |
| `scripts/gen-docs.mjs`, `docs/projects.md` | 레지스트리로 프로젝트 개요 문서 생성. `--check`는 커밋된 파일이 오래되면 실패 |
| `package.json` | 의존성 없이 `npm run test`, `registry:check`, `docs`, `docs:check`, `check` 스크립트만 둔다 |
| `scripts/test/*.test.mjs` | 검증기, 레지스트리 검사, 문서 생성 테스트 24개 |

## 결정한 값

- 외부 Action은 지금 하위 리포가 쓰는 메이저 태그가 가리키는 커밋으로 고정했다. 네 개 모두 릴리스 후 14일이 지났다.

  | Action | 버전 | 커밋 날짜 |
  |---|---|---|
  | actions/checkout | v4.4.0 | 2026-07-16 |
  | actions/setup-node | v4.4.0 | 2025-04-02 |
  | actions/upload-artifact | v4.6.2 | 2025-03-19 |
  | hashicorp/setup-terraform | v3.1.2 | 2024-08-19 |

- Terraform CLI의 정확한 버전은 아직 정하지 않았다(`terraform.cli: null`). 지금은 `setup-terraform`이 최신 버전을 설치한다. 인프라 CI를 만드는 #71에서 고정한다.
- 테스트 DB 이름은 `<DB 이름>_test`다(design.md 6.2).
- `features`는 workout-memo만 `e2e`, `openapi`, `contract`가 `true`다. 근거는 workout-memo의 `playwright.config.ts`, `docs/openapi.json`, `shared/contract.ts`다.

## 검증

- `npm run check`: 테스트 24개 통과, `registry-check: ok`, `docs/projects.md: up to date`
- 로컬 Node는 v22.17.0이다. 표준 버전 24.21.0과 다르기 때문에, 중앙 스크립트는 Node 22에서도 동작하는 API만 쓴다. `package.json`의 `engines`도 `>=22`로 두었다. CI에서는 24.21.0으로 실행한다(#71).
