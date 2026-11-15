# #565 Cookie names across apps

## Change

| File | Content |
|---|---|
| `docs/conventions/code.md` | App cookies start with the registry DB name; the shared sign-in session cookie (ADR-0015) is the only cross-app cookie |

## Search result (2026-11-15)

`git grep` for `Set-Cookie`, `res.cookie`, `document.cookie`, `cookie-parser`, and `clearCookie` on `origin/main` of all 8 app repos, excluding lockfiles and Markdown: no matches. workout-memo's lockfile lists `set-cookie-parser` only as a dependency of a dev tool. No app needs a rename.

## Verification

- `npm run check`: recorded in the PR body
