# 앱 8개 프런트엔드 반복 UI·공통 코드 (#242)

2026-10-28 조사. 앱 8개 리포 `origin/main`의 `frontend/src`를 `git show`로 읽었다. 코드는 바꾸지 않았다. 채택한 후보는 맨 아래 "결정"에 적고 구현 이슈로 등록한다.

## 1. 앱 현황

- `components/ui/` 15개, `components/layout/`, `lib/theme.ts`, `lib/utils.ts`는 8개 앱 모두 같다(동기화 관리, [ui-components.md](../ui-components.md)).
- 기능 화면이 있는 앱은 3개다. 나머지 5개는 `app.tsx`의 상태 확인 화면(`health.ts`)만 있다.

| 앱 | 화면 파일(`.tsx`, 공통 컴포넌트 제외) | 공통 컴포넌트 사용 | 서버 상태 |
|---|---|---|---|
| workout-memo | 7개 | 일부. `<button>` 57곳, `<Button>` 6곳, `<input>` 32곳. `.legacy` 스타일 위에 `Modal`(공통 `Dialog` 감쌈) | TanStack Query 8곳 + 파일 5개에 `fetch` 감싼 함수가 따로 |
| study-log | 16개 | 거의 안 씀. `<button>` 68곳, `<Button>` 0곳, `<input>` 23곳 | `useState`·`useEffect` 직접 (`useEffect` 43곳) |
| plan-routine | 2개 (`app.tsx`, `routines.tsx`) | 모두 씀. `<Button>` 8곳, `<Card>` 9곳, 원시 `<button>`·`<input>` 0곳 | `useState`·`useEffect` 직접 |

## 2. 반복되는 화면 요소

| 요소 | workout-memo | study-log | plan-routine | 공통 컴포넌트 |
|---|---|---|---|---|
| 삭제 확인 | 브라우저 `confirm()` 3곳 | 같은 줄에 "삭제 확인" 버튼을 한 번 더 보여 주는 2단계 버튼 (기록·키워드·회고 화면 등) | 없음 (보관) | **없음** |
| 처리 결과 알림 | `role="status"`·`role="alert"` 문단 25곳 | `setNotice({ kind, text })` 상태 + `role` 문단 42곳 (화면마다 같은 코드) | `role` 문단 5곳 | `toast`(sonner) 있음, 화면 안 알림 문단은 **없음** |
| 불러오는 중 | 글자 "불러오는 중" 16곳 | 18곳 | 1곳 | `Skeleton`·`Spinner`가 있지만 **기능 화면은 한 곳도 안 씀** |
| 빈 목록 | 글자 문단 | 글자 문단 | `EmptyState` | `EmptyState` 있음 |
| 날짜 입력 | `<input type="date">` 9곳 | 7곳 + 월 달력(`month-calendar.ts`) | 없음 | **없음** (네이티브 입력으로 충분) |
| 날짜 범위 | `date-range.ts` | 기간 이동 | 주기(매일·매주·4주·12주) | 없음 |
| 차트 | 직접 그린 SVG 2곳 | `recharts`(학습 시간), 히트맵(`Heatmap.tsx`) | 없음 | **없음** |
| 표 | `<table>` 3곳 | 없음 | 없음 | 없음 |
| 폼 필드(라벨+입력+오류) | `components/field.tsx` | 화면마다 직접 | `Input`+`Label` | `Input`·`Label`만. 묶음 없음 |

## 3. 반복되는 프런트 코드

| 코드 | 어디에 | 차이 |
|---|---|---|
| API 요청 함수 (`fetch` → JSON, 실패 시 서버의 한국어 `error` 던지기, 연결 실패 "서버에 연결할 수 없습니다") | study-log `api.ts`(`RequestError`에 상태 코드, `204` 처리), plan-routine `api.ts`(상태 코드 없음), workout-memo는 파일 5개에 따로 | 하는 일은 같고, 상태 코드·`204` 처리만 다르다 |
| 서버 상태 확인 (`health.ts`의 `Health` 타입과 문구) | 8개 앱 | 같음. 동기화 관리 밖이라 앱마다 복사 |
| 날짜 문자열 다루기 (`YYYY-MM-DD` 더하기·빼기, 주 시작) | workout-memo `date.ts`, study-log `month-calendar.ts` | 각자 구현. 둘 다 `Date` 시간대 함정을 피하려고 문자열로 계산 |
| `localStorage` 읽기·쓰기 | 3개 앱 모두 `lib/theme.ts`(같음) + workout-memo 화면 상태 | 테마는 이미 공통 |
| 숫자 표시 (`toFixed`) | workout-memo 4곳 | 한 앱만 |

## 4. 공통화 후보

| # | 후보 | 방식 | 판단 |
|---|---|---|---|
| A | API 요청 함수 `lib/api.ts` (`requestJson`, `RequestError`(상태 코드), `204`) | `templates/ui/`에 넣어 동기화. study-log 판을 기준으로 한다. #241 후보 A(백엔드 오류 형식)와 짝 | **권장** |
| B | 삭제 확인 대화상자 `ConfirmDialog` | `templates/ui/`. 공통 `Dialog` 위에 제목·설명·확인(파괴적 버튼)·취소. workout-memo의 `confirm()` 3곳을 바꾼다 | **권장** |
| C | 화면 안 알림 `Notice`(`role="status"`/`"alert"`) + `useNotice()` 훅 | `templates/ui/`. study-log 42곳의 같은 코드를 줄인다 | **권장** |
| D | 불러오는 중 화면을 `Skeleton`·`Spinner`로 | 컴포넌트는 이미 있음. 규칙 문서(`ui-components.md`)에 "목록은 `SkeletonList`, 버튼 안은 `Spinner`"를 적고, 앱마다 바꾸는 일은 앱 이슈로 | **권장** (문서 + 앱 이슈) |
| E | `health.ts`를 동기화 관리 파일로 | `templates/ui/`. 8개 앱이 같으므로 바로 옮길 수 있다 | **권장** (작음) |
| F | 날짜 문자열 도우미 `lib/date.ts` (`addDays`, `startOfWeek`, `serviceToday`) | `templates/ui/`. #241 후보 A의 백엔드 `serviceDate`와 같은 규칙 | 보류. 두 앱 구현이 다루는 범위가 달라 먼저 공통 부분을 좁혀야 함 |
| G | 차트 컴포넌트 | — | 하지 않음. 쓰는 앱이 둘이고 종류가 다르다. 셋째 앱이 필요해지면 study-log의 `recharts`를 기준으로 다시 본다 |
| H | study-log·workout-memo 원시 `<button>`·`<input>`을 공통 컴포넌트로 | 앱 리포 이슈 (화면 모양이 바뀌므로 화면 확인 필요) | 보류. B·C를 먼저 넣고, 그 PR에서 함께 바꿀 범위를 정한다 |

## 결정

- 2026-10-28 사용자가 4장 권장안을 채택했다.
- A·E: #310
- B·C: #311
- D: #312
- F·H: 보류
- G: 하지 않음
