# 699: app CI runs once per commit and skips the slow jobs for docs-only pull requests

Also fixes the stale `maxRollout` comment in `sync.yml` (#725).

## What changed

- `templates/app/.github/workflows/ci.yml.tmpl` and `scripts/lib/inline-ci.mjs` (the inlined copy for public apps): the trigger is `push` on `main` plus `pull_request`, not `[push, pull_request]`. A commit on a pull request branch used to run verify, e2e and docker-build twice (once for the push, once for the pull request).
- `.github/workflows/reusable-app-ci.yml`: a new `changes` job reads the pull request's own diff (`git diff --name-only HEAD^1 HEAD` on the merge commit). When every changed file is under `docs/` or ends in `.md`, `e2e`, `e2e-visual` and `docker-build` are skipped.
- `scripts/test/workflows.test.mjs`, `scripts/test/inline-ci.test.mjs`: assert the triggers and the skip conditions; the sync snapshot is updated.
- `.github/workflows/sync.yml` (#725): the first-line comment no longer mentions `maxRollout`, which is gone from `sync.config.json`.

## Decisions

- **Skip inside the reusable workflow, not with `paths-ignore`.** The app repos require the checks `ci / verify` and `ci / docker-build`. A workflow-level `paths-ignore` would not start the workflow, so those checks would stay pending and block the merge. A job skipped by `if:` counts as passed for a required check.
- **`verify` still runs on docs-only pull requests.** The issue lists verify among the jobs to skip. `verify` holds the format check (Markdown included), the central standards check and the docs tests, and a docs-only change that fails them would first surface as a red `main`. It is the cheapest of the three jobs, so the saving that matters (e2e with Playwright and the two image builds) is kept. To skip it too, add the same `needs`/`if` lines to `verify`.
- **`!cancelled()` in the conditions.** If the `changes` job itself fails, the slow jobs still run, so a failure cannot turn into a skipped (passing) required check.
- **Pushes to `main` always run everything**, so a docs-only merge is still checked after it lands.

## Impact

Every app gets the new `ci.yml` through the next sync PR. A sync PR in one app shows one CI run per commit. A pull request that changes only docs shows `e2e` and `docker-build` as skipped.

## Tests

`npm run check`; `node --test scripts/test/workflows.test.mjs scripts/test/inline-ci.test.mjs`.
