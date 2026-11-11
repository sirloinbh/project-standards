# #457 Translate the shared UI templates to English

This is the first step of #457 (app screen text to English). It changes the text that every app gets from the central templates. Each app's own screens are a separate issue in that app's repo.

## Shared basis

- Page language: `<html lang="en">`. Browser tests run with `locale: 'en-US'`.
- Dates on screen: English, as already set in `docs/conventions/domain.md` (`October 22, 2026`).
- Money: the currency stays KRW and stored data does not change. Only the display changes, to `₩12,500` with `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KRW' })`.
- Existing Korean data in app databases (category names and so on) is not rewritten here. Each app issue decides about its own data.
- Units on screen: `kg`, `cm`, `min`, `kcal`.

## Changes

| Area | Old | New |
|---|---|---|
| App shell | 본문으로 건너뛰기 / 메뉴 열기 / 주 메뉴 | Skip to main content / Open menu / Main menu |
| Theme toggle | 화면 모드: 시스템 설정·라이트·다크 | Theme: System · Light · Dark |
| ConfirmDialog defaults | 삭제 / 취소 / 처리하는 중 | Delete / Cancel / Working |
| Dialog and Sheet close | 닫기 | Close |
| Spinner default / toast region | 불러오는 중 / 알림 | Loading / Notifications |
| `lib/api.ts`, `use-notice.ts` | 서버에 연결할 수 없습니다 / 요청을 처리하지 못했습니다 | Cannot reach the server / Could not process the request |
| `health.ts` | 서버 확인 중… / 서버 연결됨 · | Checking server… / Server connected · |
| `backend/src/standard/http.ts` | 요청한 API를 찾을 수 없습니다, `${label} ID가 올바르지 않습니다`, 외 N개, … | API not found, `Invalid ${label} ID`, and N more, Request body is not valid JSON, Request body is too large, Cannot process the request, Input contains a character that is not allowed (NUL), This item already exists, Server error |
| `offline.html` | 인터넷에 연결되어 있지 않습니다 / 다시 시도 | You are offline / Try again |
| msw contract helper | 계약(docs/openapi.json)에 없는 요청 | Requests not in the contract (docs/openapi.json) |

The template tests, `scripts/test/backend-http.test.mjs`, `frontend-api.test.mjs`, `msw.test.mjs`, and `docs/ui-components.md`, `docs/design-system.md`, `docs/conventions/domain.md` were updated to match.

## Effect on apps

The next sync PR to each app brings these strings. App tests outside the synced files (for example `app.test.tsx`, backend `*.test.ts`, `e2e/*.spec.ts`) still check the Korean text, so the sync PR's CI fails until the app is updated. Per app, push a commit to the sync PR branch (the bot keeps direct commits, #367) or translate the app first in its own PR using the strings above. The user merges app PRs.

## Verification

- `npm test`: 532 pass, 0 fail. `registry:check`, `docs:check`, `tokens:check`, `packages:check`, `workflows:check`, `secrets:check`: all pass.
- The translated `templates/ui` components and tests were copied into a temporary life-journal worktree and run with its Vitest: 20 files, 55 pass, 2 skipped. The worktree was removed afterwards.
