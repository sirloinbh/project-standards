# #260 Add CodeQL code scanning and secret scanning to the repo settings standard

## Decision

- All 11 repos are public (2026-10-27), so secret scanning, push protection, and CodeQL are required for every repo.
- CodeQL uses the **default setup**. The advanced setup would need `codeql.yml` as a managed file and matching language and build, but all apps are JavaScript/TypeScript now, so the default setup is enough and the number of files to sync does not grow.
- The compliance report checks whether `state` of `GET repos/<repo>/code-scanning/default-setup` is `configured`. The sync App needs Code scanning alerts read permission. Until the permission is added, it shows "cannot confirm".

## Change

| File | Content |
|---|---|
| `scripts/lib/repo-settings.mjs` | Collects and judges the CodeQL default setup (`configured` passes, anything else fails, private repos depend on the plan, and unreadable means cannot confirm) |
| `scripts/test/repo-settings.test.mjs` | Cases for pass, private, off, and no permission |
| `docs/repo-settings.md` | Updated visibility, added a CodeQL standard row, and made the how-to apply to all repos |
| `docs/github-app.md`, `docs/adr/0002-github-app-for-sync.md` | Added Code scanning alerts read to the App permissions |
| `docs/user-steps.md` | 9. Turn on repo security settings and add the App permission (#261) |

## Verification

- `node --test scripts/test/repo-settings.test.mjs`: 6 passed
- `npm run check`: see the PR body
