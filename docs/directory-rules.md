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
│  │  ├─ routes/<기능>.ts  routes/shared.ts # 기능별 API 모듈, 오류 처리
│  │  ├─ openapi.ts  openapi-cli.ts         # OpenAPI 문서 생성 (docs/openapi.json)
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

8개 앱이 모두 Express 5 + Zod를 쓴다. 운영 코드는 패키지로 배포하지 않고, 신규 프로젝트는 스캐폴드(`scaffold/app/backend`)로 같은 구조에서 시작한다. 기존 앱은 `standards-check`가 아래 규칙을 경고(실패 아님)로 알려 준다.

### 구조

- `backend/src/app.ts`의 `createApp(pool)`이 앱을 조립한다: JSON 본문 파서 → 기능 라우트 → `app.use('/api', notFound)` → `app.use(errorHandler)` 순서다. `server.ts`는 포트를 열기만 한다.
- 기능마다 `backend/src/routes/<기능>.ts` 모듈 하나를 두고, `register<기능>Routes(app, pool)` 함수로 등록한다. 공통 도우미(`errorHandler`, `notFound`, `Db` 타입)는 `routes/shared.ts`에 둔다.
- 테스트는 `createApp`에 가짜 `pool`을 넘겨 DB 없이 라우팅과 오류 형식을 확인한다(스캐폴드 `backend/test/health.test.ts`).

### 경로

- 모든 API는 `/api`로 시작한다. nginx가 `/api/`를 API 컨테이너로 넘긴다.
- 경로는 소문자 영어 복수형과 하이픈: `GET /api/body-measurements`, `DELETE /api/workouts/:id`. 파일 확장자는 내려받기에만 붙인다: `GET /api/export/workouts.csv`.
- 수정은 `PUT`(전체 교체)을 기본으로 한다. 생성 성공은 `201`, 조회·수정·삭제 성공은 `200`이다.

### 상태 확인 `GET /api/health`

- 모든 앱에 있어야 한다. `SELECT 1`로 DB 연결까지 확인한다.
- DB가 응답하면 `200`, 아니면 오류 처리기를 거쳐 `500 { error }`다. 상태 확인 도구(Docker healthcheck, 배포 확인)는 상태 코드만 본다.
- 성공 본문은 스캐폴드 기준 `{ "status": "ok" }`다. 기존 앱의 `{ ok, service, today }`도 허용한다(아래 차이표).

### 오류 응답

- 모든 오류 응답 본문은 `{ "error": "<한국어 메시지>" }` 하나다. 타입은 `shared/contract.ts`의 `ApiError`다. 화면은 `error`를 그대로 보여 줄 수 있어야 한다.
- 내부 메시지(SQL, 스택)는 응답에 넣지 않고 `console.error(JSON.stringify({ event: 'request_error', message }))`로 로그에만 남긴다.

| 상태 코드 | 언제 | 처리 위치 |
|---|---|---|
| `400` | Zod 검증 실패(이슈 메시지를 `, `로 이음), 깨진 JSON 본문 | `errorHandler` |
| `404` | 대상 행이 없음 / 등록되지 않은 `/api` 경로 | 라우트 / `notFound` |
| `409` | 고유 제약 위반(PostgreSQL `23505`), 상태 충돌 | `errorHandler` / 라우트 |
| `413` | 본문 크기 한도(기본 `256kb`) 초과 | `errorHandler` |
| 그 밖의 `4xx` | 라우팅 전에 Express가 낸 클라이언트 오류 | `errorHandler`(상태 코드 유지) |
| `500` | 그 밖의 모든 오류(DB 연결 실패 포함) | `errorHandler` |

### 검증 위치

- 입력(`req.body`, `req.query`, `req.params`)은 라우트 처리 함수의 첫 줄에서 Zod 스키마의 `parse()`로 검증한다. 검증 전 값(`req.body.name`)을 직접 읽지 않는다.
- 실패하면 `ZodError`가 던져지고 `errorHandler`가 `400`으로 바꾼다. 라우트마다 `try/catch`를 쓰지 않는다(Express 5는 async 오류를 넘겨준다).
- 화면과 함께 쓰는 입력 스키마는 `shared/contract.ts`에, 서버만 쓰는 교차 필드 규칙은 `backend/src/domain.ts`에 둔다. 화면 폼도 같은 스키마를 쓴다.

### 하위 리포 검사 경고

