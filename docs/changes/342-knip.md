# #342 knip 오탐 정리와 결과 0인 앱부터 실패로 바꾸기

## 변경

| 파일 | 내용 |
|---|---|
| `templates/app/knip.json` | `ignore`에 중앙 관리 파일 `.claude/**`, `backend/src/standard/**`를 더하고, 모든 앱에서 knip이 "필요 없음"이라고 알린 두 패턴(`components/layout/**`, `lib/{utils,theme,api,use-notice}.ts`)을 뺐다 |
| `.github/workflows/reusable-app-ci.yml` | 입력 `knip-strict`. 꺼져 있으면 지금처럼 경고만, 켜져 있으면 knip 결과가 있을 때 실패 |
| `templates/app/.github/workflows/ci.yml.tmpl`, `registry/projects.schema.json`, `registry/projects.json` | `features.knipStrict` (처음에는 8개 모두 `false`) |
| `scripts/test/knip.test.mjs` | ignore, 두 단계 조건, 호출·펼침 CI 모두에 값이 들어가는지 |

## 첫 결과 다시 재기 (2026-10-29, 앱 `main`, 새 ignore)

| 앱 | 결과 |
|---|---|
| health-log·life-journal·money-ledger·english-study·dev-career-portfolio | `backend/src/app.ts`의 `serviceTimeZone` export 1건 |
| plan-routine | 같은 1건 + 앱 고유 export 3건 |
| study-log | 같은 1건 + 앱 고유 export 6건, type 2건 |
| workout-memo | 앱 고유 29건(안 쓰는 파일 1, export 15, type 10, 목록에 없는 실행 파일 `tsc`·`tsx` 2, `@lhci/cli` 1) |

- `serviceTimeZone`은 7개 앱의 `app.ts` 안에서만 쓰여 export가 필요 없다. 새 앱 scaffold는 이미 중앙 `standard/http.ts`를 쓰므로 scaffold는 고칠 것이 없다. 앱마다 `export`를 빼는 PR을 낸다.
- 그 PR이 병합된 5개 앱(결과 0)은 `features.knipStrict`를 켠다(별도 PR).
- `@lhci/cli`는 #280의 `lighthouserc.json`이 동기화되면 knip이 쓰는 곳을 찾는다.
- workout-memo `playwright.config.ts`는 테스트 DB 환경변수가 없으면 읽기에 실패한다. CI에는 `E2E_DATABASE_URL`이 있어 문제가 없다. 로컬에서 knip을 돌릴 때는 `TEST_DATABASE_URL`을 넣는다.
- 앱 고유 결과(study-log, plan-routine, workout-memo)는 각 앱 이슈로 정리한다.

## 검증

- `npm run check`: PR 본문에 기록

## 실패로 바꾼 앱 (2026-10-29)

- health-log, life-journal, money-ledger, english-study, dev-career-portfolio: `serviceTimeZone` export를 뺀 앱 PR이 병합되어 결과가 0이 됐다. `features.knipStrict`를 켰다.
- study-log, plan-routine, workout-memo는 앱 고유 결과를 정리한 뒤 켠다.
