# #393 Keep daily work records in the central repo

## Change

| File | Content |
|---|---|
| `docs/daily/README.md` | Rules and list of the daily records |
| `docs/daily/2026-11-01.md` | What was done on 2026-11-01 and what to do tomorrow |

## Decisions

- The format is the same as `docs/daily/` in the app repos, and only content that spans several repos goes here. Content for a single app goes in that app.
- It is not synced to apps. `templates/` was not changed.

## Checks

- Ran `npm run check`.
- The PR numbers and issue states in the record were looked up from `git log` and GitHub and copied over.
