# zod 4 이전 여부와 순서 (#307)

2026-10-28 조사. 앱 8개 리포의 `origin/main`을 `git show`로 읽고, 패키지 정보는 읽기 전용 `npm view`로 모았다. 아무것도 설치하지 않았다. 채택한 후보는 맨 아래 "결정"에 적는다.

## 1. 왜 지금 보나: zod 4 PR은 보안 업데이트다

#240 조사는 zod 4 PR을 버전 업 PR로 보고 "zod 3 유지"를 권했다. 그런데 이 PR은 보안 업데이트였다(#306 보류).

| 항목 | 내용 |
|---|---|
| 권고 | GHSA-mrhx-c7xc-m3w5 (CVE-2023-54404), high, 2026-10-01 공개 |
| 내용 | 길이 제한이 없는 배열 스키마에 큰 배열을 보내면, 실패한 원소마다 검증 이슈를 끝없이 쌓아 메모리가 바닥난다(`$ZodArray`) |
| 영향 버전 | `< 4.6.6`. zod 3에는 고친 버전이 없다 |
| 앱 | 8개 모두 zod 3.25.76 (`backend/`, workout-memo는 `frontend/`도) |
| 열린 PR | 앱마다 Dependabot `security-major` 묶음 PR 1개 (3.25.76 → 4.6.7) |

## 2. 앱이 실제로 노출된 곳

공격하려면 길이 제한이 없는 `z.array(...)`가 요청 본문을 검증해야 한다. 앱 8개의 `backend/src`, `shared`, `frontend/src`(테스트 제외)에서 배열 스키마를 모두 찾아, 뒤에 `.max()`·`.length()`가 붙는지 확인했다. 여러 줄에 걸친 스키마도 괄호를 따라가며 셌다.

| 앱 | 배열 스키마 | 길이 제한 없음 |
|---|---:|---|
| workout-memo | 15 | 0 |
| study-log | 2 | **1**: `backend/src/textbook-contents.ts:54` 목차 순서 바꾸기(`PUT …/contents/order`)의 `ids` |
| plan-routine, 골격 5개 | 0 | 0 |

