# 디렉토리·라우팅 규칙

workout-memo 구조를 근거로 한 표준이다. 신규 프로젝트는 그대로 따르고, 기존 리포는 `standards-check`가 경고(실패 아님)로 알려 준다.

## 표준 트리

```
<project>/
├─ AGENTS.md  AGENTS.project.md  CLAUDE.md  README.md
├─ package.json  package-lock.json          # npm workspaces: frontend, backend
├─ compose.yaml  .env.example
├─ shared/contract.ts                       # 입력 스키마 원본 (Zod)
├─ frontend/                                # subtree → <project>-frontend
│  ├─ Dockerfile  nginx.conf  package.json  package-lock.json  vite.config.ts
│  └─ src/
│     ├─ main.tsx  app.tsx                  # 진입점, 레이아웃과 라우터
│     ├─ <기능>.tsx                         # 화면별 파일
│     ├─ components/ui/                     # shadcn/ui 공통 컴포넌트 (중앙 관리, #123)
│     ├─ lib/                               # cn() 등 유틸리티
│     ├─ contract.ts                        # shared/contract.ts 복제본 (직접 수정 금지)
│     └─ test/                              # 테스트 도우미
├─ backend/                                 # subtree → <project>-backend
│  ├─ Dockerfile  package.json  package-lock.json  tsconfig.json
│  ├─ src/
│  │  ├─ server.ts  app.ts                  # 서버 시작, 앱 조립·오류 처리
│  │  ├─ routes/<기능>.ts                   # 기능별 API 모듈
│  │  ├─ domain.ts                          # 도메인 규칙·검증
│  │  ├─ migrate.ts                         # 마이그레이션 실행기 (#27)
│  │  └─ contract.ts                        # shared/contract.ts 복제본
│  └─ test/
├─ database/                                # subtree → <project>-db
│  ├─ README.md
│  └─ migrations/NNN_<설명>.sql
├─ e2e/                                     # Playwright (e2e를 쓰는 프로젝트)
├─ scripts/                                 # PowerShell·Node 스크립트 (일부 중앙 관리)
├─ skills/  .claude/skills/                 # std-*(중앙 관리) + 프로젝트 고유 스킬
└─ docs/  changes/  daily/  next-steps/
```

근거: workout-memo `frontend/src`, `backend/src/routes/`, `shared/contract.ts`, `database/migrations/`

## 화면 URL (React Router)

- 라우터는 `BrowserRouter`를 쓰고, 메뉴 링크는 `NavLink`로 만든다.
- 페이지 경로는 한 곳(`app.tsx`의 `pages` 객체)에 모은다. 근거: workout-memo `frontend/src/app.tsx`의 `pages = { overview: '/', journal: '/journal', … }`.
- 경로는 소문자 영어, 단어는 하이픈으로 잇는다: `/body-measurements`. 첫 화면(개요)은 `/`이다.
- 목록 필터·기간처럼 공유할 수 있는 화면 상태는 쿼리 문자열(`useSearchParams`)에 둔다: `/journal?from=2026-10-01&to=2026-10-22`.
- 상세 화면이 필요하면 `/<목록>/:id` 형식을 쓴다.

## API (Express)

- 모든 API는 `/api`로 시작한다. nginx가 `/api/`를 API 컨테이너로 넘긴다.
- 기능마다 `backend/src/routes/<기능>.ts` 모듈 하나를 두고, `register<기능>Routes(app, pool)` 함수로 등록한다. 공통 도우미는 `routes/shared.ts`에 둔다.
- 경로는 소문자 영어 복수형과 하이픈: `GET /api/body-measurements`, `DELETE /api/workouts/:id`.
- 상태 확인: `GET /api/health`. 모든 앱에 있어야 한다.
- 입력은 Zod로 서버에서 검증한다. 화면 폼도 같은 스키마를 쓴다.
- 오류 응답 형식과 상태 코드 규칙은 #30에서 정한다.

## 공유 계약 (shared/contract.ts)

- 입력 스키마의 원본은 `shared/contract.ts` 하나다.
- `npm run contract:sync`가 `backend/src/contract.ts`와 `frontend/src/contract.ts`로 복제한다. 각 영역이 subtree 리포와 Docker 빌드에서 혼자 빌드되기 위해서다.
- 복제본은 직접 고치지 않는다. `npm run check`의 `contract:check`가 불일치를 실패로 처리한다.

## OpenAPI

- API 라우트를 바꾸면 `backend/src/openapi.ts`를 맞추고 `npm run openapi`로 `docs/openapi.json`을 다시 만든다.
- 생성된 파일이 오래되면 테스트가 실패한다(workout-memo `openapi.test.ts`).
