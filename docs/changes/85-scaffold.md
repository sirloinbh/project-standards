# #85 신규 프로젝트 스캐폴드

## 변경

| 파일 | 내용 |
|---|---|
| `scaffold/app/` | 프로젝트가 소유하는 시작 파일. workout-memo 구조를 줄인 것이다: 루트·`frontend`·`backend` `package.json`(고정 버전), `compose.yaml`(빌드 secret 포함), `.env.example`, `playwright.config.ts`, `shared/contract.ts`와 `scripts/contract.mjs`, 개요 화면(React Router·TanStack Query·`cn()`), `/api/health`와 `routes/shared.ts` 오류 형식, 시작용 `db:migrate`, `database/`, e2e(axe 접근성, 360px 가로 넘침), `README.md`, `AGENTS.project.md` |
| `scripts/scaffold.mjs` | 레지스트리와 `sync.config.json`에 등록된 프로젝트의 첫 커밋을 만든다. 위 파일, `docs/runbooks`(#35), 계약 복제본, 첫 동기화가 쓸 중앙 관리 파일과 manifest를 한 번에 렌더링한다. 빈 폴더에만 쓴다 |
| `scripts/test/scaffold.test.mjs` | 가상 슬롯 99 프로젝트로 렌더링: 레지스트리 검사 통과, 남은 템플릿 변수 없음, 표준 트리, 결과물에서 standards-check 문제·경고 0개, 의존성이 고정 버전이고 의존성 정책 표·자체 패키지 버전과 같음, 등록된 8개 앱 모두 렌더링, 빈 폴더가 아니면 거부 |
| `README.md`, `docs/design.md` 6.6 | 새 프로젝트 추가 절차에 스캐폴드 명령, 설치 승인, `npm run format` 단계 |

## 결정

- 중앙 관리 파일도 스캐폴드가 함께 쓴다. 그래야 첫 커밋부터 `.npmrc`(`ignore-scripts=true`)가 있어서, 첫 설치 때도 설치 스크립트가 막힌다.
- 의존성 버전은 [의존성 정책](../dependency-policy.md) 표와 workout-memo lockfile의 설치 버전으로 고정했다. 표에 없는 것(`@types/*`, `tsx`, Testing Library, `jsdom`, `@axe-core/playwright`)도 workout-memo 설치 버전이다. 새 패키지는 없다.
- `db:migrate`는 시작용 최소 구현이다(파일 이름 순서, `schema_migrations` 체크섬, 파일별 트랜잭션, advisory lock). 공통 실행기는 #27에서 정한다.
- 템플릿 변수로 채운 문서의 표는 값 길이에 따라 정렬이 달라서 중앙에서 미리 정렬할 수 없다. 설치 뒤 `npm run format`으로 정렬한다.
- `AGENTS.project.md`의 병합 규칙은 8개 앱이 모두 쓰는 "필수 CI 통과 후 에이전트 병합"으로 시작한다.

## 검증

- `npm run check` 통과.
- 슬롯 99 결과물에 workout-memo의 설치된 `node_modules`와 중앙 `packages/`를 연결해 실행했다(설치 없음).
  - 통과: `tsc`(frontend, backend), `eslint .`, 백엔드 테스트 2개, 화면 테스트 1개, `vite build`, 백엔드 `tsc` 빌드, `contract.mjs`, `claude-skills.mjs`, `.standards/check.mjs`.
  - `prettier --check`: 템플릿 변수로 채운 문서 5개의 표 정렬만 남는다(`npm run format` 단계).
  - 실행하지 못함: e2e(테스트 DB와 `@axe-core/playwright` 설치가 필요), 실제 PostgreSQL에서 `db:migrate`.
