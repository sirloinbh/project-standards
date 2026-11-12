# #280 Try Lighthouse CI score warnings in workout-memo CI

## Change

| File | Content |
|---|---|
| `templates/lighthouse/lighthouserc.json` | New feature folder. Serves the `frontend/dist` built by `npm run check` statically and measures once. Warns when accessibility is below 0.9, best practices below 0.9, or performance below 0.8 |
| `sync.config.json`, `registry/projects.schema.json`, `registry/projects.json` | `features.lighthouse`. Only workout-memo turns it on |
| `.github/workflows/reusable-app-ci.yml` | A Lighthouse step after knip in the `verify` job. Writes the scores to the log and the job summary, and keeps the report as an artifact (`lighthouse-report`, 7 days) |
| `templates/app/.prettierignore.tmpl`, `templates/common/.gitignore.tmpl` | `lighthouserc.json`, `.lighthouseci/` |
| `scripts/test/lighthouse.test.mjs` and others | Checks that it only warns and that only workout-memo receives it |

## Decisions

- Method: the npm package `@lhci/cli` 0.15.1 (pinned in the app lockfile). We did not use an external Action, which downloads an unpinned `@lhci/cli` at every run (#245 approval comment).
- Page: one page, the built first screen (`index.html`). It is measured as static files without a backend, so the scores are for a state where API calls fail. Measuring per screen will be added after data can be filled in with #281 (MSW mocks).
- The threshold scores are trial values. After seeing the first scores in the workout-memo sync PR, we record them in #280 and decide again.
- Neither a threshold miss nor a measurement failure stops CI. Results are uploaded only as files inside the job (`filesystem`), not to a public server.
- Chrome is the Google Chrome installed on the runner image (ubuntu-24.04), the same as the e2e job.

## Turning it on for other apps

Install `@lhci/cli` in the app root (approval needed, `--ignore-scripts`), then change registry `features.lighthouse` to `true`.

## Verification

- `npm run check`: recorded in the PR body
