# #600 Add shared-auth to the sync targets with a service profile

## Change

| File | Content |
|---|---|
| `sync.config.json` | New `service` profile (`common` + `service` templates, no packages, `reusable-service-ci.yml`, `neverTouch` for `backend/**`, `deploy/**`, `compose.yaml`, `README.md`, `.env.example`, `AGENTS.project.md`) and the `sirloinbh/shared-auth` target (rollout 3) |
| `templates/service/AGENTS.md.tmpl`, `CLAUDE.md.tmpl` | Synced instructions: work procedure with the review-and-merge rule (step 5), prohibited actions, managed files. Repo-specific rules go in the repo's own `AGENTS.project.md` |
| `templates/service/.github/workflows/ci.yml.tmpl` | Caller of the new shared CI, pinned to the central workflow commit |
| `.github/workflows/reusable-service-ci.yml` | Standards, supply-chain, and secret checks; `npm ci`, typecheck, and tests in `backend/`; shell syntax check; Docker build |
| `scripts/sync.mjs` | The workflow pin now also follows `reusable-service-ci.yml` |
| `scripts/test/sync.test.mjs`, `scripts/test/fixtures/sync-snapshot.json` | 10 targets, a test for what the service profile writes, snapshot for shared-auth |
| `AGENTS.md`, `README.md`, `docs/` | Lists and counts of synced repos, GitHub App install list (user step), per-repo merge table |

## Why

shared-auth had no agent instructions at all (#593). ADR-0013 makes file sync the channel for repos that can be sync targets, and shared-auth can: it is a Node and Docker repo that lives next to the apps.

## Choices made without asking

- Chose a new `service` profile over `app` because `app` would write frontend, deploy, Dockerfile, ESLint, and design-token files that shared-auth does not have, and over `infra` because that is Terraform-specific. Reverse by changing the target's `profile`.
- Chose to ship a synced `AGENTS.md` (like `app`, unlike `infra`) so step 5 of the merge rule arrives by sync; repo-specific rules live in the repo's own `AGENTS.project.md`.
- Chose not to add the packages, ESLint, or Prettier configs: shared-auth has no root `package.json`, and adopting them is a separate decision.

## Verification

- `npm run check`: see the PR.