- 노출된 곳은 study-log 한 곳이다. 요청 본문 한도(`express.json({ limit: '256kb' })`)가 있어 원소는 많아야 수만 개다. 그래도 원소마다 이슈가 생기고, 오류 처리기가 그 메시지를 모두 이어 붙여 응답한다(수 MB).
- 중앙 오류 처리기(`backend/src/standard/http.ts`, #309)도 이슈 메시지를 개수 제한 없이 이어 붙인다.

## 3. zod 4로 옮길 때 바뀌는 것

앱 코드에서 zod 4에서 없어지거나 바뀌는 API를 셌다(테스트 제외).

| API | workout-memo | study-log | plan-routine | 골격 5개 | zod 4 |
|---|---:|---:|---:|---:|---|
| `required_error`, `invalid_type_error` | 30 | 62 | 4 | 0 | 없어짐. `error` 하나로 |
| `errorMap` | 3 | 3 | 4 | 0 | 없어짐. `error`로 |
| `ZodError.errors` | 2 | 0 | 0 | 0 | 없어짐. `issues`로 |
| `.format()`, `.flatten()` | 5 | 1 | 1 | 1씩 | 남지만 권장하지 않음 (`z.treeifyError`) |
| `.default()` | 27 | 19 | 0 | 0 | 의미가 바뀜(출력 타입에 적용, 입력이 `undefined`면 검증 생략) |
| `._def` (OpenAPI 생성) | 1 파일 | 0 | 0 | 0 | 내부 구조가 바뀜(`_zod.def`). zod 4는 `z.toJSONSchema()`를 직접 제공 |
| `zod`를 import하는 파일 | 13 | 10 | 4 | 1씩 | — |

- 스캐폴드 `backend/src/openapi.ts`도 `schema._def.typeName`을 읽는다. zod 4 API로 옮기면 다시 써야 한다.
- zod 4 패키지는 `zod/v3` 경로로 zod 3 API를 그대로 함께 배포한다. 거꾸로 zod 3.25.76도 `zod/v4` 경로로 zod 4 API를 갖고 있다.

## 4. 패키지 확인

| 버전 | 릴리스 | 14일 규칙 |
|---|---|---|
| 4.6.6 | 2026-10-11 | 지남 |
| 4.6.7 | 2026-10-12 | 지남 |

- 4.6.6 릴리스 노트: 9월 21일 유출된 git 자격 증명으로 `main`에 악성 커밋 6개가 올라갔다가 같은 날 되돌려졌고, npm에는 게시되지 않았다고 한다. 4.6.6의 npm 출처 증명(provenance)은 정리 전 커밋을 가리킨다. 설치 승인 전에 출처 증명과 Socket 점수를 확인하는 것이 좋다.

## 5. 후보

| # | 후보 | 방식 | 설치 | 판단 |
|---|---|---|---|---|
| A | 노출된 곳 막기 | study-log `ids`에 `.max()` 추가(study-log PR). 중앙 오류 처리기가 이슈 메시지를 앞 10개만 보내도록(#309 파일). 앞으로 생길 배열을 위해 `standards-check`에 "길이 제한 없는 `z.array`" 경고 추가 | 없음 | **권장, 바로** |
| B | zod 4.6.7로 올리되 import는 `zod/v3`로 | 앱마다 `from 'zod'` → `from 'zod/v3'`(1~13개 파일). 코드와 OpenAPI 생성은 그대로. 보안 알림이 닫힌다 | 있음(사용자 승인) | **권장, A 다음.** 단 `zod/v3` 경로의 배열 검증도 고쳐졌는지는 확인하지 못했다. 그래서 A가 실제 대책이고, B는 알림과 최신 패키지를 위한 것이다 |
| C | zod 4 API로 옮기기 | 3장 표의 사용처를 고치고 OpenAPI 생성을 `z.toJSONSchema()`로 다시 씀. workout-memo(rollout 1)부터 | B와 같음 | 보류. 바뀌는 곳이 앱당 수십 곳이라 기능 작업이 없는 때 앱별 이슈로 |
| D | zod 3에 머물고 알림을 닫기 | Dependabot 알림을 "위험 수용"으로 닫음 | 없음 | 비권장. A를 하면 실제 위험은 작지만, 알림을 닫으면 다음 권고도 묻힐 수 있다 |

- A와 B는 함께 할 수 있다.
- Dependabot의 zod 묶음 PR은 지금 앱 CI의 `npm ci`에서 실패한다. lockfile이 서로 맞지 않기 때문이다(health-log: `Missing: zod@4.6.6 from lock file`). 이 PR을 그대로 병합할 수는 없다.
  - B는 사용자가 `npm install --ignore-scripts zod@4.6.7`로 lockfile을 다시 만들고, `npm run lockfiles:sync`(#303)와 import 변경을 더하는 방식이 된다.
  - import를 `zod/v3`로 바꾸지 않으면 `required_error` 등 때문에 타입 검사도 실패할 것으로 보인다. 이 부분은 확인하지 못했다.
- 참고: body-parser·qs·undici 묶음 PR(`security-minor-patch`, #305)은 확인한 3개 앱(health-log, workout-memo, study-log)에서 CI를 통과했다.

## 결정

- 2026-10-28 사용자가 후보 A를 골랐다. 구현은 #326.
  - 중앙 오류 처리기는 zod 이슈 메시지를 앞 10개와 나머지 개수만 응답한다.
  - `standards-check`가 길이 제한 없는 `z.array`를 경고한다. 앱 8개 가운데 study-log 1곳만 걸린다.
  - study-log 목차 순서 바꾸기 `ids`에 `.max()`를 붙인다(study-log PR).
- B(zod 4.6.7 + `zod/v3`)·C는 이번에 하지 않는다. zod는 3.25.76에 머문다. Dependabot 알림은 닫지 않는다(D는 하지 않음).
- #306(Dependabot zod 메이저 제외, zod PR 닫기)은 하지 않는다. 열린 zod 묶음 PR 8개는 그대로 둔다.