`standards-check`는 `backend/src/app.ts`가 있는 리포에서 `backend/src`의 `.ts` 파일(테스트 제외)을 읽어 다음을 경고한다. 모든 앱이 같은 파일 구조는 아니므로 파일 위치가 아니라 규칙을 본다.

- `app.get('/api/health', …)`가 없음
- `app.ts`에 오류 처리 미들웨어(`app.use(errorHandler)` 또는 `app.use((err, …) => …)`)가 없음
- `app.ts`에 `app.use('/api', …)` 404 처리가 없음
- `app.<method>('<경로>')`가 `/api`로 시작하지 않거나, 경로 조각이 소문자·하이픈이 아님
- `res.status(4xx|5xx).json({ <error 아닌 키>: … })`
- `req.body.<필드>`, `req.query.<필드>` 직접 읽기

### workout-memo와 다른 점

규칙의 근거는 workout-memo다. 스캐폴드는 다른 앱 7개가 먼저 고친 부분(없는 경로 404, 본문 오류 구분)을 더했다. 2026-10-22 각 앱의 `backend/src`를 읽고 정리했다. 이 기준으로 `standards-check`를 돌리면 workout-memo만 "없는 /api 경로 404" 경고 1개가 나오고 나머지 7개 앱은 경고가 없다.

| 항목 | workout-memo | 다른 7개 앱 | 표준(스캐폴드) |
|---|---|---|---|
| 라우트 위치 | `routes/<기능>.ts`, `register<기능>Routes(app, pool)` | 기능 라우트가 있는 study-log·plan-routine은 `src/<기능>.ts`의 `Router`를 `app.use('/api/<기능>', …)`로 연결. 나머지 5개는 아직 기능 라우트 없음 | workout-memo 방식 |
| `/api/health` 등록 | `app.ts` 안에 직접 | `app.ts` 안에 직접 | `routes/health.ts` |
| `/api/health` 성공 본문 | `{ status: 'ok' }` | `{ ok: true, service, today }` | `{ status: 'ok' }` (둘 다 허용) |
| 오류 처리기 | `routes/shared.ts`의 `errorHandler` | `app.ts` 안의 익명 함수 | `routes/shared.ts`의 `errorHandler` |
| 없는 `/api` 경로 | Express 기본 HTML 404 | `404 { error }` | `404 { error }` (`notFound`) |
| 깨진 JSON 본문 | `400` 일반 메시지 | study-log만 `400` 전용 메시지(`entity.parse.failed`), 나머지는 `500` | `400` 전용 메시지 |
| 본문 크기 초과 | `413`(백업 전용 메시지) | study-log만 `413`, 나머지는 `500` | `413` |
| 외래 키 위반 `23503` | `400` 전용 메시지 | 없음 | 없음 (기능을 만들 때 추가) |
| 500 메시지 | "저장소에 연결할 수 없습니다…" | "서버 오류가 발생했습니다" | "서버 오류가 발생했습니다" (7개 앱과 같음) |
| 오류 응답 타입 | 없음 | 없음 | `shared/contract.ts`의 `ApiError` |
| OpenAPI 설명 | `docs/api.md` 표에서 읽음 | 없음 | `openapi.ts`의 `operations`에 `summary`로 직접 |
| `today` 주입(`createApp(pool, { today })`) | 있음 | 있음 | 없음 (날짜 기능을 만들 때 추가) |

## 공유 계약 (shared/contract.ts)

- 입력 스키마의 원본은 `shared/contract.ts` 하나다.
- `npm run contract:sync`가 `backend/src/contract.ts`와 `frontend/src/contract.ts`로 복제한다. 각 영역이 subtree 리포와 Docker 빌드에서 혼자 빌드되기 위해서다.
- 복제본은 직접 고치지 않는다. `npm run check`의 `contract:check`가 불일치를 실패로 처리한다.

## OpenAPI

- API 라우트를 바꾸면 `backend/src/openapi.ts`의 `operations`(경로마다 `summary`, 요청 스키마, 상태 코드)를 맞추고 `npm run openapi`로 `docs/openapi.json`을 다시 만든다.
- 요청 스키마는 서버의 Zod 스키마에서 변환한다. 오류 응답은 모두 `components.schemas.Error`(`{ error }`)를 가리킨다.
- 등록된 라우트와 `operations`가 다르거나 생성된 파일이 오래되면 테스트가 실패한다(스캐폴드·workout-memo `backend/test/openapi.test.ts`).
- `docs/openapi.json`은 `JSON.stringify` 결과 그대로 두고 `.prettierignore` 프로젝트 구간에 넣는다.
