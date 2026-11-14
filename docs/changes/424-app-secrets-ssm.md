# #424 Pass per-app external service keys from SSM to the server and local

- Issue: [#424](https://github.com/sirloinbh/project-standards/issues/424)
- Branch: `feat/424-app-secrets-ssm`
- Date: 2026-11-14 (Asia/Seoul)

## Decision

[ADR-0014](../adr/0014-app-secrets-ssm-paths.md) amends ADR-0010: keys live at `/sirloinbh/shared/<name>` or `/sirloinbh/<app>/<name>`, the app's `.env.example` names the parameter with `@ssm=`, and the Claude key moves to `/sirloinbh/shared/anthropic-api-key` (the old parameter never held a value).

## Change

- `scripts/lib/env-tags.mjs` (new, also copied to apps as `.standards/lib/env-tags.mjs`): the `.env.example` parser moved here from `compliance.mjs`, with the `@ssm` tag and the path rules (`ssmPathProblem`, `ssmProblems`).
- `scripts/standards-check.mjs`: fails on an `@ssm=` tag that is not a shared or own-app parameter, is not `@secret`, has an example value, or is a `VITE_` key.
- `scripts/lib/compliance.mjs`: the same rules in the compliance report; `docs/env-matrix.md` gets an "SSM parameter" column (names only).
- `templates/app/deploy/remote-deploy.sh.tmpl`: `load_ssm_env` reads every tagged key with `ssm-get.sh` after checking out the commit it starts (deploy and start/rollback) and exports it for compose. Apps with `features.claude` still get `ANTHROPIC_API_KEY` without a tag, now from the shared path.
- `tools/app-secrets.mjs`: `set <parameter>`, `check <app>`, `pull <app>` (`--dir` for another clone); the commands without an app keep handling the Claude key in `project-standards/.env`.
- Docs: ADR-0010 status, `env-conventions.md`, `tools.md`, `user-steps.md` (new step: user write permission on `/sirloinbh/*`), deploy runbook, research doc.

## Follow-up outside this repo

- shared-aws-infrastructure: widen `sirloinbh-apps-secrets-reader` from the one Claude parameter to `parameter/sirloinbh/shared/*` and `parameter/sirloinbh/<app>/*` (separate issue and PR in that repo; the user merges and applies).
- Apps: tag their keys in `.env.example` and pass them in `compose.yaml` when each key is issued (per-app issues).

## Checks

- `node --test scripts/test/deploy-templates.test.mjs`: the loader exports tagged shared and app keys, ignores untagged keys and tags split by a blank line, adds the Claude key only for `features.claude` apps (a tag wins), warns without printing on a failed read, does nothing without the key pair, and works with no `.env.example`.
- `node --test scripts/test/app-secrets.test.mjs`: 12 passed (`set <parameter>` refuses other names before reading the value; `pull <app>` writes only tagged keys and fails before writing when a tag breaks the rules; values never reach output or arguments).
- `node --test scripts/test/standards-check.test.mjs scripts/test/compliance.test.mjs`: 34 passed.

## Follow-up (2026-11-14)

- The user's write permission could not be an inline policy: the console refused it because `terraform-workout` already has an inline policy and IAM counts all inline policies of a user against 2048 characters. `docs/user-steps.md` (section 10, step 3) and ADR-0014 now say to create the customer managed policy `sirloinbh-ssm-write` and attach it to the user.
- Server permission: applied through shared-aws-infrastructure #27 and #30 (the PC's state lacked the backup bucket and IAM users, so they were imported first).
