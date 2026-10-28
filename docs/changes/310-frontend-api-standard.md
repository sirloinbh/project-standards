# #310 프런트 API 요청 함수와 health.ts를 중앙 관리 파일로

## 변경

| 파일 | 내용 |
|---|---|
| `templates/ui/frontend/src/lib/api.ts`, `api.test.ts` | `requestJson`, `RequestError`(상태 코드), `204` 처리. Vitest 테스트 4개가 앱에서 함께 돈다 |
| `templates/ui/frontend/src/health.ts` | `Health`, `healthText` (7개 앱의 파일과 같은 내용) |
| `registry/projects.json` | workout-memo `allowedDifferences`: `frontend/src/health.ts` |
| `templates/app/.prettierignore.tmpl` | 새 관리 파일 3개 |
| `scripts/test/frontend-api.test.mjs`, 스냅샷 | 중앙에서 `api.ts`를 Node 타입 제거로 검사 |
| `docs/ui-components.md` | "공통 도우미" 절 |

## 정한 것

- 기준은 study-log의 `api.ts`다. 상태 코드와 `204`를 다루는 유일한 판이다. 바꾼 점:
  - `RequestError`의 생성자 매개변수 속성(`readonly status?` 매개변수)을 필드로 풀었다. Node의 타입 제거가 이 문법을 지원하지 않아 중앙 테스트를 위해서다. 동작은 같다.
  - `name`을 `RequestError`로 정했다.
  - 서버 본문의 `error`가 문자열이 아니거나 비어 있으면 고정 문구 "요청을 처리하지 못했습니다"를 쓴다.
- 위치는 새 경로 `frontend/src/lib/api.ts`다. study-log·plan-routine의 기존 `frontend/src/api.ts`를 덮어쓰지 않으려는 것이다. 두 앱은 앱 리포에서 import를 바꾸고 기존 파일을 지운다.
- `health.ts`는 7개 앱이 이미 같은 경로(`frontend/src/health.ts`)에 같은 내용을 두고 있어 그 자리에서 관리 파일로 바꿨다. 앱에서 바뀌는 것은 첫 줄의 관리 파일 표시뿐이다. workout-memo는 이 파일이 없고 쓰지 않아 `allowedDifferences`로 뺐다(#240 조사의 "8개 앱 같음"은 7개였다).
- 테스트의 가짜 `fetch`는 `async` 대신 `Promise.resolve`·`Promise.reject`로 썼다. 공유 ESLint 1.1.0의 `require-await`(#308)를 켜도 걸리지 않는다.

## 앱에 들어간 뒤 (앱마다 바꿀 것)

| 앱 | 바꿀 것 |
|---|---|
| study-log | `import { requestJson, RequestError } from './api'`를 `'./lib/api'`로 바꾸고 `frontend/src/api.ts`를 지운다 (같은 API) |
| plan-routine | 위와 같음. 기존 판은 `RequestError`가 없어 `Error`를 던졌으므로, `instanceof Error`로 받던 곳은 그대로 동작한다 |
| workout-memo | 화면 파일 5개(`analysis`, `app`, `backup`, `body`, `routines`)의 `fetch`를 `requestJson`으로 바꾼다. 화면 동작 확인이 필요해 따로 진행한다 |
| 골격 5개 | 기능 화면이 생길 때 `requestJson`을 쓴다 |

## 검증

- `node --test scripts/test/frontend-api.test.mjs`: 2개 통과
- `api.test.ts`를 workout-memo에 설치된 Vitest 5.0.3으로 돌림(임시 폴더, 설치 없음): 4개 통과
- workout-memo에 설치된 ESLint로 공유 설정 1.1.0을 적용해 세 파일 검사: 위반 없음. 공유 Prettier 설정으로 포맷함
- `npm run sync:preview`: 앱 8개가 `lib/api.ts`·`api.test.ts`, workout-memo를 뺀 7개가 `health.ts`를 받음
- `npm run check` 결과는 PR에 적는다
