# #471 Translate app names and summaries in the registry to English

The app translation PRs (#457) could not change synced files whose text comes from `registry/projects.json`: the web app manifest, the offline page, and the server service descriptions. This changes the source.

## Changes

| Project | `title` (short name) | `displayName` |
|---|---|---|
| workout-memo | Workout Log | FORM · My Workout Log |
| study-log | Study Log | Study Log |
| health-log | Health Log | Diet, Sleep and Health Log |
| life-journal | Reviews & Diary | Reviews & Diary |
| money-ledger | Money Ledger | Ledger, Assets, Mock Trading |
| cert-manager | Cert Manager | Cert Manager |
| plan-routine | Plan Routine | Plan · Practice · Routine · Feedback |
| dev-career-portfolio | Dev Career | Dev Career Portfolio |

- `displayName` matches the app name each translation PR shows on screen.
- `title` is the short name: it becomes the web app manifest `short_name` and the start of the service descriptions.
- `summary` is translated for all 8 apps. It becomes the manifest `description` and the second line of each app's `AGENTS.md`.
- `templates/app/frontend/public/manifest.webmanifest.tmpl`: `lang` is `en`.
- `docs/projects.md` is regenerated. Tests that quote the names are updated.

## Not changed

- `domain` values (for example `운동`) are internal labels, not shown on screen.
- The Korean text around the names in `AGENTS.md.tmpl` and the app skills (`# Study Log 테스트 작성과 실행`), and the `중앙 관리 파일` header line: #455.

## Verification

- `npm run check`: pass.
- No app test reads `manifest.webmanifest` or `offline.html`, so the sync PRs should not need app changes.
