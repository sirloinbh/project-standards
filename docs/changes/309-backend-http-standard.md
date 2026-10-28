# #309 백엔드 공통 HTTP 파일 (오류 처리기·404·ID·날짜)

## 변경

| 파일 | 내용 |
|---|---|
| `templates/app/backend/src/standard/http.ts` | 새 중앙 관리 파일: `errorHandler`, `notFound`, `HttpError`, `sendError`, `parseId`·`ID_PATTERN`, `serviceDate`·`serviceTimeZone`, `ApiError` |
| `templates/app/.prettierignore.tmpl` | `backend/src/standard/` (관리 파일 해시 유지, #154) |
| `scaffold/app/backend/src/routes/shared.ts` | 직접 쓰던 오류 처리기 대신 `standard/http.ts`를 다시 내보냄 |
| `scripts/test/backend-http.test.mjs` | 관리 파일 테스트 (Node 타입 제거로 바로 실행) |
| `scripts/test/fixtures/sync-snapshot.json` | 앱 8개에 파일 1개 추가 |
| `docs/directory-rules.md`, `docs/design.md` | 위치, 상태 코드 표, 앱 고유 오류, ID와 날짜 |

## 정한 것

- 기준은 study-log의 오류 처리기다. 8개 앱 가운데 다루는 오류가 가장 많다(깨진 JSON `400`, 큰 본문 `413`, 그 밖의 `4xx` 유지, `NUL` 문자 `22021` → `400`, `23505` → `409`).
- 파일은 타입만 import한다. `ZodError`는 `instanceof` 대신 모양(`name === 'ZodError'`, `issues` 배열)으로 알아본다. 그래서 zod 3·4 어느 쪽이든 동작하고(#306·#307), 중앙 리포는 패키지 설치 없이 Node의 타입 제거로 바로 테스트한다.
- ID 검증은 zod 스키마 대신 함수 `parseId(value, label)`로 했다. 실패하면 `HttpError(400)`를 던진다. zod 스키마에서 쓰도록 `ID_PATTERN`도 내보낸다. 규칙은 study-log와 같다: 1~15자리, 앞자리 0 없음. workout-memo의 `z.coerce`가 받던 `"1e3"`, `" 7 "`는 받지 않는다.
- 라우트가 원하는 상태 코드를 내도록 `HttpError`를 넣었다(`throw new HttpError(404, '…')`).
- 앱 고유 오류는 이 파일에 넣지 않는다. 앱의 오류 미들웨어를 `errorHandler` 앞에 둔다.
- 위치는 `backend/src/standard/`다. 앱 코드와 섞이지 않고 이름만 보고 중앙 관리 파일인지 알 수 있다.

## 앱에 들어간 뒤 (앱마다 바꿀 것)

동기화 PR은 파일만 더한다. 앱이 이 파일을 쓰도록 바꾸는 일은 앱 리포에서 한다(병합은 사용자).

| 앱 | 바꿀 것 | 고쳐지는 것 |
|---|---|---|
| health-log, life-journal, money-ledger, english-study, dev-career-portfolio | `app.ts`의 익명 오류 처리기와 404를 `import { errorHandler, notFound, serviceDate } from './standard/http.js'`로 바꾸고, `serviceDate`·`serviceTimeZone` 복사본을 지운다 | 깨진 JSON·큰 본문이 `500` 대신 `400`·`413` |
| plan-routine | 위와 같음. ID 정규식(`^\d{1,18}$`)은 문자열 ID 응답과 함께 그대로 둔다 | 깨진 JSON `500` → `400` |
| study-log | 위와 같음. 라우트의 `idParam` 정규식은 `ID_PATTERN` 또는 `parseId`로 바꿀 수 있다(같은 규칙) | 중복 코드 제거 |
| workout-memo | `routes/shared.ts`의 오류 처리기를 지우고 `23503`·백업 `413` 전용 메시지만 앱 오류 미들웨어로 남긴다. `app.use('/api', notFound)`를 더한다. `id()`(`z.coerce`)를 `parseId`로 바꾸고, goals 삭제의 `404 { ok: false }`를 `404 { error }`로 고친다 | 없는 `/api` 경로가 HTML 대신 JSON 404, ID `"1e3"` 거부, 삭제 실패 본문 통일 |

workout-memo 몫은 sirloinbh/workout-memo#172로 따로 열었다(#241 후보 E).

## 검증

- `node --test scripts/test/backend-http.test.mjs`: 7개 통과 (깨진 JSON `400`, 큰 본문 `413`, 그 밖의 `4xx`, zod 오류 `400`, `HttpError`, `22021`·`23505`, `500`과 로그, JSON 404, ID 경계값, Asia/Seoul 날짜 경계)
- workout-memo에 설치된 TypeScript 5.9.3과 `@types/express`·`@types/pg`로 관리 파일과 스캐폴드 `routes/shared.ts`를 `strict`·`NodeNext`로 타입 검사: 오류 없음
- 같은 앱의 ESLint로 1.1.0 공유 설정을 적용해 검사: 위반 없음. 공유 Prettier 설정으로 포맷함
- `npm run check` 결과는 PR에 적는다
