# #704 Pin the universal app dependencies in versions.json

## Change

| File | Content |
|---|---|
| `versions.json` | `dependencies.root.devDependencies` gains `@playwright/test` 1.63.0, `@axe-core/playwright` 4.13.0, `@lhci/cli` 0.16.0, `concurrently` 9.2.5; `dependencies.frontend.dependencies` gains `zod` 4.6.7. New `optionalDependencies` section with `@testing-library/user-event` 14.6.8 |
| `versions.schema.json` | Schema for `optionalDependencies` |
| `scripts/lib/templates.mjs` | `sharedDependencyFields` writes an optional dependency only where the app's `package.json` already lists it; a name in both sections is an error |
| `scripts/lib/registry.mjs` | `registry:check` fails when `@playwright/test` differs from the version of `images.playwright` |
| `scripts/gen-docs.mjs`, `docs/versions.md` | The optional section is listed |
| `docs/dependency-policy.md` | Playwright, axe, lhci and concurrently are in all 8 apps; user-event is optional |
| `scripts/test/*` | Tests for the optional section, the Playwright check, the docs table, and the study-log fixture (the central `concurrently` pin now wins) |

## Versions chosen

Read from the 8 apps on 2026-11-19: `@playwright/test`, `@axe-core/playwright`, `concurrently` and frontend `zod` are already identical in every app. `@lhci/cli` is 0.16.0 in 6 apps and 0.16.1 in health-log and life-journal; 0.16.0 is pinned (the majority), so only those two change. `@testing-library/user-event` is in workout-memo (14.6.7) and dev-career-portfolio (14.6.8); 14.6.8 is pinned.

## Checks

- `npm run sync:preview` with the real `package.json` files of health-log, life-journal and study-log: `@lhci/cli` is 0.16.0 in all three; apps without `user-event` get nothing added.
- `npm run check` result is in the PR.
