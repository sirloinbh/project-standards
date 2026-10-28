# 앱 8개 백엔드 API 형태 비교 (#241)

2026-10-28 조사. 앱 8개 리포 `origin/main`의 `backend/src`를 `git show`로 읽어 비교했다. 코드는 바꾸지 않았다. 채택한 후보는 맨 아래 "결정"에 적고 구현 이슈로 등록한다.

API 규칙과 2026-10-22 차이표는 [directory-rules.md "API (Express)"](../directory-rules.md#api-express)에 있다. 이 문서는 그 뒤 달라진 점과 규칙이 다루지 않는 항목만 적는다.

## 1. 앱 현황

| 앱 | `backend/src` | 기능 라우트 | 라우트 방식 | OpenAPI·공유 계약 |
|---|---|---|---|---|
| workout-memo | 19개 파일 | 8묶음 | `routes/<기능>.ts`의 `register…Routes(app, pool)` (표준) | 있음 |
| study-log | 12개 파일 | 10묶음 | `src/<기능>.ts`의 `Router` + `app.use('/api/<기능>')` | 없음 |
| plan-routine | 5개 파일 | 2묶음 | study-log와 같음 | 없음 |
| health-log, life-journal, money-ledger, english-study, dev-career-portfolio | `app.ts`, `server.ts` | 없음 | — | 없음 |

- 골격만 있는 5개 앱의 `app.ts`는 헬스체크의 `service` 이름 한 줄만 다르다.
- 2026-10-22 차이표의 내용은 그대로다. workout-memo에는 아직 "없는 `/api` 경로 → JSON 404"가 없다.

## 2. 비교표

| 항목 | workout-memo | study-log | plan-routine | 골격 5개 | 규칙 |
|---|---|---|---|---|---|
| 성공 응답 모양 | 행·배열 그대로 (`res.json(rows)`) | 이름으로 감쌈 (`{ textbooks }`, `{ textbook }`) | 이름으로 감쌈 (`{ routines }`, `{ routine }`) | — | **없음** |
| 삭제 성공 | `200 { ok: true }` | `204` (본문 없음) | 삭제 대신 `POST /:id/archive` | — | `200` |
| 삭제 대상 없음 | 3곳 `404 { error }`, **goals 1곳 `404 { ok: false }`** | `404 { error }` | `404 { error }` | — | `404 { error }` |
| 부분 수정 | 없음 (`PUT`만) | `PATCH` 1곳 | `PATCH`(이름 바꾸기), `POST /:id/move` | — | `PUT` 기본. `PATCH`와 동작 경로(`/:id/<동작>`)는 언급 없음 |
| ID 검증 | `z.coerce.number().int().positive()` (`"1e3"`, `" 7 "`도 통과) | 정규식 `^[1-9]\d{0,14}$` → 숫자 | 정규식 `^\d{1,18}$`, 응답에서 `id::text` (**문자열 ID**) | — | **없음** |
| ID 컬럼 | `integer GENERATED` | `bigint` (JS 숫자로 변환, 범위 밖이면 오류) | `bigint` (문자열로 응답) | — | **없음** |
| 깨진 JSON·큰 본문 | `400`·`413` | `400`·`413` 전용 메시지 | **`500`** | **`500`** | `400`·`413` |
| `NUL` 문자 입력 (`22021`) | `500` | `400` | `500` | `500` | 없음 |
| 오늘 날짜 | `seoulToday()` + SQL `AT TIME ZONE 'Asia/Seoul'` | `serviceDate()` (`Intl`, Asia/Seoul) | 같음 | 같음 | 없음 (모두 Asia/Seoul로는 같음) |
| `DATE` 컬럼 | 문자열 유지 (`setTypeParser(1082)`) | 같음 | 같음 | 같음 | 같음 |
| 목록 페이지 나눔 | 없음 (날짜 범위 필터) | `LIMIT` 3곳 | 없음 | — | 없음 (지금 데이터 크기에서는 필요 없음) |
| 재시도 키 | `Idempotency-Key` (운동 기록 저장) | 없음 | 없음 | — | 없음 |
| 오류 로그 | `{ event: 'request_error', message }` | 같음 | 같음 | 같음 | 같음 |
| 헬스체크 본문 | `{ status: 'ok' }` | `{ ok, service, today }` | 같음 | 같음 | 둘 다 허용. 배포·감시 스크립트는 상태 코드만 봄 |

## 3. 앱마다 따로 만든 같은 코드

| 코드 | 위치 | 차이 |
|---|---|---|
| 오류 처리기 (`ZodError`, `23505`, 본문 오류, 500 로그) | 8개 앱 모두. workout-memo는 `routes/shared.ts`, 나머지는 `app.ts` 안 | 다루는 오류 종류가 앱마다 다르다(2장 "깨진 JSON", "NUL") |
| 없는 `/api` 경로 404 | 7개 앱 `app.ts` | workout-memo에 없음 |
| `serviceDate()`·`serviceTimeZone` | 7개 앱 `app.ts`에 복사 | 내용 같음 |
| ID 파라미터 검증 | 앱 3개가 서로 다르게 | 2장 "ID 검증" |
| `LIKE` 검색어 이스케이프 (`likePattern`) | study-log `sql.ts` | 검색 기능을 만드는 앱은 같은 함정을 다시 겪는다 |

## 4. 공통화 후보

| # | 후보 | 방식 | 판단 |
|---|---|---|---|
| A | 오류 처리기·`notFound`·`serviceDate`·ID 검증을 중앙 관리 파일 하나(예: `backend/src/standard/http.ts`)로 동기화하기 | 스캐폴드 `routes/shared.ts` 내용을 템플릿으로 옮기고 `featureTemplates`로 8개 앱에 배포. 앱 고유 오류(workout-memo `23503`)는 앱 쪽 처리기를 앞에 둔다 | **권장.** plan-routine·골격 5개의 깨진 JSON `500`, workout-memo의 없는 경로 HTML 404가 함께 고쳐진다 |
| B | 성공 응답 모양 규칙 정하기 | 규칙 문서. 새 코드는 study-log·plan-routine처럼 이름으로 감싼다(`{ items }`, `{ item }`). workout-memo는 화면이 바뀌어야 하므로 그대로 둔다 | **권장** (문서만) |
| C | ID 규칙 정하기 | 규칙 문서 + A의 `idParam`. 15자리 이하 양의 정수, JSON에서는 숫자. plan-routine 문자열 ID는 그대로 두되 새 앱은 숫자 | **권장** |
| D | 삭제·부분 수정·동작 경로 규칙 보완 | 규칙 문서. 삭제 성공은 `204`(본문 없음)도 허용, 부분 수정은 `PATCH`, 동작은 `POST /:id/<동작>` | **권장** (문서만, 지금 코드와 맞춤) |
| E | workout-memo 고치기: 없는 `/api` 경로 404, goals 삭제 404 본문, ID `coerce` | workout-memo 리포 이슈(A를 채택하면 그 동기화 PR에 포함) | **권장** (앱 리포 작업, 사용자 확인 뒤) |
| F | study-log·plan-routine에 OpenAPI와 공유 계약 넣기 | 앱마다 이슈. study-log(라우트 10묶음)부터 | 보류. #281(MSW 목)이 workout-memo에서 효과를 보인 뒤 정한다 |
| G | 목록 페이지 나눔 규칙 | — | 하지 않음. 1인 사용 앱의 데이터 크기에서는 필요 없다 |

## 결정

- (사용자 확인 전)
