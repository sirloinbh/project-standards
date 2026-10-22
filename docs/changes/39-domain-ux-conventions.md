# #39 공통 규칙 문서 (도메인 규칙, UX 점검표)

## 변경

| 파일 | 내용 |
|---|---|
| `docs/conventions/domain.md` | 시간대(`Asia/Seoul`, `serviceDate()`), 날짜·시각·시점·기간의 저장·API 형식, 화면 표시, 금액(원 단위 정수, `bigint`), 수량 단위(미터법, `numeric` 자릿수, `NULL`과 0 구분), 서버 검증·한국어 메시지 |
| `docs/conventions/ux-audit.md` | 점검 시기, 페이지별 측정 항목(가로 넘침, 44px 터치, 16px 입력, axe, 키보드, 라이트·다크), 과업 시나리오, 방법(점검용 DB·시드, Playwright, 실기기·Lighthouse), 심각도 P1–P3, 기록 위치 `docs/ux-audit/YYYY-MM-DD.md` |
| `docs/design-system.md` | 반응형·접근성 절에 UX 점검 문서 링크 한 줄 |

`docs/conventions/`에 목차 파일은 만들지 않았다. 같은 폴더에 #27의 `database.md`가 따로 들어올 예정이라, README 링크는 두 문서가 모두 들어온 뒤 한 번에 추가한다.

## 근거

- workout-memo: `AGENTS.md`·`AGENTS.project.md`의 날짜·시간대·총중량 kg 규칙, `shared/contract.ts`의 `date` 스키마, `database/migrations/001_initial.sql`의 `date`·`timestamptz`·`numeric(7,2)`, `docs/ux-audit/2026-10-21.md`의 방법·지표·심각도·다시 측정 절차
- study-log: `backend/src/app.ts`의 `serviceDate()`(`Intl.DateTimeFormat`, `Asia/Seoul`), `studyMinutes()`의 자정 넘김 처리
- 금액 규칙(원 단위 정수, `bigint`, 방향은 종류 필드)과 주 시작 요일(월요일)은 기존 앱에 근거가 없어 새로 정했다. money-ledger에는 아직 금액 코드가 없다.

## 8개 앱 AGENTS.md와 충돌 확인

2026-10-22에 8개 앱의 `AGENTS.md`와 `AGENTS.project.md`를 API로 읽어 비교했다(main 브랜치).

| 앱 | 날짜·시간대 | 화면 확인 크기 | 서비스 규칙 | 충돌 |
|---|---|---|---|---|
| workout-memo | `YYYY-MM-DD`, `Asia/Seoul` | AGENTS에 크기 없음(e2e 반응형·axe 검사) | 총중량 kg, 모르는 기본중량은 NULL | 없음 |
| study-log | `YYYY-MM-DD`, `Asia/Seoul`, `serviceDate()` | 390×844, 1440×900 | 없음 | 없음 |
| health-log | 위와 같음 | 위와 같음 | 없음 | 없음 |
| life-journal | 위와 같음 | 위와 같음 | 없음 | 없음 |
| money-ledger | 위와 같음 | 위와 같음 | 없음 | 없음 |
| english-study | 위와 같음 | 위와 같음 | 없음 | 없음 |
| plan-routine | 위와 같음 | 위와 같음 | 없음 | 없음 |
| dev-career-portfolio | 위와 같음 | 위와 같음 | 없음 | 없음 |

- 7개 앱(workout-memo 제외)의 `AGENTS.md`는 앱 이름·설명·포트만 다르고 나머지 줄은 같다.
- 충돌하는 규칙은 없다. 참고할 차이는 두 가지다.
  - workout-memo의 2026-10-21 점검은 PC 비교 화면을 1280×800으로 찍었다. 이 문서는 디자인 시스템과 7개 앱 AGENTS.md에 맞춰 1440×900을 쓴다. 기존 기록은 고치지 않는다.
  - workout-memo `AGENTS.md`에는 "오늘은 `serviceDate()`로 계산" 문장이 없다. 규칙이 다른 것이 아니라 빠진 것이므로 동기화 때 맞춘다.

## 검증

- 문서만 바꿨다. `npm run check` 통과(테스트 166개 중 165개 통과, 실패 0, `registry:check`·`docs:check`·`tokens:check`·`packages:check`·`workflows:check` 모두 ok).
- 새 문서의 상대 링크(`../design-system.md`, `../projects.md`, `../dependency-policy.md`, std-backlog `SKILL.md`, `conventions/ux-audit.md`) 대상 파일이 있는지 확인했다.
