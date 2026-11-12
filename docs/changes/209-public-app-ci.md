# #209 Sync the shared CI inlined into public app repos

## Change

| File | Content |
|---|---|
| `scripts/lib/inline-ci.mjs` | New file. Reads the `with:` values of the calling `ci.yml` and fills them into `reusable-app-ci.yml`. The `on: workflow_call` block becomes `on: [push, pull_request]`, `${{ inputs.x }}` becomes its value, and `inputs.x` inside conditions becomes `true`, `false`, or a string constant. Undeclared inputs and required inputs without a value stop with an error |
| `scripts/lib/sync-plan.mjs` | For apps whose registry `public` is `true`, `.github/workflows/ci.yml` is replaced with the inlined content. The manifest source is `.github/workflows/reusable-app-ci.yml` |
| `registry/projects.json`, `registry/projects.schema.json` | Added the required field `public`. Only workout-memo has `true` (same as the GitHub visibility setting as of 2026-10-25) |
| `scripts/test/inline-ci.test.mjs` | Tests input reading, inlining, errors, the public and private app difference, and the workflow-rule check on the inlined result |
| `scripts/test/scaffold.test.mjs`, `docs/design.md` | Fixture and CI description |

## Decisions

- Cause: GitHub does not let a public repo call a reusable workflow in a private repo. The `ci.yml` in workout-memo#143 failed in 0 seconds with no jobs.
- Do not make workout-memo private. The automatic server deploy reads the public repo and API without authentication.
- project-standards is not made public either (user decision, 2026-10-25).
- The inlined file is also a centrally managed file, so the hash check keeps it equal to the central content. When the central shared CI changes, it goes into the next sync PR as is. The effect of pinning by commit SHA, as for private apps, is obtained per sync PR.

## Verification

- `npm run check` passed (406 of 409 tests passed, 3 skipped; registry-check, docs check, tokens check, package-guard, check-workflows)
- Checked the `ci.yml` in the workout-memo preview by eye: Actions pinned to the central SHA, `ubuntu-24.04`, `e2e-visual` condition `true && true`, image digest
- The real run will be checked in the CI of workout-memo#143, which is updated after the merge
