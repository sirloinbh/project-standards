# #30 API 규칙과 백엔드 기본 구조

## 변경

| 파일 | 내용 |
|---|---|
| `docs/directory-rules.md` "API" | 구조(`createApp` 조립 순서, `routes/<기능>.ts`), 경로, `GET /api/health`, 오류 응답 `{ error }`와 상태 코드 표, 검증 위치, 검사 경고 목록, workout-memo·다른 7개 앱과의 차이표. "OpenAPI" 절에 `operations`와 `.prettierignore` 규칙 |
| `scripts/standards-check.mjs` | `checkApi()`: `backend/src/app.ts`가 있는 리포에서 API 규칙 6가지를 경고로 알린다. 실패(종료 코드 1)는 내지 않는다 |
| `scaffold/app/backend/src/` | `app.ts`에 `app.use('/api', notFound)`. `routes/shared.ts`에 `notFound`와 깨진 JSON(400)·본문 크기(413)·라우팅 전 4xx 처리. `openapi.ts`(Zod → JSON Schema, 라우트와 `operations` 대조), `openapi-cli.ts` |
| `scaffold/app/backend/test/` | `health.test.ts`에 없는 `/api` 경로 404, 깨진 JSON 400 테스트. `openapi.test.ts`(생성 파일 최신 여부, 경로 형식, 문서 없는 라우트 거부) |
| `scaffold/app/shared/contract.ts` | 오류 응답 타입 `ApiError` |
| `scaffold/app/docs/openapi.json.tmpl`, `.prettierignore.tmpl` | 처음 생성된 OpenAPI 문서와, 그것을 prettier에서 빼는 프로젝트 구간 |
| `scaffold/app/package.json.tmpl`, `backend/package.json.tmpl`, `README.md` | `npm run openapi` |
| `scripts/test/standards-check.test.mjs` | 경고 fixture 테스트 4개: 스캐폴드 백엔드는 경고 0개, 위반 8개 줄 번호와 함께 경고, study-log 방식(익명 오류 처리기, `Router` 연결)은 통과, `runCheck`에서 실패 없이 경고만 |
| `scripts/test/scaffold.test.mjs` | 렌더링 테스트 1개: `app.ts`·`routes/`·`contract.ts`·OpenAPI 파일, `docs/openapi.json`이 `openapi.ts`의 `operations`·제목과 같고 `JSON.stringify` 형식, `.prettierignore` 프로젝트 구간 |

## 결정

- 경고는 파일 위치가 아니라 규칙을 본다. 앱마다 라우트를 두는 방식(workout-memo `routes/`, study-log `Router`)이 달라서다. 테스트 파일(`*.test.ts`)은 읽지 않는다.
- 검사 코드는 `standards-check.mjs` 안에 두었다. 하위 리포에 복사되는 파일 목록(`templates/index.json`의 `vendor`)을 늘리지 않기 위해서다.
- 스캐폴드는 기능 라우트 예시를 두지 않았다. 새 프로젝트가 지워야 할 코드를 만들지 않고, #27(마이그레이션 실행기)과 같은 파일을 덜 건드리기 위해서다.
- OpenAPI 요약은 workout-memo처럼 `docs/api.md`에서 읽지 않고 `operations`에 직접 쓴다. 문서 파일 하나와 파서를 줄인다.

## 사용자 결정 (2026-10-22)

- `/api/health` 성공 본문: 스캐폴드는 `{ status: 'ok' }`를 쓰고, 기존 앱의 `{ ok, service, today }`도 허용한다. 상태 확인 도구는 상태 코드만 본다.
- 스캐폴드 500 메시지: 7개 앱과 같은 "서버 오류가 발생했습니다"로 바꿨다(workout-memo는 "저장소에 연결할 수 없습니다…").
- 스캐폴드 TypeScript 검증(`tsc`, `prettier --check`, 백엔드 테스트, `npm run openapi`)은 첫 신규 프로젝트를 설치할 때 한다. workout-memo `node_modules`로 실행하지 않는다.

## 검증

- `npm run check` 통과: origin/main(#173까지) 위로 rebase한 뒤 테스트 185개 중 184개 통과·실패 0개(1개는 기존 건너뜀), `registry-check: ok`, `docs/projects.md`·`design-tokens.md` 최신, `package-guard: ok`, `check-workflows: ok`.
- 로컬 8개 앱의 `backend/src`에 `checkApi()`를 돌렸다: workout-memo는 "없는 /api 경로 404" 경고 1개, 나머지 7개는 경고 0개.
- 실행하지 않음: 렌더링한 스캐폴드의 `tsc`·`prettier --check`·백엔드 테스트·`npm run openapi`. 위 사용자 결정에 따라 첫 신규 프로젝트 설치 때 확인한다. 그래서 `docs/openapi.json`은 `buildOpenApi()`가 만드는 값을 직접 써 두었고, 렌더링 테스트가 `operations`·제목·`JSON.stringify` 형식과 같은지 확인한다. 첫 설치 뒤 `npm run check`의 `openapi.test.ts`가 최종 확인한다.
