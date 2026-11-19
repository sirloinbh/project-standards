# #760 Managed OpenAPI files in apps that have not adopted the builder

## Change

- `templates/app/backend/src/standard/openapi-cli.ts`: loads the app's `document` with a dynamic import and a runtime check, so the file compiles when the app's own `backend/src/openapi.ts` has no `document` export yet (the Docker build runs `tsc` over every file in `src`). A missing export prints a clear message and exits 1.
- `templates/app/backend/src/standard/openapi.ts`: removed the `!` on `options.operations[route]`; the apps' ESLint (`no-unnecessary-type-assertion`) rejected it because they do not set `noUncheckedIndexedAccess`.

## Reason

The #679 files reached the #698 sync PRs and broke `docker-build` (`TS2305`) and `verify` (lint) in every app.

## Verification

- The scaffold rendered with an app's packages: `tsc` clean, `npm run openapi` writes the document, `openapi.test.ts` 7 pass. The files lint clean with cert-manager's ESLint config.
- `npm run check`: see the PR.
