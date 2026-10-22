# 도메인 공통 규칙 (시간대, 날짜, 금액·단위)

8개 앱이 함께 지키는 데이터 규칙이다. 앱마다 다른 규칙(예: workout-memo의 "중량은 머신 기본중량을 포함한 총중량")은 각 앱 `AGENTS.project.md`의 "서비스 규칙"에 적는다. 이 문서와 다르게 해야 하면 앱에서 바꾸지 말고 중앙 리포에 이슈를 연다.

근거: 8개 앱 `AGENTS.md`의 "날짜는 `YYYY-MM-DD`, 서비스 시간대는 `Asia/Seoul`" 규칙, workout-memo `shared/contract.ts`의 `date` 스키마, study-log `backend/src/app.ts`의 `serviceDate()`.

## 시간대

- 서비스 시간대는 `Asia/Seoul`(UTC+9, 일광절약시간 없음)이다. "오늘", "이번 주", "이번 달"은 모두 이 시간대로 계산한다.
- 서버의 오늘 날짜는 `serviceDate()` 같은 함수 한 곳에서 계산한다. 테스트에서 시각을 넣을 수 있게 `now`를 인자로 받는다.

  ```ts
  export const serviceTimeZone = 'Asia/Seoul';
  export function serviceDate(now = new Date()) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: serviceTimeZone }).format(now); // 2026-10-22
  }
  ```

- 현재 시각에 `new Date().toISOString().slice(0, 10)`을 쓰지 않는다. UTC 기준이라 한국 시간 00:00–08:59에는 전날 날짜가 나온다.
- 서버·컨테이너의 `TZ` 설정에 기대지 않는다. 코드가 시간대를 직접 지정한다.

## 날짜와 시각

| 종류 | 저장(PostgreSQL) | API·URL·폼 값 | 예 |
|---|---|---|---|
| 날짜(달력의 하루) | `date` | `YYYY-MM-DD` 문자열 | `2026-10-22` |
| 시각(하루 안의 시간) | `time` | `HH:mm` 24시간제 | `07:30` |
| 시점(언제 일어났는지) | `timestamptz` | ISO 8601, 오프셋 포함 | `2026-10-22T09:15:00.000Z` |
| 기간(길이) | `integer` | 분 단위 정수, 이름에 단위 표시 | `duration_minutes: 90` |

- 사용자가 고르는 날짜(운동한 날, 공부한 날, 마감일)는 `date`로 저장한다. 시점(`timestamptz`)으로 저장하고 잘라 쓰지 않는다.
- `created_at`, `updated_at` 같은 기록 시점은 `timestamptz NOT NULL DEFAULT now()`로 둔다.
- 날짜 입력은 서버와 화면이 같은 Zod 스키마로 검증한다. 형식(`YYYY-MM-DD`)과 실제 있는 날짜(2월 30일 거부)를 모두 확인한다. 원본 예: workout-memo `shared/contract.ts`의 `date`.
- 날짜끼리 더하고 빼는 계산은 `date + 'T00:00:00Z'`로 UTC 자정을 만들어 `setUTCDate`로 한다. 지역 시간 메서드(`setDate`, `getDay`)를 섞지 않는다.
- 기간 조회는 양 끝을 포함한다: `?from=2026-10-01&to=2026-10-22`는 1일과 22일을 모두 포함한다.
- 한 주는 일요일에 시작해서 토요일에 끝난다(2026-10-22 사용자 결정, #39). `getUTCDay()`가 `0`인 날이 주의 첫날이다.
- 시작 시각보다 끝 시각이 이르면 자정을 넘긴 것으로 본다(예: `23:30`–`00:30`은 60분). 근거: study-log `studyMinutes()`.

### 화면 표시

- 저장값과 API 값은 위 형식 그대로 둔다. 화면에 다르게 보여 줄 때만 바꾼다.
- 화면의 날짜는 한국어로 쓴다: `2026년 10월 22일`, `10월 22일 (목)`. 한 앱 안에서는 같은 위치에 같은 형식을 쓴다.
- 날짜 입력 칸에서 기본값이 필요하면 서비스 시간대의 오늘을 넣는다.

## 금액

- 통화는 원(KRW)이다. 금액은 원 단위 정수로 다룬다. 소수(`float`, `numeric(…,2)`)로 계산하지 않는다.
- 저장은 `bigint`를 쓴다. 자산 합계처럼 `integer` 범위(약 21억)를 넘을 수 있기 때문이다.
- pg는 `bigint`를 문자열로 돌려준다. API로 보낼 때 `Number.isSafeInteger`로 확인한 뒤 숫자로 바꾼다.
- 수입·지출의 방향은 부호가 아니라 종류 필드(`kind: 'income' | 'expense'`)로 나타내고, 금액은 0 이상으로 저장한다.
- 화면에서는 천 단위 쉼표와 `원`을 붙인다: `12,500원`. `Intl.NumberFormat('ko-KR')`을 쓴다.
- 외화나 소수 단위 자산(주식 수량, 환율)이 필요해지면 money-ledger에서 이슈를 열고 규칙을 이 문서에 추가한다. 그 전에는 원 단위만 쓴다.

## 수량과 단위

- 미터법을 쓴다: 무게 `kg`, 길이 `cm`, 시간 `분`, 열량 `kcal`.
- 단위는 한 필드에 하나로 고정한다. 입력 화면에서 다른 단위(lb 등)를 받지 않는다.
- 단위는 필드 이름(`duration_minutes`)이나 계약 스키마의 라벨·주석(`kg('총중량')`)에 드러나게 한다. 둘 다 없으면 단위를 추측해야 하므로 추가한다.
- 소수가 필요한 측정값(중량, 체중, 체지방률)은 `numeric(7,2)`처럼 자릿수를 정해서 저장한다. `real`·`double precision`을 쓰지 않는다. 근거: workout-memo `001_initial.sql`의 `weight numeric(7,2)`.
- 횟수·개수는 `integer`이고 `CHECK (… > 0)` 또는 `CHECK (… >= 0)`으로 범위를 제한한다.
- 모르는 값은 `NULL`, 실제로 0인 값은 `0`으로 구분한다(예: 확인하지 못한 머신 기본중량은 `NULL`).

## 검증과 메시지

- 위 규칙은 서버에서도 검증한다. 화면 검증만으로 끝내지 않는다.
- 사용자에게 보이는 검증 오류는 한국어로 쓴다: `날짜는 YYYY-MM-DD 형식으로 입력하세요`.
- 오류 응답 형식과 상태 코드는 #30에서 정한다.
