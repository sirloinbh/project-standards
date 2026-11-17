# #561 App switcher menu in the shared app shell

## What changed

- `templates/ui/frontend/src/components/layout/app-switcher.tsx` (new): a dropdown in the top bar that lists the apps and opens each one. It marks the current app with `aria-current="page"` and renders nothing when fewer than two apps are listed (for example while `rootDomain` is unset).
- `templates/ui/frontend/src/lib/apps.ts.tmpl` (new): `APPS` and `CURRENT_APP`, rendered at sync time. `scripts/lib/vars.mjs` gets `apps.list`, built from the active apps in `registry/projects.json` and `serviceHost()` (ADR-0012).
- `AppShell` renders `<AppSwitcher />` between `actions` and the mode menu. This is one line, so #612 can add an AI shell button next to it.
- `templates/app/.prettierignore.tmpl`: `frontend/src/lib/apps.ts` is a managed file.
- `docs/layout.md` documents both files.

## Decisions

- The list is data rendered into one file, not read at run time, so the apps need no network call and the registry stays the only source.
- No separate user menu: the signed-in account and sign-out already live in `AccountActions` (`actions` slot). Moving them into a menu can be a follow-up when the AI shell button lands (#612).

## Verification

- `scripts/test/app-switcher.test.mjs`: each ui app gets all active apps, its own name, and escaped quotes; the list is empty without a root domain.
- `UPDATE_SNAPSHOT=1 npm test`, then `npm run check` (results in the PR).
- UI test `app-switcher.test.tsx` and a visual check in a workout-memo worktree (results in the PR).
