# 테스트 설정 템플릿 (Playwright, Vitest)

workout-memo의 테스트 설정을 중앙 관리 파일로 만든 것이다(#33). 레지스트리 기능 플래그가 켜진 앱에만 동기화한다. 의존성이 없는 앱에 넣으면 타입 검사가 깨지기 때문이다.

| 관리 파일 | 원본 | 켜는 플래그 | 프로젝트마다 다른 값 |
|---|---|---|---|
| `playwright.config.ts` | `templates/e2e/playwright.config.ts.tmpl` | `features.e2e` | e2e API 포트(`ports.e2eApi`), e2e 웹 포트(`ports.e2eWeb`) |
| `frontend/vitest.config.ts` | `templates/vitest/frontend/vitest.config.ts.tmpl` | `features.vitest` | 없음 |

- 포트는 [ADR-0006](adr/0006-port-slot-allocation.md)의 슬롯 공식으로 정한 레지스트리 값이다. 개발 서버(`api`, `vite`)와 겹치지 않아서 개발 서버를 켠 채로 e2e를 돌릴 수 있다.
- `features.e2e`는 CI의 e2e 작업도 켠다(`reusable-app-ci.yml`).
- 두 파일 모두 `.prettierignore`의 중앙 구간에 들어 있다. 앱에서 포맷하면 해시 검사가 실패하기 때문이다(#154).
- 지금은 workout-memo만 두 플래그가 켜져 있다. 스캐폴드로 만드는 새 프로젝트는 처음부터 두 플래그를 켜고 등록한다. 스캐폴드의 `package.json`에 아래 의존성과 e2e 시작 파일이 들어 있다.

## 템플릿이 기대하는 것

Playwright 설정(`features.e2e`):

- 테스트 파일은 `e2e/` 폴더에 둔다. `e2e/tsconfig.json`이 `../playwright.config.ts`를 포함하면 루트 `npm run typecheck`가 설정 파일도 검사한다.
- 백엔드 `backend/src/server.ts`가 `PORT`, `DATABASE_URL` 환경 변수를 읽고 `/api/health`에 응답한다.
- 프론트엔드 `npm run dev`(Vite)가 `API_PROXY_TARGET`으로 `/api`를 프록시한다.
- `E2E_DATABASE_URL` 또는 `TEST_DATABASE_URL`에 `db:migrate`로 준비한 테스트 DB를 지정한다. 개인 DB는 쓰지 않는다.
- 브라우저는 PC에 설치된 Chrome을 쓴다(`channel: 'chrome'`). 브라우저를 내려받지 않는다. `E2E_VISUAL=1`일 때만 Playwright 컨테이너에 든 Chromium으로 화면 비교를 한다.
- 루트 `package.json`에 `"test:e2e": "playwright test"`, `.gitignore` 프로젝트 구간에 `test-results/`, `playwright-report/`를 둔다.

Vitest 설정(`features.vitest`):

- 테스트 파일은 `frontend/src/**/*.test.{ts,tsx}`다.
- `frontend/src/test/setup.ts`가 있어야 한다(프로젝트 소유 파일. 스캐폴드의 파일을 시작점으로 쓴다).
- `frontend/package.json`에 `"test": "vitest run"`을 둔다.

## 다른 앱이 도입할 때 필요한 의존성

workout-memo `package-lock.json`의 설치 버전이다(2026-10-22). 새 버전을 들이지 않는다.

**설치는 사용자 승인을 받은 뒤 사용자가 직접 한다.** 에이전트는 설치 명령을 실행하지 않는다. 승인된 설치도 `--ignore-scripts`로 하고([의존성 정책](dependency-policy.md)), lockfile 변경과 `ioc-scan` 결과를 앱 PR에 적는다.

| 플래그 | 위치 | 패키지 | 버전 | 쓰는 곳 |
|---|---|---|---|---|
| vitest | `frontend` devDependencies | `vitest` | 5.0.3 | `vitest.config.ts`, 테스트 실행 |
| vitest | `frontend` devDependencies | `jsdom` | 30.1.2 | `environment: 'jsdom'` |
| vitest | `frontend` devDependencies | `@testing-library/react` | 16.3.3 | 화면 테스트, `setup.ts`의 `cleanup` |
| vitest | `frontend` devDependencies | `@testing-library/dom` | 10.4.2 | `@testing-library/react`의 peer |
| vitest | `frontend` devDependencies | `@testing-library/jest-dom` | 7.0.1 | `setup.ts`의 `toBeInTheDocument` 등 |
| e2e | 루트 devDependencies | `@playwright/test` | 1.63.0 | `playwright.config.ts`, `npm run test:e2e` |
| e2e | 루트 devDependencies | `@axe-core/playwright` | 4.13.0 | 접근성 검사. 스캐폴드 `e2e/overview.spec.ts`가 쓴다 |
| e2e | 루트 devDependencies | `@types/node` | 24.19.2 | `e2e/tsconfig.json`의 `types: ["node"]` |
| e2e | `backend` devDependencies | `tsx` | 4.23.15 | `webServer`의 `npx --no-install tsx backend/src/server.ts` |

- `@testing-library/user-event`(14.6.7)는 workout-memo가 쓰지만 템플릿과 공통 UI 테스트에는 필요 없다. 앱이 쓸 때만 들인다.
- 표에 없는 `vite`, `typescript`, `react`는 이미 모든 앱에 있다. 메이저 버전은 [의존성 정책](dependency-policy.md)의 통일표를 따른다.
- `tsx`가 이미 있는 백엔드는 그대로 둔다.

## 앱에 켜는 순서

1. 앱 리포에 이슈를 열고 위 표의 패키지를 적어 사용자 승인을 받는다.
2. 사용자가 설치한다. `setup.ts`, `e2e/` 테스트, `test:e2e` 스크립트처럼 프로젝트 소유 파일을 앱 PR로 추가한다.
3. 중앙 리포에서 `registry/projects.json`의 그 앱 `features.vitest` 또는 `features.e2e`를 `true`로 바꾸는 PR을 연다. 다음 동기화 PR에 설정 파일이 들어간다.
