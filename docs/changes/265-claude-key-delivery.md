# #265 Tool to deliver the shared Claude API key to the server and local PC

## Decision (ADR-0010)

- The source of truth is the single AWS SSM parameter `/sirloinbh/anthropic-api-key`.
- The server reads it from SSM at every deploy and passes it to compose as an environment variable. No value is kept in the server `.env`.
- On the PC, a central command reads it with a personal AWS profile and puts it into the app `.env`.
- No key is kept in CI.

## Change

| File | Content |
|---|---|
| `registry/projects.schema.json`, `registry/projects.json` | Added `features.claude` (`true` only for study-log) |
| `templates/app/deploy/ssm-get.sh.tmpl` | Calls SSM `GetParameter` with `curl --aws-sigv4` and prints only the value to standard output. The key pair comes through standard input, and the name format is checked |
| `templates/app/deploy/remote-deploy.sh.tmpl` | For an app with `features.claude`, if the server `.env` has `SECRETS_AWS_ACCESS_KEY_ID`, reads `ANTHROPIC_API_KEY` from SSM and exports it. On failure it only logs a warning and uses the `.env` value |
| `tools/app-secrets.mjs` | `set` (standard input, temporary file, `put-parameter`), `check` (only present or absent), `pull` (put into the app `.env`) |
| `scripts/test/app-secrets.test.mjs`, `scripts/test/deploy-templates.test.mjs` | Check behavior and that values are not exposed, using fake AWS CLI and curl |
| `docs/tools.md`, `docs/runbooks/deploy.md`, `docs/user-steps.md` | Usage, server `.env` keys, and user step 10 |

The SSM parameter and the read-only IAM user are created in sirloinbh/shared-aws-infrastructure#8.

study-log `backend/src/translation.ts` keeps the model name in code (`claude-sonnet-5-5`). Changing it to the shared rule (`CLAUDE_MODEL`) is work in the study-log repo, so it is not in this PR.

## Verification

- `node --test scripts/test/app-secrets.test.mjs`: 7 passed
- `node --test scripts/test/deploy-templates.test.mjs`: 15 of 16 passed, 1 skipped (no python3, an existing test)
- `npm run check`: 438 of 439 tests passed, 1 skipped, 0 failed
